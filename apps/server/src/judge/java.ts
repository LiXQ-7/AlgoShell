import fs from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";
import { Problem, ProblemMode, JudgeResult } from "@algoshell/shared";
import { config } from "../config";

const MAX_CAPTURE = 1024 * 1024;

const javaHome = process.env.JAVA_HOME?.trim();
const javaCommand = (executable: "java" | "javac") => {
  if (!javaHome) return executable;
  const candidate = path.join(javaHome, "bin", process.platform === "win32" ? `${executable}.exe` : executable);
  return fs.existsSync(candidate) ? candidate : executable;
};

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
    fs.mkdirSync(config.runDir, { recursive: true });
    const java = await runProcess(javaCommand("java"), ["-version"], config.runDir, "", 5000);
    const javac = await runProcess(javaCommand("javac"), ["-version"], config.runDir, "", 5000);
    const text = `${java.stdout}\n${java.stderr}\n${javac.stdout}\n${javac.stderr}`;
    const match = text.match(/version "(\d+)[^"]*"/);
    const javacMatch = text.match(/javac\s+(\d+)(?:\.[^\s]+)?/);
    const javaMajor = match ? Number(match[1]) : 0;
    const javacMajor = javacMatch ? Number(javacMatch[1]) : 0;
    const available = java.code === 0 && javac.code === 0 && javaMajor >= 17 && javacMajor >= 17;
    return {
      available,
      version: javaMajor ? `Java ${javaMajor}` : javacMajor ? `Java ${javacMajor}` : null,
      reason: available ? null : javaMajor < 17 || javacMajor < 17 ? "需要完整的 JDK 17 或更高版本（java + javac）" : "未找到可用的 Java JDK"
    };
  } catch {
    return { available: false, version: null, reason: "Java 检测失败" };
  }
};

let running = false;

export const prepareFunctionSource = (code: string) => {
  const imports = code.match(/^\s*import\s+[^;]+;\s*$/gm) ?? [];
  const body = code
    .replace(/^\s*package\s+[^;]+;\s*$/gm, "")
    .replace(/^\s*import\s+[^;]+;\s*$/gm, "")
    .replace(/\bpublic\s+(class|interface|enum|record)\s+([A-Za-z_$][\w$]*)/g, (declaration, kind, name) =>
      name === "Solution" ? declaration : `${kind} ${name}`
    )
    .trimStart();
  const definitions = [
    !/\bclass\s+ListNode\b/.test(body) ? "class ListNode { int val; ListNode next; ListNode() {} ListNode(int val) { this.val = val; } ListNode(int val, ListNode next) { this.val = val; this.next = next; } }" : "",
    !/\bclass\s+TreeNode\b/.test(body) ? "class TreeNode { int val; TreeNode left; TreeNode right; TreeNode() {} TreeNode(int val) { this.val = val; } TreeNode(int val, TreeNode left, TreeNode right) { this.val = val; this.left = left; this.right = right; } }" : "",
    !/\bclass\s+Node\b/.test(body) ? "class Node { int val; Node next; Node random; Node left; Node right; List<Node> neighbors; List<Node> children; Node() {} Node(int val) { this.val = val; } }" : ""
  ].filter(Boolean).join("\n");
  return `import java.io.*;\nimport java.util.*;\n${imports.join("\n")}\n\n${definitions}\n\n${body}`;
};

