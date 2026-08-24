# AlgoShell

AlgoShell 是一个面向 Java 秋招准备的本地 Hot 100 训练工具。它把题单、训练计划、间隔复习、Java 编码、本地判题和 AI 教练整合到一个 PowerShell / IDE 风格的浏览器界面中。

打开应用后，只需输入：

```text
start 35
```

系统便会根据可用时间、覆盖进度、复习到期情况和历史表现安排当天任务。训练数据、代码草稿和 API 配置均保存在本机。

## 主要用途

- 在 35—40 天内有节奏地覆盖 LeetCode Hot 100。
- 区分独立完成（Solve）、提示完成（Guided）和学习覆盖（Learn），避免把“看懂题解”误认为真正掌握。
- 根据遗忘风险、薄弱项和复习债务自动安排新题与复习。
- 在浏览器内编写 Java 17，运行公开测试和本地隐藏测试。
- 使用分级提示、学习卡和 AI 诊断定位思路、边界与代码问题。
- 保留训练历史、错题、掌握度、笔记和七日计划。

## 产品特点

- 单用户、本地运行，无需注册或云服务。
- PowerShell 风格终端 + Monaco Java 编辑器。
- Java 关键字、常用集合/API 和算法片段自动补全。
- 工作日短时训练与周末长时训练采用不同任务结构。
- Function 和 ACM 两种训练模式。
- 100 道 Hot 100 结构化学习数据。
- 本地模式始终可用；未配置 AI 或网络异常不会阻塞训练。
- 支持 DeepSeek，以及其他兼容 OpenAI Chat Completions 的 AI Provider。

## 运行环境

- Windows 10/11
- Node.js 16.20 或更高
- npm
- Java 17 JDK

没有 Java 时仍可使用题目学习、复习、计划和统计，但不能执行本地 Java 判题。

## 快速运行

### 方式一：双击启动

在项目根目录双击：

```text
start.bat
```

首次启动会自动安装依赖，然后依次启动本地 API 和 Web 页面。默认地址为：

```text
Web  http://127.0.0.1:4317
API  http://127.0.0.1:3317
```

端口被占用时会自动选择新的可用端口。启动完成后浏览器会自动打开。

### 方式二：PowerShell 启动

```powershell
npm.cmd install
npm.cmd run dev
```

## 开始训练

在左侧终端输入：

```text
start
```

也可以指定今天可投入的分钟数：

```text
start 20
start 35
start 120
```

- `start 35`：短时训练，通常包含主练题、快速覆盖题和总结。
- `start 120`：长时训练，通常包含 2 道 Solve、1 道 Guided、2 道 Learn 和总结。
- 到期复习会优先插入计划。
- 尚未开始训练时，可以用新的分钟数重新规划。
- 已经使用提示、运行代码或完成任务后，系统不会覆盖当天记录。

常用命令：

```text
today                  查看今日计划
plan                   查看未来七天计划
run                    运行公开测试
submit                 运行本地隐藏测试
hint [1-6]             获取分级提示
explain                查看学习卡或 AI 个性化解释
diagnose               诊断最近一次失败
mode function|acm      切换训练模式
result ac|wa|tle|re    记录 LeetCode 官方结果
stats                  查看覆盖与完成深度
weak                   查看薄弱专题
summary day|week       生成每日或每周总结
config ai              查看 AI Provider 状态
help                   查看完整命令列表
```

编辑器快捷键：

- `Ctrl+S`：保存草稿
- `Ctrl+Enter`：运行公开测试
- `Ctrl+Shift+Enter`：运行隐藏测试

## 配置 AI API

AI 是可选增强能力。未配置 AI 时，固定提示、学习卡、调度、复习、本地判题和本地总结仍然可用。

### 推荐方式：配置向导

1. 准备 AI Provider 的 API Key。
2. 双击项目根目录的 `configure-ai.bat`。
3. 按提示填写：
   - Provider 名称
   - API Base URL
   - 快速模型
   - 智能模型
   - 是否支持 JSON `response_format`
   - API Key
4. 关闭正在运行的 AlgoShell。
5. 重新双击 `start.bat`。

