# AlgoShell 产品设计文档（PRD）

> 面向 Codex 实现  
> 文档版本：v1.0  
> 日期：2026-07-27  
> 产品形态：单用户、本地运行的 Web 应用  
> 默认技术栈：React + Monaco Editor + Node.js + SQLite + Java 17

---

## 0. 文档目的

本文档定义 AlgoShell MVP 的产品范围、交互规则、训练算法、数据契约、异常处理、验收标准和开发顺序，供 Codex 直接据此实现。

本文中的“必须”属于 MVP 验收项；“应”属于推荐实现；“可”属于后续增强项。实现时不得擅自扩展为多用户、云端平台或完整在线判题系统。

---

## 1. 产品概述

### 1.1 产品名称

**AlgoShell**

### 1.2 一句话定位

面向 Java 秋招求职者的终端式 Hot 100 自适应训练工具：用户只需输入 `start`，系统便在有限时间内自动安排新题、复习和总结，并提供本地 Java 编码、分级提示与可配置 AI 教练能力。

### 1.3 核心问题

传统刷题方式通常要求用户自己决定：

- 今天刷什么；
- 哪些题需要复习；
- 不会时应看到多少提示；
- “看懂题解”是否算掌握；
- 工作日时间不足时如何缩减任务；
- 错题、提示依赖和 ACM 输入输出错误如何沉淀。

AlgoShell 的核心价值不是展示题库，而是替用户完成训练决策：

> 用户负责练习，系统负责选题、控时、复习、诊断与记录。

### 1.4 产品原则

1. **覆盖优先但不伪装掌握**：35—40 天接触完 Hot 100，但明确区分独立完成、提示完成和学习覆盖。
2. **复习优先**：到期复习和高风险遗忘题优先于低价值新题。
3. **主动回忆优先**：复习不等于反复完整重写，优先检查题型识别、核心思路和关键代码。
4. **渐进式帮助**：提示从观察方向逐级开放到完整讲解，避免一次性暴露答案。
5. **本地确定性、AI 增强**：训练调度、判题、掌握度和复习日期由本地逻辑决定；AI 负责解释、诊断、评价和总结。
6. **个人工具优先**：不为商业化、多用户和跨端同步增加复杂度。
7. **安全默认**：API Key 不进入源码、数据库、日志、前端或题库。

---

## 2. 用户画像与使用环境

### 2.1 核心用户

- 单一用户，自用；
- 准备秋招，目标偏 Java 后端或 Java + AI 应用开发；
- LeetCode Hot 100 基本没有系统刷过；
- 主要语言为 Java 17；
- 工作日每天可投入 30—40 分钟；
- 周末每天可投入约 120 分钟；
- 希望在 35 天左右覆盖 Hot 100，允许因漏练或复习债务弹性延长至 40 天；
- 偏好 PowerShell/IDE 风格，但不需要真正的纯命令行程序。

### 2.2 使用环境

- Windows 本机；
- 已安装 Node.js、包管理器和 Java 17 JDK；
- 浏览器访问本地地址；
- SQLite 数据和用户代码保存在本地；
- 通过 `start.bat` 一键启动服务并打开浏览器；
- 已配置的 AI Provider 可用时启用 AI，断网或未配置时仍可完成主要训练；默认示例为 DeepSeek，同时支持其他 OpenAI Chat Completions 兼容服务。

### 2.3 典型使用场景

工作日晚间，用户双击 `start.bat`，在左侧终端输入：

```text
> start 35
```

系统生成 35 分钟任务：1 次微复习、1 道主练题、1 道快速覆盖题和 2 分钟总结。用户在右侧阅读题目并写 Java，必要时逐级请求提示。完成后系统记录代码结果、提示等级、耗时和错误原因，并安排下一次复习。

---

## 3. 产品目标与成功指标

### 3.1 训练目标

默认在 **35 天**覆盖 Hot 100；若发生漏练、复习债务或用户主动降低每日时长，计划可自动延长，但最长不超过 **40 天**。

“覆盖”不等于全部独立 AC。100 道题按完成深度分为：

| 完成层级 | 定义 | 单题目标时长 | 建议数量 |
|---|---|---:|---:|
| Solve | 独立完成主要思路和代码，本地测试通过；允许少量非解法型帮助 | 20—35 分钟 | 35—40 |
| Guided | 在分级提示下完成核心逻辑或完整代码 | 10—20 分钟 | 35—40 |
| Learn | 理解题意、方法、核心代码并完成一次回忆卡 | 5—10 分钟 | 20—30 |

目标总数必须为 100。系统可根据实际表现升级题目层级，例如 `Learn → Guided → Solve`。

### 3.2 首页指标

顶部状态栏至少显示：

```text
Day 09/35 | Coverage 27/100 | Solve 9 | Guided 11 | Learn 7 | Review Debt 3
```

核心统计定义：

- **Coverage**：已达到 Solve、Guided 或 Learn 任一层级的不同题目数；
- **Solve**：当前最高完成层级为 Solve 的题目数；
- **Guided**：当前最高完成层级为 Guided，尚未升级到 Solve 的题目数；
- **Learn**：当前最高完成层级为 Learn，尚未升级到 Guided 的题目数；
- **Review Debt**：复习到期日早于今天且未完成的复习任务数；
- **Local Pass**：最近一次本地隐藏测试全部通过；
- **Official Result**：用户手动登记的 LeetCode 结果。

### 3.3 MVP 成功标准

1. 用户能通过 `start.bat` 启动系统；
2. 系统能按日期、可用时间和历史表现生成当天计划；
3. 用户能完成题目、Java 编译运行、本地测试、提示和复习闭环；
4. 重启后所有训练记录、代码草稿和计划仍存在；
5. 未配置 AI Provider 或网络异常时，训练主流程仍可用；
6. 35—40 天计划能够覆盖 100 个题目条目，且不会把 Learn 显示成独立完成；
7. API Key 不出现在任何仓库文件、响应给前端的配置、数据库和日志中。

---

## 4. 训练周期与每日节奏

### 4.1 周期阶段

覆盖模式默认分为四阶段：

| 阶段 | 日期 | 主要目标 | 调度特征 |
|---|---|---|---|
| 建模期 | Day 1—3 | 建立使用习惯并学习基础题型 | 简单题优先，低复习量，教学提示更宽松 |
| 专题覆盖期 | Day 4—24 | 按知识依赖覆盖主要专题 | 当前专题为主，混入旧专题复习 |
| 混合识别期 | Day 25—32 | 训练不看标签识别算法 | 默认隐藏专题和难度，增加跨专题抽查 |
| 冲刺补齐期 | Day 33—40 | 补齐未覆盖题、修复高频错题 | 减少低价值完整重写，优先覆盖缺口和 A 级题 |

建议专题顺序：

```text
数组与哈希
→ 双指针
→ 滑动窗口与子串
→ 链表
→ 栈
→ 二叉树
→ 图与搜索
→ 回溯
→ 二分查找
→ 堆
→ 贪心
→ 动态规划
→ 技巧与综合
```

题库可为每题声明前置专题，但调度器不得连续安排超过 3 道同专题新题。

### 4.2 工作日默认节奏

默认预算 35 分钟：

| 任务 | 数量 | 预算 |
|---|---:|---:|
| 微复习 | 1 道 | 3—5 分钟 |
| 主练题 | 1 道 | 20—25 分钟 |
| 快速覆盖题 | 1 道 | 8—10 分钟 |
| 当日总结 | 1 次 | 2 分钟 |

若输入 `start 20`：

- 优先保留 1 次到期复习；
- 主练题可改为 Guided；
- 若仍超时，取消快速覆盖题；
- 不得生成预计超过 22 分钟的计划。

若输入 `start 40`：

- 保留默认结构；
- 可增加 1 次 Recall 复习，但不得额外增加第二道高难主练题。

### 4.3 周末默认节奏

默认预算 120 分钟：

| 任务 | 数量 | 预算 |
|---|---:|---:|
| 到期复习 | 3—5 道 | 15—20 分钟 |
| Solve 主练题 | 2 道 | 45—55 分钟 |
| Guided 引导题 | 1 道 | 15—20 分钟 |
| Learn 快速覆盖题 | 2 道 | 15—20 分钟 |
| Full Rebuild | 1 道 | 10—15 分钟 |
| 周总结 | 1 次 | 5 分钟 |

任务总预计时长不得超过输入预算的 105%。

### 4.4 漏练与计划延期

某天未训练时：

1. 不把所有未完成新题直接堆到次日；
2. 到期复习保留并重新排序；
3. 未完成的主练题顺延；
4. 未完成的快速覆盖题回到候选池；
5. 若按剩余每日预算无法在 Day 35 覆盖 100 题，则逐日延长，最多延长至 Day 40；
6. Day 40 仍有缺口时，系统将剩余题切换为 Learn 优先，并明确提示“覆盖目标存在风险”。

