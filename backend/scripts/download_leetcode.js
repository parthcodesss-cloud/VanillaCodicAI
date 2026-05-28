import fs from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(__dirname, "..", "data");
const FILE_PATH = join(DATA_DIR, "leetcode_questions.json");

const DATASET_URL = "https://raw.githubusercontent.com/neenza/leetcode-problems/master/merged_problems.json";

const FALLBACK_QUESTIONS = [
  {
    frontend_id: "1",
    title: "Two Sum",
    difficulty: "Easy",
    description: "Given an array of integers `nums` and an integer `target`, return indices of the two numbers such that they add up to `target`.\n\nYou may assume that each input would have exactly one solution, and you may not use the same element twice.\n\nYou can return the answer in any order.",
    code_snippets: {
      python: "class Solution:\n    def twoSum(self, nums: List[int], target: int) -> List[int]:\n        pass",
      javascript: "/**\n * @param {number[]} nums\n * @param {number} target\n * @return {number[]}\n */\nvar twoSum = function(nums, target) {\n    \n};",
      java: "class Solution {\n    public int[] twoSum(int[] nums, int target) {\n        return null;\n    }\n}",
      cpp: "class Solution {\npublic:\n    vector<int> twoSum(vector<int>& nums, int target) {\n        return {};\n    }\n};"
    }
  },
  {
    frontend_id: "9",
    title: "Palindrome Number",
    difficulty: "Easy",
    description: "Given an integer `x`, return `true` if `x` is a palindrome, and `false` otherwise.",
    code_snippets: {
      python: "class Solution:\n    def isPalindrome(self, x: int) -> bool:\n        pass",
      javascript: "/**\n * @param {number} x\n * @return {boolean}\n */\nvar isPalindrome = function(x) {\n    \n};",
      java: "class Solution {\n    public boolean isPalindrome(int x) {\n        return false;\n    }\n}",
      cpp: "class Solution {\npublic:\n    bool isPalindrome(int x) {\n        return false;\n    }\n};"
    }
  },
  {
    frontend_id: "20",
    title: "Valid Parentheses",
    difficulty: "Easy",
    description: "Given a string `s` containing just the characters `'('`, `')'`, `'{'`, `'}'`, `'['` and `']'`, determine if the input string is valid.",
    code_snippets: {
      python: "class Solution:\n    def isValid(self, s: str) -> bool:\n        pass",
      javascript: "var isValid = function(s) {\n    \n};",
      java: "class Solution {\n    public boolean isValid(String s) {\n        return false;\n    }\n}",
      cpp: "class Solution {\npublic:\n    bool isValid(string s) {\n        return false;\n    }\n};"
    }
  },
  {
    frontend_id: "70",
    title: "Climbing Stairs",
    difficulty: "Easy",
    description: "You are climbing a staircase. It takes `n` steps to reach the top.\n\nEach time you can either climb `1` or `2` steps. In how many distinct ways can you climb to the top?",
    code_snippets: {
      python: "class Solution:\n    def climbStairs(self, n: int) -> int:\n        pass",
      javascript: "var climbStairs = function(n) {\n    \n};",
      java: "class Solution {\n    public int climbStairs(int n) {\n        return 0;\n    }\n}",
      cpp: "class Solution {\npublic:\n    int climbStairs(int n) {\n        return 0;\n    }\n};"
    }
  },
  {
    frontend_id: "104",
    title: "Maximum Depth of Binary Tree",
    difficulty: "Easy",
    description: "Given the `root` of a binary tree, return its maximum depth.",
    code_snippets: {
      python: "class Solution:\n    def maxDepth(self, root: Optional[TreeNode]) -> int:\n        pass",
      javascript: "var maxDepth = function(root) {\n    \n};",
      java: "class Solution {\n    public int maxDepth(TreeNode root) {\n        return 0;\n    }\n}",
      cpp: "class Solution {\npublic:\n    int maxDepth(TreeNode* root) {\n        return 0;\n    }\n};"
    }
  }
];

export async function downloadLeetCodeQuestions() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  // Check if file exists and has content (at least 100KB to be safe)
  if (fs.existsSync(FILE_PATH)) {
    const stats = fs.statSync(FILE_PATH);
    if (stats.size > 100 * 1024) {
      console.log("📚 LeetCode dataset already cached locally");
      return;
    }
  }

  console.log("📥 Downloading LeetCode dataset in background...");
  try {
    const response = await fetch(DATASET_URL);
    if (!response.ok) {
      throw new Error(`Failed to fetch dataset: ${response.statusText}`);
    }
    const problems = await response.json();
    fs.writeFileSync(FILE_PATH, JSON.stringify(problems, null, 2), "utf-8");
    const count = problems.questions ? problems.questions.length : (Array.isArray(problems) ? problems.length : 0);
    console.log(`✅ LeetCode dataset downloaded successfully (${count} problems)`);
  } catch (err) {
    console.warn("⚠️ LeetCode download failed, using offline fallback questions:", err.message);
    if (!fs.existsSync(FILE_PATH)) {
      fs.writeFileSync(FILE_PATH, JSON.stringify(FALLBACK_QUESTIONS, null, 2), "utf-8");
    }
  }
}
