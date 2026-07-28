import { Bot, CircleCheck, CircleX, FlaskConical, ScrollText } from "lucide-react";
import type { JudgeResult } from "@algoshell/shared";

export type OutputTab = "console" | "tests" | "learning" | "coach";

export function OutputPanel(props: {
  tab: OutputTab;
  onTab: (tab: OutputTab) => void;
  consoleText: string;
  judge: JudgeResult | null;
  learningText: string;
  coachText: string;
}) {
  const tabs: Array<{ id: OutputTab; label: string; icon: typeof ScrollText }> = [
    { id: "console", label: "Console", icon: ScrollText },
    { id: "tests", label: "Tests", icon: FlaskConical },
    { id: "learning", label: "Learning Card", icon: ScrollText },
    { id: "coach", label: "AI Coach", icon: Bot }
  ];
  return (
    <section className="output-panel">
      <nav>
        {tabs.map((item) => {
          const Icon = item.icon;
          return <button className={props.tab === item.id ? "active" : ""} key={item.id} onClick={() => props.onTab(item.id)}><Icon size={14} />{item.label}</button>;
        })}
      </nav>
      <div className="output-body">
        {props.tab === "console" && <pre className="console-output">{props.consoleText || "Ready. Use Ctrl+Enter or type `run`."}</pre>}
        {props.tab === "tests" && (
          props.judge ? <div className="test-results">
            <div className={`result-banner ${props.judge.resultType === "PASSED" ? "passed" : "failed"}`}>
              {props.judge.resultType === "PASSED" ? <CircleCheck /> : <CircleX />}
              <div><strong>{props.judge.resultType.replaceAll("_", " ")}</strong><span>{props.judge.passedCount} / {props.judge.totalCount} tests passed</span></div>
            </div>
            {props.judge.compileOutput && <pre>{props.judge.compileOutput}</pre>}
            {props.judge.cases.map((item) => (
              <details key={item.id} open={!item.passed}>
                <summary>{item.passed ? "✓" : "×"} {item.id} <time>{item.durationMs}ms</time></summary>
                {(item.input || item.actual || item.error) && <pre>{item.input ? `Input\n${item.input}\n\n` : ""}{item.expected ? `Expected\n${item.expected}\n\n` : ""}{item.actual ? `Actual\n${item.actual}` : ""}{item.error ? `Error\n${item.error}` : ""}</pre>}
              </details>
            ))}
          </div> : <div className="empty-output">No test result yet.</div>
        )}
        {props.tab === "learning" && <pre className="prose-output">{props.learningText || "Use `hint` or `explain` to reveal learning material."}</pre>}
        {props.tab === "coach" && <pre className="prose-output coach-output">{props.coachText || "AI coach is quiet. Use `diagnose`, `explain`, or `summary`."}</pre>}
      </div>
    </section>
  );
}
