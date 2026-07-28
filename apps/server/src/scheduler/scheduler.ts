import { CompletionLevel, Problem, ProblemProgress } from "@algoshell/shared";
import { NewTask } from "../db/repository";

export interface SchedulerContext {
  date: string;
  day: number;
  cycleDays: number;
  minutes: number;
  isWeekend: boolean;
  problems: Problem[];
  progress: Map<string, ProblemProgress>;
}

const dayDiff = (from: string, to: string) =>
  Math.floor((Date.parse(`${to.slice(0, 10)}T00:00:00Z`) - Date.parse(`${from.slice(0, 10)}T00:00:00Z`)) / 86400000);

export const phaseForDay = (day: number) => {
  if (day <= 3) return "MODELING";
  if (day <= 24) return "TOPIC_COVERAGE";
  if (day <= 32) return "MIXED_RECOGNITION";
  return "SPRINT";
};

const reviewTypeFor = (progress: ProblemProgress) => {
  if (progress.consecutiveReviewFailures >= 2) return "FULL_REBUILD";
  if (progress.implementationScore + 15 < progress.reasoningScore) return "CODE_SKELETON";
  if (progress.implementationScore < 40) return "BUG_FIX";
  return "IDEA_RECALL";
};

const reviewSeconds = (type: string) => type === "FULL_REBUILD" ? 900 : type === "IDEA_RECALL" ? 180 : 300;

const reviewScore = (problem: Problem, progress: ProblemProgress, date: string) => {
  const overdue = progress.nextReviewAt ? Math.max(0, dayDiff(progress.nextReviewAt, date)) : 0;
  const due = progress.nextReviewAt && progress.nextReviewAt.slice(0, 10) <= date ? Math.min(100, 60 + overdue * 8) : 0;
  const weakness = 100 - Math.min(progress.recognitionScore, progress.reasoningScore, progress.implementationScore);
  const importance = problem.importance === "A" ? 100 : problem.importance === "B" ? 65 : 35;
  const failures = Math.min(100, progress.consecutiveReviewFailures * 15);
  return due * 0.25 + weakness * 0.18 + importance * 0.12 + failures * 0.08;
};

