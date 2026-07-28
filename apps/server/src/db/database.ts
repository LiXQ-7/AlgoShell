import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";
import { config } from "../config";

const ensureDirectories = () => {
  for (const dir of [
    path.dirname(config.databaseFile),
    config.problemDir,
    config.runDir,
    config.recoveryDir,
    config.backupDir
  ]) fs.mkdirSync(dir, { recursive: true });
};

const migrations = [
  `
  CREATE TABLE IF NOT EXISTS schema_migrations (
    version INTEGER PRIMARY KEY,
    applied_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS app_config (
    key TEXT PRIMARY KEY,
    value_json TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS problem_progress (
    problem_id TEXT PRIMARY KEY,
    status TEXT NOT NULL DEFAULT 'UNSEEN',
    completion_level TEXT NOT NULL DEFAULT 'UNSEEN',
    best_mode TEXT,
    recognition_score INTEGER NOT NULL DEFAULT 0,
    reasoning_score INTEGER NOT NULL DEFAULT 0,
    implementation_score INTEGER NOT NULL DEFAULT 0,
    speed_score INTEGER NOT NULL DEFAULT 0,
    stability_score INTEGER NOT NULL DEFAULT 0,
    mastery_score INTEGER NOT NULL DEFAULT 0,
    review_stage INTEGER NOT NULL DEFAULT 0,
    next_review_at TEXT,
    last_review_at TEXT,
    last_practiced_at TEXT,
    consecutive_review_failures INTEGER NOT NULL DEFAULT 0,
    local_passed INTEGER NOT NULL DEFAULT 0,
    official_best_result TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS training_sessions (
    id TEXT PRIMARY KEY,
    session_date TEXT NOT NULL,
    session_type TEXT NOT NULL,
    planned_minutes INTEGER NOT NULL,
    actual_seconds INTEGER NOT NULL DEFAULT 0,
    status TEXT NOT NULL,
    phase TEXT NOT NULL,
    generated_reason_json TEXT NOT NULL,
    started_at TEXT,
    completed_at TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS session_tasks (
    id TEXT PRIMARY KEY,
    session_id TEXT NOT NULL,
    problem_id TEXT,
    task_type TEXT NOT NULL,
    target_level TEXT,
    review_type TEXT,
    planned_seconds INTEGER NOT NULL,
    actual_seconds INTEGER NOT NULL DEFAULT 0,
    sequence_no INTEGER NOT NULL,
    status TEXT NOT NULL,
    scheduling_score REAL NOT NULL DEFAULT 0,
    scheduling_reason_json TEXT NOT NULL,
    highest_hint_level INTEGER NOT NULL DEFAULT 0,
    result_summary_json TEXT,
    started_at TEXT,
    completed_at TEXT,
    FOREIGN KEY (session_id) REFERENCES training_sessions(id)
  );
  CREATE TABLE IF NOT EXISTS attempts (
    id TEXT PRIMARY KEY,
    session_task_id TEXT,
    problem_id TEXT NOT NULL,
    mode TEXT NOT NULL,
    action TEXT NOT NULL,
    code_snapshot_id TEXT,
    result_type TEXT NOT NULL,
    passed_count INTEGER,
    total_count INTEGER,
    duration_ms INTEGER,
    error_type TEXT,
    failure_detail_json TEXT,
    created_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS code_snapshots (
    id TEXT PRIMARY KEY,
    problem_id TEXT NOT NULL,
    mode TEXT NOT NULL,
    content TEXT NOT NULL,
    content_hash TEXT NOT NULL,
    source TEXT NOT NULL,
    created_at TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_code_problem_mode_time
    ON code_snapshots(problem_id, mode, created_at DESC);
  CREATE TABLE IF NOT EXISTS hint_events (
    id TEXT PRIMARY KEY,
    session_task_id TEXT,
    problem_id TEXT NOT NULL,
    level INTEGER NOT NULL,
    source TEXT NOT NULL,
    prompt_version TEXT,
    response_cache_key TEXT,
    success INTEGER NOT NULL,
    created_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS review_events (
    id TEXT PRIMARY KEY,
    session_task_id TEXT NOT NULL,
    problem_id TEXT NOT NULL,
    review_type TEXT NOT NULL,
    self_rating INTEGER NOT NULL,
    objective_score INTEGER,
    ai_score INTEGER,
    result TEXT NOT NULL,
    score_delta_json TEXT NOT NULL,
    previous_interval_days INTEGER NOT NULL,
    next_interval_days INTEGER NOT NULL,
    next_review_at TEXT NOT NULL,
    created_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS official_results (
    id TEXT PRIMARY KEY,
    problem_id TEXT NOT NULL,
    result TEXT NOT NULL,
    notes TEXT,
    recorded_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS mistake_events (
    id TEXT PRIMARY KEY,
    problem_id TEXT NOT NULL,
    attempt_id TEXT,
    mistake_type TEXT NOT NULL,
    source TEXT NOT NULL,
    note TEXT,
    resolved INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS notes (
    id TEXT PRIMARY KEY,
    problem_id TEXT,
    content TEXT NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS ai_call_logs (
    id TEXT PRIMARY KEY,
    task_type TEXT NOT NULL,
    model TEXT NOT NULL,
    prompt_version TEXT NOT NULL,
    status TEXT NOT NULL,
    prompt_tokens INTEGER,
    completion_tokens INTEGER,
    cache_hit_tokens INTEGER,
    latency_ms INTEGER,
    error_code TEXT,
    request_hash TEXT NOT NULL,
    created_at TEXT NOT NULL
  );
  `
];

