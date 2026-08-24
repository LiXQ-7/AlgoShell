import crypto from "node:crypto";
import https from "node:https";
import { config } from "../config";
import { db } from "../db/database";
import { newId } from "../db/repository";

type AiTask = "HINT" | "EXPLAIN" | "DIAGNOSE" | "SUMMARY" | "REVIEW";

const postJson = (url: URL, body: unknown, timeoutMs: number) =>
  new Promise<{ status: number; body: string }>((resolve, reject) => {
    const payload = JSON.stringify(body);
    const request = https.request({
      protocol: url.protocol, hostname: url.hostname, port: url.port || 443,
      path: url.pathname + url.search, method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Content-Length": Buffer.byteLength(payload),
        Authorization: `Bearer ${config.ai.apiKey}`
      },
      timeout: timeoutMs
    }, (response) => {
      const chunks: Buffer[] = [];
      response.on("data", (chunk: Buffer) => chunks.push(chunk));
      response.on("end", () => resolve({ status: response.statusCode || 500, body: Buffer.concat(chunks).toString("utf8") }));
    });
    request.once("timeout", () => request.destroy(new Error("AI_TIMEOUT")));
    request.once("error", reject);
    request.end(payload);
  });

const chatEndpoint = () => {
  const base = config.ai.baseUrl.endsWith("/") ? config.ai.baseUrl : `${config.ai.baseUrl}/`;
  return new URL("chat/completions", base);
};

export const callAi = async (task: AiTask, messages: Array<{ role: "system" | "user"; content: string }>) => {
  if (!config.ai.configured) {
    throw Object.assign(new Error("AI Provider 未配置，已使用本地内容"), { code: "AI_NOT_CONFIGURED" });
  }
  // Review is latency-sensitive and already constrained by a strict JSON schema.
  // Use the fast model so Submit does not wait on a reasoning-model timeout.
  const smart = task === "DIAGNOSE" || task === "SUMMARY";
  const model = smart ? config.ai.smartModel : config.ai.fastModel;
  const started = Date.now();
  const requestHash = crypto.createHash("sha256").update(JSON.stringify({ task, model, messages })).digest("hex");
  let status = "FAILED";
  let errorCode: string | null = null;
  try {
    const response = await postJson(chatEndpoint(), {
      model, messages, temperature: 0.25,
      ...(config.ai.jsonMode && (task === "DIAGNOSE" || task === "REVIEW")
        ? { response_format: { type: "json_object" } }
        : {})
    }, config.ai.timeoutMs);
    if (response.status >= 400) {
      errorCode = String(response.status);
      throw Object.assign(new Error(`${config.ai.provider} 请求失败 (${response.status})`), { code: `AI_${response.status}` });
    }
    const parsed = JSON.parse(response.body);
    const content = parsed.choices?.[0]?.message?.content;
    if (!content) throw Object.assign(new Error(`${config.ai.provider} 返回空内容`), { code: "AI_EMPTY" });
    status = "SUCCESS";
    return {
      content: String(content),
      model,
      usage: {
        promptTokens: parsed.usage?.prompt_tokens ?? null,
        completionTokens: parsed.usage?.completion_tokens ?? null,
        cacheHitTokens: parsed.usage?.prompt_cache_hit_tokens ?? null
      }
    };
  } catch (error) {
    errorCode = errorCode || (error instanceof Error ? error.message.slice(0, 60) : "UNKNOWN");
    throw error;
  } finally {
    db.prepare(`INSERT INTO ai_call_logs(
      id,task_type,model,prompt_version,status,latency_ms,error_code,request_hash,created_at
    ) VALUES(?,?,?,'v1',?,?,?,?,?)`).run(
      newId(), task, model, status, Date.now() - started, errorCode, requestHash, new Date().toISOString()
    );
  }
};
