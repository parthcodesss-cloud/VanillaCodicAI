import express from "express";
import fs from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { requireAuth } from "../middleware/auth.js";
import { HfInference } from "@huggingface/inference";
import { getProfile, saveProfile } from "../services/memoryStore.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(__dirname, "..", "data");
const FILE_PATH = join(DATA_DIR, "leetcode_questions.json");
const CACHE_DIR = join(DATA_DIR, "leetcode_cache");

const router = express.Router();

let problemsCache = null;

// Helper to read problems list
function getProblems() {
  try {
    if (fs.existsSync(FILE_PATH)) {
      if (problemsCache && problemsCache.length > 5) {
        return problemsCache;
      }
      const raw = fs.readFileSync(FILE_PATH, "utf-8");
      const parsed = JSON.parse(raw);
      problemsCache = parsed.questions || parsed;
      return problemsCache;
    }
  } catch (e) {
    console.error("Error reading leetcode_questions:", e.message);
  }
  return [];
}

// Initialize HuggingFace
const hf = new HfInference(process.env.HF_TOKEN);
const HF_MODEL = "Qwen/Qwen2.5-Coder-32B-Instruct";

// 1. Get paginated and filtered list of LeetCode problems
router.get("/problems", requireAuth, (req, res) => {
  try {
    const list = getProblems();
    const q = (req.query.q || "").toLowerCase().trim();
    const difficulty = (req.query.difficulty || "").toLowerCase().trim();
    
    let filtered = list;
    if (q) {
      filtered = filtered.filter(p => 
        (p.title && p.title.toLowerCase().includes(q)) || 
        (p.frontend_id && String(p.frontend_id).toLowerCase().includes(q))
      );
    }
    
    if (difficulty && difficulty !== "all") {
      filtered = filtered.filter(p => p.difficulty && p.difficulty.toLowerCase() === difficulty);
    }

    // Sort by frontend_id numerically
    filtered.sort((a, b) => {
      const numA = parseInt(a.frontend_id, 10);
      const numB = parseInt(b.frontend_id, 10);
      if (!isNaN(numA) && !isNaN(numB)) {
        return numA - numB;
      }
      return String(a.frontend_id).localeCompare(String(b.frontend_id));
    });

    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 30;
    const startIndex = (page - 1) * limit;
    const endIndex = page * limit;
    
    const paginated = filtered.slice(startIndex, endIndex).map(p => ({
      frontend_id: p.frontend_id,
      title: p.title,
      difficulty: p.difficulty
    }));

    res.json({
      problems: paginated,
      total: filtered.length,
      page,
      limit,
      totalPages: Math.ceil(filtered.length / limit)
    });
  } catch (err) {
    console.error("LeetCode problems listing error:", err.message);
    res.status(500).json({ error: "Failed to load problems list." });
  }
});

// 2. Get specific problem details (with cached test runners)
router.get("/problems/:id", requireAuth, async (req, res) => {
  try {
    const list = getProblems();
    const problem = list.find(p => String(p.frontend_id) === String(req.params.id));
    if (!problem) {
      return res.status(404).json({ error: "Problem not found." });
    }

    // Check for cached test runners
    const runnerCachePath = join(CACHE_DIR, `runners_${problem.frontend_id}.json`);
    let testRunners = {};
    if (fs.existsSync(runnerCachePath)) {
      try {
        testRunners = JSON.parse(fs.readFileSync(runnerCachePath, "utf-8"));
      } catch (e) {
        // regenerate below
      }
    }

    // Generate test runners if not cached
    if (!testRunners.python && !testRunners.javascript) {
      try {
        const [pythonRunner, jsRunner, javaRunner, cppRunner] = await Promise.all([
          generateTestRunnerCode(problem, "python"),
          generateTestRunnerCode(problem, "javascript"),
          generateTestRunnerCode(problem, "java"),
          generateTestRunnerCode(problem, "cpp")
        ]);
        testRunners = { python: pythonRunner, javascript: jsRunner, java: javaRunner, cpp: cppRunner };
        // Save to cache
        if (!fs.existsSync(CACHE_DIR)) {
          fs.mkdirSync(CACHE_DIR, { recursive: true });
        }
        fs.writeFileSync(runnerCachePath, JSON.stringify(testRunners, null, 2), "utf-8");
      } catch (e) {
        console.error("Failed to generate test runners for problem", problem.frontend_id, e.message);
      }
    }
    
    res.json({
      frontend_id: problem.frontend_id,
      title: problem.title,
      difficulty: problem.difficulty,
      description: problem.description,
      examples: problem.examples || [],
      constraints: problem.constraints || [],
      code_snippets: problem.code_snippets || {},
      test_runners: testRunners,
    });
  } catch (err) {
    console.error("LeetCode problem details error:", err.message);
    res.status(500).json({ error: "Failed to load problem details." });
  }
});

