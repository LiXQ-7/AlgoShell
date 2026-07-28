import { BookOpen, Clock3, ExternalLink, Flag, Layers3 } from "lucide-react";
import type { Problem, ProblemProgress, SessionTask } from "@algoshell/shared";

const trackNames: Record<string, string> = {
  ARRAY_HASH: "数组与哈希", TWO_POINTERS: "双指针", SLIDING_WINDOW: "滑动窗口", SUBSTRING: "子串",
  ARRAY: "数组", MATRIX: "矩阵", LINKED_LIST: "链表", STACK: "栈", TREE: "二叉树",
  GRAPH: "图与搜索", TRIE: "前缀树", BACKTRACKING: "回溯", BINARY_SEARCH: "二分查找",
  HEAP: "堆", GREEDY: "贪心", DYNAMIC_PROGRAMMING: "动态规划", TECHNIQUE: "技巧与综合"
};

export function ProblemPane(props: {
  problem: Problem;
  progress: ProblemProgress | null;
  task: SessionTask | null;
  revealLearning: boolean;
  onCommand: (command: string) => void;
}) {
  const isReview = props.task?.taskType.startsWith("REVIEW");
  const reviewCard = props.problem.reviewCards.find((card) =>
    card.type === props.task?.reviewType) ?? props.problem.reviewCards[0];
  if (isReview) {
    return (
      <div className="problem-pane review-pane">
        <div className="eyebrow"><BookOpen size={14} /> ACTIVE RECALL</div>
        <h1>{props.problem.title}</h1>
        <p className="problem-summary">{props.problem.statement.summary}</p>
        <div className="recall-card">
          <span>REVIEW PROMPT</span>
          <h3>{reviewCard?.prompt}</h3>
          {reviewCard?.template && <pre>{reviewCard.template}</pre>}
          <p>先主动回忆，再按下方 1—5 评分。不要急着打开学习卡。</p>
        </div>
      </div>
    );
  }
  return (
    <div className="problem-pane">
      <div className="problem-meta">
        <span>LC {props.problem.leetcodeId}</span>
        <span className={`difficulty ${props.problem.difficulty.toLowerCase()}`}>{props.problem.difficulty}</span>
        <span><Layers3 size={13} /> {trackNames[props.problem.track] || props.problem.track}</span>
        <span><Flag size={13} /> {props.task?.targetLevel || props.problem.coverageTarget}</span>
        <span><Clock3 size={13} /> {props.problem.estimatedMinutes.solve} min</span>
      </div>
      <div className="problem-heading">
        <div>
          <h1>{props.problem.title}</h1>
          <p className="problem-summary">{props.problem.statement.summary}</p>
        </div>
        <button className="ghost-button" onClick={() => props.onCommand("open")}>
          <ExternalLink size={15} /> LeetCode
        </button>
      </div>
      <div className="markdown-copy">
        {props.problem.statement.descriptionMarkdown.split("\n").map((line, index) => <p key={index}>{line}</p>)}
        <h3>示例</h3>
        <div className="example-grid">
          {props.problem.statement.examples.slice(0, 2).map((example, index) => (
            <div className="example-card" key={index}>
              <span>EXAMPLE {index + 1}</span>
              <pre><b>Input</b>{"\n"}{example.input}{"\n\n"}<b>Output</b>{"\n"}{example.output}</pre>
            </div>
          ))}
        </div>
      </div>
      {props.revealLearning && (
        <div className="learning-inline">
          <div className="eyebrow"><BookOpen size={14} /> LEARNING CARD</div>
          <h3>{props.problem.learningCard.plainExplanation}</h3>
          <p><strong>关键观察：</strong>{props.problem.learningCard.keyObservation}</p>
          <ol>{props.problem.learningCard.algorithmSteps.map((step) => <li key={step}>{step}</li>)}</ol>
          <pre>{props.problem.learningCard.coreCode}</pre>
          <p><strong>复杂度：</strong>{props.problem.learningCard.complexity.time} / {props.problem.learningCard.complexity.space}</p>
          <p><strong>易错点：</strong>{props.problem.learningCard.pitfalls.join("；")}</p>
        </div>
      )}
    </div>
  );
}
