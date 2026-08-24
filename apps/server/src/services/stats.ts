import { DashboardStats, ProblemProgress } from "@algoshell/shared";
import { db, getAppConfig } from "../db/database";
import { getAllProgress } from "../db/repository";
import { problemStore } from "../problems/store";

const dateOnly = () => new Date().toISOString().slice(0, 10);
export const calculateDay = () => {
  const app = getAppConfig() as { trainingStartDate: string; cycleDays: number };
  const start = Date.parse(`${app.trainingStartDate}T00:00:00Z`);
  const current = Date.parse(`${dateOnly()}T00:00:00Z`);
  return Math.max(1, Math.floor((current - start) / 86400000) + 1);
};

export const getStats = (environment: { javaAvailable: boolean; javaVersion: string | null; aiConfigured: boolean }): DashboardStats => {
  const app = getAppConfig() as { cycleDays: number; aiMode: string };
  const progress = [...getAllProgress().values()];
  const count = (level: string) => progress.filter((item) => item.completionLevel === level).length;
  const today = dateOnly();
  return {
    day: calculateDay(), cycleDays: app.cycleDays, coverage: progress.filter((item) => item.completionLevel !== "UNSEEN").length,
    totalProblems: problemStore.all().length, solve: count("SOLVE"), guided: count("GUIDED"), learn: count("LEARN"),
    reviewDebt: progress.filter((item) => item.nextReviewAt && item.nextReviewAt.slice(0, 10) < today).length,
    aiMode: environment.aiConfigured ? app.aiMode : "LOCAL", aiConfigured: environment.aiConfigured,
    javaAvailable: environment.javaAvailable, javaVersion: environment.javaVersion
  };
};

export const getWeaknesses = () => {
  const progress = getAllProgress();
  const groups = new Map<string, ProblemProgress[]>();
  for (const problem of problemStore.all()) {
    const item = progress.get(problem.id);
    if (!item) continue;
    const list = groups.get(problem.track) ?? [];
    list.push(item);
    groups.set(problem.track, list);
  }
  return [...groups.entries()].map(([track, items]) => {
    const average = (field: keyof ProblemProgress) =>
      Math.round(items.reduce((sum, item) => sum + Number(item[field]), 0) / items.length);
    const reasoning = average("reasoningScore");
    const implementation = average("implementationScore");
    return {
      track, count: items.length, mastery: average("masteryScore"), reasoning, implementation,
      gap: reasoning - implementation,
      conclusion: reasoning - implementation >= 15
        ? "思路理解领先于代码实现，建议安排 Code Skeleton 和 Full Rebuild。"
        : average("masteryScore") < 45 ? "当前掌握较脆弱，建议增加主动回忆和短周期复习。" : "当前表现相对稳定。"
    };
  }).sort((a, b) => a.mastery - b.mastery);
};

export const getHistory = () => {
  const sessions = db.prepare(
    "SELECT id,session_date,session_type,planned_minutes,actual_seconds,status,phase,started_at,completed_at FROM training_sessions ORDER BY created_at DESC LIMIT 50"
  ).all();
  const attempts = db.prepare(
    "SELECT problem_id,mode,action,result_type,passed_count,total_count,duration_ms,error_type,created_at FROM attempts ORDER BY created_at DESC LIMIT 100"
  ).all();
  const mistakes = db.prepare(
    "SELECT problem_id,mistake_type,source,note,resolved,created_at FROM mistake_events ORDER BY created_at DESC LIMIT 100"
  ).all();
  return { sessions, attempts, mistakes };
};

