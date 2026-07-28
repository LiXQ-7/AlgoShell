import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outDir = path.join(root, "data", "problems");
fs.mkdirSync(outDir, { recursive: true });

const rows = [
  [1, "两数之和", "two-sum", "ARRAY_HASH", "EASY"],
  [49, "字母异位词分组", "group-anagrams", "ARRAY_HASH", "MEDIUM"],
  [128, "最长连续序列", "longest-consecutive-sequence", "ARRAY_HASH", "MEDIUM"],
  [283, "移动零", "move-zeroes", "TWO_POINTERS", "EASY"],
  [11, "盛最多水的容器", "container-with-most-water", "TWO_POINTERS", "MEDIUM"],
  [15, "三数之和", "3sum", "TWO_POINTERS", "MEDIUM"],
  [42, "接雨水", "trapping-rain-water", "TWO_POINTERS", "HARD"],
  [3, "无重复字符的最长子串", "longest-substring-without-repeating-characters", "SLIDING_WINDOW", "MEDIUM"],
  [438, "找到字符串中所有字母异位词", "find-all-anagrams-in-a-string", "SLIDING_WINDOW", "MEDIUM"],
  [560, "和为 K 的子数组", "subarray-sum-equals-k", "SUBSTRING", "MEDIUM"],
  [239, "滑动窗口最大值", "sliding-window-maximum", "SLIDING_WINDOW", "HARD"],
  [76, "最小覆盖子串", "minimum-window-substring", "SLIDING_WINDOW", "HARD"],
  [53, "最大子数组和", "maximum-subarray", "ARRAY", "MEDIUM"],
  [56, "合并区间", "merge-intervals", "ARRAY", "MEDIUM"],
  [189, "轮转数组", "rotate-array", "ARRAY", "MEDIUM"],
  [238, "除自身以外数组的乘积", "product-of-array-except-self", "ARRAY", "MEDIUM"],
  [41, "缺失的第一个正数", "first-missing-positive", "ARRAY", "HARD"],
  [73, "矩阵置零", "set-matrix-zeroes", "MATRIX", "MEDIUM"],
  [54, "螺旋矩阵", "spiral-matrix", "MATRIX", "MEDIUM"],
  [48, "旋转图像", "rotate-image", "MATRIX", "MEDIUM"],
  [240, "搜索二维矩阵 II", "search-a-2d-matrix-ii", "MATRIX", "MEDIUM"],
  [160, "相交链表", "intersection-of-two-linked-lists", "LINKED_LIST", "EASY"],
  [206, "反转链表", "reverse-linked-list", "LINKED_LIST", "EASY"],
  [234, "回文链表", "palindrome-linked-list", "LINKED_LIST", "EASY"],
  [141, "环形链表", "linked-list-cycle", "LINKED_LIST", "EASY"],
  [142, "环形链表 II", "linked-list-cycle-ii", "LINKED_LIST", "MEDIUM"],
  [21, "合并两个有序链表", "merge-two-sorted-lists", "LINKED_LIST", "EASY"],
  [2, "两数相加", "add-two-numbers", "LINKED_LIST", "MEDIUM"],
  [19, "删除链表的倒数第 N 个结点", "remove-nth-node-from-end-of-list", "LINKED_LIST", "MEDIUM"],
  [24, "两两交换链表中的节点", "swap-nodes-in-pairs", "LINKED_LIST", "MEDIUM"],
  [25, "K 个一组翻转链表", "reverse-nodes-in-k-group", "LINKED_LIST", "HARD"],
  [138, "随机链表的复制", "copy-list-with-random-pointer", "LINKED_LIST", "MEDIUM"],
  [148, "排序链表", "sort-list", "LINKED_LIST", "MEDIUM"],
  [23, "合并 K 个升序链表", "merge-k-sorted-lists", "LINKED_LIST", "HARD"],
  [146, "LRU 缓存", "lru-cache", "LINKED_LIST", "MEDIUM"],
  [94, "二叉树的中序遍历", "binary-tree-inorder-traversal", "TREE", "EASY"],
  [104, "二叉树的最大深度", "maximum-depth-of-binary-tree", "TREE", "EASY"],
  [226, "翻转二叉树", "invert-binary-tree", "TREE", "EASY"],
  [101, "对称二叉树", "symmetric-tree", "TREE", "EASY"],
  [543, "二叉树的直径", "diameter-of-binary-tree", "TREE", "EASY"],
  [102, "二叉树的层序遍历", "binary-tree-level-order-traversal", "TREE", "MEDIUM"],
  [108, "将有序数组转换为二叉搜索树", "convert-sorted-array-to-binary-search-tree", "TREE", "EASY"],
  [98, "验证二叉搜索树", "validate-binary-search-tree", "TREE", "MEDIUM"],
  [230, "二叉搜索树中第 K 小的元素", "kth-smallest-element-in-a-bst", "TREE", "MEDIUM"],
  [199, "二叉树的右视图", "binary-tree-right-side-view", "TREE", "MEDIUM"],
  [114, "二叉树展开为链表", "flatten-binary-tree-to-linked-list", "TREE", "MEDIUM"],
  [105, "从前序与中序遍历序列构造二叉树", "construct-binary-tree-from-preorder-and-inorder-traversal", "TREE", "MEDIUM"],
  [437, "路径总和 III", "path-sum-iii", "TREE", "MEDIUM"],
  [236, "二叉树的最近公共祖先", "lowest-common-ancestor-of-a-binary-tree", "TREE", "MEDIUM"],
  [124, "二叉树中的最大路径和", "binary-tree-maximum-path-sum", "TREE", "HARD"],
  [200, "岛屿数量", "number-of-islands", "GRAPH", "MEDIUM"],
  [994, "腐烂的橘子", "rotting-oranges", "GRAPH", "MEDIUM"],
  [207, "课程表", "course-schedule", "GRAPH", "MEDIUM"],
  [208, "实现 Trie（前缀树）", "implement-trie-prefix-tree", "TRIE", "MEDIUM"],
  [46, "全排列", "permutations", "BACKTRACKING", "MEDIUM"],
  [78, "子集", "subsets", "BACKTRACKING", "MEDIUM"],
  [17, "电话号码的字母组合", "letter-combinations-of-a-phone-number", "BACKTRACKING", "MEDIUM"],
  [39, "组合总和", "combination-sum", "BACKTRACKING", "MEDIUM"],
  [22, "括号生成", "generate-parentheses", "BACKTRACKING", "MEDIUM"],
  [79, "单词搜索", "word-search", "BACKTRACKING", "MEDIUM"],
  [131, "分割回文串", "palindrome-partitioning", "BACKTRACKING", "MEDIUM"],
  [51, "N 皇后", "n-queens", "BACKTRACKING", "HARD"],
  [35, "搜索插入位置", "search-insert-position", "BINARY_SEARCH", "EASY"],
  [74, "搜索二维矩阵", "search-a-2d-matrix", "BINARY_SEARCH", "MEDIUM"],
  [34, "在排序数组中查找元素的第一个和最后一个位置", "find-first-and-last-position-of-element-in-sorted-array", "BINARY_SEARCH", "MEDIUM"],
  [33, "搜索旋转排序数组", "search-in-rotated-sorted-array", "BINARY_SEARCH", "MEDIUM"],
  [153, "寻找旋转排序数组中的最小值", "find-minimum-in-rotated-sorted-array", "BINARY_SEARCH", "MEDIUM"],
  [4, "寻找两个正序数组的中位数", "median-of-two-sorted-arrays", "BINARY_SEARCH", "HARD"],
  [20, "有效的括号", "valid-parentheses", "STACK", "EASY"],
  [155, "最小栈", "min-stack", "STACK", "MEDIUM"],
  [394, "字符串解码", "decode-string", "STACK", "MEDIUM"],
  [739, "每日温度", "daily-temperatures", "STACK", "MEDIUM"],
  [84, "柱状图中最大的矩形", "largest-rectangle-in-histogram", "STACK", "HARD"],
  [215, "数组中的第 K 个最大元素", "kth-largest-element-in-an-array", "HEAP", "MEDIUM"],
  [347, "前 K 个高频元素", "top-k-frequent-elements", "HEAP", "MEDIUM"],
  [295, "数据流的中位数", "find-median-from-data-stream", "HEAP", "HARD"],
  [121, "买卖股票的最佳时机", "best-time-to-buy-and-sell-stock", "GREEDY", "EASY"],
  [55, "跳跃游戏", "jump-game", "GREEDY", "MEDIUM"],
  [45, "跳跃游戏 II", "jump-game-ii", "GREEDY", "MEDIUM"],
  [763, "划分字母区间", "partition-labels", "GREEDY", "MEDIUM"],
  [70, "爬楼梯", "climbing-stairs", "DYNAMIC_PROGRAMMING", "EASY"],
  [118, "杨辉三角", "pascals-triangle", "DYNAMIC_PROGRAMMING", "EASY"],
  [198, "打家劫舍", "house-robber", "DYNAMIC_PROGRAMMING", "MEDIUM"],
  [279, "完全平方数", "perfect-squares", "DYNAMIC_PROGRAMMING", "MEDIUM"],
  [322, "零钱兑换", "coin-change", "DYNAMIC_PROGRAMMING", "MEDIUM"],
  [139, "单词拆分", "word-break", "DYNAMIC_PROGRAMMING", "MEDIUM"],
  [300, "最长递增子序列", "longest-increasing-subsequence", "DYNAMIC_PROGRAMMING", "MEDIUM"],
  [152, "乘积最大子数组", "maximum-product-subarray", "DYNAMIC_PROGRAMMING", "MEDIUM"],
  [416, "分割等和子集", "partition-equal-subset-sum", "DYNAMIC_PROGRAMMING", "MEDIUM"],
  [32, "最长有效括号", "longest-valid-parentheses", "DYNAMIC_PROGRAMMING", "HARD"],
  [62, "不同路径", "unique-paths", "DYNAMIC_PROGRAMMING", "MEDIUM"],
  [64, "最小路径和", "minimum-path-sum", "DYNAMIC_PROGRAMMING", "MEDIUM"],
  [5, "最长回文子串", "longest-palindromic-substring", "DYNAMIC_PROGRAMMING", "MEDIUM"],
  [1143, "最长公共子序列", "longest-common-subsequence", "DYNAMIC_PROGRAMMING", "MEDIUM"],
  [72, "编辑距离", "edit-distance", "DYNAMIC_PROGRAMMING", "MEDIUM"],
  [136, "只出现一次的数字", "single-number", "TECHNIQUE", "EASY"],
  [169, "多数元素", "majority-element", "TECHNIQUE", "EASY"],
  [75, "颜色分类", "sort-colors", "TECHNIQUE", "MEDIUM"],
  [31, "下一个排列", "next-permutation", "TECHNIQUE", "MEDIUM"],
  [287, "寻找重复数", "find-the-duplicate-number", "TECHNIQUE", "MEDIUM"]
];

