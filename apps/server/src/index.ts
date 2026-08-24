import fs from "node:fs";
import path from "node:path";
import cors from "cors";
import express, { NextFunction, Request, Response } from "express";
import { CompletionLevelSchema, ModeSchema } from "@algoshell/shared";
import { z } from "zod";
import { config, redact } from "./config";
import { createDailyBackup } from "./db/backup";
import { db, getAppConfig, patchAppConfig } from "./db/database";
import {
  activateTask, completeTask, createSession, getAllProgress, getDraft, getLatestCodeSnapshotId, getProgress, getTodaySession,
  newId, recordAttempt, recordLearningEvent, recordOfficialResult, recordReview, saveDraft, saveNote,
  setHintLevel, skipTask, replaceUntouchedSession
} from "./db/repository";
import { detectJava, judgeJava } from "./judge/java";
import { problemStore } from "./problems/store";
import { buildDailyPlan, phaseForDay } from "./scheduler/scheduler";
import { buildSummary, calculateDay, getHistory, getStats, getWeaknesses } from "./services/stats";
import { callAi } from "./ai/openai-compatible";

const app = express();
app.use(express.json({ limit: "2mb" }));
app.use(cors({ origin: /^http:\/\/127\.0\.0\.1:\d+$/ }));

const localDate = () => {
  const current = new Date();
  const shifted = new Date(current.getTime() - current.getTimezoneOffset() * 60000);
  return shifted.toISOString().slice(0, 10);
};

let environment = { available: false, version: null as string | null, reason: "正在检测 Java" as string | null };
detectJava().then((result) => { environment = result; }).catch(() => undefined);
createDailyBackup().catch((error) => console.warn("[DATABASE] Backup failed:", redact(String(error))));

const asyncRoute = (handler: (request: Request, response: Response, next: NextFunction) => Promise<unknown>) =>
  (request: Request, response: Response, next: NextFunction) => void handler(request, response, next).catch(next);

const AiCodeReviewSchema = z.object({
  verdict: z.enum(["LIKELY_CORRECT", "NEEDS_CHANGES", "UNCERTAIN"]),
  confidence: z.number().min(0).max(1),
  summary: z.string().min(1).max(1200),
  timeComplexity: z.string().min(1).max(120),
  spaceComplexity: z.string().min(1).max(120),
  evidence: z.array(z.string().max(500)).max(8).default([]),
  risks: z.array(z.string().max(500)).max(8).default([])
});

const parseAiJson = (content: string) => {
  const cleaned = content.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
  return JSON.parse(cleaned);
};

app.get("/api/health", (_request, response) => {
  response.json({
    status: "ok", version: "0.1.0", database: "ready",
    problems: problemStore.report(), java: environment,
    ai: { configured: config.ai.configured, reason: config.ai.statusReason, provider: config.ai.provider }
  });
});

app.get("/api/config", (_request, response) => {
  response.json({
    ...getAppConfig(),
    aiConfigured: config.ai.configured,
    aiStatusReason: config.ai.statusReason,
    aiProvider: config.ai.provider,
    aiBaseUrl: config.ai.baseUrl,
    aiFastModel: config.ai.fastModel,
    aiSmartModel: config.ai.smartModel,
    aiJsonMode: config.ai.jsonMode,
    apiKey: undefined
  });
});
app.patch("/api/config", (request, response) => {
  const schema = z.object({
    cycleDays: z.number().int().min(1).max(40).optional(),
    maxCycleDays: z.number().int().min(35).max(60).optional(),
    weekdayBudget: z.number().int().min(10).max(240).optional(),
    weekendBudget: z.number().int().min(20).max(360).optional(),
    aiMode: z.enum(["LOCAL", "MINIMAL", "BALANCED", "INTENSIVE"]).optional(),
    theme: z.enum(["DARK", "LIGHT"]).optional()
  });
  response.json(patchAppConfig(schema.parse(request.body)));
});

app.get("/api/problems", (_request, response) => {
  const progress = getAllProgress();
  response.json(problemStore.all().map((problem) => ({
    id: problem.id, leetcodeId: problem.leetcodeId, title: problem.title, slug: problem.slug,
    difficulty: problem.difficulty, track: problem.track, importance: problem.importance,
    defaultMode: problem.defaultMode, supportedModes: problem.supportedModes,
    judgeReady: problem.testCases.length >= 4, progress: progress.get(problem.id) ?? null
  })));
});
app.get("/api/problems/:id", (request, response) => {
  const problem = problemStore.get(request.params.id);
  if (!problem) return response.status(404).json({ code: "PROBLEM_NOT_FOUND", message: "题目不存在或题库文件无效" });
  return response.json({ problem, progress: getProgress(problem.id) });
});
app.get("/api/progress", (_request, response) => response.json([...getAllProgress().values()]));