const functionHarness = (harnessId?: string) => {
  if (harnessId === "TWO_SUM") return `import java.util.*;

public class Main {
    public static void main(String[] args) {
        Scanner scanner = new Scanner(System.in);
        int n = scanner.nextInt();
        int[] nums = new int[n];
        for (int i = 0; i < n; i++) nums[i] = scanner.nextInt();
        int target = scanner.nextInt();
        int[] answer = new Solution().twoSum(nums, target);
        System.out.println(answer[0] + " " + answer[1]);
    }
}
`;
  if (harnessId === "CONTAINER_WATER") return `import java.util.*;

public class Main {
    public static void main(String[] args) {
        Scanner scanner = new Scanner(System.in);
        int n = scanner.nextInt();
        int[] height = new int[n];
        for (int i = 0; i < n; i++) height[i] = scanner.nextInt();
        System.out.println(new Solution().maxArea(height));
    }
}
`;
  if (harnessId === "SYMMETRIC_TREE") return `import java.util.*;

public class Main {
    private static TreeNode build(String[] values) {
        if (values.length == 0 || values[0].equals("null")) return null;
        TreeNode root = new TreeNode(Integer.parseInt(values[0]));
        Queue<TreeNode> queue = new ArrayDeque<>();
        queue.offer(root);
        int index = 1;
        while (!queue.isEmpty() && index < values.length) {
            TreeNode node = queue.poll();
            if (index < values.length && !values[index].equals("null")) {
                node.left = new TreeNode(Integer.parseInt(values[index]));
                queue.offer(node.left);
            }
            index++;
            if (index < values.length && !values[index].equals("null")) {
                node.right = new TreeNode(Integer.parseInt(values[index]));
                queue.offer(node.right);
            }
            index++;
        }
        return root;
    }

    public static void main(String[] args) {
        Scanner scanner = new Scanner(System.in);
        int n = scanner.nextInt();
        String[] values = new String[n];
        for (int i = 0; i < n; i++) values[i] = scanner.next();
        System.out.println(new Solution().isSymmetric(build(values)));
    }
}
`;
  return null;
};

export const judgeJava = async (
  problem: Problem,
  mode: ProblemMode,
  code: string,
  visibility: "PUBLIC" | "HIDDEN"
): Promise<JudgeResult> => {
  if (running) throw Object.assign(new Error("已有判题任务正在运行"), { code: "JUDGE_BUSY" });
  const modeConfig = mode === "ACM" ? problem.acmMode : problem.functionMode;
  if (!modeConfig) throw Object.assign(new Error(`当前题目不支持 ${mode} 模式`), { code: "MODE_NOT_SUPPORTED" });
  const configuredIds = visibility === "PUBLIC" ? modeConfig.publicTests : modeConfig.hiddenTests;
  const selected = problem.testCases.filter((test) => test.visibility === visibility && configuredIds.includes(test.id));
  const harness = mode === "FUNCTION" ? functionHarness(modeConfig.harnessId) : null;
  const canExecute = mode === "ACM" ? selected.length > 0 : Boolean(harness && selected.length > 0);
  running = true;
  const runId = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const runDir = path.join(config.runDir, runId);
  fs.mkdirSync(runDir, { recursive: true });
  try {
    let compileFiles: string[];
    if (mode === "FUNCTION") {
      fs.writeFileSync(path.join(runDir, "Solution.java"), prepareFunctionSource(code), "utf8");
      compileFiles = ["Solution.java"];
      if (harness) {
        fs.writeFileSync(path.join(runDir, "Main.java"), harness, "utf8");
        compileFiles.unshift("Main.java");
      }
    } else {
      fs.writeFileSync(path.join(runDir, "Main.java"), code, "utf8");
      compileFiles = ["Main.java"];
    }
    const compile = await runProcess(
      javaCommand("javac"),
      ["-J-Duser.language=en", "-J-Duser.country=US", "-encoding", "UTF-8", ...compileFiles],
      runDir,
      "",
      8000
    );
    if (compile.timeout || compile.code !== 0) {
      return {
        resultType: "COMPILE_ERROR", passedCount: 0, totalCount: selected.length, cases: [],
        compileOutput: compile.timeout ? "编译超时" : compile.stderr.slice(0, 12000)
      };
    }
    if (!canExecute) {
      return {
        resultType: "UNVERIFIED", passedCount: 0, totalCount: 0, cases: [],
        verification: "COMPILE_ONLY",
        compileOutput: mode === "FUNCTION"
          ? "Java 17 编译通过；该题暂无本地 Function 测试，Submit 将继续进行 AI 代码审查。AI 审查不是 LeetCode Accepted。"
          : "Java 17 编译通过；该题暂无本地测试用例，当前结果仅代表代码可以编译。"
      };
    }
    const cases: JudgeResult["cases"] = [];
    for (const test of selected) {
      const execution = await runProcess(javaCommand("java"), ["-Xmx256m", "-cp", runDir, "Main"], runDir, test.input, modeConfig.timeLimitMs);
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
    return { resultType, passedCount, totalCount: selected.length, cases, verification: "LOCAL_TESTS" };
  } finally {
    running = false;
    try { fs.rmSync(runDir, { recursive: true, force: true }); } catch { /* recovery cleanup can handle this */ }
  }
};
