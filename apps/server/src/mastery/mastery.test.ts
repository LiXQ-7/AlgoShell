import { describe, expect, it } from "vitest";
import { emptyProgress } from "../db/repository";
import { applyDelta, eventDelta, higherLevel, reviewInterval } from "./mastery";

describe("mastery model", () => {
  it("keeps unseen when proposed level is unseen", () => {
    expect(higherLevel("UNSEEN", "UNSEEN")).toBe("UNSEEN");
  });
  it("upgrades learn to guided", () => {
    expect(higherLevel("LEARN", "GUIDED")).toBe("GUIDED");
  });
  it("never downgrades solve", () => {
    expect(higherLevel("SOLVE", "LEARN")).toBe("SOLVE");
  });
  it("learn improves recognition without implementation", () => {
    const delta = eventDelta("LEARN");
    expect(delta.recognition).toBeGreaterThan(0);
    expect(delta.implementation).toBe(0);
  });
  it("solve gives the strongest implementation gain", () => {
    expect(eventDelta("SOLVE").implementation).toBeGreaterThan(eventDelta("GUIDED").implementation);
  });
  it("level 6 does not improve implementation", () => {
    expect(eventDelta("LEVEL_6").implementation).toBe(0);
  });
  it("scores are clamped at zero", () => {
    const progress = { ...emptyProgress("p"), recognitionScore: 2 };
    expect(applyDelta(progress, eventDelta("REVIEW", { rating: 1 })).recognition).toBe(0);
  });
  it("scores are clamped at one hundred", () => {
    const progress = {
      ...emptyProgress("p"), recognitionScore: 99, reasoningScore: 99,
      implementationScore: 99, speedScore: 99, stabilityScore: 99
    };
    expect(applyDelta(progress, eventDelta("SOLVE")).mastery).toBe(100);
  });
});

describe("review interval", () => {
  it("rating 1 returns tomorrow", () => expect(reviewInterval(1, 14, 4, 0)).toBe(1));
  it("rating 2 returns in two days", () => expect(reviewInterval(2, 14, 4, 0)).toBe(2));
  it("rating 3 returns in three days", () => expect(reviewInterval(3, 14, 4, 0)).toBe(3));
  it("rating 4 multiplies by 1.5", () => expect(reviewInterval(4, 4, 2, 0)).toBe(6));
  it("rating 4 caps at fourteen", () => expect(reviewInterval(4, 20, 4, 0)).toBe(14));
  it("rating 5 grows toward stage sequence", () => expect(reviewInterval(5, 1, 1, 0)).toBeGreaterThanOrEqual(7));
  it("rating 5 caps at twenty eight", () => expect(reviewInterval(5, 28, 4, 0)).toBe(28));
  it("high assistance caps interval at two", () => expect(reviewInterval(5, 28, 4, 5)).toBe(2));
});
