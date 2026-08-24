# AlgoShell 当前进展

最后同步：2026-08-25
当前阶段：可运行的本地 MVP；已修复 Function 判题降级、代码感知 AI 教练与 Java 编辑体验，继续扩充题库本地判题覆盖

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

- SUMMARY 任务已补齐明确完成入口：底部显示“生成总结并完成”按钮；点击按钮或在当前 SUMMARY 任务输入 `summary`，都会生成每日总结、完成 SUMMARY，并在没有后续任务时结束当日会话。普通 `complete/done` 不再允许绕过总结生成。
- 答题工作区支持双向调整：题目/编辑器之间可横向拖动，编辑器/输出区之间可纵向拖动；比例保存在本机，双击分隔线可恢复默认布局。
- Monaco 编辑器切题和模式切换改为原子加载草稿，异步旧请求不会覆盖新题；每个题目/模式使用独立模型路径，并在容器尺寸变化后显式重新布局和恢复焦点，减少语法高亮丢失、光标错位和切换闪烁。
- Java 判题优先使用 `JAVA_HOME` 中的完整 JDK，并同时校验 `java` 与 `javac` 均为 17 或更高版本；开发启动器会从环境变量和常见 JDK 17 安装位置发现 Java。
- “两数之和”已增加 Function Harness；用户只需编写 `Solution.twoSum`，本地服务补充标准库 import 和测试入口，Run/Submit 分别运行公开/隐藏用例。
- “盛最多水的容器”已补齐 Function Harness、ACM 模板、2 个公开和 2 个隐藏用例；Function 与 ACM 均可用 Java 17 执行，不再出现模式不支持。
- “对称二叉树”已补齐 Function Harness、ACM 树构造模板、2 个公开和 2 个隐藏用例；用户在 Function 草稿中声明 `public class TreeNode` 时，后端会把辅助顶层类型安全转换为包级类型，避免 `TreeNode.java` 文件名冲突。
- Function 判题不再因缺少 Harness 返回 `SYSTEM_ERROR`：所有 Function 代码都会先用 Java 17 编译；有本地 Harness 时执行测试，没有时返回明确的 `UNVERIFIED / COMPILE_ONLY`，Submit 在 AI 可用时继续生成 `AI_REVIEWED` 静态审查，并明确不等同于 Accepted。
- 判题结果新增验证来源：`LOCAL_TESTS`、`COMPILE_ONLY`、`AI_REVIEW`；前端分别显示绿色通过、黄色未验证和蓝色 AI 审查卡，AI 卡包含置信度、真实代码复杂度、代码证据和可证风险。
- 每次 Run/Submit 现在把尝试关联到对应代码快照；每日/每周 Summary 会读取实际提交代码、题目与验证来源，逐题分析算法、变量、控制流及实际时空复杂度。历史平台错误与真实 CE/WA/TLE/RE 分开统计，SUMMARY 自身不再造成任务分类合计不一致。
- Hint、Explain、Diagnose 都直接接收当前编辑器代码；提示词禁止要求重复粘贴代码、禁止把 Harness 缺口当成用户错误，并要求风险必须有最小反例和真实控制流证据。
- Submit 的 AI 静态审查改用 Fast 模型，避免 Reasoner 阻塞判题；真实 Provider 回归使用 `deepseek-chat` 约 0.9 秒返回。若仍超时，界面只说明“审查未返回、正确性未验证”，不再暴露 `AI_TIMEOUT` 技术错误。
- Monaco 增加 Java 关键字、常用集合/API、成员方法和常用算法片段补全；浏览器实测输入 `Arr` 可出现 `Arrays`、`ArrayList`、`ArrayDeque` 建议，Function/ACM 切换后草稿与高亮可恢复。

- 工程基线：npm workspaces、TypeScript、React/Vite、Express、shared schema、`start.bat` 和自动端口选择。
- PowerShell/IDE 风格单页界面：顶部指标、左侧终端、题面、Monaco、Console/Tests/Learning/Coach 输出区。
- 终端 action：`start/today/review/practice/run/submit/hint/explain/diagnose/mode/skip/result/open/note/stats/weak/history/mistakes/templates/plan/summary/config/help/clear`。
- SQLite migration、训练会话、任务、草稿快照、尝试、提示、复习、官方结果、笔记和 AI 调用元数据。
- 工作日/周末确定性调度、阶段切换、复习债务、任务原因、Solve/Guided/Learn 判定、五维 mastery 与动态复习间隔。
- Java ACM 编译运行：唯一临时目录、单并发、参数数组启动、超时、256MB JVM 堆、1MB 输出捕获、公开/隐藏结果分级展示。
- OpenAI-compatible 服务端 Provider：可配置 Provider 名称、Base URL、Fast/Smart 模型、JSON mode 和超时；具备结构化任务、调用元数据、提示等级泄露检测和本地降级，前端无法读取 Key。
- 100 道稳定 ID 题库：本地改写摘要、专题、难度、目标层级、学习卡、Level 1—6 提示和 Recall 卡；schema 校验为 100/100。
- 10 道基础题具有完整 ACM 公开/隐藏用例：两数之和、盛最多水的容器、移动零、无重复字符最长子串、最大子数组和、搜索插入位置、有效括号、股票最佳时机、爬楼梯、对称二叉树；其中两数之和、盛最多水的容器和对称二叉树另有 Function Harness。
- README 已包含安装、首次训练、AI 配置、数据位置、安全边界和当前题库边界。
- 已修复 Windows 冷启动竞态：`scripts/dev.mjs` 先启动并轮询 `/api/health`，API 就绪后才启动 Vite，Web 就绪后才打开浏览器；API 与 Web 端口会作为一对共同检查。前端初始化请求另有 6 次短重试，避免瞬时连接失败。
- 已修复 `start 35` 与 `start 120` 无差异的问题：90 分钟及以上即使在工作日也使用长时模板；未产生提示、运行或完成记录的当天会话可用新分钟数安全重规划，已经开始训练时返回明确冲突提示而不覆盖记录。
- 已将 `plan` 的原始 JSON 输出替换为可展开的七日计划卡片：显示日期、工作日/周末预算、新题/复习数量、预计用时、题目名称、训练深度和调度原因。
- 已完善 AI 状态诊断与配置入口：顶部明确显示 `AI LOCAL · 未配置`，点击后展示本地降级原因和启用步骤；`/api/health`、`/api/config` 只返回配置状态与原因，不返回 Key。
- 已增加通用 `configure-ai.bat` 与 `scripts/configure-ai.ps1`：可配置任意 OpenAI Chat Completions 兼容 Provider，使用安全输入读取 Key，写入 Git 忽略的本机 `.env`，不在终端回显密钥；README 与 PRD 已同步。
- README 已重写为可公开发布的使用文档，覆盖产品简介、用途、环境要求、启动步骤、训练命令、DeepSeek/其他 Provider 配置、安全规范、判题边界和开发验证。
- 项目已初始化为 Git 仓库并发布到公开仓库 `https://github.com/LiXQ-7/AlgoShell`，默认分支为 `main`。

