import { describe, expect, it } from "vitest";
import type { ProblemProgress } from "@algoshell/shared";
import { emptyProgress } from "../db/repository";
import { problemStore } from "../problems/store";
import { buildDailyPlan, phaseForDay } from "./scheduler";

const problems = problemStore.all();
const context = (overrides: Partial<Parameters<typeof buildDailyPlan>[0]> = {}) => ({
  date: "2026-07-28",
  day: 1,
  cycleDays: 35,
  minutes: 35,
  isWeekend: false,
  problems,
  progress: new Map<string, ProblemProgress>(),
  ...overrides
});

describe("scheduler phases", () => {
  it("uses modeling through day 3", () => expect(phaseForDay(3)).toBe("MODELING"));
  it("starts coverage on day 4", () => expect(phaseForDay(4)).toBe("TOPIC_COVERAGE"));
  it("uses mixed recognition on day 25", () => expect(phaseForDay(25)).toBe("MIXED_RECOGNITION"));
  it("uses sprint after day 32", () => expect(phaseForDay(33)).toBe("SPRINT"));
});

describe("daily plan", () => {
  it("always reserves a summary", () => {
    expect(buildDailyPlan(context()).at(-1)?.taskType).toBe("SUMMARY");
  });
  it("fits a weekday inside 105 percent", () => {
    const plan = buildDailyPlan(context());
    expect(plan.reduce((sum, task) => sum + task.plannedSeconds, 0)).toBeLessThanOrEqual(35 * 60 * 1.05);
  });
  it("fits a weekend inside 105 percent", () => {
    const plan = buildDailyPlan(context({ minutes: 120, isWeekend: true }));
    expect(plan.reduce((sum, task) => sum + task.plannedSeconds, 0)).toBeLessThanOrEqual(120 * 60 * 1.05);
  });
  it("keeps at least one new task when no debt exists", () => {
    expect(buildDailyPlan(context()).some((task) => task.taskType.startsWith("NEW"))).toBe(true);
  });
  it("creates more tasks on the weekend", () => {
    expect(buildDailyPlan(context({ minutes: 120, isWeekend: true })).length).toBeGreaterThan(buildDailyPlan(context()).length);
  });
  it("uses the extended template for a 120 minute weekday session", () => {
    const shortPlan = buildDailyPlan(context({ minutes: 35, isWeekend: false }));
    const longPlan = buildDailyPlan(context({ minutes: 120, isWeekend: false }));
    expect(longPlan.length).toBeGreaterThan(shortPlan.length);
    expect(longPlan.filter((task) => task.taskType.startsWith("NEW")).length).toBe(5);
    expect(longPlan.at(-1)?.plannedSeconds).toBe(300);
  });
  it("puts a due review ahead of new work", () => {
    const due = {
      ...emptyProgress(problems[0]!.id), completionLevel: "GUIDED" as const,
      nextReviewAt: "2026-07-27T00:00:00.000Z", masteryScore: 30
    };
    const plan = buildDailyPlan(context({ progress: new Map([[problems[0]!.id, due]]) }));
    expect(plan[0]?.taskType.startsWith("REVIEW")).toBe(true);
  });
  it("uses full rebuild after two review failures", () => {
    const due = {
      ...emptyProgress(problems[0]!.id), completionLevel: "GUIDED" as const,
      nextReviewAt: "2026-07-27T00:00:00.000Z", consecutiveReviewFailures: 2
    };
    const plan = buildDailyPlan(context({ progress: new Map([[problems[0]!.id, due]]), minutes: 40 }));
    expect(plan[0]?.taskType).toBe("REVIEW_REBUILD");
  });
  it("uses skeleton when implementation trails reasoning", () => {
    const due = {
      ...emptyProgress(problems[0]!.id), completionLevel: "GUIDED" as const,
      nextReviewAt: "2026-07-28T00:00:00.000Z", reasoningScore: 70, implementationScore: 20
    };
    const plan = buildDailyPlan(context({ progress: new Map([[problems[0]!.id, due]]) }));
    expect(plan[0]?.taskType).toBe("REVIEW_SKELETON");
  });
  it("uses no duplicate problem in a day", () => {
    const ids = buildDailyPlan(context({ minutes: 120, isWeekend: true })).map((task) => task.problemId).filter(Boolean);
    expect(new Set(ids).size).toBe(ids.length);
  });
  it("generates deterministic plans for fixed input", () => {
    expect(buildDailyPlan(context())).toEqual(buildDailyPlan(context()));
  });
  it("reduces new work at high review debt", () => {
    const progress = new Map<string, ProblemProgress>();
    for (const problem of problems.slice(0, 12)) {
      progress.set(problem.id, {
        ...emptyProgress(problem.id), completionLevel: "LEARN",
        nextReviewAt: "2026-07-20T00:00:00.000Z"
      });
    }
    const plan = buildDailyPlan(context({ progress }));
    expect(plan.filter((task) => task.taskType.startsWith("NEW")).length).toBeLessThanOrEqual(1);
  });
  it("uses a short plan for twenty minutes", () => {
    const plan = buildDailyPlan(context({ minutes: 20 }));
    expect(plan.reduce((sum, task) => sum + task.plannedSeconds, 0)).toBeLessThanOrEqual(21 * 60);
  });
}
);
