import crypto from "node:crypto";
import { CompletionLevel, ProblemProgress, ProblemMode, SessionTask, TrainingSession } from "@algoshell/shared";
import { db } from "./database";
import { applyDelta, eventDelta, higherLevel, reviewInterval, ScoreDelta } from "../mastery/mastery";

const now = () => new Date().toISOString();
export const newId = () => crypto.randomUUID();

type ProgressRow = {
  problem_id: string; status: string; completion_level: CompletionLevel; best_mode: ProblemMode | null;
  recognition_score: number; reasoning_score: number; implementation_score: number; speed_score: number;
  stability_score: number; mastery_score: number; review_stage: number; next_review_at: string | null;
  last_review_at: string | null; last_practiced_at: string | null; consecutive_review_failures: number;
  local_passed: number; official_best_result: string | null;
};

export const mapProgress = (row: ProgressRow): ProblemProgress => ({
  problemId: row.problem_id, status: row.status, completionLevel: row.completion_level, bestMode: row.best_mode,
  recognitionScore: row.recognition_score, reasoningScore: row.reasoning_score,
  implementationScore: row.implementation_score, speedScore: row.speed_score,
  stabilityScore: row.stability_score, masteryScore: row.mastery_score, reviewStage: row.review_stage,
  nextReviewAt: row.next_review_at, lastReviewAt: row.last_review_at, lastPracticedAt: row.last_practiced_at,
  consecutiveReviewFailures: row.consecutive_review_failures, localPassed: Boolean(row.local_passed),
  officialBestResult: row.official_best_result
});

export const emptyProgress = (problemId: string): ProblemProgress => ({
  problemId, status: "UNSEEN", completionLevel: "UNSEEN", bestMode: null,
  recognitionScore: 0, reasoningScore: 0, implementationScore: 0, speedScore: 0,
  stabilityScore: 0, masteryScore: 0, reviewStage: 0, nextReviewAt: null,
  lastReviewAt: null, lastPracticedAt: null, consecutiveReviewFailures: 0,
  localPassed: false, officialBestResult: null
});

export const getAllProgress = () => {
  const rows = db.prepare("SELECT * FROM problem_progress").all() as ProgressRow[];
  return new Map(rows.map((row) => [row.problem_id, mapProgress(row)]));
};

export const getProgress = (problemId: string) => {
  const row = db.prepare("SELECT * FROM problem_progress WHERE problem_id=?").get(problemId) as ProgressRow | undefined;
  return row ? mapProgress(row) : emptyProgress(problemId);
};

const saveProgress = (progress: ProblemProgress) => {
  const timestamp = now();
  db.prepare(`
    INSERT INTO problem_progress(
      problem_id,status,completion_level,best_mode,recognition_score,reasoning_score,implementation_score,
      speed_score,stability_score,mastery_score,review_stage,next_review_at,last_review_at,last_practiced_at,
      consecutive_review_failures,local_passed,official_best_result,created_at,updated_at
    ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
    ON CONFLICT(problem_id) DO UPDATE SET
      status=excluded.status, completion_level=excluded.completion_level, best_mode=excluded.best_mode,
      recognition_score=excluded.recognition_score, reasoning_score=excluded.reasoning_score,
      implementation_score=excluded.implementation_score, speed_score=excluded.speed_score,
      stability_score=excluded.stability_score, mastery_score=excluded.mastery_score,
      review_stage=excluded.review_stage, next_review_at=excluded.next_review_at,
      last_review_at=excluded.last_review_at, last_practiced_at=excluded.last_practiced_at,
      consecutive_review_failures=excluded.consecutive_review_failures, local_passed=excluded.local_passed,
      official_best_result=excluded.official_best_result, updated_at=excluded.updated_at
  `).run(
    progress.problemId, progress.status, progress.completionLevel, progress.bestMode,
    progress.recognitionScore, progress.reasoningScore, progress.implementationScore,
    progress.speedScore, progress.stabilityScore, progress.masteryScore, progress.reviewStage,
    progress.nextReviewAt, progress.lastReviewAt, progress.lastPracticedAt,
    progress.consecutiveReviewFailures, progress.localPassed ? 1 : 0, progress.officialBestResult,
    timestamp, timestamp
  );
};