---

## 5. 信息架构与主界面

### 5.1 单页应用布局

主界面采用左侧终端、右侧题目与编辑器的 IDE 布局：

```text
┌──────────────────────────────────────────────────────────────────┐
│ AlgoShell | Day 09/35 | Coverage 27/100 | Review Debt 3 | AI ● │
├──────────────────────┬───────────────────────────────────────────┤
│ Terminal             │ Problem / Review / Stats / Plan          │
│                      ├───────────────────────────────────────────┤
│ > start              │ Monaco Java Editor                       │
│ > hint               │                                           │
│ > run                │                                           │
│                      ├───────────────────────────────────────────┤
│ Session Plan         │ Console / Tests / Learning Card / Coach  │
└──────────────────────┴───────────────────────────────────────────┘
```

建议尺寸：

- 左栏：页面宽度 26%，最小 300px，最大 420px；
- 右栏：剩余宽度；
- 右上题目区与编辑器可纵向拖动调整；
- 右下输出区高度可调整，默认 28%；
- 浏览器宽度小于 1000px 时允许左栏折叠，但 MVP 不专门适配手机。

### 5.2 左侧终端

包含：

- 命令历史；
- 输入行；
- 系统反馈；
- 当前训练计划；
- 当前任务序号与剩余预计时间；
- 快捷命令提示。

终端命令与按钮调用同一套 action，不得维护两套业务逻辑。

### 5.3 右上内容区

根据当前上下文展示：

- 新题题面；
- 复习卡；
- 学习卡；
- 统计；
- 未来计划；
- 薄弱项；
- 算法模板。

题目默认不展示算法标签；Day 25 后默认同时隐藏难度。

### 5.4 右中编辑器

Monaco Editor 必须支持：

- Java 语法高亮；
- 行号；
- 自动缩进；
- 括号匹配；
- `Ctrl+S` 保存；
- `Ctrl+Enter` 运行；
- `Ctrl+Shift+Enter` 提交本地隐藏用例；
- 每题、每模式分别保存草稿；
- Function 与 ACM 模式模板切换；
- 运行中禁用重复提交。

MVP 不要求 Java Language Server、智能重构或复杂补全。

### 5.5 右下输出区

使用标签页：

- Console：编译错误、程序标准输出与标准错误；
- Tests：公开/隐藏测试结果；
- Learning Card：分级提示与固定讲解；
- AI Coach：已配置 Provider 的流式解释、诊断和总结。

隐藏测试失败时不得默认显示完整期望输出与隐藏输入；可显示错误类别和一个最小化失败样例，前提是该样例允许公开。

---

## 6. 命令体系

### 6.1 MVP 命令

| 命令 | 示例 | 行为 |
|---|---|---|
| `start [minutes]` | `start 35` | 生成或继续今日训练 |
| `today` | `today` | 显示今日计划和完成情况 |
| `review` | `review` | 只生成到期复习会话 |
| `practice <topic>` | `practice dp` | 发起专题加练，不计入默认今日计划 |
| `run` | `run` | 运行公开测试或当前自定义输入 |
| `submit` | `submit` | 运行本地隐藏测试 |
| `hint [level]` | `hint 2` | 请求下一级或指定级别提示 |
| `explain` | `explain` | 打开固定讲解；AI 可结合当前代码补充 |
| `diagnose` | `diagnose` | 基于最近一次失败请求 AI 诊断 |
| `mode [function\|acm]` | `mode acm` | 查看或切换当前题模式 |
| `skip` | `skip` | 暂时跳过当前任务并记录原因 |
| `result <ac\|wa\|tle\|re>` | `result ac` | 手动记录 LeetCode 官方结果 |
| `open` | `open` | 在新标签页打开当前 LeetCode 题目 |
| `note [text]` | `note 注意 left 不回退` | 保存当前题个人笔记 |
| `stats` | `stats` | 展示覆盖与掌握统计 |
| `weak` | `weak` | 展示薄弱专题、题目和错误类型 |
| `history` | `history` | 展示训练历史 |
| `mistakes` | `mistakes` | 展示错误记录 |
| `templates [topic]` | `templates window` | 展示算法模板 |
| `plan` | `plan` | 展示未来 7 天预估计划 |
| `summary [day\|week]` | `summary week` | 生成本地或 AI 总结 |
| `config` | `config` | 展示配置面板 |
| `help` | `help` | 展示命令帮助 |
| `clear` | `clear` | 只清空终端显示，不删除历史 |

### 6.2 命令解析规则

- 忽略首尾空格，命令名不区分大小写；
- 参数无效时返回用法，不修改状态；
- 训练中执行 `stats` 等查看命令，不应丢失当前题和计时状态；
- `start` 若当日已有未完成会话，默认继续；`start --new` 不属于 MVP；
- 自然语言命令不属于 MVP，后续可由 AI 解析为白名单 action；
- 任何 AI 输出不得直接作为可执行命令。

---

## 7. 题目训练模式

### 7.1 Function 模式

适用于链表、二叉树、复杂图结构和平台预构造对象的题目。

页面展示：

- 函数签名；
- 必要的数据结构定义；
- `Solution` 模板；
- 测试 Harness 由系统在后端拼装，用户不可编辑；
- 用户代码只实现目标函数。

示例：

```java
class Solution {
    public int lengthOfLongestSubstring(String s) {
        // write your code
    }
}
```

### 7.2 ACM 模式

适用于数组、字符串、哈希、双指针、滑动窗口、栈、二分、动态规划、贪心、矩阵及部分图论题。

页面展示：

- 输入格式；
- 输出格式；
- 样例；
- 数据范围；
- 完整 `Main` 类模板；
- 用户负责输入解析、算法与输出。

示例：

```java
import java.io.*;
import java.util.*;

public class Main {
    public static void main(String[] args) throws Exception {
        BufferedReader br = new BufferedReader(
            new InputStreamReader(System.in)
        );

        // write your code
    }
}
```

### 7.3 模式选择规则

- 每题在题库中声明 `defaultMode`；
- 用户可通过 `mode` 切换；
- 两种模式的代码草稿分别保存；
- 切换模式不改变题目完成层级；
- 某题只配置一种模式时，切换命令应说明“不支持”，不得生成未经验证的临时代码 Harness；
- 树和链表题默认 Function，避免把训练时间消耗在序列化和反序列化；
- 核心题后期可被调度为“模式转换加练”，但不属于首次覆盖的硬性要求。

---

## 8. 新题流程

### 8.1 状态机

```text
PLANNED
→ READING
→ THINKING
→ CODING
→ RUNNING
→ LOCAL_SUBMITTED
→ RESULT_RECORDED
→ REFLECTION
→ COMPLETED
```

允许路径：

- 任意训练状态 → `PAUSED`；
- `READING/THINKING/CODING` → `SKIPPED`；
- `RUNNING` 失败 → 返回 `CODING`；
- `LOCAL_SUBMITTED` 失败 → 返回 `CODING` 或进入 `DIAGNOSIS`；
- 未登记官方结果也可完成本地任务，但题目显示“官方结果未记录”。

### 8.2 Solve 主练题

1. 展示题面，默认隐藏标签；
2. 用户阅读并可填写可选预测：
   - 预计题型；
   - 预计复杂度；
   - 预计完成时间；
3. 独立思考与编码；
4. 运行公开测试；
5. 必要时请求分级提示；
6. 本地 Submit 运行隐藏测试；
7. 可打开 LeetCode 并手动提交；
8. 用户执行 `result ac/wa/tle/re`；
9. 选择或确认错误标签；
10. 系统计算本次表现并安排复习；
11. 保存 1—3 句个人总结。

### 8.3 Guided 引导题

1. 展示题面；
2. 保留短暂独立思考时间；
3. 系统允许更快进入 Level 2—4 提示；
4. 用户至少完成核心逻辑；
5. 通过公开测试或完成核心代码补全；
6. 记录最高提示等级；
7. 完成层级最高为 Guided，除非符合 Solve 升级条件。

### 8.4 Learn 快速覆盖题

1. 先阅读题面并进行 1—2 分钟方向猜测；
2. 展示结构化学习卡；
3. 用户阅读通俗解释、关键观察和核心代码；
4. 完成一张 60—120 秒 Recall 卡；
5. 自评并由系统记录；
6. 安排次日短复习；
7. Learn 不要求完整代码或本地隐藏测试。

### 8.5 完成层级判定

建议规则：

