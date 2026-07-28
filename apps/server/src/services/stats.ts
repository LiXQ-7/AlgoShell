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
  const attempts = db.prepare("SELECT * FROM attempts WHERE created_at>=?").all(since) as Array<{ result_type: string; error_type: string | null }>;
  const completed = tasks.filter((task) => task.status === "COMPLETED");
  const counts = {
    solve: completed.filter((task) => task.task_type === "NEW_SOLVE").length,
    guided: completed.filter((task) => task.task_type === "NEW_GUIDED").length,
    learn: completed.filter((task) => task.task_type === "NEW_LEARN").length,
    reviews: completed.filter((task) => task.task_type.startsWith("REVIEW")).length
  };
  const errors = attempts.filter((attempt) => attempt.result_type !== "PASSED").map((attempt) => attempt.error_type).filter(Boolean);
  const topError = errors.length ? [...new Set(errors)].sort((a, b) => errors.filter((x) => x === b).length - errors.filter((x) => x === a).length)[0] : null;
  const avgHint = completed.length ? completed.reduce((sum, task) => sum + task.highest_hint_level, 0) / completed.length : 0;
  return {
    period, sessions: sessions.length, completedTasks: completed.length, ...counts,
    attempts: attempts.length, topError, averageHintLevel: Number(avgHint.toFixed(1)),
    text: `本${period === "week" ? "周" : "日"}完成 ${completed.length} 个任务：Solve ${counts.solve}、Guided ${counts.guided}、Learn ${counts.learn}、复习 ${counts.reviews}。${topError ? `最高频错误为 ${topError}。` : "当前没有已记录的判题错误。"}平均最高提示等级 ${avgHint.toFixed(1)}。`
  };
};