export const recordLearningEvent = (
  problemId: string,
  requestedLevel: CompletionLevel,
  mode: ProblemMode,
  highestHintLevel: number,
  localPassed: boolean
) => {
  const current = getProgress(problemId);
  let achieved: CompletionLevel = requestedLevel;
  if (highestHintLevel >= 6) achieved = "LEARN";
  else if (requestedLevel === "SOLVE" && (!localPassed || highestHintLevel > 2)) achieved = highestHintLevel <= 5 ? "GUIDED" : "LEARN";
  else if (requestedLevel === "GUIDED" && !localPassed && highestHintLevel < 3) achieved = "LEARN";
  const scored = applyDelta(current, eventDelta(achieved === "SOLVE" ? "SOLVE" : achieved === "GUIDED" ? "GUIDED" : "LEARN"));
  const nextReview = new Date();
  nextReview.setDate(nextReview.getDate() + 1);
  const updated: ProblemProgress = {
    ...current, status: "COVERED", completionLevel: higherLevel(current.completionLevel, achieved), bestMode: mode,
    recognitionScore: scored.recognition, reasoningScore: scored.reasoning, implementationScore: scored.implementation,
    speedScore: scored.speed, stabilityScore: scored.stability, masteryScore: scored.mastery,
    reviewStage: Math.max(1, current.reviewStage), nextReviewAt: nextReview.toISOString(),
    lastPracticedAt: now(), localPassed: current.localPassed || localPassed
  };
  saveProgress(updated);
  return { progress: updated, achieved };
};

export const recordReview = (taskId: string, problemId: string, reviewType: string, rating: number, highestHintLevel = 0) => {
  const current = getProgress(problemId);
  const previousInterval = current.lastReviewAt && current.nextReviewAt
    ? Math.max(1, Math.round((Date.parse(current.nextReviewAt) - Date.parse(current.lastReviewAt)) / 86400000))
    : [1, 3, 7, 14, 28][Math.min(current.reviewStage, 4)]!;
  const nextDays = reviewInterval(rating, previousInterval, current.reviewStage, highestHintLevel);
  const nextDate = new Date();
  nextDate.setDate(nextDate.getDate() + nextDays);
  const delta = eventDelta("REVIEW", { rating });
  const scored = applyDelta(current, delta);
  const updated: ProblemProgress = {
    ...current, recognitionScore: scored.recognition, reasoningScore: scored.reasoning,
    implementationScore: scored.implementation, speedScore: scored.speed, stabilityScore: scored.stability,
    masteryScore: scored.mastery, reviewStage: rating >= 4 ? Math.min(4, current.reviewStage + 1) : current.reviewStage,
    nextReviewAt: nextDate.toISOString(), lastReviewAt: now(), lastPracticedAt: now(),
    consecutiveReviewFailures: rating <= 2 ? current.consecutiveReviewFailures + 1 : 0
  };
  db.transaction(() => {
    saveProgress(updated);
    db.prepare(`INSERT INTO review_events(
      id,session_task_id,problem_id,review_type,self_rating,objective_score,ai_score,result,score_delta_json,
      previous_interval_days,next_interval_days,next_review_at,created_at
    ) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)`).run(
      newId(), taskId, problemId, reviewType, rating, rating * 20, null, rating >= 3 ? "PASSED" : "FAILED",
      JSON.stringify(delta), previousInterval, nextDays, nextDate.toISOString(), now()
    );
  })();
  return updated;
};

