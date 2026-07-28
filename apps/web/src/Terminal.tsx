import { FormEvent, useEffect, useRef, useState } from "react";
import { ChevronRight, TerminalSquare } from "lucide-react";
import type { TrainingSession } from "@algoshell/shared";

export interface TerminalLine {
  id: number;
  kind: "input" | "info" | "success" | "error" | "muted";
  text: string;
}

export function TerminalPanel(props: {
  lines: TerminalLine[];
  session: TrainingSession | null;
  onCommand: (command: string) => Promise<void>;
}) {
  const [value, setValue] = useState("");
  const [history, setHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const endRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [props.lines]);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const command = value.trim();
    if (!command) return;
    setHistory((current) => [command, ...current.filter((item) => item !== command)].slice(0, 30));
    setHistoryIndex(-1);
    setValue("");
    void props.onCommand(command);
  };

  const activeIndex = props.session?.tasks.findIndex((task) => task.status === "ACTIVE") ?? -1;
  return (
    <aside className="terminal-panel">
      <div className="panel-title">
        <TerminalSquare size={15} />
        <span>TERMINAL</span>
        <span className="terminal-id">PS ALGOSHELL</span>
      </div>
      <div className="terminal-scroll">
        <div className="terminal-brand">
          <div className="brand-mark">A<span>/</span>S</div>
          <div>
            <strong>AlgoShell</strong>
            <small>Hot 100 adaptive training</small>
          </div>
        </div>
        {props.lines.map((line) => (
          <div className={`terminal-line ${line.kind}`} key={line.id}>
            {line.kind === "input" && <span className="prompt-symbol">❯</span>}
            <span>{line.text}</span>
          </div>
        ))}
        <div ref={endRef} />
      </div>

      {props.session && (
        <div className="session-mini">
          <div className="session-mini-head">
            <span>SESSION PLAN</span>
            <span>{Math.max(0, activeIndex + 1)}/{props.session.tasks.length}</span>
          </div>
          <div className="session-progress">
            <span style={{ width: `${(props.session.tasks.filter((task) => task.status === "COMPLETED").length / props.session.tasks.length) * 100}%` }} />
          </div>
          <div className="session-task-list">
            {props.session.tasks.map((task) => (
              <div className={`mini-task ${task.status.toLowerCase()}`} key={task.id}>
                <span className="mini-dot" />
                <span>{task.taskType.replaceAll("_", " ")}</span>
                <time>{Math.round(task.plannedSeconds / 60)}m</time>
              </div>
            ))}
          </div>
        </div>
      )}

      <form className="terminal-input" onSubmit={submit}>
        <ChevronRight size={18} />
        <input
          autoFocus
          value={value}
          spellCheck={false}
          placeholder="type a command…"
          onChange={(event) => setValue(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "ArrowUp" && history.length) {
              event.preventDefault();
              const next = Math.min(history.length - 1, historyIndex + 1);
              setHistoryIndex(next);
              setValue(history[next] || "");
            }
            if (event.key === "ArrowDown") {
              event.preventDefault();
              const next = historyIndex - 1;
              setHistoryIndex(next);
              setValue(next >= 0 ? history[next] || "" : "");
            }
          }}
        />
        <button type="submit" aria-label="Run command"><kbd>ENTER</kbd></button>
      </form>
    </aside>
  );
}
