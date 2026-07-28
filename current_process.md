# AlgoShell 当前进展

最后同步：2026-07-29  
当前阶段：可运行的本地 MVP；进入题库本地判题覆盖扩充阶段

## 项目目的

AlgoShell 是面向 Java 秋招准备的单用户本地 Hot 100 自适应训练工具，权威需求见 `AlgoShell_产品设计文档_PRD.md`。

## 已确认决策与假设

- Windows 本地 Web 应用，不做账号、云同步、社区或自动 LeetCode 提交。
- TypeScript 单仓库：React + Monaco、Node/Express、SQLite、Java 17。
- 训练目标为 35 天覆盖、最多延长至 40 天，Solve/Guided/Learn 分开记录。
- 本地引擎决定调度、复习、掌握度和判题；可配置 AI Provider 只负责可降级的提示、解释、诊断和总结。
- AI 接入使用 OpenAI Chat Completions 兼容协议，DeepSeek 是当前默认配置而非产品限制；新配置使用 `AI_*` 环境变量，并兼容旧版 `DEEPSEEK_*` 变量。
- AI Key 只从本机 `.env` 读取；历史对话中暴露过的 Key 应尽快轮换。
- 复杂结构题在本地 Harness 未补齐前使用 Function 学习卡 + LeetCode 官方手动提交，不伪报本地 Accepted。

## 已完成并验证

- 工程基线：npm workspaces、TypeScript、React/Vite、Express、shared schema、`start.bat` 和自动端口选择。
- PowerShell/IDE 风格单页界面：顶部指标、左侧终端、题面、Monaco、Console/Tests/Learning/Coach 输出区。
- 终端 action：`start/today/review/practice/run/submit/hint/explain/diagnose/mode/skip/result/open/note/stats/weak/history/mistakes/templates/plan/summary/config/help/clear`。
- SQLite migration、训练会话、任务、草稿快照、尝试、提示、复习、官方结果、笔记和 AI 调用元数据。
- 工作日/周末确定性调度、阶段切换、复习债务、任务原因、Solve/Guided/Learn 判定、五维 mastery 与动态复习间隔。
- Java ACM 编译运行：唯一临时目录、单并发、参数数组启动、超时、256MB JVM 堆、1MB 输出捕获、公开/隐藏结果分级展示。
- OpenAI-compatible 服务端 Provider：可配置 Provider 名称、Base URL、Fast/Smart 模型、JSON mode 和超时；具备结构化任务、调用元数据、提示等级泄露检测和本地降级，前端无法读取 Key。
- 100 道稳定 ID 题库：本地改写摘要、专题、难度、目标层级、学习卡、Level 1—6 提示和 Recall 卡；schema 校验为 100/100。
- 8 道基础题具有完整 ACM 公开/隐藏用例：两数之和、移动零、无重复字符最长子串、最大子数组和、搜索插入位置、有效括号、股票最佳时机、爬楼梯。
- README 已包含安装、首次训练、AI 配置、数据位置、安全边界和当前题库边界。
- 已修复 Windows 冷启动竞态：`scripts/dev.mjs` 先启动并轮询 `/api/health`，API 就绪后才启动 Vite，Web 就绪后才打开浏览器；API 与 Web 端口会作为一对共同检查。前端初始化请求另有 6 次短重试，避免瞬时连接失败。
- 已修复 `start 35` 与 `start 120` 无差异的问题：90 分钟及以上即使在工作日也使用长时模板；未产生提示、运行或完成记录的当天会话可用新分钟数安全重规划，已经开始训练时返回明确冲突提示而不覆盖记录。
- 已将 `plan` 的原始 JSON 输出替换为可展开的七日计划卡片：显示日期、工作日/周末预算、新题/复习数量、预计用时、题目名称、训练深度和调度原因。
- 已完善 AI 状态诊断与配置入口：顶部明确显示 `AI LOCAL · 未配置`，点击后展示本地降级原因和启用步骤；`/api/health`、`/api/config` 只返回配置状态与原因，不返回 Key。
- 已增加通用 `configure-ai.bat` 与 `scripts/configure-ai.ps1`：可配置任意 OpenAI Chat Completions 兼容 Provider，使用安全输入读取 Key，写入 Git 忽略的本机 `.env`，不在终端回显密钥；README 与 PRD 已同步。
- README 已重写为可公开发布的使用文档，覆盖产品简介、用途、环境要求、启动步骤、训练命令、DeepSeek/其他 Provider 配置、安全规范、判题边界和开发验证。
- 项目已初始化为 Git 仓库并发布到公开仓库 `https://github.com/LiXQ-7/AlgoShell`，默认分支为 `main`。

## 当前工作与未完成项

- 其余 92 道题的 Function Harness、ACM 适配（适用时）和经参考实现校验的公开/隐藏测试尚未完成。
- AI 流式 SSE 与前端停止生成尚未实现；当前为非流式请求。
- Judge 自动化测试目前以真实集成验收为主，尚未把 CE/WA/TLE/RE/输出超限全部固化为 Vitest。
- 数据库损坏只读恢复、迁移前自动备份失败降级、40 天全量模拟和正式 E2E 测试仍待补齐。
- 未测量 PRD 中的 P95 性能预算。

## 阻塞与待用户决定

- 无实现阻塞。
- 如继续扩充题库，建议由用户确认优先顺序：先补 45—55 道 A 级核心题的本地 Harness，还是按 Hot 100 清单顺序补齐全部 100 道。

