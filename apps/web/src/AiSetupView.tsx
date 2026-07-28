import { Bot, CheckCircle2, KeyRound, ShieldCheck, TerminalSquare, WifiOff } from "lucide-react";

interface AiConfig {
  aiConfigured: boolean;
  aiStatusReason: "READY" | "KEY_EMPTY" | "ENV_FILE_MISSING";
  aiMode: string;
  aiProvider: string;
  aiBaseUrl: string;
  aiFastModel: string;
  aiSmartModel: string;
  aiJsonMode: boolean;
}

export function AiSetupView({ config }: { config: AiConfig }) {
  const ready = config.aiConfigured;
  const reason = config.aiStatusReason === "ENV_FILE_MISSING"
    ? "项目中还没有本机 .env 配置文件。"
    : config.aiStatusReason === "KEY_EMPTY"
      ? ".env 已存在，但 AI_API_KEY 为空。"
      : `${config.aiProvider} Key 已由本地服务读取。`;

  return (
    <div className="data-view ai-setup-view">
      <div className="eyebrow"><Bot size={14} /> AI COACH</div>
      <h1>{ready ? `${config.aiProvider} 已连接` : "当前使用本地教练"}</h1>
      <p>AI 不可用时，题库、调度、固定提示、Java 判题和复习仍然可以正常工作。</p>

      <div className={`ai-status-card ${ready ? "ready" : "local"}`}>
        <div className="ai-status-icon">{ready ? <CheckCircle2 /> : <WifiOff />}</div>
        <div>
          <small>{ready ? "READY" : "LOCAL FALLBACK"}</small>
          <strong>{reason}</strong>
          <p>{ready ? `当前模式：${config.aiMode}` : "这就是顶部显示 AI LOCAL 的原因，并非程序崩溃。"}</p>
        </div>
      </div>

      {!ready && (
        <div className="ai-setup-steps">
          <h3><KeyRound size={16} /> 配置 AI Provider</h3>
          <ol>
            <li><span>1</span><div><strong>准备 Provider 和 API Key</strong><p>支持 DeepSeek 及其他提供 OpenAI 兼容 Chat Completions 接口的服务。</p></div></li>
            <li><span>2</span><div><strong>双击项目根目录的 configure-ai.bat</strong><p>填写名称、Base URL、模型和 Key；脚本不会把 Key 打印到终端。</p></div></li>
            <li><span>3</span><div><strong>关闭并重新运行 start.bat</strong><p>顶部状态将从 AI LOCAL 变成 AI BALANCED。</p></div></li>
          </ol>
          <div className="ai-command"><TerminalSquare size={15} /><code>configure-ai.bat</code></div>
        </div>
      )}

      <div className="ai-security-note">
        <ShieldCheck size={16} />
        <p>Key 仅保存在 Git 忽略的本机 `.env` 中，由 Node 服务端读取；不会返回前端、写入 SQLite 或出现在日志中。</p>
      </div>

      <div className="ai-model-grid">
        <div><span>PROVIDER</span><strong>{config.aiProvider}</strong></div>
        <div><span>FAST MODEL</span><strong>{config.aiFastModel}</strong></div>
        <div><span>SMART MODEL</span><strong>{config.aiSmartModel}</strong></div>
        <div><span>BASE URL</span><strong>{config.aiBaseUrl}</strong></div>
      </div>
    </div>
  );
}
