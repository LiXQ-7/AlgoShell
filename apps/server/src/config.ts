import fs from "node:fs";
import path from "node:path";
import dotenv from "dotenv";

export const repoRoot = path.resolve(__dirname, "../../..");
const envFile = path.join(repoRoot, ".env");
const envFileExists = fs.existsSync(envFile);
dotenv.config({ path: envFile });
const aiApiKey = process.env.AI_API_KEY?.trim() || process.env.DEEPSEEK_API_KEY?.trim() || "";
const aiConfigured = Boolean(aiApiKey);
const legacyDeepSeekConfig = Boolean(process.env.DEEPSEEK_API_KEY?.trim());

export const config = {
  host: "127.0.0.1",
  port: Number(process.env.PORT || 3317),
  dataDir: path.join(repoRoot, "data"),
  databaseFile: path.join(repoRoot, "data", "database", "algoshell.db"),
  problemDir: path.join(repoRoot, "data", "problems"),
  runDir: path.join(repoRoot, "workspace", "runs"),
  recoveryDir: path.join(repoRoot, "workspace", "recovery"),
  backupDir: path.join(repoRoot, "data", "backups"),
  ai: {
    configured: aiConfigured,
    statusReason: aiConfigured ? "READY" : envFileExists ? "KEY_EMPTY" : "ENV_FILE_MISSING",
    provider: process.env.AI_PROVIDER?.trim() || (legacyDeepSeekConfig ? "DeepSeek" : "OpenAI-compatible"),
    apiKey: aiApiKey,
    baseUrl: process.env.AI_BASE_URL?.trim() || process.env.DEEPSEEK_BASE_URL?.trim() || "https://api.deepseek.com",
    fastModel: process.env.AI_FAST_MODEL?.trim() || process.env.DEEPSEEK_FAST_MODEL?.trim() || "deepseek-chat",
    smartModel: process.env.AI_SMART_MODEL?.trim() || process.env.DEEPSEEK_SMART_MODEL?.trim() || "deepseek-reasoner",
    timeoutMs: Number(process.env.AI_TIMEOUT_MS || process.env.DEEPSEEK_TIMEOUT_MS || 40000),
    jsonMode: /^(1|true|yes)$/i.test(process.env.AI_JSON_MODE || (legacyDeepSeekConfig ? "true" : "false"))
  }
};

export const redact = (value: string) =>
  value
    .replace(/Bearer\s+[^\s"']+/gi, "Bearer [REDACTED]")
    .replace(/sk-[A-Za-z0-9_-]{8,}/g, "sk-[REDACTED]")
    .replace(/[A-Za-z]:\\[^\s"']+/g, "[LOCAL_PATH]");