## 当前工作与未完成项

- 其余 90 道题的可执行本地 Harness/ACM 适配（适用时）和经参考实现校验的公开/隐藏测试尚未完成；目前仍可进行 Java 17 编译与 AI 静态审查。
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

- 当前 100 题“可学习、可编译”，但只有 10 题“可执行本地用例判题”；AI 静态审查可补充代码分析，但不能替代真实测试或 LeetCode Accepted。这仍是最大剩余工作量。
- Node 16 为兼容当前机器使用 Vite 4/旧版 tsx，`npm audit` 报告依赖链漏洞；本地仅监听 `127.0.0.1` 可降低暴露面，但升级到 Node 18/20 后应同步升级开发依赖。
- Function 模式缺失 Harness 时返回 `UNVERIFIED`，AI 已配置的 Submit 返回 `AI_REVIEWED`；两者都不会计为本地通过或用户代码错误。
- Provider 的 Base URL、模型名和 JSON mode 可通过环境变量覆盖；使用其他服务前需确认其兼容 `/chat/completions`、Bearer 鉴权及所选模型。
- 当前本机配置使用了曾在对话中明文出现的 Key，虽已验证可用，但安全上应视为已暴露并尽快轮换。

## 验证记录

- 2026-08-25 对称二叉树回归：包含 `public class TreeNode` 的 Function 写法公开 2/2、隐藏 2/2；ACM 树构造模板公开 2/2、隐藏 2/2；真实浏览器中 Function/ACM 按钮均可用、ACM `Main` 模板正常、切换后无控制台错误。
- 2026-08-25 AI 超时降级回归：Submit 审查路由到 Fast 模型，真实 DeepSeek 调用使用 `deepseek-chat` 约 0.9 秒返回；失败提示不再向用户显示原始 `AI_TIMEOUT`。
- 2026-08-25 自动验证更新：`npm.cmd run typecheck` 通过；3 个测试文件共 36 项 Vitest 通过（新增辅助类型源码适配 3 项）；题库校验 100/100、0 错误；生产构建通过。
- 2026-08-25 判题与 AI 教练回归：盛最多水的容器 Function 公开 2/2、隐藏 2/2、ACM 公开 2/2 均为 `PASSED / LOCAL_TESTS`；三数之和无 Harness 时 Java 17 编译后返回 `UNVERIFIED / COMPILE_ONLY`，不再返回 `SYSTEM_ERROR`。
- 2026-08-25 Summary 真实 AI 回归：DeepSeek Summary 能引用“盛最多水的容器”的 `left/right/area/ans`、`while` 与分支移动规则，推导 O(n) 时间、O(1) 空间，并把旧 `SYSTEM_ERROR` 限制为无测试证据而非用户错误。风险控制提示已继续收紧，要求最小反例必须真实走到错误表达式。
- 2026-08-25 编辑器浏览器回归：Java 补全建议出现 `Arrays`、`ArrayList`、`ArrayDeque`；盛最多水的容器可在 Function/ACM 间切换，ACM `Main` 模板正常，切回后 Function 草稿恢复。
- 2026-08-25 自动验证：`npm.cmd run typecheck` 通过；33 项 Vitest 通过；题库校验 100/100、0 错误；生产 Web/Server 构建通过。
- 2026-08-14 SUMMARY 完成入口回归：真实浏览器恢复到 3/3 SUMMARY 任务后，中文按钮与说明正常显示、按钮可用、Run/Submit 自动禁用，页面控制台无 error/warning；未点击按钮，避免修改用户当前训练记录。`npm.cmd run typecheck`、33 项 Vitest、100/100 题库校验和生产构建均通过。
- 2026-08-12 编辑器与布局回归：浏览器中横向、纵向拖动后 Monaco 尺寸同步变化；ACM/Function 切换与刷新后 Java token 高亮和编辑焦点保持正常，布局比例可恢复。
- 2026-08-12 Java 17 回归：健康检查返回完整 JDK 17 可用；两数之和 ACM Run/Submit 公开与隐藏用例均为 2/2；Function 模式（无显式 import 的 `Solution` 代码）Run/Submit 公开与隐藏用例均为 2/2。
- 2026-08-12 完整自动验证：`npm.cmd run typecheck` 通过；`npm.cmd test` 通过（2 个测试文件、33 个场景）；`npm.cmd run validate:problems` 通过（100/100）；`npm.cmd run build` 通过。

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
