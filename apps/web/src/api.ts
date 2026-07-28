import type {
  DashboardStats, JudgeResult, Problem, ProblemMode, ProblemProgress, TrainingSession
} from "@algoshell/shared";

export interface ProblemListItem {
  id: string;
  leetcodeId: number;
  title: string;
  slug: string;
  difficulty: string;
  track: string;
  importance: string;
  defaultMode: ProblemMode;
  supportedModes: ProblemMode[];
  judgeReady: boolean;
  progress: ProblemProgress | null;
}

export interface PlanTaskItem {
  type: string;
  problemId: string | null;
  problemTitle: string | null;
  minutes: number;
  reasons: string[];
}

export interface PlanDay {
  date: string;
  budgetMinutes: number;
  estimatedMinutes: number;
  trainingTaskCount: number;
  reviewCount: number;
  newProblemCount: number;
  tasks: PlanTaskItem[];
}

const request = async <T>(url: string, options?: RequestInit): Promise<T> => {
  const response = await fetch(url, {
    ...options,
    headers: { "Content-Type": "application/json", ...(options?.headers || {}) }
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw Object.assign(new Error(data.message || `请求失败 (${response.status})`), data);
  return data as T;
};

export const withRetry = async <T>(
  operation: () => Promise<T>,
  attempts = 6,
  delayMs = 300
): Promise<T> => {
  let lastError: unknown;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      if (attempt < attempts) {
        await new Promise((resolve) => window.setTimeout(resolve, delayMs));
      }
    }
  }
  throw lastError;
};

export const api = {
  health: () => request<any>("/api/health"),
  stats: () => request<DashboardStats>("/api/stats"),
  problems: () => request<ProblemListItem[]>("/api/problems"),
  problem: (id: string) => request<{ problem: Problem; progress: ProblemProgress }>(`/api/problems/${id}`),
  today: () => request<TrainingSession | null>("/api/sessions/today"),
  start: (minutes?: number, reviewOnly = false) =>
    request<TrainingSession>("/api/sessions/start", { method: "POST", body: JSON.stringify({ minutes, reviewOnly }) }),
  complete: (taskId: string, body: unknown) =>
    request<{ session: TrainingSession; achieved: string | null }>(`/api/session-tasks/${taskId}/complete`, { method: "POST", body: JSON.stringify(body) }),
  skip: (taskId: string, reason: string) =>
    request<TrainingSession>(`/api/session-tasks/${taskId}/skip`, { method: "POST", body: JSON.stringify({ reason }) }),
  draft: (problemId: string, mode: ProblemMode) => request<{ content: string; updatedAt: string | null }>(`/api/editor/${problemId}/${mode}`),
  saveDraft: (problemId: string, mode: ProblemMode, content: string) =>
    request<{ saved: boolean; hash: string }>(`/api/editor/${problemId}/${mode}`, { method: "PUT", body: JSON.stringify({ content }) }),
  judge: (action: "run" | "submit", body: unknown) =>
    request<JudgeResult>(`/api/judge/${action}`, { method: "POST", body: JSON.stringify(body) }),
  hint: (body: unknown) => request<any>("/api/hints", { method: "POST", body: JSON.stringify(body) }),
  ai: (action: "explain" | "diagnose", body: unknown) =>
    request<any>(`/api/ai/${action}`, { method: "POST", body: JSON.stringify(body) }),
  gradeReview: (taskId: string, body: unknown) =>
    request<any>(`/api/reviews/${taskId}/grade`, { method: "POST", body: JSON.stringify(body) }),
  official: (body: unknown) => request<any>("/api/official-results", { method: "POST", body: JSON.stringify(body) }),
  note: (problemId: string | null, content: string) =>
    request<any>("/api/notes", { method: "POST", body: JSON.stringify({ problemId, content }) }),
  weak: () => request<any[]>("/api/weaknesses"),
  history: () => request<any>("/api/history"),
  mistakes: () => request<any[]>("/api/mistakes"),
  plan: () => request<PlanDay[]>("/api/plan"),
  summary: (period: "day" | "week", useAi = true) =>
    request<any>("/api/summary", { method: "POST", body: JSON.stringify({ period, useAi }) }),
  config: () => request<any>("/api/config"),
  patchConfig: (body: unknown) => request<any>("/api/config", { method: "PATCH", body: JSON.stringify(body) })
};