配置成功后，页面右上角会从 `AI LOCAL · 未配置` 变为 `AI BALANCED`。

### DeepSeek 配置示例

配置向导默认值已经适用于 DeepSeek：

```text
Provider       DeepSeek
Base URL       https://api.deepseek.com
Fast model     deepseek-chat
Smart model    deepseek-reasoner
JSON mode      true
```

只需要在安全输入提示中填写自己的 API Key。不要把真实 Key 写入 README、源码或截图。

### 其他 AI Provider

其他服务只要兼容以下接口即可接入：

```text
POST {AI_BASE_URL}/chat/completions
Authorization: Bearer <API Key>
```

也可以复制 `.env.example` 为 `.env`，然后仅在本机填写：

```dotenv
AI_PROVIDER=YourProvider
AI_API_KEY=your_api_key_here
AI_BASE_URL=https://provider.example.com/v1
AI_FAST_MODEL=your-fast-model
AI_SMART_MODEL=your-smart-model
AI_JSON_MODE=false
AI_TIMEOUT_MS=40000
```

如果 Provider 不支持 `response_format: { "type": "json_object" }`，请将 `AI_JSON_MODE` 设置为 `false`。

### API Key 安全

请务必遵守：

- 不要把真实 API Key 写入任何源码、README、Issue、Commit、截图或聊天记录。
- `.env` 已在 `.gitignore` 中排除，不会被正常 Git 提交。
- Key 仅由本地 Node 服务读取，不会返回前端、写入 SQLite 或输出到日志。
- `.env.example` 只能保存空值或占位符。
- 如果 Key 曾出现在聊天、截图或 Git 历史中，应立即在 Provider 控制台撤销并重新生成。
- 提交代码前建议执行密钥扫描，并再次确认 `git status` 中没有 `.env`。

## 题库与判题边界

- `data/problems` 包含 100 道题的本地改写摘要、专题、训练深度、学习卡、1—6 级提示和 Recall 卡。
- 当前有 10 道基础题具备完整 ACM 公开/隐藏测试；“两数之和”“盛最多水的容器”和“对称二叉树”还支持 Function 本地测试。
- Function 编译会兼容 LeetCode 常见的 `public class TreeNode/ListNode` 辅助定义，不再因为辅助类型与 `Solution.java` 文件名不同而误报编译错误。
- 所有 Function 代码都会先使用 Java 17 编译；缺少可执行 Harness 时不会再报系统错误，而会明确显示“仅编译通过、正确性未验证”。
- 对尚无本地测试的题，配置 AI 后执行 `submit` 会基于当前编辑器代码生成静态审查，包括实际算法、时空复杂度、代码证据和潜在反例；AI 审查不能替代真实测试。
- Submit 静态审查默认使用 Fast 模型以降低等待时间；AI 超时时训练流程继续，并保留“正确性未验证”的诚实状态。
- 判题卡会明确区分：`LOCAL_TESTS`（真实本地用例）、`COMPILE_ONLY`（仅编译）、`AI_REVIEW`（AI 静态审查）。
- 本地 `submit` 通过不等同于 LeetCode 官方 Accepted。
- 可以使用 `open` 打开官方题目，再通过 `result ac` 等命令记录官方结果。
- 项目不会读取 LeetCode Cookie，也不会自动登录或代替用户提交。

## 本地数据

```text
data/database/algoshell.db  训练状态、草稿、尝试和笔记
data/backups/               本地数据库备份
workspace/runs/             临时 Java 运行目录
.env                        本机 AI 配置，不会提交
```

## 开发与验证

```powershell
npm.cmd install
npm.cmd run typecheck
npm.cmd test
npm.cmd run validate:problems
npm.cmd run build
```

主要技术栈：

- React + TypeScript + Vite
- Monaco Editor
- Node.js + Express
- SQLite
- Java 17
- OpenAI-compatible Chat Completions API

## 当前状态

项目已经具备可运行的本地 MVP：训练调度、复习、代码编辑、本地判题、统计、七日计划和 AI Provider 接入均可使用。

当前最大的后续工作是为剩余题目逐步补齐高质量 Function Harness、ACM 适配和经参考实现验证的隐藏测试。
