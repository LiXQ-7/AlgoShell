import { calculateMastery, clampScore, CompletionLevel, ProblemProgress } from "@algoshell/shared";

export interface ScoreDelta {
  recognition: number;
  reasoning: number;
  implementation: number;
  speed: number;
  stability: number;
}

export const eventDelta = (
  event: "LEARN" | "GUIDED" | "SOLVE" | "OFFICIAL_AC" | "FAILED" | "LEVEL_6" | "REVIEW",
  options: { rating?: number; fast?: boolean } = {}
): ScoreDelta => {
  if (event === "LEARN") return { recognition: 8, reasoning: 6, implementation: 0, speed: 2, stability: 2 };
  if (event === "GUIDED") return { recognition: 6, reasoning: 8, implementation: 10, speed: 3, stability: 3 };
  if (event === "SOLVE") return { recognition: 8, reasoning: 10, implementation: 15, speed: options.fast ? 10 : 5, stability: 5 };
  if (event === "OFFICIAL_AC") return { recognition: 2, reasoning: 3, implementation: 8, speed: 2, stability: 4 };
  if (event === "FAILED") return { recognition: 0, reasoning: -3, implementation: -7, speed: -3, stability: -3 };
  if (event === "LEVEL_6") return { recognition: 2, reasoning: 3, implementation: 0, speed: 0, stability: -2 };
  const rating = options.rating ?? 3;
  const byRating: Record<number, ScoreDelta> = {
    1: { recognition: -8, reasoning: -8, implementation: -4, speed: -3, stability: -10 },
    2: { recognition: -2, reasoning: -5, implementation: -4, speed: -2, stability: -6 },
    3: { recognition: 1, reasoning: 2, implementation: 0, speed: 0, stability: 1 },
    4: { recognition: 3, reasoning: 4, implementation: 2, speed: 3, stability: 5 },
    5: { recognition: 4, reasoning: 5, implementation: 2, speed: 5, stability: 8 }
  };
  return byRating[rating] || byRating[3]!;
};

export const applyDelta = (progress: ProblemProgress, delta: ScoreDelta) => {
  const scores = {
    recognition: clampScore(progress.recognitionScore + delta.recognition),
    reasoning: clampScore(progress.reasoningScore + delta.reasoning),
    implementation: clampScore(progress.implementationScore + delta.implementation),
    speed: clampScore(progress.speedScore + delta.speed),
    stability: clampScore(progress.stabilityScore + delta.stability)
  };
  return { ...scores, mastery: calculateMastery(scores) };
};

const rank: Record<CompletionLevel, number> = { UNSEEN: 0, LEARN: 1, GUIDED: 2, SOLVE: 3 };
export const higherLevel = (current: CompletionLevel, next: CompletionLevel) =>
  rank[next] > rank[current] ? next : current;

export const reviewInterval = (
  rating: number,
  currentInterval: number,
  stage: number,
  highestHintLevel: number
) => {
  let days: number;
  if (rating <= 1) days = 1;
  else if (rating === 2) days = 2;
  else if (rating === 3) days = 3;
  else if (rating === 4) days = Math.min(14, Math.max(1, Math.round(currentInterval * 1.5)));
  else days = Math.min(28, Math.max([1, 3, 7, 14, 28][Math.min(stage + 1, 4)]!, currentInterval * 2));
  if (highestHintLevel >= 5) days = Math.min(days, 2);
  return Math.max(1, days);
};