```text
Solve:
- 完整代码通过本地隐藏测试；
- 最高帮助等级 <= 2；
- 未查看完整代码；
- 实际耗时不超过题目 Solve 预算的 160%。

Guided:
- 完整代码或核心代码通过对应测试；
- 最高帮助等级为 3—5，或看过算法结构；
- 未完全依赖复制完整答案。

Learn:
- 已查看结构化讲解；
- 已完成 Recall 卡；
- 未达到 Guided 或 Solve。
```

查看 Level 6 完整讲解后，本次最高只能记为 Learn；后续独立复习可升级。

---

## 9. 复习系统

### 9.1 复习目标

每道题分别检查：

- **Recognition**：能否识别题型和适用算法；
- **Reasoning**：能否说清核心状态、过程、边界和复杂度；
- **Implementation**：能否写出关键代码；
- **Speed**：能否在合理时间内完成；
- **Stability**：多次间隔复习是否稳定成功。

### 9.2 四种复习形式

| 类型 | 内容 | 默认时长 | 触发条件 |
|---|---|---:|---|
| Idea Recall | 回答题型、状态、边界、复杂度 | 1—2 分钟 | 首次短复习、已较熟练题 |
| Code Skeleton | 补全 2—8 行关键代码 | 3—5 分钟 | 思路正确但实现较弱 |
| Bug Fix | 修复一个典型错误 | 3—5 分钟 | 有重复错误标签或边界问题 |
| Full Rebuild | 完整 Function/ACM 编码 | 10—25 分钟 | 连续失败、A 级核心题、长期未完整编码 |

### 9.3 复习流程

```text
展示题名和一句话描述
→ 限时主动回忆
→ 用户作答/补码/修错
→ 本地规则与可选 AI 评估
→ 用户选择 1—5 自评
→ 合并客观证据
→ 更新维度分数
→ 计算下次复习日期
```

自评分：

| 分数 | 含义 |
|---:|---|
| 1 | 完全忘记 |
| 2 | 记得题型，想不起完整思路 |
| 3 | 思路正确，核心代码写不出 |
| 4 | 能完成但有卡顿或小错 |
| 5 | 快速且完整 |

### 9.4 初始复习间隔

默认间隔序列：

```text
首次覆盖 → +1 天 → +3 天 → +7 天 → +14 天 → +28 天
```

动态调整：

| 结果 | 下次间隔 | 复习形式 |
|---|---:|---|
| 1 完全忘记 | 1 天 | Full Rebuild 或 Guided |
| 2 仅记得题型 | 2 天 | Idea Recall + Code Skeleton |
| 3 思路对、代码弱 | 3 天 | Code Skeleton |
| 4 基本完成 | 当前间隔 × 1.5，最大 14 天 | Recall/Bug Fix |
| 5 快速完整 | 当前间隔 × 2，最大 28 天 | Recall |

额外规则：

- 连续两次复习失败：下一次强制 Full Rebuild；
- 查看 Level 5 或 Level 6：下次间隔不超过 2 天；
- 本地隐藏测试失败：Implementation 至少下降 6 分；
- 官方 AC：Implementation 增加，但不能覆盖提示依赖的扣分；
- 复习逾期天数越高，优先级越高，但不得一次性把全部债务塞进当天。

---

## 10. 分级提示与学习卡

### 10.1 提示等级

| 等级 | 展示内容 | 禁止内容 |
|---:|---|---|
| 0 | 独立思考，无提示 | 一切解法信息 |
| 1 | 一个观察方向 | 算法名称、伪代码、代码 |
| 2 | 明确核心算法 | 完整流程、代码 |
| 3 | 核心变量与结构 | 可直接复制的代码 |
| 4 | 伪代码 | Java 完整实现 |
| 5 | 5—15 行关键代码 | 完整 ACM/Function 答案 |
| 6 | 完整讲解、复杂度、完整实现 | 无 |

每次请求必须记录：

- 时间；
- 请求等级；
- 来源（本地固定卡或 AI）；
- 是否成功返回；
- 展示内容版本；
- 请求前的训练状态。

默认 `hint` 只打开下一级；跳级 `hint 4` 前显示确认提示，但不阻止用户。

### 10.2 固定学习卡结构

每道题至少包含：

1. 人话解释；
2. 暴力思路与不足；
3. 关键观察；
4. 核心算法过程；
5. Java 核心代码；
6. 易错点；
7. 时间与空间复杂度；
8. 与相似题的联系。

### 10.3 AI 提示约束

AI 请求必须携带：

- 当前题结构化摘要；
- 当前提示等级；
- 已显示过的提示；
- 用户代码的必要片段；
- 当前错误类别；
- 严格的禁止内容。

AI 输出超出当前等级时，服务端应丢弃该响应并回退到本地固定提示，不直接展示。

---

## 11. OpenAI-compatible AI Provider 接入

### 11.1 角色边界

本地引擎负责：

- 每日任务选择；
- 复习日期；
- 掌握度更新；
- Java 编译运行和测试判定；
- 覆盖统计；
- 固定学习卡；
- 无网降级。

AI Provider 负责：

- 分级个性化提示；
- 基于当前卡点的通俗解释；
- 代码错误诊断；
- 复习自然语言回答评估；
- 每日/每周总结；
- 只提供“建议”的计划微调原因。

AI 不得：

- 直接修改训练记录；
- 直接决定题目已掌握；
- 执行系统命令；
- 读写任意本地文件；
- 自动提交 LeetCode；
- 在用户未请求 `fix` 的情况下给出完整修复代码；
- 覆盖本地调度硬约束。

### 11.2 API 配置

服务端环境变量：

```dotenv
AI_PROVIDER=DeepSeek
AI_API_KEY=
AI_BASE_URL=https://api.deepseek.com
AI_FAST_MODEL=deepseek-chat
AI_SMART_MODEL=deepseek-reasoner
AI_JSON_MODE=true
AI_TIMEOUT_MS=40000
```

要求：

- 允许通过环境变量覆盖模型名；
- 快速模型用于提示、简评和短复习评估；
- 智能模型用于代码诊断、周总结和复杂解释；
- 不把价格写死在代码中；
- 状态栏可显示会话 token 用量，但成本估算只在配置了单价时显示。

DeepSeek 是默认示例 Provider。其他服务只要兼容 OpenAI Chat Completions 的请求、鉴权和响应格式，也可通过 `AI_PROVIDER`、`AI_BASE_URL` 与模型变量接入。基础地址、模型名及 `response_format` 支持情况必须以所选 Provider 的官方文档为准。

### 11.3 AI 使用强度

| 模式 | 调用范围 |
|---|---|
| Minimal | 仅 `explain`、`diagnose`、`summary` 主动调用 |
| Balanced | 提示、诊断、复习评价、每日总结调用；默认 |
| Intensive | 每题过程评价和个性化反馈也调用 |

配置缺失时自动变为 Local，不报阻断错误。

### 11.4 结构化输出