// 3. Get AI approach for a specific problem (cached)
router.get("/problems/:id/approach", requireAuth, async (req, res) => {
  const problemId = req.params.id;
  const cachePath = join(CACHE_DIR, `${problemId}.json`);
  
  // Check cache first
  if (fs.existsSync(cachePath)) {
    try {
      const cached = JSON.parse(fs.readFileSync(cachePath, "utf-8"));
      return res.json(cached);
    } catch (err) {
      // Ignore and regenerate
    }
  }

  const list = getProblems();
  const problem = list.find(p => String(p.frontend_id) === String(problemId));
  if (!problem) {
    return res.status(404).json({ error: "Problem not found." });
  }

  if (!process.env.HF_TOKEN) {
    return res.status(500).json({ error: "AI service not configured on server (missing HF_TOKEN)." });
  }

  try {
    const prompt = `You are CodeMedic AI, a world-class code debugging and DSA mentor.
Analyze the following LeetCode problem:
Title: #${problem.frontend_id} ${problem.title}
Difficulty: ${problem.difficulty}
Description:
${problem.description}

Provide a simplified, beginner-friendly step-by-step algorithm approach to solve this problem.
Break it down into:
1. **Understanding the Goal**: A 1-2 sentence explanation of what we are trying to achieve.
2. **Key Intuition**: The core trick or insight needed (e.g. "We can use two pointers to avoid nested loops").
3. **Step-by-Step Approach**: A numbered list of logical steps to take in code.
4. **Complexity**: The expected Time and Space complexity of this approach (e.g. O(n) time, O(1) space).

CRITICAL RULE:
- Do NOT provide the final solution code.
- Only explain the algorithm and logic.
- Keep the language simple and encouraging.`;

    const response = await hf.chatCompletion({
      model: HF_MODEL,
      messages: [
        { role: "system", content: "You are CodeMedic AI. Provide step-by-step DSA algorithms and hints without displaying full solution code." },
        { role: "user", content: prompt }
      ],
      max_tokens: 1500,
      temperature: 0.3,
    });

    const approach = response.choices[0].message.content.trim();
    const resultData = {
      frontend_id: problem.frontend_id,
      title: problem.title,
      approach
    };

    // Save to cache
    if (!fs.existsSync(CACHE_DIR)) {
      fs.mkdirSync(CACHE_DIR, { recursive: true });
    }
    fs.writeFileSync(cachePath, JSON.stringify(resultData, null, 2), "utf-8");

    res.json(resultData);
  } catch (err) {
    console.error("AI approach generation error:", err.message);
    res.status(500).json({ error: `Failed to generate approach: ${err.message}` });
  }
});

// Helper to generate a test runner snippet using Hugging Face
async function generateTestRunnerCode(problem, language) {
  if (!process.env.HF_TOKEN) return "";
  
  let rules = "";
  if (language === "python") {
    rules = `
- The user's code ALREADY defines the 'Solution' class. Do NOT define or write the 'Solution' class or any of its methods in your snippet.
- Write Python code that instantiates 'Solution()' (from the user's code) and runs at least 2 test cases from the examples.
- Use assert statements or comparisons.
- Wrap execution in a try-except block.
- Print "✅ All test cases passed successfully!" if all assertions pass.
- If an assertion fails, print the error message (e.g. "❌ Case 1 failed: Expected X, got Y") to sys.stderr and call sys.exit(1).
- Return ONLY the raw python code to append. Do not include markdown code fences or explanation.
`;
  } else if (language === "javascript") {
    rules = `
- The user's code ALREADY defines the function or the 'Solution' class. Do NOT write the implementation of the function or the 'Solution' class in your snippet.
- Write JavaScript code that checks if the function/class exists, instantiates it if it's a class, and runs at least 2 test cases from the examples.
- If a test fails, print the error message to console.error and call process.exit(1).
- Print "✅ All test cases passed successfully!" if all pass.
- Return ONLY the raw JavaScript code to append. Do not include markdown code fences or explanation.
`;
  } else if (language === "java") {
    rules = `
- The user's code ALREADY defines the 'Solution' class. Do NOT define the 'Solution' class in your snippet.
- Write a Java 'public static void main(String[] args)' method that instantiates Solution and runs at least 2 test cases.
- If any test fails, print the failure details to System.err and call System.exit(1).
- Print "✅ All test cases passed successfully!" if all pass.
- Return ONLY the raw Java code for the main method (starting with public static void main and ending with the closing brace). Do not include the class declaration itself or markdown code fences.
`;
  } else if (language === "cpp") {
    rules = `
- The user's code ALREADY defines the 'Solution' class. Do NOT define the 'Solution' class in your snippet.
- Write a C++ 'int main()' function that instantiates Solution and runs at least 2 test cases.
- If any test fails, print failure details to std::cerr and return 1.
- Print "✅ All test cases passed successfully!" if all pass.
- Return ONLY the raw C++ main function code. Do not include markdown code fences or explanation.
`;
  }

  const prompt = `You are a LeetCode test case generator.
Analyze the following LeetCode problem:
Title: #${problem.frontend_id} ${problem.title}
Description: ${problem.description}
Examples: ${JSON.stringify(problem.examples)}

Generate a test runner snippet in ${language} that will test the user's Solution implementation.
Rules for ${language}:
${rules}

Ensure the code is valid, handles standard types, and parses the outputs correctly.
IMPORTANT: Return ONLY the raw code. No markdown fences like \`\`\`python or \`\`\`, no explanation, no other text.`;

  try {
    const response = await hf.chatCompletion({
      model: HF_MODEL,
      messages: [
        { role: "system", content: "You are a test case generator. You MUST respond with ONLY raw executable code blocks, without markdown fences." },
        { role: "user", content: prompt }
      ],
      max_tokens: 800,
      temperature: 0.2,
    });
    
    let text = response.choices[0].message.content.trim();
    const match = text.match(/```(?:python|javascript|java|cpp|json)?\n([\s\S]*?)\n```/) || text.match(/```([\s\S]*?)```/);
    if (match) {
      text = match[1].trim();
    } else {
      if (text.startsWith("```")) {
        text = text.replace(/^```(?:python|javascript|java|cpp|json)?\n?/, "").replace(/\n?```$/, "");
      }
    }
    return text.trim();
  } catch (err) {
    console.error(`Failed to generate test runner for ${language}:`, err.message);
    return "";
  }
}