type SessionRow = {
  id: string; session_date: string; session_type: string; planned_minutes: number; actual_seconds: number;
  status: string; phase: string; started_at: string | null; completed_at: string | null;
};
type TaskRow = {
  id: string; session_id: string; problem_id: string | null; task_type: SessionTask["taskType"];
  target_level: CompletionLevel | null; review_type: string | null; planned_seconds: number; actual_seconds: number;
  sequence_no: number; status: string; scheduling_score: number; scheduling_reason_json: string;
  highest_hint_level: number; started_at: string | null; completed_at: string | null;
};

const mapTask = (row: TaskRow): SessionTask => ({
  id: row.id, sessionId: row.session_id, problemId: row.problem_id, taskType: row.task_type,
  targetLevel: row.target_level, reviewType: row.review_type, plannedSeconds: row.planned_seconds,
  actualSeconds: row.actual_seconds, sequenceNo: row.sequence_no, status: row.status,
  schedulingScore: row.scheduling_score, schedulingReason: JSON.parse(row.scheduling_reason_json),
  highestHintLevel: row.highest_hint_level, startedAt: row.started_at, completedAt: row.completed_at
});

export const getSession = (id: string): TrainingSession | null => {
  const session = db.prepare("SELECT * FROM training_sessions WHERE id=?").get(id) as SessionRow | undefined;
  if (!session) return null;
  const taskRows = db.prepare("SELECT * FROM session_tasks WHERE session_id=? ORDER BY sequence_no").all(id) as TaskRow[];
  return {
    id: session.id, sessionDate: session.session_date, sessionType: session.session_type,
    plannedMinutes: session.planned_minutes, actualSeconds: session.actual_seconds, status: session.status,
    phase: session.phase, tasks: taskRows.map(mapTask), startedAt: session.started_at, completedAt: session.completed_at
  };
};

export const getTodaySession = (date: string) => {
  const row = db.prepare(
    "SELECT id FROM training_sessions WHERE session_date=? AND status IN ('PLANNED','ACTIVE','PAUSED') ORDER BY created_at DESC LIMIT 1"
  ).get(date) as { id: string } | undefined;
  return row ? getSession(row.id) : null;
};

export const replaceUntouchedSession = (sessionId: string) => {
  const tasks = db.prepare(
    "SELECT id,status,actual_seconds FROM session_tasks WHERE session_id=?"
  ).all(sessionId) as Array<{ id: string; status: string; actual_seconds: number }>;
  if (!tasks.length) return false;
  const untouchedStatuses = tasks.every((task) =>
    ["PLANNED", "ACTIVE"].includes(task.status) && task.actual_seconds === 0
  );
  if (!untouchedStatuses) return false;

  const taskIds = tasks.map((task) => task.id);
  const placeholders = taskIds.map(() => "?").join(",");
  const attemptCount = (db.prepare(
    `SELECT COUNT(*) AS count FROM attempts WHERE session_task_id IN (${placeholders})`
  ).get(...taskIds) as { count: number }).count;
  const hintCount = (db.prepare(
    `SELECT COUNT(*) AS count FROM hint_events WHERE session_task_id IN (${placeholders})`
  ).get(...taskIds) as { count: number }).count;
  const reviewCount = (db.prepare(
    `SELECT COUNT(*) AS count FROM review_events WHERE session_task_id IN (${placeholders})`
  ).get(...taskIds) as { count: number }).count;
  if (attemptCount > 0 || hintCount > 0 || reviewCount > 0) return false;

  db.transaction(() => {
    db.prepare("DELETE FROM session_tasks WHERE session_id=?").run(sessionId);
    db.prepare("DELETE FROM training_sessions WHERE id=?").run(sessionId);
  })();
  return true;
};

export interface NewTask {
  problemId: string | null;
  taskType: SessionTask["taskType"];
  targetLevel: CompletionLevel | null;
  reviewType: string | null;
  plannedSeconds: number;
  score: number;
  reasons: string[];
}