## 下一步（按顺序）

1. 为 A 级核心题补齐 Function Harness、参考实现和至少 2 个公开 + 2 个隐藏用例。
2. 增加 Judge 的 CE、WA、TLE、RE、输出超限自动测试。
3. 实现 AI SSE 流式输出、取消与 JSON 诊断 schema 校验。
4. 加强数据库迁移失败只读降级和恢复文件流程。
5. 模拟 35—40 天训练，检查覆盖、债务和 Day 38—40 强制 Learn/Guided 规则。
6. 补一条自动端到端流程并执行完整 PRD 第 23 章验收。

## 风险与未解决问题

- 当前 100 题“可学习”，但只有 8 题“可完整本地判题”；这是最大剩余工作量。
- Node 16 为兼容当前机器使用 Vite 4/旧版 tsx，`npm audit` 报告依赖链漏洞；本地仅监听 `127.0.0.1` 可降低暴露面，但升级到 Node 18/20 后应同步升级开发依赖。
- Function 模式缺失 Harness 时会明确返回 `SYSTEM_ERROR` 和官方手动验证说明。
- Provider 的 Base URL、模型名和 JSON mode 可通过环境变量覆盖；使用其他服务前需确认其兼容 `/chat/completions`、Bearer 鉴权及所选模型。
- 当前本机配置使用了曾在对话中明文出现的 Key，虽已验证可用，但安全上应视为已暴露并尽快轮换。

## 验证记录

- `npm.cmd run typecheck`：通过。
- `npm.cmd test`：通过，2 个测试文件、33 个测试场景。
- `npm.cmd run validate:problems`：通过，100 个有效题目、0 个 schema 错误。
- `npm.cmd run build`：通过；Web 生产包与 Server 编译产物生成成功。
- Java 17 真实集成：两数之和公开测试 2/2、隐藏测试 2/2。
- 浏览器真实验收：启动会话生成 3 个任务；题面、Monaco、分级提示、命令提交和刷新恢复通过。
- 2026-07-29 冷启动回归：日志严格按 `Starting API → API ready → Web ready` 输出；从 Vite 端口请求 `/api/stats` 成功返回 100 题、Java 17 和 Local AI 状态，未再出现 `ECONNREFUSED`。
- 2026-07-29 时长调度回归：无历史输入下，35 分钟工作日计划为 3 个任务（Solve、Learn、Summary），120 分钟工作日计划为 6 个任务（2 Solve、Guided、2 Learn、Summary）；生产构建通过。
- 2026-07-29 计划与 AI 配置 UX 回归：`npm.cmd run typecheck`、33 项 Vitest 和 `npm.cmd run build` 均通过；浏览器验证七日计划卡片、顶部 AI 状态点击、缺少 `.env` 的明确原因与安全配置步骤均正常，控制台无 error/warning。
- 2026-07-29 通用 AI Provider 回归：类型检查、33 项 Vitest 和生产构建通过；真实 DeepSeek Summary 调用返回 `source: AI`、模型 `deepseek-reasoner`；`/api/config` 显示 Provider/模型/Base URL 且不包含 Key；浏览器显示 `AI BALANCED` 和当前 Provider，控制台无 error/warning。
- 2026-07-29 GitHub 发布前安全检查：`.env` 已被 `.gitignore` 排除，`.env.example` 的 `AI_API_KEY` 为空；排除本机运行数据和依赖后，候选发布文件未发现 `sk-` API Key 形态内容。
- 2026-07-29 GitHub 发布：公开仓库 `LiXQ-7/AlgoShell` 创建成功，`main` 已推送；远端确认不存在 `.env`，且 `.env.example` 的 `AI_API_KEY` 为空。

## 关键文件

- `AlgoShell_产品设计文档_PRD.md`：权威产品需求。
- `README.md`：用户安装与使用说明。
- `configure-ai.bat`：通用 AI Provider 本机安全配置入口。
- `scripts/configure-ai.ps1`：安全写入通用 `AI_*` 本机配置。
- `apps/web/src/App.tsx`：统一命令/action 和主界面。
- `apps/web/src/PlanView.tsx`：七日计划卡片视图。
- `apps/web/src/AiSetupView.tsx`：AI 状态原因与配置指引。
- `apps/server/src/index.ts`：API 与业务编排。
- `apps/server/src/scheduler/scheduler.ts`：纯函数调度器。
- `apps/server/src/mastery/mastery.ts`：掌握度和复习间隔。
- `apps/server/src/judge/java.ts`：Java 本地判题。
- `apps/server/src/ai/openai-compatible.ts`：通用 OpenAI Chat Completions Provider。
- `data/problems/manifest.json`：100 题清单。
- `scripts/generate-problems.mjs`：题库生成源。
- `scripts/dev.mjs`：按健康检查顺序启动 API、Web 并打开浏览器。

## 接手步骤

1. 阅读本文件、`README.md` 与 PRD 中第 23—24 章。
2. 运行 `npm.cmd install`，再运行 `npm.cmd run typecheck`、`npm.cmd test` 和 `npm.cmd run validate:problems`。
3. 双击 `start.bat` 或运行 `npm.cmd run dev`，输入 `start 35` 验证训练闭环。
4. 如需更换 AI 服务或轮换 Key，双击 `configure-ai.bat` 填写 Provider、Base URL、模型和新 Key，再重启 `start.bat`。
5. 继续开发时优先从“下一步”第 1 项开始，并保持 API Key 只在本机 `.env`。