app.post("/api/sessions/start", (request, response) => {
  const body = z.object({ minutes: z.number().int().min(10).max(360).optional(), reviewOnly: z.boolean().optional() }).parse(request.body);
  const date = localDate();
  const existing = getTodaySession(date);
  if (existing) {
    const requestedMinutes = body.minutes ?? existing.plannedMinutes;
    const sameSessionType = !body.reviewOnly || existing.sessionType === "REVIEW_ONLY";
    if (requestedMinutes === existing.plannedMinutes && sameSessionType) {
      return response.json(existing);
    }
    if (!replaceUntouchedSession(existing.id)) {
      return response.status(409).json({
        code: "SESSION_ALREADY_STARTED",
        message: `今天的 ${existing.plannedMinutes} 分钟训练已经开始，不能直接改成 ${requestedMinutes} 分钟。请先完成当前会话。`
      });
    }
  }
  const settings = getAppConfig() as { weekdayBudget: number; weekendBudget: number; cycleDays: number };
  const weekday = new Date(`${date}T12:00:00`).getDay();
  const isWeekend = weekday === 0 || weekday === 6;
  const minutes = body.minutes ?? (isWeekend ? settings.weekendBudget : settings.weekdayBudget);
  const day = calculateDay();
  let tasks = buildDailyPlan({
    date, day, cycleDays: settings.cycleDays, minutes, isWeekend,
    problems: problemStore.all(), progress: getAllProgress()
  });
  if (body.reviewOnly) {
    tasks = tasks.filter((task) => task.taskType.startsWith("REVIEW") || task.taskType === "SUMMARY");
  }
  const sessionType = body.reviewOnly ? "REVIEW_ONLY" : isWeekend ? "WEEKEND" : minutes >= 90 ? "EXTENDED" : "WEEKDAY";
  response.status(201).json(createSession(date, minutes, sessionType, phaseForDay(day), tasks));
});
app.get("/api/sessions/today", (_request, response) => response.json(getTodaySession(localDate())));
app.post("/api/session-tasks/:id/start", (request, response) => {
  const session = activateTask(request.params.id);
  if (!session) return response.status(404).json({ code: "TASK_NOT_FOUND" });
  return response.json(session);
});
app.post("/api/session-tasks/:id/complete", (request, response) => {
  const body = z.object({
    mode: ModeSchema.optional(), localPassed: z.boolean().optional(), highestHintLevel: z.number().int().min(0).max(6).optional(),
    reflection: z.string().max(2000).optional()
  }).parse(request.body);
  const row = db.prepare("SELECT * FROM session_tasks WHERE id=?").get(request.params.id) as {
    problem_id: string | null; task_type: string; target_level: string | null; highest_hint_level: number;
  } | undefined;
  if (!row) return response.status(404).json({ code: "TASK_NOT_FOUND" });
  let achieved: string | null = null;
  if (row.problem_id && row.task_type.startsWith("NEW")) {
    const target = CompletionLevelSchema.parse(row.target_level || "LEARN");
    const result = recordLearningEvent(
      row.problem_id, target, body.mode ?? problemStore.get(row.problem_id)?.defaultMode ?? "FUNCTION",
      Math.max(row.highest_hint_level, body.highestHintLevel ?? 0), Boolean(body.localPassed)
    );
    achieved = result.achieved;
  }
  if (body.reflection) saveNote(row.problem_id, body.reflection);
  const session = completeTask(request.params.id, { achieved, ...body });
  return response.json({ session, achieved });
});
app.post("/api/session-tasks/:id/skip", (request, response) => {
  const body = z.object({ reason: z.string().min(1).max(500).default("用户暂时跳过") }).parse(request.body);
  const session = skipTask(request.params.id, body.reason);
  if (!session) return response.status(404).json({ code: "TASK_NOT_FOUND" });
  return response.json(session);
});