if (rows.length !== 100) throw new Error(`Expected 100 problems, got ${rows.length}`);

const judgeReady = {
  1: {
    summary: "给定整数数组和目标值，输出和为目标值的两个元素下标。",
    input: "第一行是元素个数 n，第二行是 n 个整数，第三行是目标值 target。",
    output: "输出两个从 0 开始的下标，按升序排列。",
    examples: [["4\n2 7 11 15\n9\n", "0 1\n"], ["3\n3 2 4\n6\n", "1 2\n"], ["2\n3 3\n6\n", "0 1\n"], ["5\n-1 -2 -3 -4 -5\n-8\n", "2 4\n"]],
    core: "Map<Integer, Integer> seen = new HashMap<>();",
    observation: "遍历到当前数时，只需查询目标值减去当前数是否已经出现。",
    steps: ["建立数值到下标的映射", "遍历数组并计算补数", "命中补数后输出两个下标"],
    pitfalls: ["先查询再写入，避免同一元素使用两次", "注意重复元素"],
    time: "O(n)",
    space: "O(n)"
  },
  283: {
    summary: "将数组中的所有零移动到末尾，同时保持非零元素相对顺序。",
    input: "第一行是 n，第二行是 n 个整数。",
    output: "输出移动后的数组，以空格分隔。",
    examples: [["5\n0 1 0 3 12\n", "1 3 12 0 0\n"], ["1\n0\n", "0\n"], ["3\n1 2 3\n", "1 2 3\n"], ["4\n0 0 1 0\n", "1 0 0 0\n"]],
    core: "if (nums[fast] != 0) nums[slow++] = nums[fast];",
    observation: "慢指针指向下一个应写入非零元素的位置。",
    steps: ["快指针扫描数组", "把非零元素依次写到慢指针", "将剩余位置补零"],
    pitfalls: ["不要破坏非零元素的相对顺序", "最后需要补零"],
    time: "O(n)",
    space: "O(1)"
  },
  3: {
    summary: "给定字符串，求不含重复字符的最长连续子串长度。",
    input: "一行字符串 s。",
    output: "输出最长长度。",
    examples: [["abcabcbb\n", "3\n"], ["bbbbb\n", "1\n"], ["pwwkew\n", "3\n"], ["abba\n", "2\n"]],
    core: "left = Math.max(left, lastIndex + 1);",
    observation: "右端扩展后，只移动左端恢复窗口合法性，左边界不能回退。",
    steps: ["右指针逐个加入字符", "重复时更新左边界", "记录最新位置并更新答案"],
    pitfalls: ["left 不能回退", "窗口长度是 right - left + 1"],
    time: "O(n)",
    space: "O(k)"
  },
  53: {
    summary: "给定整数数组，求和最大的连续非空子数组之和。",
    input: "第一行是 n，第二行是 n 个整数。",
    output: "输出最大连续子数组和。",
    examples: [["9\n-2 1 -3 4 -1 2 1 -5 4\n", "6\n"], ["1\n1\n", "1\n"], ["5\n5 4 -1 7 8\n", "23\n"], ["3\n-3 -2 -5\n", "-2\n"]],
    core: "current = Math.max(nums[i], current + nums[i]);",
    observation: "以当前位置结尾的最优解，只需决定接上前缀还是从当前数重新开始。",
    steps: ["维护以当前位置结尾的最大和", "更新全局最大值"],
    pitfalls: ["全负数组不能把初值设为 0", "题目要求非空子数组"],
    time: "O(n)",
    space: "O(1)"
  },
  35: {
    summary: "在有序数组中查找目标值，未找到时返回应插入的位置。",
    input: "第一行是 n，第二行是严格递增数组，第三行是 target。",
    output: "输出目标下标或插入位置。",
    examples: [["4\n1 3 5 6\n5\n", "2\n"], ["4\n1 3 5 6\n2\n", "1\n"], ["4\n1 3 5 6\n7\n", "4\n"], ["1\n1\n0\n", "0\n"]],
    core: "while (left < right) { int mid = left + (right - left) / 2; }",
    observation: "寻找第一个大于等于 target 的位置。",
    steps: ["使用左闭右开区间", "比较中点与目标值", "循环结束位置即答案"],
    pitfalls: ["区间定义必须前后一致", "target 大于所有元素时答案是 n"],
    time: "O(log n)",
    space: "O(1)"
  },
  20: {
    summary: "判断只包含括号字符的字符串是否有效。",
    input: "一行括号字符串。",
    output: "有效输出 true，否则输出 false。",
    examples: [["()\n", "true\n"], ["()[]{}\n", "true\n"], ["(]\n", "false\n"], ["([)]\n", "false\n"]],
    core: "if (stack.isEmpty() || stack.pop() != expected) return false;",
    observation: "后出现的左括号必须先被匹配，符合栈的后进先出。",
    steps: ["遇到左括号入栈", "遇到右括号检查栈顶", "最后确认栈为空"],
    pitfalls: ["弹栈前检查空栈", "遍历结束仍可能有未匹配左括号"],
    time: "O(n)",
    space: "O(n)"
  },
  121: {
    summary: "给定每天的股票价格，只允许一次买入和一次卖出，求最大利润。",
    input: "第一行是 n，第二行是 n 个价格。",
    output: "输出最大利润，无法获利时输出 0。",
    examples: [["6\n7 1 5 3 6 4\n", "5\n"], ["5\n7 6 4 3 1\n", "0\n"], ["2\n1 2\n", "1\n"], ["1\n5\n", "0\n"]],
    core: "best = Math.max(best, price - minPrice);",
    observation: "卖出当天的最佳利润由此前最低买入价决定。",
    steps: ["维护历史最低价格", "计算当天卖出的利润", "更新最大利润"],
    pitfalls: ["必须先买后卖", "全程下降时答案为 0"],
    time: "O(n)",
    space: "O(1)"
  },
  70: {
    summary: "每次爬 1 或 2 个台阶，求到达第 n 阶的方法数。",
    input: "一个正整数 n。",
    output: "输出方法数。",
    examples: [["2\n", "2\n"], ["3\n", "3\n"], ["5\n", "8\n"], ["10\n", "89\n"]],
    core: "current = previousOne + previousTwo;",
    observation: "到达当前台阶的最后一步只能来自前一阶或前两阶。",
    steps: ["定义到第 i 阶的方法数", "使用 f(i)=f(i-1)+f(i-2)", "滚动变量压缩空间"],
    pitfalls: ["确认 n=1 和 n=2 的初值", "更新滚动变量的顺序"],
    time: "O(n)",
    space: "O(1)"
  }
};

