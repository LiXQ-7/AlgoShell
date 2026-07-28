import { CalendarDays, ChevronDown, Clock3, RotateCcw, Sparkles } from "lucide-react";
import type { PlanDay, PlanTaskItem } from "./api";

const taskLabels: Record<string, { label: string; tone: string }> = {
  NEW_SOLVE: { label: "主练 · Solve", tone: "solve" },
  NEW_GUIDED: { label: "引导练习 · Guided", tone: "guided" },
  NEW_LEARN: { label: "快速覆盖 · Learn", tone: "learn" },
  REVIEW_RECALL: { label: "思路回忆", tone: "review" },
  REVIEW_SKELETON: { label: "核心代码复习", tone: "review" },
  REVIEW_BUG_FIX: { label: "典型错误修复", tone: "review" },
  REVIEW_REBUILD: { label: "完整重建", tone: "review" },
  MIXED_CHECK: { label: "混合识别", tone: "guided" },
  SUMMARY: { label: "训练总结", tone: "summary" }
};

const formatDate = (date: string, today: string) => {
  const value = new Date(`${date}T12:00:00`);
  const weekday = new Intl.DateTimeFormat("zh-CN", { weekday: "short" }).format(value);
  const monthDay = new Intl.DateTimeFormat("zh-CN", { month: "numeric", day: "numeric" }).format(value);
  return { weekday, monthDay, isToday: date === today };
};

const taskTitle = (task: PlanTaskItem) =>
  task.problemTitle ?? (task.type === "SUMMARY" ? "回顾表现并调整明日安排" : "训练任务");

export function PlanView({ days }: { days: PlanDay[] }) {
  const today = new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 10);
  return (
    <div className="data-view plan-view">
      <div className="eyebrow"><CalendarDays size={14} /> TRAINING ROUTE</div>
      <h1>未来七天</h1>
      <p>这是基于当前进度的预估安排；到期复习和实际表现可能使计划发生变化。</p>

      <div className="plan-week">
        {days.map((day, index) => {
          const date = formatDate(day.date, today);
          const utilization = Math.min(100, Math.round((day.estimatedMinutes / Math.max(1, day.budgetMinutes)) * 100));
          return (
            <details className="plan-day" key={day.date} open={index === 0}>
              <summary>
                <div className="plan-date">
                  <strong>{date.weekday}</strong>
                  <span>{date.monthDay}</span>
                  {date.isToday && <i>今天</i>}
                </div>
                <div className="plan-overview">
                  <span><Sparkles size={13} /> 新题 {day.newProblemCount}</span>
                  <span><RotateCcw size={13} /> 复习 {day.reviewCount}</span>
                  <span><Clock3 size={13} /> 预计 {day.estimatedMinutes} 分钟</span>
                </div>
                <div className="plan-budget">
                  <span>{day.budgetMinutes} min budget</span>
                  <ChevronDown size={15} />
                </div>
              </summary>

              <div className="plan-utilization">
                <span style={{ width: `${utilization}%` }} />
              </div>
              <div className="plan-task-list">
                {day.tasks.map((task, taskIndex) => {
                  const meta = taskLabels[task.type] ?? { label: task.type, tone: "summary" };
                  return (
                    <div className="plan-task" key={`${task.type}-${task.problemId ?? taskIndex}`}>
                      <span className={`plan-task-dot ${meta.tone}`} />
                      <div>
                        <small className={meta.tone}>{meta.label}</small>
                        <strong>{taskTitle(task)}</strong>
                        {task.reasons[0] && <p>{task.reasons[0]}</p>}
                      </div>
                      <time>{task.minutes} 分钟</time>
                    </div>
                  );
                })}
              </div>
              <footer>
                训练任务 {day.trainingTaskCount} 个
                <span>·</span>
                预计 {day.estimatedMinutes}/{day.budgetMinutes} 分钟
              </footer>
            </details>
          );
        })}
      </div>
    </div>
  );
}