app.get("/api/editor/:problemId/:mode", (request, response) => {
  const problem = problemStore.get(request.params.problemId);
  const mode = ModeSchema.parse(request.params.mode.toUpperCase());
  if (!problem) return response.status(404).json({ code: "PROBLEM_NOT_FOUND" });
  if (!problem.supportedModes.includes(mode)) return response.status(400).json({ code: "MODE_NOT_SUPPORTED" });
  const draft = getDraft(problem.id, mode);
  const content = draft?.content ?? (mode === "ACM" ? problem.acmMode?.mainTemplate : problem.functionMode?.userTemplate) ?? "";
  return response.json({ content, updatedAt: draft?.updatedAt ?? null });
});
app.put("/api/editor/:problemId/:mode", (request, response) => {
  const problem = problemStore.get(request.params.problemId);
  const mode = ModeSchema.parse(request.params.mode.toUpperCase());
  const body = z.object({ content: z.string().max(300000) }).parse(request.body);
  if (!problem) return response.status(404).json({ code: "PROBLEM_NOT_FOUND" });
  if (!problem.supportedModes.includes(mode)) return response.status(400).json({ code: "MODE_NOT_SUPPORTED" });
  response.json({ saved: true, hash: saveDraft(problem.id, mode, body.content) });
});

app.post("/api/judge/:action", asyncRoute(async (request, response) => {
  const action = z.enum(["run", "submit"]).parse(request.params.action);
  const body = z.object({
    problemId: z.string(), mode: ModeSchema, code: z.string().max(300000), taskId: z.string().nullable().optional()
  }).parse(request.body);
  const problem = problemStore.get(body.problemId);
  if (!problem) return response.status(404).json({ code: "PROBLEM_NOT_FOUND" });
  if (!environment.available) return response.status(503).json({
    code: "JAVA_UNAVAILABLE",
    message: environment.reason || "需要完整的 Java 17 JDK（java + javac）才能判题"
  });
  saveDraft(body.problemId, body.mode, body.code, action.toUpperCase());
  const codeSnapshotId = getLatestCodeSnapshotId(body.problemId, body.mode);
  const started = Date.now();
  let result = await judgeJava(problem, body.mode, body.code, action === "run" ? "PUBLIC" : "HIDDEN");
  if (action === "submit" && result.resultType === "UNVERIFIED" && config.ai.configured) {
    try {
      const ai = await callAi("REVIEW", [
        {
          role: "system",
          content: [
            "你是严谨的 Java 算法代码审查器。只返回 JSON。",
            "这不是在线判题：不得声称 Accepted，也不得把缺少本地 Harness 当作用户错误。",
            "必须直接分析给出的代码：识别其算法、用代码中的循环/数据结构推导实际时间和空间复杂度、检查边界和潜在反例。",
            "提出风险前必须按控制流实际走到出错语句，并给出最小反例和具体表达式；无法证明会失败时 risks 返回空数组，禁止猜测。",
            "verdict 只能是 LIKELY_CORRECT、NEEDS_CHANGES、UNCERTAIN；证据不足时必须 UNCERTAIN。",
            "字段：verdict, confidence(0-1), summary, timeComplexity, spaceComplexity, evidence(string[]), risks(string[])。"
          ].join("\n")
        },
        {
          role: "user",
          content: [
            `题目：${problem.title}（LeetCode ${problem.leetcodeId}）`,
            `题意摘要：${problem.statement.summary}`,
            `方法签名：${problem.functionMode?.methodSignature || "未结构化"}`,
            `预期关键观察：${problem.learningCard.keyObservation}`,
            `参考复杂度：时间 ${problem.learningCard.complexity.time}，空间 ${problem.learningCard.complexity.space}`,
            `Java 17 编译结果：${result.compileOutput || "编译通过"}`,
            `用户代码：\n${body.code.slice(0, 20000)}`
          ].join("\n\n")
        }
      ]);
      const review = AiCodeReviewSchema.parse(parseAiJson(ai.content));
      result = {
        ...result,
        resultType: "AI_REVIEWED" as const,
        verification: "AI_REVIEW" as const,
        review,
        compileOutput: "Java 17 编译通过；由于该题暂无本地测试，以下为 AI 静态代码审查，不等同于 LeetCode Accepted。"
      };
    } catch (error) {
      result = {
        ...result,
        compileOutput: "Java 17 编译通过；当前题暂无本地测试。AI 静态审查暂时未返回，正确性仍未验证，可稍后重试 Submit。"
      };
    }
  }
  const codeFailureTypes = new Set(["COMPILE_ERROR", "WRONG_ANSWER", "TIME_LIMIT", "RUNTIME_ERROR", "FORMAT_ERROR"]);
  recordAttempt({
    taskId: body.taskId ?? null, problemId: body.problemId, mode: body.mode, action: action.toUpperCase(),
    resultType: result.resultType, passedCount: result.passedCount, totalCount: result.totalCount,
    durationMs: Date.now() - started, errorType: codeFailureTypes.has(result.resultType) ? result.resultType : undefined,
    codeSnapshotId,
    detail: {
      verification: result.verification,
      review: result.review,
      cases: result.cases.map((item) => ({ id: item.id, passed: item.passed, error: item.error }))
    }
  });
  return response.json(result);
}));