export const buildSummary = (period: "day" | "week") => {
  const days = period === "week" ? 7 : 1;
  const since = new Date(Date.now() - days * 86400000).toISOString();
  const sessions = db.prepare("SELECT * FROM training_sessions WHERE created_at>=?").all(since) as Array<{ status: string }>;
  const tasks = db.prepare("SELECT * FROM session_tasks WHERE completed_at>=?").all(since) as Array<{ task_type: string; status: string; highest_hint_level: number }>;
  const attempts = db.prepare(`
    SELECT a.*,
      COALESCE(cs.content, (
        SELECT fallback.content FROM code_snapshots fallback
        WHERE fallback.problem_id=a.problem_id AND fallback.mode=a.mode AND fallback.created_at<=a.created_at
        ORDER BY fallback.created_at DESC LIMIT 1
      )) AS code_content
    FROM attempts a
    LEFT JOIN code_snapshots cs ON cs.id=a.code_snapshot_id
    WHERE a.created_at>=?
    ORDER BY a.created_at DESC
  `).all(since) as Array<{
    problem_id: string; mode: string; action: string; result_type: string; error_type: string | null;
    passed_count: number; total_count: number; failure_detail_json: string | null; code_content: string | null; created_at: string;
  }>;
  const completed = tasks.filter((task) => task.status === "COMPLETED" && task.task_type !== "SUMMARY");
  const completedSummaries = tasks.filter((task) => task.status === "COMPLETED" && task.task_type === "SUMMARY").length;
  const counts = {
    solve: completed.filter((task) => task.task_type === "NEW_SOLVE").length,
    guided: completed.filter((task) => task.task_type === "NEW_GUIDED").length,
    learn: completed.filter((task) => task.task_type === "NEW_LEARN").length,
    reviews: completed.filter((task) => task.task_type.startsWith("REVIEW")).length
  };
  const codeFailureTypes = new Set(["COMPILE_ERROR", "WRONG_ANSWER", "TIME_LIMIT", "RUNTIME_ERROR", "FORMAT_ERROR"]);
  const errors = attempts.filter((attempt) => codeFailureTypes.has(attempt.result_type)).map((attempt) => attempt.error_type).filter(Boolean);
  const topError = errors.length ? [...new Set(errors)].sort((a, b) => errors.filter((x) => x === b).length - errors.filter((x) => x === a).length)[0] : null;
  const avgHint = completed.length ? completed.reduce((sum, task) => sum + task.highest_hint_level, 0) / completed.length : 0;
  const latestByProblem = new Map<string, typeof attempts[number]>();
  for (const attempt of attempts) if (!latestByProblem.has(attempt.problem_id)) latestByProblem.set(attempt.problem_id, attempt);
  const codeReviews = [...latestByProblem.values()].slice(0, 6).map((attempt) => {
    const problem = problemStore.get(attempt.problem_id);
    let detail: { verification?: string; review?: unknown } = {};
    try { detail = JSON.parse(attempt.failure_detail_json || "{}"); } catch { /* keep empty detail */ }
    return {
      problemId: attempt.problem_id,
      title: problem?.title ?? attempt.problem_id,
      mode: attempt.mode,
      action: attempt.action,
      resultType: attempt.result_type,
      verification: detail.verification ?? (attempt.result_type === "PASSED" ? "LOCAL_TESTS" : "UNKNOWN"),
      passed: `${attempt.passed_count ?? 0}/${attempt.total_count ?? 0}`,
      expectedComplexity: problem?.learningCard.complexity ?? null,
      expectedObservation: problem?.learningCard.keyObservation ?? null,
      methodSignature: problem?.functionMode?.methodSignature ?? null,
      priorAiReview: detail.review ?? null,
      code: (attempt.code_content || "").slice(0, 6000)
    };
  });
  const platformIssueCount = attempts.filter((attempt) => attempt.result_type === "SYSTEM_ERROR" || attempt.result_type === "UNVERIFIED").length;
  const locallyPassedCount = attempts.filter((attempt) => attempt.result_type === "PASSED").length;
  const aiReviewedCount = attempts.filter((attempt) => attempt.result_type === "AI_REVIEWED").length;
  const practicedNames = codeReviews.map((item) => item.title);
  return {
    period, sessions: sessions.length, completedTasks: completed.length, completedSummaries, ...counts,
    newCoverageTasks: counts.solve + counts.guided + counts.learn,
    attempts: attempts.length, locallyPassedCount, aiReviewedCount, platformIssueCount,
    topError, averageHintLevel: Number(avgHint.toFixed(1)), practicedProblems: practicedNames,
    text: `本${period === "week" ? "周" : "日"}完成 ${completed.length} 个有效训练任务：Solve ${counts.solve}、Guided ${counts.guided}、Learn ${counts.learn}、复习 ${counts.reviews}。${practicedNames.length ? `涉及题目：${practicedNames.join("、")}。` : "尚无可分析的代码提交。"}${topError ? `真实代码错误最高频为 ${topError}。` : "当前没有已记录的代码错误。"}${platformIssueCount ? `另有 ${platformIssueCount} 次平台能力缺口，已与用户代码错误分开。` : ""}`,
    analysisContext: {
      taskCounts: { ...counts, completedTasks: completed.length, completedSummaries },
      attemptCounts: { total: attempts.length, locallyPassedCount, aiReviewedCount, platformIssueCount },
      averageHintLevel: Number(avgHint.toFixed(1)),
      actualCodeSubmissions: codeReviews
    }
  };
};