ensureDirectories();
export const db = new Database(config.databaseFile);
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");
db.exec(`
  CREATE TABLE IF NOT EXISTS schema_migrations (
    version INTEGER PRIMARY KEY,
    applied_at TEXT NOT NULL
  )
`);

for (let index = 0; index < migrations.length; index += 1) {
  const version = index + 1;
  const applied = db.prepare("SELECT 1 FROM schema_migrations WHERE version = ?").get(version);
  if (!applied) {
    db.transaction(() => {
      db.exec(migrations[index]!);
      db.prepare("INSERT INTO schema_migrations(version, applied_at) VALUES (?, ?)").run(version, new Date().toISOString());
    })();
  }
}

const now = new Date().toISOString();
const defaults: Record<string, unknown> = {
  trainingStartDate: now.slice(0, 10),
  cycleDays: 35,
  maxCycleDays: 40,
  weekdayBudget: 35,
  weekendBudget: 120,
  aiMode: "BALANCED",
  theme: "DARK"
};
const insertConfig = db.prepare(
  "INSERT OR IGNORE INTO app_config(key, value_json, updated_at) VALUES (?, ?, ?)"
);
db.transaction(() => {
  for (const [key, value] of Object.entries(defaults)) {
    insertConfig.run(key, JSON.stringify(value), now);
  }
})();

export const getAppConfig = () => {
  const rows = db.prepare("SELECT key, value_json FROM app_config").all() as Array<{ key: string; value_json: string }>;
  return Object.fromEntries(rows.map((row) => [row.key, JSON.parse(row.value_json)]));
};

export const patchAppConfig = (patch: Record<string, unknown>) => {
  const statement = db.prepare(
    `INSERT INTO app_config(key, value_json, updated_at) VALUES (?, ?, ?)
     ON CONFLICT(key) DO UPDATE SET value_json=excluded.value_json, updated_at=excluded.updated_at`
  );
  db.transaction(() => {
    for (const [key, value] of Object.entries(patch)) {
      if (!["cycleDays", "maxCycleDays", "weekdayBudget", "weekendBudget", "aiMode", "theme"].includes(key)) continue;
      statement.run(key, JSON.stringify(value), new Date().toISOString());
    }
  })();
  return getAppConfig();
};