export const buildDailyPlan = (context: SchedulerContext): NewTask[] => {
  const extendedSession = context.isWeekend || context.minutes >= 90;
  const totalBudget = Math.floor(context.minutes * 60 * 1.05);
  const summarySeconds = extendedSession ? 300 : 120;
  let remaining = totalBudget - summarySeconds;
  const tasks: NewTask[] = [];
  const today = context.date;

  const dueReviews = context.problems
    .map((problem) => ({ problem, progress: context.progress.get(problem.id) }))
    .filter((entry): entry is { problem: Problem; progress: ProblemProgress } =>
      Boolean(entry.progress?.nextReviewAt && entry.progress.nextReviewAt.slice(0, 10) <= today))
    .map((entry) => ({ ...entry, score: reviewScore(entry.problem, entry.progress, today), type: reviewTypeFor(entry.progress) }))
    .sort((a, b) => b.score - a.score || a.problem.leetcodeId - b.problem.leetcodeId);

  const debt = dueReviews.filter((entry) => entry.progress.nextReviewAt!.slice(0, 10) < today).length;
  const reviewLimit = extendedSession ? 5 : context.minutes >= 40 ? 2 : 1;
  for (const candidate of dueReviews.slice(0, reviewLimit)) {
    const seconds = reviewSeconds(candidate.type);
    if (seconds > remaining) continue;
    tasks.push({
      problemId: candidate.problem.id,
      taskType: candidate.type === "FULL_REBUILD" ? "REVIEW_REBUILD"
        : candidate.type === "CODE_SKELETON" ? "REVIEW_SKELETON"
          : candidate.type === "BUG_FIX" ? "REVIEW_BUG_FIX" : "REVIEW_RECALL",
      targetLevel: candidate.progress.completionLevel,
      reviewType: candidate.type,
      plannedSeconds: seconds,
      score: candidate.score,
      reasons: [
        candidate.progress.nextReviewAt!.slice(0, 10) < today ? "该题复习已逾期" : "该题今天到期复习",
        `当前掌握度 ${candidate.progress.masteryScore}`,
        candidate.type === "FULL_REBUILD" ? "连续复习失败，升级为完整重建" : `采用 ${candidate.type} 复习`
      ]
    });
    remaining -= seconds;
  }

  const covered = context.progress.size;
  const expectedCovered = Math.min(100, Math.ceil((context.day / context.cycleDays) * 100));
  const gap = Math.max(0, expectedCovered - covered);
  const unseen = context.problems.filter((problem) => !context.progress.has(problem.id) || context.progress.get(problem.id)!.completionLevel === "UNSEEN");
  const desired: CompletionLevel[] = extendedSession
    ? ["SOLVE", "SOLVE", "GUIDED", "LEARN", "LEARN"]
    : context.minutes < 25 ? ["GUIDED"]
      : context.minutes < 32 ? ["GUIDED", "LEARN"]
        : ["SOLVE", "LEARN"];

  if (debt >= 12 && context.day < 38) desired.splice(0, desired.length, "LEARN");
  else if (debt >= 8 && desired.length > 1) desired.splice(1);

  let lastTrack = "";
  let sameTrack = 0;
  for (const requestedLevel of desired) {
    const candidates = unseen
      .filter((problem) => !tasks.some((task) => task.problemId === problem.id))
      .map((problem, order) => {
        const targetMatch = problem.coverageTarget === requestedLevel ? 35 : 0;
        const importance = problem.importance === "A" ? 12 : problem.importance === "B" ? 8 : 4;
        const phaseBoost = context.day >= 33 ? gap * 4 : 0;
        const trackPenalty = problem.track === lastTrack && sameTrack >= 3 ? 100 : 0;
        return { problem, score: 50 + targetMatch + importance + phaseBoost - order * 0.08 - trackPenalty };
      })
      .sort((a, b) => b.score - a.score || a.problem.leetcodeId - b.problem.leetcodeId);
    const chosen = candidates[0];
    if (!chosen) break;
    const estimate = chosen.problem.estimatedMinutes[requestedLevel.toLowerCase() as "solve" | "guided" | "learn"] * 60;
    if (estimate > remaining) continue;
    const runnable = chosen.problem.testCases.length >= 4;
    tasks.push({
      problemId: chosen.problem.id,
      taskType: requestedLevel === "SOLVE" ? "NEW_SOLVE" : requestedLevel === "GUIDED" ? "NEW_GUIDED" : "NEW_LEARN",
      targetLevel: requestedLevel,
      reviewType: null,
      plannedSeconds: estimate,
      score: chosen.score,
      reasons: [
        gap > 0 ? `当前覆盖进度落后计划 ${gap} 题` : "按当前专题顺序推进覆盖",
        `题库目标层级为 ${chosen.problem.coverageTarget}`,
        runnable ? "已配置本地公开与隐藏测试" : "复杂结构题以 Function 学习与官方提交为主"
      ]
    });
    remaining -= estimate;
    if (chosen.problem.track === lastTrack) sameTrack += 1;
    else { lastTrack = chosen.problem.track; sameTrack = 1; }
  }

  if (!tasks.some((task) => task.taskType.startsWith("NEW")) && unseen.length && remaining >= 300) {
    const problem = unseen[0]!;
    tasks.push({
      problemId: problem.id, taskType: "NEW_LEARN", targetLevel: "LEARN", reviewType: null,
      plannedSeconds: Math.min(remaining, problem.estimatedMinutes.learn * 60), score: 45,
      reasons: ["保留短 Learn 任务，避免覆盖完全停滞"]
    });
  }

  tasks.push({
    problemId: null, taskType: "SUMMARY", targetLevel: null, reviewType: null,
    plannedSeconds: summarySeconds, score: 100, reasons: ["固定保留当日事实总结与计划调整"]
  });
  return tasks;
};
