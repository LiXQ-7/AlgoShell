import { z } from "zod";

export const CompletionLevelSchema = z.enum(["UNSEEN", "LEARN", "GUIDED", "SOLVE"]);
export const ModeSchema = z.enum(["FUNCTION", "ACM"]);
export const DifficultySchema = z.enum(["EASY", "MEDIUM", "HARD"]);
export const TaskTypeSchema = z.enum([
  "REVIEW_RECALL",
  "REVIEW_SKELETON",
  "REVIEW_BUG_FIX",
  "REVIEW_REBUILD",
  "NEW_SOLVE",
  "NEW_GUIDED",
  "NEW_LEARN",
  "MIXED_CHECK",
  "SUMMARY"
]);

const TestCaseSchema = z.object({
  id: z.string(),
  visibility: z.enum(["PUBLIC", "HIDDEN"]),
  input: z.string(),
  expected: z.string(),
  comparison: z.enum(["EXACT", "TRIM", "TRIM_LINES"]).default("TRIM_LINES"),
  tags: z.array(z.string()).default([])
});

const ModeConfigSchema = z.object({
  userTemplate: z.string().optional(),
  mainTemplate: z.string().optional(),
  className: z.string().optional(),
  methodSignature: z.string().optional(),
  harnessId: z.string().optional(),
  inputDescription: z.string().optional(),
  outputDescription: z.string().optional(),
  publicTests: z.array(z.string()),
  hiddenTests: z.array(z.string()),
  timeLimitMs: z.number().int().positive().default(3000),
  outputLimitBytes: z.number().int().positive().default(1048576)
});

export const ProblemSchema = z.object({
  schemaVersion: z.literal(1),
  id: z.string(),
  leetcodeId: z.number().int().positive(),
  title: z.string(),
  slug: z.string(),
  difficulty: DifficultySchema,
  topics: z.array(z.string()).min(1),
  track: z.string(),
  importance: z.enum(["A", "B", "C"]),
  coverageTarget: z.enum(["SOLVE", "GUIDED", "LEARN"]),
  defaultMode: ModeSchema,
  supportedModes: z.array(ModeSchema).min(1),
  prerequisites: z.array(z.string()).default([]),
  estimatedMinutes: z.object({
    solve: z.number().positive(),
    guided: z.number().positive(),
    learn: z.number().positive(),
    recall: z.number().positive(),
    rebuild: z.number().positive()
  }),
  source: z.object({
    leetcodeUrl: z.string().url(),
    contentPolicy: z.literal("LOCALLY_AUTHORED_SUMMARY")
  }),
  statement: z.object({
    summary: z.string(),
    descriptionMarkdown: z.string(),
    constraints: z.array(z.string()),
    examples: z.array(z.object({
      input: z.string(),
      output: z.string(),
      explanation: z.string().optional()
    })).min(1)
  }),
  functionMode: ModeConfigSchema.optional(),
  acmMode: ModeConfigSchema.optional(),
  testCases: z.array(TestCaseSchema),
  learningCard: z.object({
    plainExplanation: z.string(),
    bruteForce: z.string(),
    keyObservation: z.string(),
    algorithmSteps: z.array(z.string()),
    coreCode: z.string(),
    pitfalls: z.array(z.string()),
    complexity: z.object({ time: z.string(), space: z.string() }),
    relatedProblemIds: z.array(z.string()).default([])
  }),
  hints: z.array(z.object({ level: z.number().int().min(1).max(6), content: z.string() })),
  reviewCards: z.array(z.object({
    id: z.string(),
    type: z.enum(["IDEA_RECALL", "CODE_SKELETON", "BUG_FIX", "FULL_REBUILD"]),
    prompt: z.string(),
    template: z.string().optional(),
    rubric: z.array(z.string()).optional(),
    expectedConcepts: z.array(z.string()).optional()
  })).min(1)
}).superRefine((problem, ctx) => {
  if (problem.supportedModes.includes("ACM") && !problem.acmMode) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: "ACM mode config missing" });
  }
  if (problem.supportedModes.includes("FUNCTION") && !problem.functionMode) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Function mode config missing" });
  }
});

export type CompletionLevel = z.infer<typeof CompletionLevelSchema>;
export type ProblemMode = z.infer<typeof ModeSchema>;
export type TaskType = z.infer<typeof TaskTypeSchema>;
export type Problem = z.infer<typeof ProblemSchema>;

export interface ProblemProgress {
  problemId: string;
  status: string;
  completionLevel: CompletionLevel;
  bestMode: ProblemMode | null;
  recognitionScore: number;
  reasoningScore: number;
  implementationScore: number;
  speedScore: number;
  stabilityScore: number;
  masteryScore: number;
  reviewStage: number;
  nextReviewAt: string | null;
  lastReviewAt: string | null;
  lastPracticedAt: string | null;
  consecutiveReviewFailures: number;
  localPassed: boolean;
  officialBestResult: string | null;
}

export interface SessionTask {
  id: string;
  sessionId: string;
  problemId: string | null;
  taskType: TaskType;
  targetLevel: CompletionLevel | null;
  reviewType: string | null;
  plannedSeconds: number;
  actualSeconds: number;
  sequenceNo: number;
  status: string;
  schedulingScore: number;
  schedulingReason: string[];
  highestHintLevel: number;
  startedAt: string | null;
  completedAt: string | null;
}

export interface TrainingSession {
  id: string;
  sessionDate: string;
  sessionType: string;
  plannedMinutes: number;
  actualSeconds: number;
  status: string;
  phase: string;
  tasks: SessionTask[];
  startedAt: string | null;
  completedAt: string | null;
}

export interface DashboardStats {
  day: number;
  cycleDays: number;
  coverage: number;
  totalProblems: number;
  solve: number;
  guided: number;
  learn: number;
  reviewDebt: number;
  aiMode: string;
  aiConfigured: boolean;
  javaAvailable: boolean;
  javaVersion: string | null;
}

export interface JudgeCaseResult {
  id: string;
  passed: boolean;
  durationMs: number;
  input?: string;
  expected?: string;
  actual?: string;
  error?: string;
}

export interface JudgeResult {
  resultType: "PASSED" | "COMPILE_ERROR" | "WRONG_ANSWER" | "TIME_LIMIT" | "RUNTIME_ERROR" | "FORMAT_ERROR" | "UNVERIFIED" | "AI_REVIEWED" | "SYSTEM_ERROR";
  passedCount: number;
  totalCount: number;
  compileOutput?: string;
  cases: JudgeCaseResult[];
  verification?: "LOCAL_TESTS" | "COMPILE_ONLY" | "AI_REVIEW";
  review?: {
    verdict: "LIKELY_CORRECT" | "NEEDS_CHANGES" | "UNCERTAIN";
    confidence: number;
    summary: string;
    timeComplexity: string;
    spaceComplexity: string;
    evidence: string[];
    risks: string[];
  };
}

export const clampScore = (value: number) => Math.max(0, Math.min(100, Math.round(value)));

export const calculateMastery = (scores: {
  recognition: number;
  reasoning: number;
  implementation: number;
  speed: number;
  stability: number;
}) =>
  clampScore(
    scores.recognition * 0.2 +
      scores.reasoning * 0.25 +
      scores.implementation * 0.3 +
      scores.speed * 0.1 +
      scores.stability * 0.15
  );
