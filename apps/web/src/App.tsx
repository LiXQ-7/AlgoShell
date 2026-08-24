import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";
import Editor from "@monaco-editor/react";
import type { BeforeMount, OnMount } from "@monaco-editor/react";
import {
  Bot, Braces, Check, ChevronDown, CircleDot, Clock3, Code2, Gauge, Lightbulb, Loader2,
  Play, RotateCcw, Send, Sparkles, Wifi, WifiOff
} from "lucide-react";
import type {
  DashboardStats, JudgeResult, Problem, ProblemMode, ProblemProgress, SessionTask, TrainingSession
} from "@algoshell/shared";
import { api, PlanDay, ProblemListItem, withRetry } from "./api";
import { AiSetupView } from "./AiSetupView";
import { OutputPanel, OutputTab } from "./OutputPanel";
import { PlanView } from "./PlanView";
import { ProblemPane } from "./ProblemPane";
import { TerminalLine, TerminalPanel } from "./Terminal";

type View =
  | { type: "problem" }
  | { type: "data"; title: string; subtitle: string; data: unknown }
  | { type: "plan"; days: PlanDay[] }
  | { type: "ai-setup"; config: any }
  | { type: "welcome" };

const helpText = `Commands
  start [minutes]       start or continue today's session
  today                 show today's plan
  review                create a review-only session
  practice <topic>      open a topic problem for extra practice
  run / submit          run public / hidden local tests
  hint [1-6]            reveal the next or selected hint
  explain / diagnose    open learning card / diagnose last failure
  mode [function|acm]   inspect or switch coding mode
  skip                  skip the active task
  result <ac|wa|tle|re> record the official LeetCode result
  open                  open the official problem page
  note <text>           save a note for the current problem
  stats / weak          inspect progress and weaknesses
  history / mistakes    inspect training records
  templates [topic]     show an algorithm template
  plan                  preview the next seven days
  summary [day|week]    generate a factual training summary
  config / config ai    inspect local or AI configuration
  clear / help          clear the terminal / show this help`;

const templates: Record<string, string> = {
  window: `Sliding Window
Signal: contiguous interval + condition can be restored by moving a boundary.
State: left, right, frequency map / count.
Invariant: the current window is legal.

for (int right = 0; right < n; right++) {
    add(right);
    while (!valid()) remove(left++);
    updateAnswer(left, right);
}`,
  dp: `Dynamic Programming
1. Define exactly what dp[i] means.
2. Identify the final decision that reaches state i.
3. Write the transition before optimizing space.
4. Confirm initialization and traversal order.
5. Test the smallest legal input.`,
  tree: `Tree DFS
Return value: what information does a subtree provide to its parent?
Global value: what answer may be formed through the current node?

Result dfs(Node node) {
    if (node == null) return base;
    Result left = dfs(node.left);
    Result right = dfs(node.right);
    return combine(node, left, right);
}`,
  list: `Linked List
Before changing a pointer, save the next node.
Draw prev / current / next for one iteration.
Check: empty list, one node, head replacement, tail termination.`,
  binary: `Binary Search (left closed, right open)
int left = 0, right = n;
while (left < right) {
    int mid = left + (right - left) / 2;
    if (check(mid)) right = mid;
    else left = mid + 1;
}
return left;`
};

const storedShare = (key: string, fallback: number, minimum: number, maximum: number) => {
  const parsed = Number(localStorage.getItem(key));
  return Number.isFinite(parsed) && parsed > 0 ? Math.min(maximum, Math.max(minimum, parsed)) : fallback;
};

let lineCounter = 0;
const line = (kind: TerminalLine["kind"], text: string): TerminalLine => ({ id: ++lineCounter, kind, text });