app.post("/api/hints", asyncRoute(async (request, response) => {
  const body = z.object({
    problemId: z.string(), taskId: z.string().nullable().optional(), level: z.number().int().min(1).max(6),
    useAi: z.boolean().optional(), code: z.string().max(300000).optional()
  }).parse(request.body);
  const problem = problemStore.get(body.problemId);
  if (!problem) return response.status(404).json({ code: "PROBLEM_NOT_FOUND" });
  const local = problem.hints.find((hint) => hint.level === body.level)?.content
    ?? (body.level === 6 ? problem.learningCard.plainExplanation : "当前级别暂无额外提示。");
  setHintLevel(body.taskId ?? null, problem.id, body.level, "LOCAL");
  if (!body.useAi || !config.ai.configured || body.level >= 5) return response.json({ content: local, source: "LOCAL", level: body.level });
  try {
    const prohibitions = body.level === 1
      ? "不得说出算法名称、伪代码或代码，80字以内。"
      : body.level === 2 ? "可说明算法名称，但不得给出完整流程或代码，120字以内。" : "只说明核心变量和结构，不给可复制代码。";
    const ai = await callAi("HINT", [
      { role: "system", content: `你是克制且针对当前代码的算法训练教练。当前提示等级 ${body.level}。${prohibitions} 用户代码已经附在消息中，禁止要求用户再次粘贴代码。提示必须点名当前代码里的变量、条件或缺失步骤；不要讨论平台 Harness。` },
      { role: "user", content: `题目：${problem.title}\n题目摘要：${problem.statement.summary}\n预期观察：${problem.learningCard.keyObservation}\n参考复杂度：${problem.learningCard.complexity.time} / ${problem.learningCard.complexity.space}\n本地提示：${local}\n当前用户代码：\n${(body.code || "").slice(0, 6000)}` }
    ]);
    const levelOneLeak = body.level === 1 && /(滑动窗口|动态规划|二分|哈希|单调栈|队列|深度优先|广度优先|DFS|BFS)/i.test(ai.content);
    const codeLeak = body.level <= 3 && /```|public\s+class|for\s*\(|while\s*\(|return\s+[^，。]{8,};/i.test(ai.content);
    if (levelOneLeak || codeLeak) {
      return response.json({ content: local, source: "LOCAL_POLICY_FALLBACK", level: body.level });
    }
    setHintLevel(body.taskId ?? null, problem.id, body.level, "AI");
    return response.json({ content: ai.content, source: "AI", level: body.level, model: ai.model, usage: ai.usage });
  } catch {
    return response.json({ content: local, source: "LOCAL_FALLBACK", level: body.level });
  }
}));

app.post("/api/ai/:action", asyncRoute(async (request, response) => {
  const action = z.enum(["explain", "diagnose"]).parse(request.params.action);
  const body = z.object({ problemId: z.string(), code: z.string().max(300000).optional(), failure: z.unknown().optional() }).parse(request.body);
  const problem = problemStore.get(body.problemId);
  if (!problem) return response.status(404).json({ code: "PROBLEM_NOT_FOUND" });
  const local = action === "explain"
    ? `${problem.learningCard.plainExplanation}\n\n关键观察：${problem.learningCard.keyObservation}\n\n步骤：\n${problem.learningCard.algorithmSteps.map((step, i) => `${i + 1}. ${step}`).join("\n")}`
    : `先根据最近一次运行结果定位错误类型，再检查：${problem.learningCard.pitfalls.join("；")}。`;
  if (!config.ai.configured) return response.json({ content: local, source: "LOCAL" });
  try {
    const task = action === "diagnose" ? "DIAGNOSE" : "EXPLAIN";
    const system = action === "diagnose"
      ? "你是算法代码诊断教练。只返回 JSON，字段为 errorType, lineStart, lineEnd, summary, explanation, nextHint, revealFix, confidence。revealFix 必须为 false，不给完整修复代码。必须诊断给出的真实代码；SYSTEM_ERROR、UNVERIFIED 或缺少 Harness 只是平台信息，不得当作代码错误。"
      : "你是算法代码教练。用户代码已经附上，禁止要求再次粘贴。必须先识别当前实现使用的算法，再结合具体变量、循环和分支分析正确性、边界、实际时间复杂度与空间复杂度。缺少 Harness 不是代码错误，必须忽略这类平台信息并继续做代码级分析。提出风险前必须沿真实控制流证明会执行到错误表达式，并给出最小反例；无法证明时明确无可证风险，禁止猜测。不直接重写完整答案。控制在700字内。";
    const ai = await callAi(task, [
      { role: "system", content: system },
      { role: "user", content: `题目：${problem.title}（LeetCode ${problem.leetcodeId}）\n题意：${problem.statement.summary}\n方法签名：${problem.functionMode?.methodSignature || "未结构化"}\n关键观察：${problem.learningCard.keyObservation}\n参考复杂度：时间 ${problem.learningCard.complexity.time}，空间 ${problem.learningCard.complexity.space}\n当前用户代码：\n${(body.code || "").slice(0, 16000)}\n最近验证信息（其中平台缺口不得视为代码错误）：${JSON.stringify(body.failure || {})}` }
    ]);
    return response.json({ content: ai.content, source: "AI", model: ai.model, usage: ai.usage });
  } catch {
    return response.json({ content: local, source: "LOCAL_FALLBACK" });
  }
}));

app.post("/api/reviews/:taskId/grade", (request, response) => {
  const body = z.object({ problemId: z.string(), reviewType: z.string(), rating: z.number().int().min(1).max(5) }).parse(request.body);
  const row = db.prepare("SELECT highest_hint_level FROM session_tasks WHERE id=?").get(request.params.taskId) as { highest_hint_level: number } | undefined;
  if (!row) return response.status(404).json({ code: "TASK_NOT_FOUND" });
  const progress = recordReview(request.params.taskId, body.problemId, body.reviewType, body.rating, row.highest_hint_level);
  const session = completeTask(request.params.taskId, { rating: body.rating });
  response.json({ progress, session });
});
app.post("/api/official-results", (request, response) => {
  const body = z.object({ problemId: z.string(), result: z.enum(["AC", "WA", "TLE", "RE"]), notes: z.string().max(1000).optional() }).parse(request.body);
  if (!problemStore.get(body.problemId)) return response.status(404).json({ code: "PROBLEM_NOT_FOUND" });
  response.status(201).json(recordOfficialResult(body.problemId, body.result, body.notes));
});
app.post("/api/notes", (request, response) => {
  const body = z.object({ problemId: z.string().nullable().optional(), content: z.string().min(1).max(5000) }).parse(request.body);
  saveNote(body.problemId ?? null, body.content);
  response.status(201).json({ saved: true });
});

app.get("/api/stats", (_request, response) => response.json(getStats({
  javaAvailable: environment.available, javaVersion: environment.version, aiConfigured: config.ai.configured
})));
app.get("/api/weaknesses", (_request, response) => response.json(getWeaknesses()));
app.get("/api/history", (_request, response) => response.json(getHistory()));
app.get("/api/mistakes", (_request, response) => response.json(getHistory().mistakes));
app.get("/api/plan", (_request, response) => {
  const settings = getAppConfig() as { weekdayBudget: number; weekendBudget: number; cycleDays: number };
  const progress = getAllProgress();
  const days = Array.from({ length: 7 }, (_, offset) => {
    const date = new Date();
    date.setDate(date.getDate() + offset);
    const dateText = new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
    const isWeekend = date.getDay() === 0 || date.getDay() === 6;
    const minutes = isWeekend ? settings.weekendBudget : settings.weekdayBudget;
    const tasks = buildDailyPlan({
      date: dateText, day: calculateDay() + offset, cycleDays: settings.cycleDays, minutes, isWeekend,
      problems: problemStore.all(), progress
    });
    const estimatedMinutes = Math.round(tasks.reduce((sum, task) => sum + task.plannedSeconds, 0) / 60);
    const trainingTasks = tasks.filter((task) => task.taskType !== "SUMMARY");
    return {
      date: dateText,
      budgetMinutes: minutes,
      estimatedMinutes,
      trainingTaskCount: trainingTasks.length,
      reviewCount: trainingTasks.filter((task) => task.taskType.startsWith("REVIEW")).length,
      newProblemCount: trainingTasks.filter((task) => task.taskType.startsWith("NEW")).length,
      tasks: tasks.map((task) => {
        const problem = task.problemId ? problemStore.get(task.problemId) : null;
        return {
          type: task.taskType,
          problemId: task.problemId,
          problemTitle: problem?.title ?? null,
          minutes: Math.round(task.plannedSeconds / 60),
          reasons: task.reasons
        };
      })
    };
  });
  response.json(days);
});
app.post("/api/summary", asyncRoute(async (request, response) => {
  const body = z.object({ period: z.enum(["day", "week"]).default("day"), useAi: z.boolean().optional() }).parse(request.body);
  const local = buildSummary(body.period);
  const { analysisContext, ...publicSummary } = local;
  if (!body.useAi || !config.ai.configured) return response.json({ ...publicSummary, source: "LOCAL" });
  try {
    const ai = await callAi("SUMMARY", [
      {
        role: "system",
        content: [
          "你是严谨、具体的算法训练教练。输出中文 Markdown，分为：代码表现、具体问题、下一步；700字以内。",
          "必须逐题阅读 actualCodeSubmissions 中的真实代码，指出代码里实际采用的算法、关键变量/控制流、实际时间复杂度与空间复杂度。",
          "只能依据代码和验证记录下结论：LOCAL_TESTS/PASSED 可称本地测试通过；AI_REVIEW 只能称静态审查；不得声称 LeetCode Accepted。",
          "SYSTEM_ERROR、UNVERIFIED、platformIssueCount 是历史产品能力缺口，不是用户知识错误；最多用一句话注明‘旧记录未形成有效测试证据’，不得把它写成主要问题。",
          "禁止建议检查网络、反馈平台、重试系统错误或强制使用提示。下一步必须围绕具体题目的边界用例、代码实现或算法迁移训练。",
          "Solve/Guided/Learn 都可能是新题训练；Learn=0 不代表没有新知识。SUMMARY 不计入 completedTasks，禁止质疑分类合计。",
          "拒绝空泛建议。每个判断必须引用题目名以及代码中的变量、循环、数据结构或具体验证结果。",
          "声称边界错误前必须按真实控制流证明最小反例会执行到具体错误表达式；如果循环守卫已阻止访问就不得报错。",
          "如果没有足够代码或测试证据，明确写‘证据不足’，不要猜测。"
        ].join("\n")
      },
      { role: "user", content: JSON.stringify(analysisContext) }
    ]);
    return response.json({ ...publicSummary, text: ai.content, source: "AI", model: ai.model });
  } catch {
    return response.json({ ...publicSummary, source: "LOCAL_FALLBACK" });
  }
}));

app.use((error: unknown, _request: Request, response: Response, _next: NextFunction) => {
  const known = error as { code?: string; message?: string; issues?: unknown };
  const isValidation = error instanceof z.ZodError;
  console.error("[APP]", redact(error instanceof Error ? error.stack || error.message : String(error)));
  response.status(isValidation ? 400 : known.code === "JUDGE_BUSY" ? 409 : 500).json({
    code: isValidation ? "INVALID_REQUEST" : known.code || "INTERNAL_ERROR",
    message: isValidation ? "请求参数无效" : known.message || "本地服务出现异常",
    ...(isValidation ? { issues: (error as z.ZodError).issues } : {})
  });
});

const webDist = path.resolve(__dirname, "../../web/dist");
if (fs.existsSync(webDist)) {
  app.use(express.static(webDist));
  app.get("*", (_request, response) => response.sendFile(path.join(webDist, "index.html")));
}

app.listen(config.port, config.host, () => {
  console.log(`[APP] AlgoShell API listening on http://${config.host}:${config.port}`);
  console.log(`[APP] Problems: ${problemStore.report().valid}/100, AI: ${config.ai.configured ? config.ai.provider : "local"}`);
});