export const createSession = (date: string, minutes: number, type: string, phase: string, tasks: NewTask[]) => {
  const id = newId();
  const timestamp = now();
  db.transaction(() => {
    db.prepare(`INSERT INTO training_sessions(
      id,session_date,session_type,planned_minutes,status,phase,generated_reason_json,started_at,created_at,updated_at
    ) VALUES(?,?,?,?,?,?,?,?,?,?)`).run(
      id, date, type, minutes, "ACTIVE", phase, JSON.stringify({ generatedBy: "local-v1" }), timestamp, timestamp, timestamp
    );
    const insert = db.prepare(`INSERT INTO session_tasks(
      id,session_id,problem_id,task_type,target_level,review_type,planned_seconds,sequence_no,status,
      scheduling_score,scheduling_reason_json,started_at
    ) VALUES(?,?,?,?,?,?,?,?,?,?,?,?)`);
    tasks.forEach((task, index) => insert.run(
      newId(), id, task.problemId, task.taskType, task.targetLevel, task.reviewType, task.plannedSeconds,
      index + 1, index === 0 ? "ACTIVE" : "PLANNED", task.score, JSON.stringify(task.reasons),
      index === 0 ? timestamp : null
    ));
  })();
  return getSession(id)!;
};

export const activateTask = (taskId: string) => {
  const row = db.prepare("SELECT session_id FROM session_tasks WHERE id=?").get(taskId) as { session_id: string } | undefined;
  if (!row) return null;
  const timestamp = now();
  db.transaction(() => {
    db.prepare("UPDATE session_tasks SET status='ACTIVE', started_at=COALESCE(started_at, ?) WHERE id=?").run(timestamp, taskId);
    db.prepare("UPDATE training_sessions SET status='ACTIVE', updated_at=? WHERE id=?").run(timestamp, row.session_id);
  })();
  return getSession(row.session_id);
};

export const completeTask = (taskId: string, result: unknown) => {
  const task = db.prepare("SELECT * FROM session_tasks WHERE id=?").get(taskId) as TaskRow | undefined;
  if (!task) return null;
  const timestamp = now();
  db.transaction(() => {
    db.prepare("UPDATE session_tasks SET status='COMPLETED', completed_at=?, result_summary_json=? WHERE id=?")
      .run(timestamp, JSON.stringify(result), taskId);
    const next = db.prepare(
      "SELECT id FROM session_tasks WHERE session_id=? AND status='PLANNED' ORDER BY sequence_no LIMIT 1"
    ).get(task.session_id) as { id: string } | undefined;
    if (next) {
      db.prepare("UPDATE session_tasks SET status='ACTIVE', started_at=? WHERE id=?").run(timestamp, next.id);
    } else {
      db.prepare("UPDATE training_sessions SET status='COMPLETED', completed_at=?, updated_at=? WHERE id=?")
        .run(timestamp, timestamp, task.session_id);
    }
  })();
  return getSession(task.session_id);
};

export const skipTask = (taskId: string, reason: string) => {
  const task = db.prepare("SELECT * FROM session_tasks WHERE id=?").get(taskId) as TaskRow | undefined;
  if (!task) return null;
  const timestamp = now();
  db.transaction(() => {
    db.prepare("UPDATE session_tasks SET status='SKIPPED', completed_at=?, result_summary_json=? WHERE id=?")
      .run(timestamp, JSON.stringify({ reason }), taskId);
    const next = db.prepare(
      "SELECT id FROM session_tasks WHERE session_id=? AND status='PLANNED' ORDER BY sequence_no LIMIT 1"
    ).get(task.session_id) as { id: string } | undefined;
    if (next) db.prepare("UPDATE session_tasks SET status='ACTIVE', started_at=? WHERE id=?").run(timestamp, next.id);
    else db.prepare("UPDATE training_sessions SET status='COMPLETED', completed_at=?, updated_at=? WHERE id=?")
      .run(timestamp, timestamp, task.session_id);
  })();
  return getSession(task.session_id);
};