let javaCompletionRegistered = false;
const configureJavaLanguage: BeforeMount = (monaco) => {
  if (javaCompletionRegistered) return;
  javaCompletionRegistered = true;

  const keywords = [
    "public", "private", "protected", "class", "static", "final", "void", "int", "long", "double",
    "boolean", "char", "String", "return", "if", "else", "for", "while", "switch", "case", "break",
    "continue", "new", "null", "true", "false", "try", "catch", "throw", "throws", "extends", "implements"
  ];
  const classes = [
    "Arrays", "Collections", "List", "ArrayList", "LinkedList", "Map", "HashMap", "TreeMap", "Set",
    "HashSet", "TreeSet", "Queue", "Deque", "ArrayDeque", "PriorityQueue", "StringBuilder", "Math", "Integer"
  ];
  const snippets: Array<[string, string, string]> = [
    ["fori", "for (int ${1:i} = 0; ${1:i} < ${2:n}; ${1:i}++) {\n\t${0}\n}", "Index-based for loop"],
    ["foreach", "for (${1:int} ${2:value} : ${3:values}) {\n\t${0}\n}", "Enhanced for loop"],
    ["while", "while (${1:condition}) {\n\t${0}\n}", "While loop"],
    ["main", "public static void main(String[] args) throws Exception {\n\t${0}\n}", "Java entry point"],
    ["solution", "class Solution {\n\tpublic ${1:int} ${2:solve}(${3}) {\n\t\t${0}\n\t}\n}", "LeetCode Solution class"],
    ["hashmap", "Map<${1:Integer}, ${2:Integer}> ${3:map} = new HashMap<>();", "HashMap declaration"],
    ["hashset", "Set<${1:Integer}> ${2:set} = new HashSet<>();", "HashSet declaration"],
    ["deque", "Deque<${1:Integer}> ${2:queue} = new ArrayDeque<>();", "Deque / BFS queue"],
    ["heap", "PriorityQueue<${1:Integer}> ${2:heap} = new PriorityQueue<>();", "Min heap"],
    ["computeIfAbsent", "${1:map}.computeIfAbsent(${2:key}, k -> new ArrayList<>()).add(${3:value});", "Create a list and append"],
    ["binarySearch", "int left = 0, right = ${1:n};\nwhile (left < right) {\n\tint mid = left + (right - left) / 2;\n\tif (${2:check(mid)}) right = mid;\n\telse left = mid + 1;\n}\n${0}", "Left-closed, right-open binary search"]
  ];
  const members: Array<[string, string, string]> = [
    ["length", "length", "Array length"], ["length()", "length()", "String length"], ["size()", "size()", "Collection size"],
    ["add()", "add(${1:value})", "Append to collection"], ["get()", "get(${1:key})", "Read by key or index"],
    ["put()", "put(${1:key}, ${2:value})", "Store key/value"], ["containsKey()", "containsKey(${1:key})", "Map key check"],
    ["contains()", "contains(${1:value})", "Membership check"], ["offer()", "offer(${1:value})", "Queue insertion"],
    ["poll()", "poll()", "Queue removal"], ["peek()", "peek()", "Queue head"], ["sort()", "sort(${1:values})", "Sort values"],
    ["fill()", "fill(${1:values}, ${2:value})", "Fill an array"], ["max()", "max(${1:a}, ${2:b})", "Maximum"],
    ["min()", "min(${1:a}, ${2:b})", "Minimum"], ["charAt()", "charAt(${1:index})", "String character"],
    ["substring()", "substring(${1:start}, ${2:end})", "String slice"]
  ];

  monaco.languages.registerCompletionItemProvider("java", {
    triggerCharacters: ["."],
    provideCompletionItems(model, position) {
      const word = model.getWordUntilPosition(position);
      const range = {
        startLineNumber: position.lineNumber,
        endLineNumber: position.lineNumber,
        startColumn: word.startColumn,
        endColumn: word.endColumn
      };
      const suggestions = [
        ...keywords.map((keyword) => ({
          label: keyword, kind: monaco.languages.CompletionItemKind.Keyword, insertText: keyword,
          detail: "Java keyword", range
        })),
        ...classes.map((className) => ({
          label: className, kind: monaco.languages.CompletionItemKind.Class, insertText: className,
          detail: "java.util / java.lang", range
        })),
        ...snippets.map(([label, insertText, detail]) => ({
          label, kind: monaco.languages.CompletionItemKind.Snippet, insertText, detail, range,
          insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet
        })),
        ...members.map(([label, insertText, detail]) => ({
          label, kind: monaco.languages.CompletionItemKind.Method, insertText, detail, range,
          insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet
        }))
      ];
      return { suggestions };
    }
  });
};