const topicName = {
  ARRAY_HASH: "数组与哈希", TWO_POINTERS: "双指针", SLIDING_WINDOW: "滑动窗口",
  SUBSTRING: "子串", ARRAY: "数组", MATRIX: "矩阵", LINKED_LIST: "链表",
  STACK: "栈", TREE: "二叉树", GRAPH: "图与搜索", TRIE: "前缀树",
  BACKTRACKING: "回溯", BINARY_SEARCH: "二分查找", HEAP: "堆",
  GREEDY: "贪心", DYNAMIC_PROGRAMMING: "动态规划", TECHNIQUE: "技巧与综合"
};

const buildProblem = (row, index) => {
  const [leetcodeId, title, slug, track, difficulty] = row;
  const ready = judgeReady[leetcodeId];
  const importance = index < 50 ? "A" : index < 80 ? "B" : "C";
  const coverageTarget = index < 38 ? "SOLVE" : index < 76 ? "GUIDED" : "LEARN";
  const summary = ready?.summary || `围绕“${title}”训练${topicName[track]}中的典型建模、边界处理与代码实现。`;
  const examples = ready
    ? ready.examples.map(([input, output], exampleIndex) => ({ input: input.trimEnd(), output: output.trimEnd(), explanation: exampleIndex === 0 ? "基础示例。" : undefined }))
    : [{ input: "请参考官方题面中的示例", output: "按题意返回结果", explanation: "本地题面采用摘要，复杂结构题建议使用 Function 模式。" }];
  const testCases = ready
    ? ready.examples.map(([input, expected], testIndex) => ({
        id: `tc-${testIndex + 1}`,
        visibility: testIndex < 2 ? "PUBLIC" : "HIDDEN",
        input,
        expected,
        comparison: "TRIM_LINES",
        tags: [testIndex === 0 ? "BASIC" : "EDGE"]
      }))
    : [];
  const acmMode = ready
    ? {
        inputDescription: ready.input,
        outputDescription: ready.output,
        mainTemplate: "import java.io.*;\nimport java.util.*;\n\npublic class Main {\n    public static void main(String[] args) throws Exception {\n        BufferedReader br = new BufferedReader(new InputStreamReader(System.in));\n        // 根据上方输入格式读取数据并输出答案\n    }\n}\n",
        publicTests: ["tc-1", "tc-2"],
        hiddenTests: ["tc-3", "tc-4"],
        timeLimitMs: 3000,
        outputLimitBytes: 1048576
      }
    : undefined;
  const functionMode = {
    className: "Solution",
    methodSignature: "请按照官方题目要求实现目标方法",
    userTemplate: "class Solution {\n    // 在这里实现官方题目要求的方法\n}\n",
    harnessId: "OFFICIAL_MANUAL",
    publicTests: [],
    hiddenTests: [],
    timeLimitMs: 3000,
    outputLimitBytes: 1048576
  };
  const supportedModes = ready ? ["ACM", "FUNCTION"] : ["FUNCTION"];
  return {
    schemaVersion: 1,
    id: `lc-${String(leetcodeId).padStart(4, "0")}`,
    leetcodeId,
    title,
    slug,
    difficulty,
    topics: [track],
    track,
    importance,
    coverageTarget,
    defaultMode: ready ? "ACM" : "FUNCTION",
    supportedModes,
    prerequisites: index === 0 ? [] : [rows[Math.max(0, index - 1)][3]],
    estimatedMinutes: {
      solve: difficulty === "HARD" ? 35 : difficulty === "MEDIUM" ? 25 : 20,
      guided: difficulty === "HARD" ? 20 : 15,
      learn: difficulty === "HARD" ? 10 : 8,
      recall: 3,
      rebuild: difficulty === "HARD" ? 25 : 15
    },
    source: {
      leetcodeUrl: `https://leetcode.cn/problems/${slug}/`,
      contentPolicy: "LOCALLY_AUTHORED_SUMMARY"
    },
    statement: {
      summary,
      descriptionMarkdown: `${summary}\n\n本工具使用本地改写摘要。完整约束、特殊数据结构定义与更多示例请点击“打开 LeetCode”查看官方题面。`,
      constraints: ready ? ["输入规模满足常见面试题约束", "请关注空输入、重复元素与边界值"] : ["具体数据范围以官方题面为准"],
      examples
    },
    functionMode,
    ...(acmMode ? { acmMode } : {}),
    testCases,
    learningCard: {
      plainExplanation: ready?.summary || `先把“${title}”翻译成可维护的状态，再决定每一步如何推进。`,
      bruteForce: `直接枚举所有可能通常会产生重复计算；先写出暴力解，再找出可以复用的信息。`,
      keyObservation: ready?.observation || `${topicName[track]}题的关键是明确状态含义、状态变化条件和不变量。`,
      algorithmSteps: ready?.steps || ["识别输入输出与目标", "定义核心状态或数据结构", "按不变量推进并处理边界", "分析复杂度并用样例验证"],
      coreCode: ready?.core || "// 先写清状态定义，再完成核心转移",
      pitfalls: ready?.pitfalls || ["只记模板而没有解释不变量", "忽略空值、下标或重复元素", "复杂度分析与实现不一致"],
      complexity: { time: ready?.time || "依具体解法而定", space: ready?.space || "依具体解法而定" },
      relatedProblemIds: []
    },
    hints: [
      { level: 1, content: "先写出暴力解会重复计算什么，再寻找可以维护的信息。" },
      { level: 2, content: `从${topicName[track]}的常见状态与不变量开始建模。` },
      { level: 3, content: ready?.observation || "列出核心状态、更新时机和循环不变量。" },
      { level: 4, content: (ready?.steps || ["定义状态", "逐步更新", "输出结果"]).join(" → ") },
      { level: 5, content: ready?.core || "// 根据学习卡补全核心代码" },
      { level: 6, content: `完整讲解已在学习卡中展开；官方完整题面与参考实现请通过题目链接核对。` }
    ],
    reviewCards: [
      {
        id: "recall-1",
        type: "IDEA_RECALL",
        prompt: `不看标签，说明“${title}”的题型、核心状态、不变量、易错点与复杂度。`,
        rubric: ["题型识别", "核心状态", "边界条件", "复杂度"]
      },
      ...(importance === "A"
        ? [{
            id: "skeleton-1",
            type: "CODE_SKELETON",
            prompt: "根据学习卡补全或默写最关键的状态更新。",
            template: ready?.core || "// 写出关键状态转移",
            expectedConcepts: ready?.steps || ["状态定义", "状态更新"]
          }]
        : [])
    ]
  };
};

const manifest = { schemaVersion: 1, version: "2026.07.28", problems: [] };
for (let index = 0; index < rows.length; index += 1) {
  const problem = buildProblem(rows[index], index);
  const file = `${String(index + 1).padStart(3, "0")}-${problem.slug}.json`;
  fs.writeFileSync(path.join(outDir, file), `${JSON.stringify(problem, null, 2)}\n`, "utf8");
  manifest.problems.push({ id: problem.id, file, order: index + 1 });
}
fs.writeFileSync(path.join(outDir, "manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
console.log(`Generated ${manifest.problems.length} problem files in ${outDir}`);