代码诊断、复习评价和计划建议必须请求 JSON 输出，并在服务端使用 schema 校验。官方 JSON Output 要求设置 `response_format: { "type": "json_object" }`，同时在提示词中明确要求 JSON 并给出示例；仍需处理空内容和截断，详见[官方 JSON Output 文档](https://api-docs.deepseek.com/guides/json_mode/)。

诊断响应示例：

```json
{
  "errorType": "BOUNDARY_ERROR",
  "lineStart": 17,
  "lineEnd": 17,
  "summary": "左指针可能回退",
  "explanation": "更新左边界时没有保留当前 left 的较大值",
  "nextHint": "检查重复字符是否仍位于当前窗口",
  "revealFix": false,
  "confidence": 0.91
}
```

服务端校验：

- 枚举字段必须在白名单内；
- 行号必须落在用户代码范围；
- `revealFix=false` 时响应不得含完整答案代码块；
- `confidence` 必须为 0—1；
- 无法校验则不落库为正式诊断，只显示“AI 诊断不可用”并给出本地错误信息。

### 11.5 流式响应

- `explain`、`diagnose`、`summary` 应支持流式显示；
- 客户端允许用户停止生成；
- 停止生成的半截内容不得用于掌握度评分；
- 自行解析 SSE 时需忽略 `: keep-alive` 注释；官方说明见[Rate Limit & Isolation](https://api-docs.deepseek.com/quick_start/rate_limit)；
- JSON 任务优先非流式，完整接收后再校验。

### 11.6 超时、重试与错误映射

| 状态 | 用户提示 | 行为 |
|---:|---|---|
| 400/422 | 请求格式无效 | 记录脱敏错误，回退本地内容，不自动重试 |
| 401 | API 配置无效 | 提示重新配置，不回显 Key |
| 402 | 余额不足 | 切换 Local 模式 |
| 429 | 请求过快 | 1 秒、3 秒退避重试，最多 2 次 |
| 500/503 | 服务异常/繁忙 | 退避重试，失败后本地降级 |
| 超时 | AI 暂时不可用 | 可手动重试，训练流程继续 |

错误语义以所选 Provider 的官方错误码为准。

### 11.7 缓存

- 固定学习卡不调用 AI；
- 相同题目、相同提示等级、无用户上下文的解释可保存本地缓存；
- 含用户代码的诊断不得跨代码版本复用；
- 缓存键至少包含：模型、提示模板版本、题目 ID、任务类型、提示等级、代码哈希；
- Provider 服务端缓存能力不作为本地缓存的替代；本地仍应独立做结果缓存。

### 11.8 API Key 安全规范

必须满足：

1. 只在 Node.js 服务端读取 `AI_API_KEY`；
2. 前端不得直接调用第三方 AI Provider；
3. API Key 不写入源码、`.env.example` 实值、SQLite、LocalStorage、题库、日志、错误栈或网络响应；
4. `.env` 加入 `.gitignore`；
5. 日志中对 `Authorization` 头和疑似 `sk-` 前缀内容脱敏；
6. 配置检查接口只返回 `configured: true/false`；
7. MVP 开发期使用环境变量；如未来增加界面保存密钥，Windows 版使用 Credential Manager，不存项目目录；
8. 发往模型的数据只包含题目必要信息、用户代码、失败结果和匿名训练指标；
9. 不发送用户名、邮箱、文件绝对路径或其他无关信息；
10. 若使用 `user_id`，采用本地随机 UUID 的哈希或固定匿名 ID，不包含隐私字段。

---

## 12. 本地 Java 运行与判题

### 12.1 总体流程

```text
保存代码快照
→ 创建隔离运行目录
→ 写入 Main.java / Solution.java + Harness
→ javac 编译
→ 对每个用例启动 java 子进程
→ 输入测试数据
→ 捕获 stdout/stderr/退出码/耗时
→ 规范化输出并比较
→ 保存结构化结果
→ 清理临时运行目录
```

### 12.2 `run`

- 运行公开测试或用户自定义输入；
- 展示输入、期望输出、实际输出；
- 编译失败时展示精简错误；
- 默认超时 3 秒，可按题目覆盖；
- 不更新题目完成层级，但记录运行历史。

### 12.3 `submit`

- 运行本地隐藏测试；
- 展示通过数量和错误类别；
- 默认不展示全部隐藏用例；
- 全部通过标记 `localPassed=true`；
- 本地通过只代表通过本地用例，不等同于 LeetCode Accepted。

### 12.4 错误类型

```text
COMPILE_ERROR
WRONG_ANSWER
TIME_LIMIT
RUNTIME_ERROR
FORMAT_ERROR
MEMORY_LIMIT
SYSTEM_ERROR
```

可选用户原因标签：

```text
ALGORITHM_NOT_FOUND
STATE_DEFINITION
BOUNDARY_ERROR
IMPLEMENTATION_ERROR
COMPLEXITY_TOO_HIGH
ACM_IO_ERROR
MISUNDERSTOOD_SOLUTION
CARELESSNESS
```

### 12.5 安全与资源限制

本地个人工具仍需基本防护：

- Java 子进程设置超时并在超时后终止进程树；
- 每个运行请求使用唯一临时目录；
- 不把用户输入拼接进 shell 命令；
- 使用参数数组启动 `javac` 和 `java`；
- 限制标准输出大小，例如 1MB；
- 限制并发运行数为 1；
- Harness 与题库路径必须经过白名单解析；
- 运行目录不得指向项目根目录或用户主目录；
- MVP 可不实现操作系统级沙箱，但 UI 必须注明“仅运行自己编写的代码”。

### 12.6 LeetCode 闭环

1. 用户本地 Submit；
2. 点击 `Official Submit` 或执行 `open`；
3. 浏览器新标签打开题库中的 `leetcodeUrl`；
4. 用户手动粘贴并在 LeetCode 提交；
5. 返回 AlgoShell 执行：

```text
> result ac
```

或：

```text
> result wa
> result tle
> result re
```

系统记录时间和结果。MVP 不读取 Cookie、不自动登录、不抓取提交结果、不代替用户提交。

---

## 13. 结构化题库 JSON

### 13.1 文件组织

```text
data/problems/
├─ manifest.json
├─ 0001-two-sum.json
├─ 0002-group-anagrams.json
└─ ...
```

`manifest.json` 保存版本、题目顺序和文件校验信息。启动时进行 schema 校验；单题损坏时隔离该题并报告，不阻止其余题目加载。

### 13.2 单题 JSON 示例

```json
{
  "schemaVersion": 1,
  "id": "lc-0003",
  "leetcodeId": 3,
  "title": "无重复字符的最长子串",
  "slug": "longest-substring-without-repeating-characters",
  "difficulty": "MEDIUM",
  "topics": ["SLIDING_WINDOW", "HASH_MAP", "STRING"],
  "track": "SLIDING_WINDOW",
  "importance": "A",
  "coverageTarget": "SOLVE",
  "defaultMode": "ACM",
  "supportedModes": ["FUNCTION", "ACM"],
  "prerequisites": ["ARRAY_HASH_BASICS"],
  "estimatedMinutes": {
    "solve": 25,
    "guided": 15,
    "learn": 8,
    "recall": 3,
    "rebuild": 15
  },
  "source": {
    "leetcodeUrl": "https://leetcode.cn/problems/longest-substring-without-repeating-characters/",
    "contentPolicy": "LOCALLY_AUTHORED_SUMMARY"
  },
  "statement": {
    "summary": "给定字符串，求不含重复字符的最长连续子串长度。",
    "descriptionMarkdown": "本地改写后的题目描述。",
    "constraints": ["0 <= s.length <= 50000"],
    "examples": [
      {
        "input": "abcabcbb",
        "output": "3",
        "explanation": "最长合法连续子串长度为 3。"
      }
    ]
  },
  "functionMode": {
    "className": "Solution",
    "methodSignature": "public int lengthOfLongestSubstring(String s)",
    "userTemplate": "class Solution {\n    public int lengthOfLongestSubstring(String s) {\n        \n    }\n}",
    "harnessId": "string_to_int_v1",
    "publicTests": ["tc-1", "tc-2"],
    "hiddenTests": ["tc-3", "tc-4"]
  },
  "acmMode": {
    "inputDescription": "一行字符串 s。",
    "outputDescription": "输出最长长度。",
    "mainTemplate": "import java.io.*;\nimport java.util.*;\n\npublic class Main {\n    public static void main(String[] args) throws Exception {\n        BufferedReader br = new BufferedReader(new InputStreamReader(System.in));\n        String s = br.readLine();\n        // write your code\n    }\n}",
    "publicTests": ["tc-1", "tc-2"],
    "hiddenTests": ["tc-3", "tc-4"],
    "timeLimitMs": 3000,
    "outputLimitBytes": 1048576
  },
  "testCases": [
    {
      "id": "tc-1",
      "visibility": "PUBLIC",
      "input": "abcabcbb\n",
      "expected": "3\n",
      "comparison": "TRIM_LINES",
      "tags": ["BASIC"]
    },
    {
      "id": "tc-3",
      "visibility": "HIDDEN",
      "input": "abba\n",
      "expected": "2\n",
      "comparison": "TRIM_LINES",
      "tags": ["LEFT_POINTER_ROLLBACK"]
    }
  ],
  "learningCard": {
    "plainExplanation": "维护一个始终不含重复字符的连续窗口。",
    "bruteForce": "枚举所有子串并检查重复，存在大量重复计算。",
    "keyObservation": "右端扩展后，只需移动左端恢复窗口合法性。",
    "algorithmSteps": [
      "右指针逐个加入字符",
      "若字符在当前窗口重复，左边界只向右移动",
      "记录字符最新位置",
      "更新最大窗口长度"
    ],
    "coreCode": "left = Math.max(left, lastIndex + 1);",
    "pitfalls": ["left 不能回退", "更新答案时注意下标差加一"],
    "complexity": {
      "time": "O(n)",
      "space": "O(k)"
    },
    "relatedProblemIds": []
  },
  "hints": [
    {
      "level": 1,
      "content": "能否维护一个始终满足条件的连续范围？"
    },
    {
      "level": 2,
      "content": "尝试使用滑动窗口，让右端扩展、左端恢复合法性。"
    }
  ],
  "reviewCards": [
    {
      "id": "recall-1",
      "type": "IDEA_RECALL",
      "prompt": "left 在什么情况下移动？为什么不能回退？",
      "rubric": ["识别重复字符", "限制在当前窗口", "使用 max"]
    },
    {
      "id": "skeleton-1",
      "type": "CODE_SKELETON",
      "prompt": "补全左边界更新。",
      "template": "left = ______________________;",
      "expectedConcepts": ["Math.max", "lastIndex + 1"]
    }
  ]
}
```

### 13.3 题库约束

- 必须恰好包含计划使用的 100 道题；
- 每题至少有题目摘要、一个模式、两个公开测试、两个隐藏测试、六段学习卡和一张 Recall 卡；
- A 级题应有 Code Skeleton 或 Bug Fix 卡；
- 测试用例必须经过人工或自动参考实现校验；
- 不批量复制受版权保护的完整原题正文，优先使用本地改写摘要并保留官方跳转链接；
- 题库版本升级不得覆盖用户历史，只通过稳定 `id` 关联。

---

## 14. SQLite 数据结构

### 14.1 设计原则

- 题库静态内容保存在 JSON；用户状态和训练记录保存在 SQLite；
- 时间统一存 ISO 8601 UTC，展示时转换为本地时区；
- 枚举以字符串存储，便于调试；
- 关键写操作使用事务；
- 不存 API Key；
- 代码正文可存 SQLite，运行临时文件不作为唯一数据源。

### 14.2 核心表

#### `app_config`

```sql
CREATE TABLE app_config (
  key TEXT PRIMARY KEY,
  value_json TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
```

保存训练周期、工作日预算、周末预算、AI 模式、主题等非敏感配置。

#### `problem_progress`

```sql
CREATE TABLE problem_progress (
  problem_id TEXT PRIMARY KEY,
  status TEXT NOT NULL DEFAULT 'UNSEEN',
  completion_level TEXT NOT NULL DEFAULT 'UNSEEN',
  best_mode TEXT,
  recognition_score INTEGER NOT NULL DEFAULT 0,
  reasoning_score INTEGER NOT NULL DEFAULT 0,
  implementation_score INTEGER NOT NULL DEFAULT 0,
  speed_score INTEGER NOT NULL DEFAULT 0,
  stability_score INTEGER NOT NULL DEFAULT 0,
  mastery_score INTEGER NOT NULL DEFAULT 0,
  review_stage INTEGER NOT NULL DEFAULT 0,
  next_review_at TEXT,
  last_review_at TEXT,
  last_practiced_at TEXT,
  consecutive_review_failures INTEGER NOT NULL DEFAULT 0,
  local_passed INTEGER NOT NULL DEFAULT 0,
  official_best_result TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
```

#### `training_sessions`

```sql
CREATE TABLE training_sessions (
  id TEXT PRIMARY KEY,
  session_date TEXT NOT NULL,
  session_type TEXT NOT NULL,
  planned_minutes INTEGER NOT NULL,
  actual_seconds INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL,
  phase TEXT NOT NULL,
  generated_reason_json TEXT NOT NULL,
  started_at TEXT,
  completed_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
```

#### `session_tasks`

```sql
CREATE TABLE session_tasks (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL,
  problem_id TEXT NOT NULL,
  task_type TEXT NOT NULL,
  target_level TEXT,
  review_type TEXT,
  planned_seconds INTEGER NOT NULL,
  actual_seconds INTEGER NOT NULL DEFAULT 0,
  sequence_no INTEGER NOT NULL,
  status TEXT NOT NULL,
  scheduling_score REAL NOT NULL DEFAULT 0,
  scheduling_reason_json TEXT NOT NULL,
  highest_hint_level INTEGER NOT NULL DEFAULT 0,
  result_summary_json TEXT,
  started_at TEXT,
  completed_at TEXT,
  FOREIGN KEY (session_id) REFERENCES training_sessions(id)
);
```

#### `attempts`

```sql
CREATE TABLE attempts (
  id TEXT PRIMARY KEY,
  session_task_id TEXT,
  problem_id TEXT NOT NULL,
  mode TEXT NOT NULL,
  action TEXT NOT NULL,
  code_snapshot_id TEXT,
  result_type TEXT NOT NULL,
  passed_count INTEGER,
  total_count INTEGER,
  duration_ms INTEGER,
  error_type TEXT,
  failure_detail_json TEXT,
  created_at TEXT NOT NULL,
  FOREIGN KEY (session_task_id) REFERENCES session_tasks(id)
);
```

#### `code_snapshots`

```sql
CREATE TABLE code_snapshots (
  id TEXT PRIMARY KEY,
  problem_id TEXT NOT NULL,
  mode TEXT NOT NULL,
  content TEXT NOT NULL,
  content_hash TEXT NOT NULL,
  source TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE INDEX idx_code_problem_mode_time
ON code_snapshots(problem_id, mode, created_at DESC);
```

#### `hint_events`

```sql
CREATE TABLE hint_events (
  id TEXT PRIMARY KEY,
  session_task_id TEXT NOT NULL,
  problem_id TEXT NOT NULL,
  level INTEGER NOT NULL,
  source TEXT NOT NULL,
  prompt_version TEXT,
  response_cache_key TEXT,
  success INTEGER NOT NULL,
  created_at TEXT NOT NULL
);
```

#### `review_events`

```sql
CREATE TABLE review_events (
  id TEXT PRIMARY KEY,
  session_task_id TEXT NOT NULL,
  problem_id TEXT NOT NULL,
  review_type TEXT NOT NULL,
  self_rating INTEGER NOT NULL,
  objective_score INTEGER,
  ai_score INTEGER,
  result TEXT NOT NULL,
  score_delta_json TEXT NOT NULL,
  previous_interval_days INTEGER NOT NULL,
  next_interval_days INTEGER NOT NULL,
  next_review_at TEXT NOT NULL,
  created_at TEXT NOT NULL
);
```

#### `official_results`

```sql
CREATE TABLE official_results (
  id TEXT PRIMARY KEY,
  problem_id TEXT NOT NULL,
  result TEXT NOT NULL,
  notes TEXT,
  recorded_at TEXT NOT NULL
);
```

#### `mistake_events`

```sql
CREATE TABLE mistake_events (
  id TEXT PRIMARY KEY,
  problem_id TEXT NOT NULL,
  attempt_id TEXT,
  mistake_type TEXT NOT NULL,
  source TEXT NOT NULL,
  note TEXT,
  resolved INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL
);
```

#### `notes`

```sql
CREATE TABLE notes (
  id TEXT PRIMARY KEY,
  problem_id TEXT,
  content TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
```

#### `ai_call_logs`

```sql
CREATE TABLE ai_call_logs (
  id TEXT PRIMARY KEY,
  task_type TEXT NOT NULL,
  model TEXT NOT NULL,
  prompt_version TEXT NOT NULL,
  status TEXT NOT NULL,
  prompt_tokens INTEGER,
  completion_tokens INTEGER,
  cache_hit_tokens INTEGER,
  latency_ms INTEGER,
  error_code TEXT,
  request_hash TEXT NOT NULL,
  created_at TEXT NOT NULL
);
```

只记录元数据和哈希，不记录 API Key；是否保存完整 AI 内容由配置决定，默认只把已展示的用户可见结果存入相应训练记录。

### 14.3 数据迁移

- 使用 `schema_migrations(version, applied_at)`；
- 启动时自动备份数据库后再迁移；
- 迁移失败时使用只读模式启动，并提示备份位置；
- 不得静默删除不兼容数据。

---

## 15. 训练调度算法

### 15.1 输入

- 当前日期与训练 Day；
- 用户本次可用分钟数；
- 工作日/周末；
- 当前阶段；
- 已覆盖/未覆盖题；
- 到期与逾期复习；
- 每题重要性、难度、专题、前置关系和预计时长；
- 掌握度维度；
- 最近提示等级、错误类型和耗时；
- Review Debt；
- 剩余天数与剩余未覆盖题数；
- 当天已完成任务。

### 15.2 候选任务

```text
REVIEW_RECALL
REVIEW_SKELETON
REVIEW_BUG_FIX
REVIEW_REBUILD
NEW_SOLVE
NEW_GUIDED
NEW_LEARN
MIXED_CHECK
SUMMARY
```

### 15.3 优先级公式

候选任务基础分建议为：

```text
priority =
  dueScore
  + weaknessScore
  + importanceScore
  + phaseScore
  + forgettingRiskScore
  + coverageGapScore
  + recentFailureScore
  - timePressurePenalty
  - repetitionPenalty
```

各项归一化到 0—100，建议权重：

```text
dueScore             0.25
weaknessScore        0.18
importanceScore      0.12
phaseScore           0.10
forgettingRiskScore  0.12
coverageGapScore     0.15
recentFailureScore   0.08
```

惩罚项直接从加权结果中扣除。

关键计算：

```text
dueScore =
  复习未到期: 0
  今日到期: 60
  每逾期 1 天 +8，上限 100

weaknessScore =
  100 - min(recognition, reasoning, implementation)

coverageGapScore =
  max(0, expectedCoveredByToday - actualCovered) / dailyTarget × 100

forgettingRiskScore =
  daysSinceLastPractice / max(1, currentIntervalDays) × 60
  + consecutiveFailures × 15
```

### 15.4 硬约束

1. 计划总时长 ≤ 输入预算 × 1.05；
2. 工作日默认至少 1 个新题任务，除非 Review Debt ≥ 8 或严重逾期 A 题 ≥ 3；
3. Review Debt ≥ 8 时减少新题；Review Debt ≥ 12 时可暂停 Solve 新题，但应保留 1 个短 Learn 任务以避免覆盖完全停滞，Day 38 后除外；
4. 同一专题连续新题不超过 3 道；
5. 连续两道高难任务后插入简单任务或复习；
6. 未满足前置专题的题降低优先级，冲刺补齐期可忽略软前置；
7. 当天不重复安排同一道题，除非前一任务失败后明确进入 Rebuild；
8. Summary 固定保留 2—5 分钟；
9. Day 33 后提高 Coverage Gap 权重；
10. Day 38—40 对未覆盖题强制 Learn/Guided 优先，确保可完成 100 题覆盖。

### 15.5 生成伪代码

```ts
function buildDailyPlan(context) {
  const budget = context.availableMinutes * 60;
  const reservedSummary = context.isWeekend ? 300 : 120;
  let remaining = budget - reservedSummary;

  const candidates = buildCandidates(context)
    .filter(isEligible)
    .map(task => ({
      ...task,
      score: calculatePriority(task, context)
    }))
    .sort(byScoreDesc);

  const plan = [];

  for (const task of candidates) {
    if (task.estimatedSeconds > remaining * 1.05) continue;
    if (violatesHardConstraints(task, plan, context)) continue;

    plan.push(task);
    remaining -= task.estimatedSeconds;

    if (coverageAndReviewQuotasSatisfied(plan, context)) break;
  }

  if (!containsNewCoverage(plan) && shouldKeepCoverageMoving(context)) {
    replaceLowestValueTaskWithShortLearn(plan, candidates, remaining);
  }

  plan.push(createSummaryTask(reservedSummary));
  return persistPlanWithReasons(plan);
}
```

### 15.6 可解释性

每个任务必须保存并展示一句调度原因，例如：

```text
安排“反转链表”Code Skeleton：
昨天首次完成，implementation=42，且今天到期复习。
```

AI 可润色表达，但原因字段必须来自本地确定性数据。

---

## 16. 掌握度模型

### 16.1 维度与总分

每题五个 0—100 分维度：

```text
recognition_score
reasoning_score
implementation_score
speed_score
stability_score
```

总分：

```text
mastery =
  recognition × 0.20
  + reasoning × 0.25
  + implementation × 0.30
  + speed × 0.10
  + stability × 0.15
```

取整并限制在 0—100。

### 16.2 事件更新建议

| 事件 | Recognition | Reasoning | Implementation | Speed | Stability |
|---|---:|---:|---:|---:|---:|
| Learn + Recall 通过 | +8 | +6 | +0 | +2 | +2 |
| Guided 核心代码通过 | +6 | +8 | +10 | +3 | +3 |
| Solve 本地通过，提示 ≤2 | +8 | +10 | +15 | 按耗时 +3—10 | +5 |
| 官方 AC | +2 | +3 | +8 | +2 | +4 |
| WA/RE/TLE | 0 | -2 至 -6 | -4 至 -10 | -3 | -3 |
| Recall 评分 5 | +4 | +5 | +2 | +5 | +8 |
| Recall 评分 1 | -8 | -8 | -4 | -3 | -10 |
| 查看 Level 6 | +2 | +3 | 0 | 0 | -2 |

单次事件对任一维度最大增加 15，最大减少 15。所有变更必须保存 `score_delta_json`，便于追溯。

### 16.3 掌握标签

| 总分 | 标签 | 含义 |
|---:|---|---|
| 0—24 | Unseen/Fragile | 未接触或极易遗忘 |
| 25—44 | Understood | 已理解但不能稳定复现 |
| 45—64 | Reproducible | 有提示或少量卡顿可复现 |
| 65—79 | Solid | 大部分情况下可独立完成 |
| 80—100 | Mastered | 多次间隔后仍能快速完成 |

完成层级与掌握标签是两个概念：

- 完成层级表示“以何种方式覆盖过”；
- 掌握标签表示“当前综合稳定程度”。

### 16.4 防止自评失真

复习最终结果由以下证据合并：

```text
objectiveScore  50%：测试/代码补全/关键点命中
selfRating      20%：用户 1—5 自评
assistance      15%：提示等级和是否看答案
timeScore       15%：耗时
```

AI 评分只作为 objectiveScore 的一个子证据，不能单独更新 mastery。

---

## 17. 总结、统计与薄弱项

### 17.1 每日总结

至少输出：

- 今日完成任务数；
- Solve/Guided/Learn 新增数；
- 复习成功率；
- 最高频错误；
- 提示依赖；
- 明日调度调整；
- 未完成任务如何处理。

本地模板始终可生成；AI 可把结构化数据转成自然语言，但不得输出空泛鼓励替代事实。

### 17.2 周总结

至少输出：

- 本周覆盖题数及层级分布；
- 专题掌握变化；
- 错误类型分布；
- ACM 输入输出错误次数；
- 平均提示等级；
- 复习债务变化；
- 下一周明确调整项。

### 17.3 薄弱项

薄弱项计算优先考虑：

- 专题平均 mastery；
- 最近 14 天失败率；
- Implementation 与 Reasoning 的差值；
- 相同错误标签重复次数；
- 逾期复习数量。

示例：

```text
链表：Reasoning 68 / Implementation 39
结论：思路识别尚可，指针更新实现不稳定。
建议：安排 2 次 Code Skeleton + 1 次 Full Rebuild。
```

---

## 18. 异常与降级

### 18.1 启动异常

| 异常 | 行为 |
|---|---|
| Node 依赖未安装 | `start.bat` 给出明确安装提示并退出 |
| Java 未安装 | 应用仍启动，但编辑与学习可用；Run/Submit 禁用并提示安装 Java 17 |
| Java 版本不是 17+ | 警告并禁用不兼容能力 |
| 端口占用 | 自动尝试后续端口并打开实际地址 |
| 数据库不存在 | 自动创建 |
| 数据库损坏 | 不覆盖原文件；备份后尝试恢复，失败进入只读模式 |
| 题库单题损坏 | 隔离并报告该题；其余题可用 |
| 题库不足 100 题 | 显示配置错误，训练计划只使用有效题，不伪报 100 覆盖 |

### 18.2 运行异常

- 编译进程崩溃：标记 SYSTEM_ERROR，不扣 mastery；
- 用户代码超时：终止进程树并标记 TIME_LIMIT；
- 输出过大：终止并提示可能存在死循环；
- 浏览器刷新：恢复当前会话、任务、编辑器草稿和计时；
- 服务重启：会话恢复为 PAUSED；
- 重复点击 Run：只接受第一个请求；
- SQLite 写失败：停止改变训练状态，代码草稿先写入恢复文件，并提示用户；
- 计划无法装入时间预算：使用最短到期复习 + 最短 Learn + Summary；
- 当天无候选新题但 Coverage < 100：运行题库完整性诊断。

### 18.3 AI 降级

无 Key、断网、超时、余额不足或服务异常时：

- 固定提示仍可用；
- 固定学习卡仍可用；
- 编译运行和本地判题仍可用；
- 本地规则生成复习评价；
- 本地模板生成总结；
- 状态栏显示 `AI: Local`；
- 不因 AI 失败中断、回滚或重复完成训练任务。

---

## 19. 非功能要求

### 19.1 性能

- 本地首页首屏：开发机上冷启动后 3 秒内可交互；
- 普通命令响应：P95 < 200ms，不含编译和 AI；
- 草稿保存：输入停止后 500ms 防抖，2 秒内落库；
- SQLite 常用查询：P95 < 100ms；
- Java 编译启动：正常题目 5 秒内返回或超时；
- 应用只允许 1 个 Java 判题任务并发；
- AI 流式首字节超时单独提示，不冻结 UI。

### 19.2 可靠性

- 关键训练状态事务化；
- 每次启动前检查未完成会话；
- 数据库每日首次启动时生成滚动备份，保留最近 7 份；
- 代码快照按题、模式保留最近 20 份；
- 删除历史不是 MVP，避免误删。

### 19.3 安全

- 所有 API Key 规则见 11.8；
- 服务默认只监听 `127.0.0.1`；
- 不开放局域网访问；
- 浏览器端调用后端使用同源或严格 CORS；
- 所有题目 ID、Harness ID 和文件路径使用白名单；
- Java 运行不使用 shell 拼接；
- 日志脱敏；
- 不自动操作 LeetCode 登录态。

### 19.4 可维护性

- TypeScript 全栈；
- 前后端共享枚举和 schema；
- 题库使用 JSON Schema 或 Zod 校验；
- 调度器、掌握度、复习算法必须为无副作用纯函数并具备单元测试；
- AI Provider 通过 OpenAI Chat Completions 兼容接口抽象，DeepSeek 为默认示例；
- 模型名、超时和提示模板版本配置化；
- 数据库迁移可追踪；
- 业务错误使用稳定 error code。

### 19.5 可用性

- 终端命令和可点击按钮并存；
- 颜色不是唯一状态表达方式；
- 编译错误保留可复制文本；
- 所有长任务可取消或显示进行状态；
- 关键操作有明确结果反馈；
- 默认深色主题，保持专业克制，不过度游戏化。

### 19.6 可观测性

本地日志至少区分：

```text
APP
SCHEDULER
DATABASE
JUDGE
AI
```

不得记录 API Key、完整 Authorization、无必要的绝对路径。日志按天滚动，默认保留 7 天。

---

## 20. MVP 范围

### 20.1 MVP 必须包含

- 单用户本地 Web 应用；
- React 单页前端；
- Monaco Java 编辑器；
- Node.js 本地服务；
- SQLite；
- Java 17 Function/ACM 运行；
- 结构化 Hot 100 题库接口和 schema；
- 35—40 天覆盖调度；
- Solve/Guided/Learn 三种新题深度；
- Recall/Skeleton/Bug Fix/Rebuild 四种复习；
- 分级提示与固定学习卡；
- 可配置 AI Provider 的提示、解释、诊断、评价、总结；
- API 安全与 AI 降级；
- 本地公开/隐藏用例；
- LeetCode 跳转；
- 手动登记 AC/WA/TLE/RE；
- 统计、薄弱项、历史、笔记；
- `start.bat` 一键启动；
- 数据备份和恢复基础能力。

### 20.2 明确不做

- 注册登录；
- 多用户；
- 云同步；
- 手机端；
- 排行榜、好友、社区；
- 正式桌面安装包；
- 自动抓取或批量复制 LeetCode 内容；
- 自动登录 LeetCode；
- 自动提交代码或读取官方判题结果；
- 完整在线 OJ；
- Docker 强制依赖；
- 多编程语言；
- Java Language Server；
- AI 自动修改代码；
- 自然语言命令；
- 支付和计费系统；
- 复杂可视化大屏；
- 云端部署。

---

## 21. 项目目录

建议使用单仓库：

```text
algoshell/
├─ apps/
│  ├─ web/
│  │  ├─ src/
│  │  │  ├─ components/
│  │  │  ├─ features/
│  │  │  │  ├─ terminal/
│  │  │  │  ├─ editor/
│  │  │  │  ├─ problem/
│  │  │  │  ├─ review/
│  │  │  │  ├─ stats/
│  │  │  │  └─ ai-coach/
│  │  │  ├─ api/
│  │  │  ├─ state/
│  │  │  └─ styles/
│  │  └─ package.json
│  └─ server/
│     ├─ src/
│     │  ├─ api/
│     │  ├─ commands/
│     │  ├─ config/
│     │  ├─ db/
│     │  ├─ scheduler/
│     │  ├─ mastery/
│     │  ├─ review/
│     │  ├─ judge/
│     │  ├─ ai/
│     │  │  ├─ providers/
│     │  │  ├─ prompts/
│     │  │  └─ schemas/
│     │  ├─ problems/
│     │  └─ services/
│     └─ package.json
├─ packages/
│  ├─ shared/
│  │  ├─ src/types/
│  │  ├─ src/schemas/
│  │  └─ src/constants/
│  └─ problem-tools/
│     ├─ src/validate/
│     └─ src/test-reference/
├─ data/
│  ├─ problems/
│  │  ├─ manifest.json
│  │  └─ *.json
│  ├─ database/
│  │  └─ algoshell.db
│  └─ backups/
├─ workspace/
│  ├─ recovery/
│  └─ runs/
├─ scripts/
│  ├─ check-environment.ps1
│  ├─ validate-problems.ts
│  └─ seed-dev-data.ts
├─ tests/
│  ├─ scheduler/
│  ├─ mastery/
│  ├─ judge/
│  └─ e2e/
├─ start.bat
├─ .env.example
├─ .gitignore
├─ package.json
├─ README.md
└─ current_process.md
```

`.env.example` 只能包含空值或占位说明：

```dotenv
AI_PROVIDER=DeepSeek
AI_API_KEY=
AI_BASE_URL=https://api.deepseek.com
AI_FAST_MODEL=deepseek-chat
AI_SMART_MODEL=deepseek-reasoner
AI_JSON_MODE=true
```

---

## 22. 后端接口建议

接口可调整，但能力边界应保持：

```text
GET    /api/health
GET    /api/config
PATCH  /api/config
GET    /api/problems/:id
GET    /api/progress
POST   /api/sessions/start
GET    /api/sessions/today
POST   /api/session-tasks/:id/start
POST   /api/session-tasks/:id/complete
POST   /api/session-tasks/:id/skip
GET    /api/editor/:problemId/:mode
PUT    /api/editor/:problemId/:mode
POST   /api/judge/run
POST   /api/judge/submit
POST   /api/hints
POST   /api/ai/explain
POST   /api/ai/diagnose
POST   /api/reviews/:taskId/grade
POST   /api/official-results
GET    /api/stats
GET    /api/weaknesses
GET    /api/history
POST   /api/summary
```

AI 流式端点可使用 SSE。所有写接口校验当前 session/task 状态，避免重复完成和越序更新。

---

## 23. 验收标准

### 23.1 启动与环境

- [ ] 双击 `start.bat` 可检查依赖、启动前后端并自动打开浏览器；
- [ ] 端口占用时能自动选择可用端口；
- [ ] 未安装 Java 时应用可进入学习模式，Run/Submit 有明确提示；
- [ ] 服务只监听本机地址；
- [ ] 重复执行 `start.bat` 不启动多个冲突实例。

### 23.2 UI 与命令

- [ ] 实现左终端、右题目/编辑器/输出布局；
- [ ] 章节 6.1 的 MVP 命令全部可用；
- [ ] 命令与按钮共享同一业务 action；
- [ ] 刷新页面后当前任务和草稿恢复；
- [ ] Function/ACM 草稿独立保存。

### 23.3 调度

- [ ] `start 35` 生成不超过 36.75 分钟的工作日计划；
- [ ] `start 120` 生成不超过 126 分钟的周末计划；
- [ ] 到期 A 题优先于普通新题；
- [ ] Review Debt ≥ 8 时减少新题；
- [ ] 同一专题连续新题不超过 3 道；
- [ ] Day 35 未完成时可延长至 Day 40；
- [ ] 每个任务都有本地生成的调度原因；
- [ ] 固定历史输入产生可重复的调度结果，随机项需可注入 seed。

### 23.4 新题与复习

- [ ] Solve/Guided/Learn 判定规则生效；
- [ ] 查看 Level 6 后本次最高只能为 Learn；
- [ ] 四种复习卡可执行；
- [ ] 复习 1—5 评分正确更新间隔；
- [ ] 连续两次复习失败触发 Full Rebuild；
- [ ] 完成层级和 mastery 分开显示；
- [ ] 所有分数变化可追溯。

### 23.5 判题

- [ ] ACM 模式可编译运行 `Main.java`；
- [ ] Function 模式可通过 Harness 调用 `Solution`；
- [ ] 能区分 CE、WA、TLE、RE 和格式错误；
- [ ] 超时后终止进程；
- [ ] 输出大小受到限制；
- [ ] Run 展示公开用例详情；
- [ ] Submit 不泄露全部隐藏用例；
- [ ] 本地通过不会自动标记官方 AC。

### 23.6 LeetCode 闭环

- [ ] `open` 打开当前题官方链接；
- [ ] `result ac/wa/tle/re` 可登记结果；
- [ ] 不使用 LeetCode Cookie；
- [ ] 不自动提交或抓取结果。

### 23.7 AI Provider

- [ ] 服务端从 `AI_API_KEY` 读取密钥，并兼容旧版 `DEEPSEEK_API_KEY`；
- [ ] 前端无法获取密钥；
- [ ] Minimal/Balanced/Intensive/Local 状态正确；
- [ ] AI 未配置时主流程可用；
- [ ] JSON 任务有 schema 校验；
- [ ] 401/402/429/500/503 和超时有对应降级；
- [ ] 日志不出现 API Key；
- [ ] AI 不能直接更改 mastery 或训练计划；
- [ ] 流式响应可停止；
- [ ] `hint` 不超出请求等级，违规时回退固定提示。

### 23.8 数据

- [ ] SQLite 重启后数据保持；
- [ ] 每日备份正常；
- [ ] 数据迁移失败进入只读模式且不覆盖原库；
- [ ] 题库启动校验可定位具体损坏文件；
- [ ] 100 题清单与文件数一致；
- [ ] API Key 不进入数据库。

### 23.9 自动测试最低要求

- [ ] 调度器单元测试 ≥ 20 个关键场景；
- [ ] 掌握度与复习间隔单元测试覆盖边界值；
- [ ] 命令解析测试覆盖所有 MVP 命令；
- [ ] Java Judge 覆盖成功、CE、WA、TLE、RE、超大输出；
- [ ] AI Provider 使用 mock 覆盖成功、空 JSON、截断、超时和错误码；
- [ ] 至少 1 条端到端流程：启动会话 → 做题 → Run → Submit → 记录结果 → 完成 → 重启恢复。

---

## 24. Codex 分阶段开发任务

Codex 必须按阶段交付，每阶段完成测试和文档后再进入下一阶段。不得在题库、判题和调度尚未稳定时提前堆叠复杂 AI 功能。

### 阶段 0：仓库与工程基线

目标：建立可运行、可测试的单仓库。

任务：

1. 初始化 TypeScript monorepo；
2. 建立 React、Node.js、shared 包；
3. 配置格式化、lint、unit test、E2E test；
4. 实现 `/api/health`；
5. 编写 `.env.example`、`.gitignore`；
6. 实现 `start.bat` 与环境检查；
7. 创建 `current_process.md` 记录接手状态。

完成门槛：

- 一键启动；
- 前后端健康检查通过；
- 测试命令可运行；
- 仓库中无密钥。

### 阶段 1：题库 schema 与 SQLite 基础

目标：建立稳定的数据契约。

任务：

1. 实现题库 JSON Schema/Zod schema；
2. 建立 manifest 和 2—3 道样例题；
3. 实现题库加载、隔离损坏文件和校验脚本；
4. 实现 SQLite 表与迁移；
5. 实现 repository 层；
6. 实现数据库备份与只读降级；
7. 为 schema 和 migration 编写测试。

完成门槛：

- 样例题可查询；
- 数据可重启保持；
- 损坏题目不会拖垮全局；
- API Key 不在数据模型中。

### 阶段 2：主界面、终端与编辑器

目标：完成可操作的单页骨架。

任务：

1. 实现顶部状态栏；
2. 实现左终端与命令历史；
3. 实现右侧题目、编辑器、输出标签页；
4. 接入 Monaco Java；
5. 实现编辑器草稿防抖保存与恢复；
6. 实现 Function/ACM 模式切换；
7. 建立统一 action 层，按钮与命令共用；
8. 实现 `help/today/mode/note/clear`。

完成门槛：

- 刷新不丢当前题和代码；
- 两种模式草稿独立；
- 基本快捷键可用。

### 阶段 3：Java 本地运行与判题

目标：形成完整本地编码反馈。

任务：

1. 环境检测 Java 17；
2. 实现唯一临时目录；
3. 实现 ACM 编译运行；
4. 实现 Function Harness；
5. 实现公开/隐藏测试；
6. 实现输出比较策略；
7. 实现超时、进程树终止、输出限制；
8. 实现 `run/submit`；
9. 保存 attempt 和 code snapshot；
10. 完成 Judge 自动测试。

完成门槛：

- CE/WA/TLE/RE/格式错误正确识别；
- 隐藏用例不泄露；
- 不使用 shell 字符串拼接执行用户代码。

### 阶段 4：训练会话、调度与掌握度

目标：输入 `start` 后系统能自动安排和推进训练。

任务：

1. 实现训练阶段、任务类型和状态机；
2. 实现工作日/周末计划模板；
3. 实现候选任务与优先级公式；
4. 实现硬约束；
5. 实现 Review Debt；
6. 实现 Solve/Guided/Learn 判定；
7. 实现五维 mastery 更新；
8. 实现 1/3/7/14/28 天复习；
9. 实现四种复习形式；
10. 实现 `start/review/skip/result`；
11. 为调度器和复习算法补齐单元测试。

完成门槛：

- 固定 seed 可复现计划；
- 所有分数和调度原因可追溯；
- 预算、债务、专题连续数等硬约束通过测试。

### 阶段 5：学习卡、分级提示与统计

目标：形成无 AI 也完整可用的训练闭环。

任务：

1. 实现 Level 0—6；
2. 实现固定学习卡；
3. 实现 Recall/Skeleton/Bug Fix/Rebuild UI；
4. 实现 `hint/explain` 本地版本；
5. 实现统计、薄弱项、错误历史；
6. 实现本地每日/周总结；
7. 实现 `stats/weak/history/mistakes/templates/plan/summary`。

完成门槛：

- Local 模式可完成完整训练；
- Level 6 对完成层级的限制生效；
- 总结包含事实和具体调整。

### 阶段 6：AI Provider

目标：在不改变本地决策权的前提下增强解释和诊断。

任务：

1. 定义 AI Provider 接口；
2. 实现通用 OpenAI Chat Completions 兼容客户端，以 DeepSeek 为默认示例；
3. 实现 Fast/Smart 模型路由；
4. 实现 Minimal/Balanced/Intensive；
5. 实现提示模板版本管理；
6. 实现 JSON schema 校验；
7. 实现 SSE 流式响应与取消；
8. 实现重试、超时、错误码和降级；
9. 实现本地缓存与代码哈希；
10. 实现日志脱敏；
11. 使用 mock 完成异常测试。

完成门槛：

- 前端无任何途径读到 Key；
- AI 不可用时行为与阶段 5 一致；
- 违规提示不展示；
- AI 不直接写 mastery。

### 阶段 7：完整题库建设

目标：将题库从样例扩展到可训练的 Hot 100。

任务：

1. 确认稳定的 100 题清单和专题顺序；
2. 为每题编写本地改写题目摘要；
3. 标注难度、重要性、模式、目标层级、预计时间和前置关系；
4. 为每题提供学习卡和分级提示；
5. 为每题提供 Recall 卡；
6. 为 A 题提供 Skeleton/Bug Fix 卡；
7. 为支持模式编写模板与 Harness；
8. 编写公开/隐藏测试；
9. 使用参考实现批量验证测试；
10. 运行 schema、重复 ID、链接和覆盖完整性检查。

完成门槛：

- 恰好 100 个稳定 ID；
- 所有题通过 schema；
- 所有测试用例经参考实现验证；
- 计划模拟能在 35—40 天覆盖 100 题；
- 不批量复制完整原题正文。

### 阶段 8：端到端验收与交付

目标：达到可连续使用的个人工具质量。

任务：

1. 执行章节 23 全部验收项；
2. 模拟 40 天训练数据，检查覆盖、债务和延期；
3. 做一次真实工作日 35 分钟流程；
4. 做一次周末 120 分钟流程；
5. 测试断网、无 Key、无 Java、端口占用、数据库迁移失败；
6. 检查仓库和日志是否包含密钥模式；
7. 完善 README、备份恢复和故障排查；
8. 更新 `current_process.md`。

完成门槛：

- 核心 E2E 通过；
- 无 P0/P1 缺陷；
- 用户可只根据 README 完成安装、配置和首次训练。

---

## 25. 首次使用流程

首次打开：

```text
AlgoShell Initial Setup
────────────────────────────────
Training cycle       35 days
Maximum extension    40 days
Weekday budget       35 min
Weekend budget       120 min
Primary language     Java 17
Goal                 Hot 100 Coverage
AI mode              Balanced
────────────────────────────────
```

检查项：

1. Node 服务正常；
2. SQLite 可写；
3. 题库有效；
4. Java 17 可用；
5. `AI_API_KEY` 是否配置，仅显示是/否；
6. 创建初始训练配置；
7. 生成 Day 1 路线预览；
8. 引导输入 `start`。

不要求注册、昵称、邮箱或云端账号。

---

## 26. 最终产品闭环

```text
双击 start.bat
→ 输入 start [minutes]
→ 本地调度器生成今日计划
→ Recall 旧题
→ Solve / Guided / Learn 新题
→ Java 本地 Run / Submit
→ 必要时分级提示或 AI 诊断
→ 打开 LeetCode 手动提交
→ 手动记录 AC / WA / TLE / RE
→ 更新五维掌握度
→ 安排下一次复习
→ 生成每日总结
→ 次日继续
```

MVP 完成的判断不是“页面做出来”，而是上述闭环在 AI 正常和 AI 不可用两种情况下都能稳定执行，并能在模拟训练中按规则完成 35—40 天 Hot 100 覆盖。