export default function App() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [problems, setProblems] = useState<ProblemListItem[]>([]);
  const [session, setSession] = useState<TrainingSession | null>(null);
  const [problem, setProblem] = useState<Problem | null>(null);
  const [progress, setProgress] = useState<ProblemProgress | null>(null);
  const [mode, setMode] = useState<ProblemMode>("FUNCTION");
  const [code, setCode] = useState("");
  const [lines, setLines] = useState<TerminalLine[]>([
    line("success", "AlgoShell v0.1 · local training engine online"),
    line("muted", "Type `start` to begin or `help` to inspect commands.")
  ]);
  const [view, setView] = useState<View>({ type: "welcome" });
  const [outputTab, setOutputTab] = useState<OutputTab>("console");
  const [consoleText, setConsoleText] = useState("");
  const [learningText, setLearningText] = useState("");
  const [coachText, setCoachText] = useState("");
  const [judgeResult, setJudgeResult] = useState<JudgeResult | null>(null);
  const [revealLearning, setRevealLearning] = useState(false);
  const [busy, setBusy] = useState("");
  const [problemShare, setProblemShare] = useState(() => storedShare("algoshell.problemShare", 44, 28, 68));
  const [workbenchShare, setWorkbenchShare] = useState(() => storedShare("algoshell.workbenchShare", 68, 45, 84));
  const saveTimer = useRef<number | null>(null);
  const editorLoadSequence = useRef(0);
  const editorRef = useRef<Parameters<OnMount>[0] | null>(null);
  const editorHostRef = useRef<HTMLDivElement | null>(null);
  const upperGridRef = useRef<HTMLDivElement | null>(null);
  const workbenchRef = useRef<HTMLDivElement | null>(null);
  const currentTask = useMemo(
    () => session?.tasks.find((task) => task.status === "ACTIVE") ?? null,
    [session]
  );

  const append = useCallback((kind: TerminalLine["kind"], text: string) => {
    setLines((current) => [...current, line(kind, text)]);
  }, []);

  const refreshStats = useCallback(async () => {
    const next = await api.stats();
    setStats(next);
  }, []);

  const openProblem = useCallback(async (problemId: string, preferredMode?: ProblemMode) => {
    const sequence = ++editorLoadSequence.current;
    const payload = await api.problem(problemId);
    const nextMode = preferredMode && payload.problem.supportedModes.includes(preferredMode)
      ? preferredMode : payload.problem.defaultMode;
    const draft = await api.draft(problemId, nextMode);
    if (sequence !== editorLoadSequence.current) return;
    setProblem(payload.problem);
    setProgress(payload.progress);
    setMode(nextMode);
    setCode(draft.content);
    setView({ type: "problem" });
    setJudgeResult(null);
    setRevealLearning(false);
  }, []);

  const syncSession = useCallback(async (next: TrainingSession | null) => {
    setSession(next);
    const active = next?.tasks.find((task) => task.status === "ACTIVE");
    if (active?.problemId) await openProblem(active.problemId);
    else if (active?.taskType === "SUMMARY") {
      const summary = await api.summary("day", false);
      setView({ type: "data", title: "Daily debrief", subtitle: "Local, deterministic training facts", data: summary });
    }
    await refreshStats();
  }, [openProblem, refreshStats]);

  useEffect(() => {
    let cancelled = false;
    withRetry(() => Promise.all([api.stats(), api.problems(), api.today()]))
      .then(async ([nextStats, nextProblems, today]) => {
        if (cancelled) return;
        setStats(nextStats);
        setProblems(nextProblems);
        if (today) await syncSession(today);
      })
      .catch((error) => {
        if (!cancelled) append("error", `Startup failed: ${error.message}`);
      });
    return () => {
      cancelled = true;
    };
  }, [append, syncSession]);

  useEffect(() => {
    if (!problem) return;
    if (saveTimer.current) window.clearTimeout(saveTimer.current);
    saveTimer.current = window.setTimeout(() => {
      api.saveDraft(problem.id, mode, code).catch(() => append("error", "Draft autosave failed."));
    }, 600);
    return () => {
      if (saveTimer.current) window.clearTimeout(saveTimer.current);
    };
  }, [append, code, mode, problem]);

  const switchMode = useCallback(async (requested: ProblemMode) => {
    if (!problem) throw new Error("No active problem.");
    if (!problem.supportedModes.includes(requested)) throw new Error(`This problem does not support ${requested} mode.`);
    const sequence = ++editorLoadSequence.current;
    const problemId = problem.id;
    await api.saveDraft(problemId, mode, code);
    const draft = await api.draft(problemId, requested);
    if (sequence !== editorLoadSequence.current) return;
    setMode(requested);
    setCode(draft.content);
    append("success", `Mode switched to ${requested}. Drafts are saved independently.`);
  }, [append, code, mode, problem]);

  const handleEditorMount: OnMount = useCallback((editor) => {
    editorRef.current = editor;
    requestAnimationFrame(() => {
      editor.layout();
      editor.focus();
    });
  }, []);

  useEffect(() => {
    const host = editorHostRef.current;
    if (!host || !window.ResizeObserver) return;
    let frame = 0;
    const observer = new ResizeObserver(() => {
      window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(() => editorRef.current?.layout());
    });
    observer.observe(host);
    return () => {
      observer.disconnect();
      window.cancelAnimationFrame(frame);
    };
  }, [problem, mode]);

  useEffect(() => {
    if (view.type !== "problem" || !problem) return;
    const frame = window.requestAnimationFrame(() => {
      editorRef.current?.layout();
      editorRef.current?.focus();
    });
    return () => window.cancelAnimationFrame(frame);
  }, [mode, problem, view.type]);

  useEffect(() => localStorage.setItem("algoshell.problemShare", String(problemShare)), [problemShare]);
  useEffect(() => localStorage.setItem("algoshell.workbenchShare", String(workbenchShare)), [workbenchShare]);

  const startResize = useCallback((axis: "horizontal" | "vertical", event: ReactPointerEvent<HTMLDivElement>) => {
    event.preventDefault();
    const move = (pointer: PointerEvent) => {
      if (axis === "horizontal") {
        const bounds = upperGridRef.current?.getBoundingClientRect();
        if (!bounds) return;
        setProblemShare(Math.min(68, Math.max(28, ((pointer.clientX - bounds.left) / bounds.width) * 100)));
      } else {
        const bounds = workbenchRef.current?.getBoundingClientRect();
        if (!bounds) return;
        setWorkbenchShare(Math.min(84, Math.max(45, ((pointer.clientY - bounds.top) / bounds.height) * 100)));
      }
    };
    const stop = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", stop);
      window.removeEventListener("pointercancel", stop);
      window.removeEventListener("blur", stop);
      document.body.classList.remove("is-resizing-horizontal", "is-resizing-vertical");
      editorRef.current?.layout();
    };
    document.body.classList.add(axis === "horizontal" ? "is-resizing-horizontal" : "is-resizing-vertical");
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", stop, { once: true });
    window.addEventListener("pointercancel", stop, { once: true });
    window.addEventListener("blur", stop, { once: true });
  }, []);

  const runJudge = useCallback(async (action: "run" | "submit") => {
    if (!problem) throw new Error("No active problem.");
    setBusy(action);
    setOutputTab("tests");
    setConsoleText(`${action === "run" ? "Running public tests" : "Submitting against hidden tests"}…`);
    try {
      const result = await api.judge(action, {
        problemId: problem.id, mode, code, taskId: currentTask?.id ?? null
      });
      setJudgeResult(result);
      setConsoleText(result.compileOutput || `${result.resultType}: ${result.passedCount}/${result.totalCount}`);
      const isFailure = ["COMPILE_ERROR", "WRONG_ANSWER", "TIME_LIMIT", "RUNTIME_ERROR", "FORMAT_ERROR", "SYSTEM_ERROR"].includes(result.resultType);
      const detail = result.resultType === "AI_REVIEWED"
        ? ` · ${result.review?.verdict.replaceAll("_", " ") ?? "UNCERTAIN"}, not Accepted`
        : result.resultType === "UNVERIFIED" ? " · compile only, correctness unverified" : ` (${result.passedCount}/${result.totalCount})`;
      append(isFailure ? "error" : result.resultType === "PASSED" ? "success" : "info", `${action}: ${result.resultType}${detail}`);
    } finally {
      setBusy("");
    }
  }, [append, code, currentTask?.id, mode, problem]);

  const finishTask = useCallback(async () => {
    if (!currentTask) throw new Error("No active task.");
    if (currentTask.taskType.startsWith("REVIEW")) throw new Error("Rate this review from 1 to 5 before completing it.");
    if (currentTask.taskType === "SUMMARY") throw new Error("Generate the daily summary to finish this session.");
    setBusy("complete");
    try {
      const result = await api.complete(currentTask.id, {
        mode, localPassed: judgeResult?.resultType === "PASSED",
        highestHintLevel: currentTask.highestHintLevel
      });
      append("success", result.achieved ? `Task complete · achieved ${result.achieved}` : "Task complete.");
      await syncSession(result.session);
    } finally {
      setBusy("");
    }
  }, [append, currentTask, judgeResult?.resultType, mode, syncSession]);

  const gradeReview = useCallback(async (rating: number) => {
    if (!currentTask?.problemId) throw new Error("No active review.");
    setBusy("review");
    try {
      const result = await api.gradeReview(currentTask.id, {
        problemId: currentTask.problemId,
        reviewType: currentTask.reviewType || "IDEA_RECALL",
        rating
      });
      append(rating >= 4 ? "success" : "info", `Review rated ${rating}/5 · next review scheduled.`);
      await syncSession(result.session);
    } finally {
      setBusy("");
    }
  }, [append, currentTask, syncSession]);

  const executeCommand = useCallback(async (raw: string) => {
    append("input", raw);
    const [nameRaw, ...args] = raw.trim().split(/\s+/);
    const name = (nameRaw || "").toLowerCase();
    try {
      if (name === "clear") { setLines([]); return; }
      if (name === "help") { append("info", helpText); return; }
      if (name === "start" || name === "review") {
        const minutes = args[0] ? Number(args[0]) : undefined;
        if (args[0] && (!Number.isFinite(minutes) || minutes! < 10)) throw new Error("Usage: start [minutes], minimum 10.");
        const next = await api.start(minutes, name === "review");
        append("success", `Session ready · ${next.tasks.length} tasks · ${next.plannedMinutes} min · ${next.phase}`);
        await syncSession(next);
        return;
      }
      if (name === "today") {
        const next = await api.today();
        if (!next) append("muted", "No session for today. Type `start`.");
        else append("info", next.tasks.map((task, index) => `${index + 1}. ${task.taskType} · ${Math.round(task.plannedSeconds / 60)}m · ${task.status}\n   ${task.schedulingReason[0]}`).join("\n"));
        return;
      }
      if (name === "practice") {
        const query = args.join(" ").toLowerCase();
        if (!query) throw new Error("Usage: practice <topic>");
        const matched = problems.find((item) =>
          item.track.toLowerCase().includes(query) || item.title.toLowerCase().includes(query) ||
          (query === "dp" && item.track === "DYNAMIC_PROGRAMMING") ||
          (query === "window" && item.track === "SLIDING_WINDOW")
        );
        if (!matched) throw new Error(`No problem matched topic: ${query}`);
        await openProblem(matched.id);
        append("success", `Extra practice opened: ${matched.title}. It does not change today's plan until completed through a session.`);
        return;
      }
      if (name === "run" || name === "submit") { await runJudge(name); return; }
      if (name === "mode") {
        if (!args[0]) { append("info", `Current mode: ${mode}. Supported: ${problem?.supportedModes.join(", ") || "none"}`); return; }
        const requested = args[0].toUpperCase();
        if (requested !== "FUNCTION" && requested !== "ACM") throw new Error("Usage: mode function|acm");
        await switchMode(requested);
        return;
      }
      if (name === "hint") {
        if (!problem) throw new Error("No active problem.");
        const next = args[0] ? Number(args[0]) : Math.min(6, (currentTask?.highestHintLevel ?? 0) + 1);
        if (!Number.isInteger(next) || next < 1 || next > 6) throw new Error("Usage: hint [1-6]");
        const response = await api.hint({
          problemId: problem.id, taskId: currentTask?.id ?? null, level: next,
          useAi: Boolean(stats?.aiConfigured), code
        });
        setLearningText((current) => `${current}${current ? "\n\n" : ""}LEVEL ${next} · ${response.source}\n${response.content}`);
        setOutputTab("learning");
        setSession((current) => current ? {
          ...current,
          tasks: current.tasks.map((task) => task.id === currentTask?.id ? { ...task, highestHintLevel: Math.max(task.highestHintLevel, next) } : task)
        } : current);
        if (next === 6) setRevealLearning(true);
        append("info", `Hint level ${next} revealed (${response.source}).`);
        return;
      }
      if (name === "explain" || name === "diagnose") {
        if (!problem) throw new Error("No active problem.");
        setBusy(name);
        setOutputTab("coach");
        const response = await api.ai(name, { problemId: problem.id, code, failure: judgeResult });
        const text = typeof response.content === "string" ? response.content : JSON.stringify(response.content, null, 2);
        setCoachText(text);
        setRevealLearning(name === "explain");
        append("success", `${name} ready (${response.source}).`);
        setBusy("");
        return;
      }
      if (name === "skip") {
        if (!currentTask) throw new Error("No active task.");
        const next = await api.skip(currentTask.id, "Skipped from terminal");
        append("muted", "Task skipped and returned to the candidate pool.");
        await syncSession(next);
        return;
      }
      if (name === "result") {
        if (!problem || !args[0] || !["ac", "wa", "tle", "re"].includes(args[0].toLowerCase())) throw new Error("Usage: result ac|wa|tle|re");
        await api.official({ problemId: problem.id, result: args[0].toUpperCase() });
        append(args[0].toLowerCase() === "ac" ? "success" : "info", `Official result recorded: ${args[0].toUpperCase()}`);
        await refreshStats();
        return;
      }
      if (name === "open") {
        if (!problem) throw new Error("No active problem.");
        window.open(problem.source.leetcodeUrl, "_blank", "noopener,noreferrer");
        append("muted", "Official LeetCode page opened in a new tab.");
        return;
      }
      if (name === "note") {
        if (!args.length) throw new Error("Usage: note <text>");
        await api.note(problem?.id ?? null, args.join(" "));
        append("success", "Note saved locally.");
        return;
      }
      if (name === "stats") {
        const next = await api.stats();
        setStats(next);
        setView({ type: "data", title: "Coverage telemetry", subtitle: "Completion depth remains separate from mastery", data: next });
        append("info", `Coverage ${next.coverage}/${next.totalProblems} · Solve ${next.solve} · Guided ${next.guided} · Learn ${next.learn} · Debt ${next.reviewDebt}`);
        return;
      }
      if (name === "weak") {
        const data = await api.weak();
        setView({ type: "data", title: "Weakness radar", subtitle: "Topics ordered by average mastery", data });
        append("info", `${data.length} practiced topic groups analyzed.`);
        return;
      }
      if (name === "history" || name === "mistakes") {
        const data = name === "history" ? await api.history() : await api.mistakes();
        setView({ type: "data", title: name === "history" ? "Training history" : "Mistake log", subtitle: "Local records only", data });
        append("info", `${name} opened.`);
        return;
      }
      if (name === "plan") {
        const data = await api.plan();
        setView({ type: "plan", days: data });
        append("info", "Seven-day plan preview generated.");
        return;
      }
      if (name === "summary") {
        const period = args[0]?.toLowerCase() === "week" ? "week" : "day";
        setBusy("summary");
        try {
          const data = await api.summary(period, true);
          setView({ type: "data", title: `${period === "week" ? "Weekly" : "Daily"} debrief`, subtitle: `${data.source} coach`, data });
          setCoachText(data.text);
          setOutputTab("coach");
          if (period === "day" && currentTask?.taskType === "SUMMARY") {
            const result = await api.complete(currentTask.id, {});
            append("success", `Daily summary ready (${data.source}) · today's session complete.`);
            await syncSession(result.session);
          } else {
            append("success", `${period} summary ready (${data.source}).`);
          }
        } finally {
          setBusy("");
        }
        return;
      }
      if (name === "templates") {
        const key = args[0]?.toLowerCase() || "window";
        const content = templates[key] || templates.window;
        setView({ type: "data", title: `Algorithm template · ${key}`, subtitle: "Transferable structure, not a full problem answer", data: content });
        append("info", `Template opened: ${key}`);
        return;
      }
      if (name === "config") {
        const data = await api.config();
        if (args[0]?.toLowerCase() === "ai") setView({ type: "ai-setup", config: data });
        else setView({ type: "data", title: "Local configuration", subtitle: "Sensitive keys are never returned to the browser", data });
        append("info", `AI ${data.aiConfigured ? "configured" : "not configured"} · mode ${data.aiMode}`);
        return;
      }
      if (name === "complete" || name === "done") { await finishTask(); return; }
      throw new Error(`Unknown command: ${name}. Type \`help\`.`);
    } catch (error) {
      setBusy("");
      append("error", error instanceof Error ? error.message : String(error));
    }
  }, [
    append, code, currentTask, finishTask, judgeResult, mode, openProblem, problem, problems,
    refreshStats, runJudge, stats?.aiConfigured, switchMode, syncSession
  ]);

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (event.ctrlKey && event.key === "Enter") {
        event.preventDefault();
        void executeCommand(event.shiftKey ? "submit" : "run");
      }
      if (event.ctrlKey && event.key.toLowerCase() === "s") {
        event.preventDefault();
        if (problem) api.saveDraft(problem.id, mode, code).then(() => append("success", "Draft saved.")).catch(() => append("error", "Draft save failed."));
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [append, code, executeCommand, mode, problem]);

  const remainingSeconds = currentTask?.plannedSeconds ?? 0;
  return (
    <main className="app-shell">
      <header className="topbar">
        <div className="app-title"><span className="logo-box"><Braces size={18} /></span><strong>AlgoShell</strong><small>/ HOT100</small></div>
        <div className="metrics">
          <span><small>DAY</small><b>{String(stats?.day ?? 1).padStart(2, "0")}<i>/{stats?.cycleDays ?? 35}</i></b></span>
          <span><small>COVERAGE</small><b>{stats?.coverage ?? 0}<i>/{stats?.totalProblems ?? 100}</i></b></span>
          <span className="solve"><small>SOLVE</small><b>{stats?.solve ?? 0}</b></span>
          <span className="guided"><small>GUIDED</small><b>{stats?.guided ?? 0}</b></span>
          <span className="learn"><small>LEARN</small><b>{stats?.learn ?? 0}</b></span>
          <span className="debt"><small>DEBT</small><b>{stats?.reviewDebt ?? 0}</b></span>
        </div>
        <div className="runtime-status">
          <span className={stats?.javaAvailable ? "online" : "offline"}><CircleDot size={12} /> {stats?.javaVersion || "JAVA OFF"}</span>
          <button
            className={stats?.aiConfigured ? "online" : "offline"}
            title={stats?.aiConfigured ? "AI Provider 已配置，点击查看状态" : "未检测到 AI API Key，点击查看配置方法"}
            onClick={() => void executeCommand("config ai")}
          >
            {stats?.aiConfigured ? <Wifi size={13} /> : <WifiOff size={13} />}
            AI {stats?.aiConfigured ? stats.aiMode : "LOCAL · 未配置"}
          </button>
        </div>
      </header>

      <div className="workspace-grid">
        <TerminalPanel lines={lines} session={session} onCommand={executeCommand} />
        <section className="main-workspace">
          <div className="workspace-toolbar">
            <div className="context-tabs">
              <button className={view.type === "problem" ? "active" : ""} onClick={() => problem && setView({ type: "problem" })}><Code2 size={14} /> Problem</button>
              <button onClick={() => void executeCommand("stats")}><Gauge size={14} /> Stats</button>
              <button onClick={() => void executeCommand("plan")}><Clock3 size={14} /> Plan</button>
            </div>
            <div className="task-context">
              {currentTask && <><span>{currentTask.taskType.replaceAll("_", " ")}</span><b>{Math.round(remainingSeconds / 60)} min</b></>}
            </div>
          </div>

          <div
            className="workbench-stack"
            ref={workbenchRef}
            style={{ gridTemplateRows: `minmax(260px, ${workbenchShare}fr) 7px minmax(110px, ${100 - workbenchShare}fr)` }}
          >
          <div
            className="upper-grid"
            ref={upperGridRef}
            style={{ gridTemplateColumns: `minmax(280px, ${problemShare}%) 7px minmax(380px, 1fr)` }}
          >
            <section className="content-stage">
              {view.type === "problem" && problem ? (
                <ProblemPane problem={problem} progress={progress} task={currentTask} revealLearning={revealLearning} onCommand={(command) => void executeCommand(command)} />
              ) : view.type === "plan" ? (
                <PlanView days={view.days} />
              ) : view.type === "ai-setup" ? (
                <AiSetupView config={view.config} />
              ) : view.type === "data" ? (
                <DataView title={view.title} subtitle={view.subtitle} data={view.data} />
              ) : (
                <Welcome onStart={() => void executeCommand("start")} stats={stats} />
              )}
            </section>

            <div
              className="resize-handle resize-handle-horizontal"
              role="separator"
              aria-label="调整题目与答题区宽度"
              aria-orientation="vertical"
              title="拖动调整宽度；双击恢复默认"
              onPointerDown={(event) => startResize("horizontal", event)}
              onDoubleClick={() => setProblemShare(44)}
            ><span /></div>

            <section className="editor-stage">
              <div className="editor-header">
                <div className="file-tab"><span className="java-icon">J</span>{mode === "ACM" ? "Main.java" : "Solution.java"}<i>●</i></div>
                <button
                  className="mode-switch"
                  disabled={!problem || problem.supportedModes.length < 2}
                  title={!problem ? "No active problem" : problem.supportedModes.length < 2 ? `本题仅提供 ${mode} 模板` : `切换到 ${mode === "ACM" ? "FUNCTION" : "ACM"}`}
                  onClick={() => problem && void switchMode(problem.supportedModes.find((candidate) => candidate !== mode) ?? mode).catch((error) => append("error", error.message))}
                >
                  {mode}<ChevronDown size={13} />
                </button>
              </div>
              <div className="monaco-host" ref={editorHostRef}>
                <Editor
                  key={`${problem?.id ?? "empty"}:${mode}`}
                  path={`file:///algoshell/${problem?.id ?? "empty"}/${mode}/${mode === "ACM" ? "Main.java" : "Solution.java"}`}
                  height="100%"
                  language="java"
                  theme="vs-dark"
                  value={code}
                  beforeMount={configureJavaLanguage}
                  onMount={handleEditorMount}
                  onChange={(value) => setCode(value ?? "")}
                  keepCurrentModel={false}
                  saveViewState={false}
                  loading={<div className="editor-loading">Loading Java editor…</div>}
                  options={{
                    fontFamily: "'JetBrains Mono', 'Cascadia Code', monospace",
                    fontSize: 14, lineHeight: 23, minimap: { enabled: false }, scrollBeyondLastLine: false,
                    padding: { top: 16 }, renderLineHighlight: "all", cursorBlinking: "smooth",
                    cursorSmoothCaretAnimation: "on", smoothScrolling: true,
                    bracketPairColorization: { enabled: true }, automaticLayout: false,
                    quickSuggestions: { other: true, comments: false, strings: false },
                    suggestOnTriggerCharacters: true, wordBasedSuggestions: "currentDocument",
                    parameterHints: { enabled: true }, tabCompletion: "on", snippetSuggestions: "top",
                    suggestSelection: "first", acceptSuggestionOnEnter: "on",
                    suggest: { showKeywords: true, showSnippets: true, showMethods: true, showClasses: true },
                    detectIndentation: true, formatOnPaste: true,
                    fixedOverflowWidgets: true, renderWhitespace: "selection"
                  }}
                />
              </div>
              <div className="editor-actions">
                <button className="ghost-action" onClick={() => void executeCommand("hint")} disabled={!problem || Boolean(busy)}><Lightbulb size={15} /> Hint</button>
                <button className="ghost-action" onClick={() => void executeCommand("explain")} disabled={!problem || Boolean(busy)}><Sparkles size={15} /> Explain</button>
                <span className="action-spacer" />
                <button className="run-action" onClick={() => void executeCommand("run")} disabled={!problem || Boolean(busy)}>{busy === "run" ? <Loader2 className="spin" size={15} /> : <Play size={15} />} Run <kbd>Ctrl ↵</kbd></button>
                <button className="submit-action" onClick={() => void executeCommand("submit")} disabled={!problem || Boolean(busy)}>{busy === "submit" ? <Loader2 className="spin" size={15} /> : <Send size={15} />} Submit</button>
              </div>
            </section>
          </div>

          <div
            className="resize-handle resize-handle-vertical"
            role="separator"
            aria-label="调整答题区与输出区高度"
            aria-orientation="horizontal"
            title="拖动调整高度；双击恢复默认"
            onPointerDown={(event) => startResize("vertical", event)}
            onDoubleClick={() => setWorkbenchShare(68)}
          ><span /></div>

          <OutputPanel tab={outputTab} onTab={setOutputTab} consoleText={consoleText} judge={judgeResult} learningText={learningText} coachText={coachText} />
          </div>

          {currentTask && (
            <div className="completion-bar">
              {currentTask.taskType.startsWith("REVIEW") ? (
                <>
                  <span>How well did you recall it?</span>
                  <div className="rating-row">
                    {[1, 2, 3, 4, 5].map((rating) => <button key={rating} disabled={Boolean(busy)} onClick={() => void gradeReview(rating)}>{rating}<small>{["forgot", "type only", "idea", "hesitant", "complete"][rating - 1]}</small></button>)}
                  </div>
                </>
              ) : currentTask.taskType === "SUMMARY" ? (
                <>
                  <span><Sparkles size={15} /> 生成今日训练总结，并完成本次训练。</span>
                  <button disabled={Boolean(busy)} onClick={() => void executeCommand("summary")}>
                    {busy === "summary" ? <Loader2 className="spin" size={15} /> : <Check size={15} />} 生成总结并完成
                  </button>
                </>
              ) : (
                <>
                  <span><Check size={15} /> Finish when the learning objective is met. Depth is judged honestly from tests and hint usage.</span>
                  <button disabled={Boolean(busy)} onClick={() => void finishTask().catch((error) => append("error", error.message))}>{busy === "complete" ? <Loader2 className="spin" size={15} /> : <Check size={15} />} Complete task</button>
                </>
              )}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

function Welcome(props: { onStart: () => void; stats: DashboardStats | null }) {
  return (
    <div className="welcome-view">
      <span className="welcome-kicker">DAY {String(props.stats?.day ?? 1).padStart(2, "0")} · READY</span>
      <h1>Your next algorithm<br />session is one command away.</h1>
      <p>Due reviews first. Coverage kept honest. Java 17 runs locally.</p>
      <button onClick={props.onStart}><Play size={17} /> Start today</button>
      <div className="welcome-command"><span>PS algoshell&gt;</span> start 35 <i>↵</i></div>
    </div>
  );
}

function DataView(props: { title: string; subtitle: string; data: unknown }) {
  const render = () => {
    if (typeof props.data === "string") return <pre className="template-view">{props.data}</pre>;
    if (Array.isArray(props.data)) return (
      <div className="data-list">
        {props.data.map((item, index) => <DataCard key={index} data={item} index={index} />)}
      </div>
    );
    if (props.data && typeof props.data === "object") {
      const data = props.data as Record<string, unknown>;
      return (
        <div className="metric-card-grid">
          {Object.entries(data).map(([key, value]) => (
            typeof value !== "object" || value === null
              ? <div className="metric-card" key={key}><span>{key.replace(/([A-Z])/g, " $1")}</span><strong>{String(value ?? "—")}</strong></div>
              : <DataCard key={key} data={{ [key]: value }} index={0} />
          ))}
        </div>
      );
    }
    return <div className="empty-output">No data yet.</div>;
  };
  return (
    <div className="data-view">
      <div className="eyebrow"><Gauge size={14} /> LOCAL TELEMETRY</div>
      <h1>{props.title}</h1>
      <p>{props.subtitle}</p>
      {render()}
    </div>
  );
}

function DataCard({ data, index }: { data: unknown; index: number }) {
  if (!data || typeof data !== "object") return <div className="data-card">{String(data)}</div>;
  return (
    <div className="data-card">
      <span className="data-card-index">{String(index + 1).padStart(2, "0")}</span>
      <pre>{JSON.stringify(data, null, 2)}</pre>
    </div>
  );
}
