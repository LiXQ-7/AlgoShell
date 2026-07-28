import fs from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";
import { Problem, ProblemMode, JudgeResult } from "@algoshell/shared";
import { config } from "../config";

const MAX_CAPTURE = 1024 * 1024;

const runProcess = (
  command: string,
  args: string[],
  cwd: string,
  input: string,
  timeoutMs: number
) => new Promise<{ code: number | null; stdout: string; stderr: string; timeout: boolean; overflow: boolean; durationMs: number }>((resolve) => {
  const started = Date.now();
  const child = spawn(command, args, { cwd, shell: false, windowsHide: true });
  let stdout = "";
  let stderr = "";
  let outputBytes = 0;
  let finished = false;
  let overflow = false;
  const finish = (result: { code: number | null; timeout: boolean }) => {
    if (finished) return;
    finished = true;
    clearTimeout(timer);
    resolve({
      ...result, stdout, stderr,
      overflow, durationMs: Date.now() - started
    });
  };
  const append = (current: string, chunk: Buffer) => {
    outputBytes += chunk.length;
    if (outputBytes > MAX_CAPTURE) {
      overflow = true;
      child.kill();
      return current;
    }
    return current + chunk.toString("utf8");
  };
  child.stdout.on("data", (chunk: Buffer) => { stdout = append(stdout, chunk); });
  child.stderr.on("data", (chunk: Buffer) => { stderr = append(stderr, chunk); });
  child.once("error", (error) => {
    stderr = error.message;
    finish({ code: -1, timeout: false });
  });
  child.once("close", (code) => finish({ code, timeout: false }));
  const timer = setTimeout(() => {
    child.kill();
    finish({ code: null, timeout: true });
  }, timeoutMs);
  child.stdin.end(input);
});

const normalize = (value: string, comparison: string) => {
  const lf = value.replace(/\r\n/g, "\n");
  if (comparison === "EXACT") return lf;
  if (comparison === "TRIM") return lf.trim();
  return lf.split("\n").map((line) => line.trimEnd()).join("\n").trim();
};

export const detectJava = async () => {
  try {
    const result = await runProcess("java", ["-version"], config.runDir, "", 3000);
    const text = `${result.stdout}\n${result.stderr}`;
    const match = text.match(/version "(\d+)[^"]*"/);
    const major = match ? Number(match[1]) : 0;
    return { available: result.code === 0 && major >= 17, version: match?.[1] ? `Java ${match[1]}` : null };
  } catch {
    return { available: false, version: null };
  }
};

let running = false;
export const judgeJava = async (
  problem: Problem,
  mode: ProblemMode,
  code: string,
  visibility: "PUBLIC" | "HIDDEN"
): Promise<JudgeResult> => {
  if (running) throw Object.assign(new Error("已有判题任务正在运行"), { code: "JUDGE_BUSY" });
  if (mode === "FUNCTION") {
    return {
      resultType: "SYSTEM_ERROR", passedCount: 0, totalCount: 0, cases: [],
      compileOutput: "该题的 Function Harness 尚未本地化。请在学习后使用“打开 LeetCode”进行官方提交，或切换到题目支持的 ACM 模式。"
    };
  }
  const modeConfig = problem.acmMode;
  if (!modeConfig) throw Object.assign(new Error("当前题不支持 ACM 模式"), { code: "MODE_NOT_SUPPORTED" });
  const selected = problem.testCases.filter((test) => test.visibility === visibility);
  if (!selected.length) {
    return {
      resultType: "SYSTEM_ERROR", passedCount: 0, totalCount: 0, cases: [],
      compileOutput: "当前题尚未配置本地测试，请使用官方题目链接验证。"
    };
  }
  running = true;
  const runId = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const runDir = path.join(config.runDir, runId);
  fs.mkdirSync(runDir, { recursive: true });
  try {
    fs.writeFileSync(path.join(runDir, "Main.java"), code, "utf8");
    const compile = await runProcess("javac", ["-encoding", "UTF-8", "Main.java"], runDir, "", 8000);
    if (compile.timeout || compile.code !== 0) {
      return {
        resultType: "COMPILE_ERROR", passedCount: 0, totalCount: selected.length, cases: [],
        compileOutput: compile.timeout ? "编译超时" : compile.stderr.slice(0, 12000)
      };
    }
    const cases: JudgeResult["cases"] = [];
    for (const test of selected) {
      const execution = await runProcess("java", ["-Xmx256m", "-cp", runDir, "Main"], runDir, test.input, modeConfig.timeLimitMs);
      const base = {
        id: test.id, durationMs: execution.durationMs,
        ...(visibility === "PUBLIC" ? { input: test.input, expected: test.expected, actual: execution.stdout } : {})
      };
      if (execution.timeout) cases.push({ ...base, passed: false, error: "TIME_LIMIT" });
      else if (execution.overflow) cases.push({ ...base, passed: false, error: "OUTPUT_LIMIT" });
      else if (execution.code !== 0) cases.push({ ...base, passed: false, error: execution.stderr.slice(0, 4000) || "RUNTIME_ERROR" });
      else {
        const passed = normalize(execution.stdout, test.comparison) === normalize(test.expected, test.comparison);
        cases.push({ ...base, passed, ...(!passed && visibility === "HIDDEN" ? { error: "WRONG_ANSWER" } : {}) });
      }
      if (!cases[cases.length - 1]!.passed && visibility === "HIDDEN") break;
    }
    const passedCount = cases.filter((item) => item.passed).length;
    const failed = cases.find((item) => !item.passed);
    const resultType = !failed ? "PASSED"
      : failed.error === "TIME_LIMIT" ? "TIME_LIMIT"
        : failed.error === "OUTPUT_LIMIT" ? "RUNTIME_ERROR"
          : failed.error && failed.error !== "WRONG_ANSWER" ? "RUNTIME_ERROR" : "WRONG_ANSWER";
    return { resultType, passedCount, totalCount: selected.length, cases };
  } finally {
    running = false;
    try { fs.rmSync(runDir, { recursive: true, force: true }); } catch { /* recovery cleanup can handle this */ }
  }
};
