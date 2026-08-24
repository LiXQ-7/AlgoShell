import { describe, expect, it } from "vitest";
import { prepareFunctionSource } from "./java";

describe("prepareFunctionSource", () => {
  it("makes user-provided LeetCode helper types package-private", () => {
    const source = prepareFunctionSource(`
public class TreeNode {
    int val;
    TreeNode left;
    TreeNode right;
}

class Solution {
    public boolean isSymmetric(TreeNode root) {
        return true;
    }
}
`);

    expect(source).toContain("class TreeNode");
    expect(source).not.toContain("public class TreeNode");
    expect(source).toContain("class Solution");
  });

  it("keeps imports before generated helper definitions", () => {
    const source = prepareFunctionSource(`
import java.math.BigInteger;

class Solution {
    BigInteger solve() { return BigInteger.ONE; }
}
`);

    expect(source.indexOf("import java.math.BigInteger;")).toBeLessThan(source.indexOf("class ListNode"));
  });

  it("does not duplicate a helper type already supplied by the user", () => {
    const source = prepareFunctionSource("class ListNode { int val; }\nclass Solution {}");
    expect(source.match(/class ListNode/g)).toHaveLength(1);
  });
});