// 4. Get a random LeetCode problem tailored to the user's level
router.get("/random-by-level", requireAuth, async (req, res) => {
  try {
    const profile = getProfile(req.userId) || { level: 1 };
    const level = profile.level || 1;
    
    let targetDifficulty = "Easy";
    if (level >= 3 && level <= 4) {
      targetDifficulty = "Medium";
    } else if (level >= 5) {
      targetDifficulty = "Hard";
    }

    const list = getProblems();
    let filtered = list.filter(p => p.difficulty && p.difficulty.toLowerCase() === targetDifficulty.toLowerCase());
    
    // Fallback if no questions are found for that difficulty
    if (filtered.length === 0) {
      filtered = list.filter(p => p.difficulty && p.difficulty.toLowerCase() === "easy");
    }
    
    if (filtered.length === 0) {
      return res.status(404).json({ error: "No problems available in the catalog." });
    }

    // Pick a random problem
    const randomIndex = Math.floor(Math.random() * filtered.length);
    const problem = filtered[randomIndex];

    // Generate test runners in parallel for the four languages
    const [pythonRunner, jsRunner, javaRunner, cppRunner] = await Promise.all([
      generateTestRunnerCode(problem, "python"),
      generateTestRunnerCode(problem, "javascript"),
      generateTestRunnerCode(problem, "java"),
      generateTestRunnerCode(problem, "cpp")
    ]);

    res.json({
      frontend_id: problem.frontend_id,
      title: problem.title,
      difficulty: problem.difficulty,
      description: problem.description,
      examples: problem.examples || [],
      constraints: problem.constraints || [],
      code_snippets: problem.code_snippets || {},
      test_runners: {
        python: pythonRunner,
        javascript: jsRunner,
        java: javaRunner,
        cpp: cppRunner
      }
    });
  } catch (err) {
    console.error("Error generating random problem by level:", err.message);
    res.status(500).json({ error: "Failed to generate random problem by level." });
  }
});

// 5. Claim rewards for completing a test based on difficulty
router.post("/test/complete", requireAuth, (req, res) => {
  try {
    const difficulty = (req.body.difficulty || "easy").toLowerCase();
    const profile = getProfile(req.userId);
    if (!profile) {
      return res.status(404).json({ error: "Profile not found." });
    }

    let xpEarned = 50;
    let coinsEarned = 15;

    if (difficulty === "medium") {
      xpEarned = 100;
      coinsEarned = 25;
    } else if (difficulty === "hard") {
      xpEarned = 200;
      coinsEarned = 50;
    }

    profile.xp = (profile.xp || 0) + xpEarned;
    profile.coins = (profile.coins || 0) + coinsEarned;
    
    // Level calculation
    const XP_PER_LEVEL = 100;
    const oldLevel = profile.level || 1;
    const newLevel = Math.floor(profile.xp / XP_PER_LEVEL) + 1;
    profile.level = newLevel;

    const titles = [
      "Bug Spotter", "Code Rookie", "Debug Apprentice", "Bug Hunter", 
      "Code Surgeon", "Debug Specialist", "Error Eliminator", "Code Medic", 
      "Debug Master", "Code Architect"
    ];
    profile.levelTitle = titles[Math.min(newLevel - 1, titles.length - 1)];

    saveProfile(req.userId, profile);

    res.json({
      success: true,
      xpEarned,
      coinsEarned,
      newProfile: profile,
      leveledUp: newLevel > oldLevel
    });
  } catch (err) {
    console.error("Test completion error:", err.message);
    res.status(500).json({ error: "Failed to record test completion." });
  }
});

export default router;