export const setHintLevel = (taskId: string | null, problemId: string, level: number, source: string) => {
  const timestamp = now();
  db.transaction(() => {
    if (taskId) db.prepare("UPDATE session_tasks SET highest_hint_level=MAX(highest_hint_level, ?) WHERE id=?").run(level, taskId);
    db.prepare(`INSERT INTO hint_events(id,session_task_id,problem_id,level,source,prompt_version,success,created_at)
      VALUES(?,?,?,?,?,'local-v1',1,?)`).run(newId(), taskId, problemId, level, source, timestamp);
  })();
};

export const saveDraft = (problemId: string, mode: ProblemMode, content: string, source = "AUTOSAVE") => {
  const hash = crypto.createHash("sha256").update(content).digest("hex");
  const existing = db.prepare(
    "SELECT id FROM code_snapshots WHERE problem_id=? AND mode=? AND content_hash=? ORDER BY created_at DESC LIMIT 1"
  ).get(problemId, mode, hash);
  if (!existing) {
    db.prepare("INSERT INTO code_snapshots(id,problem_id,mode,content,content_hash,source,created_at) VALUES(?,?,?,?,?,?,?)")
      .run(newId(), problemId, mode, content, hash, source, now());
    const stale = db.prepare(
      "SELECT id FROM code_snapshots WHERE problem_id=? AND mode=? ORDER BY created_at DESC LIMIT -1 OFFSET 20"
    ).all(problemId, mode) as Array<{ id: string }>;
    const remove = db.prepare("DELETE FROM code_snapshots WHERE id=?");
    db.transaction(() => stale.forEach((row) => remove.run(row.id)))();
  }
  return hash;
};

export const getDraft = (problemId: string, mode: ProblemMode) => {
  const row = db.prepare(
    "SELECT content, created_at FROM code_snapshots WHERE problem_id=? AND mode=? ORDER BY created_at DESC LIMIT 1"
  ).get(problemId, mode) as { content: string; created_at: string } | undefined;
  return row ? { content: row.content, updatedAt: row.created_at } : null;
};

export const recordAttempt = (input: {
  taskId: string | null; problemId: string; mode: ProblemMode; action: string; resultType: string;
  passedCount: number; totalCount: number; durationMs: number; errorType?: string; detail?: unknown;
}) => {
  const id = newId();
  db.prepare(`INSERT INTO attempts(
    id,session_task_id,problem_id,mode,action,result_type,passed_count,total_count,duration_ms,error_type,failure_detail_json,created_at
  ) VALUES(?,?,?,?,?,?,?,?,?,?,?,?)`).run(
    id, input.taskId, input.problemId, input.mode, input.action, input.resultType, input.passedCount,
    input.totalCount, input.durationMs, input.errorType ?? null, JSON.stringify(input.detail ?? {}), now()
  );
  return id;
};

export const recordOfficialResult = (problemId: string, result: string, notes?: string) => {
  const current = getProgress(problemId);
  const ranked = ["RE", "TLE", "WA", "AC"];
  const best = !current.officialBestResult || ranked.indexOf(result) > ranked.indexOf(current.officialBestResult)
    ? result : current.officialBestResult;
  const timestamp = now();
  db.transaction(() => {
    db.prepare("INSERT INTO official_results(id,problem_id,result,notes,recorded_at) VALUES(?,?,?,?,?)")
      .run(newId(), problemId, result, notes ?? null, timestamp);
    let updated = { ...current, officialBestResult: best };
    if (result === "AC") {
      const score = applyDelta(current, eventDelta("OFFICIAL_AC"));
      updated = {
        ...updated, recognitionScore: score.recognition, reasoningScore: score.reasoning,
        implementationScore: score.implementation, speedScore: score.speed,
        stabilityScore: score.stability, masteryScore: score.mastery
      };
    }
    saveProgress(updated);
  })();
  return getProgress(problemId);
};

export const saveNote = (problemId: string | null, content: string) => {
  const timestamp = now();
  db.prepare("INSERT INTO notes(id,problem_id,content,created_at,updated_at) VALUES(?,?,?,?,?)")
    .run(newId(), problemId, content, timestamp, timestamp);
};
