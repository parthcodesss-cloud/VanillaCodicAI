import "dotenv/config";
import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import { HfInference } from "@huggingface/inference";
import { exec, spawn } from "child_process";
import { writeFileSync, unlinkSync, existsSync, mkdirSync, rmSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { createServer } from "http";
import { Server } from "socket.io";

const __dirname = dirname(fileURLToPath(import.meta.url));
const TEMP_DIR = join(__dirname, "..", "temp");
if (!existsSync(TEMP_DIR)) mkdirSync(TEMP_DIR, { recursive: true });

import { runMigrations } from "./db/migrate.js";
import authRouter from "./routes/auth.js";
import socialRouter from "./routes/social.js";
import leetcodeRouter from "./routes/leetcode.js";
import prescriptionsRouter from "./routes/prescriptions.js";
import { downloadLeetCodeQuestions } from "./scripts/download_leetcode.js";
import { requireAuth } from "./middleware/auth.js";
import {
  getUserProfile, updateUserProfile, addUserSession, getUserSessions
} from "./services/authService.js";
import {
  addSession, getProfile, getSessions, getRecentSessions
} from "./services/memoryStore.js";
import {
  updateProfileAfterDebug, updateProfileAfterFix, getSkillRadarData,
  getLevelTitle, getDifficultyLevel, getWeakestSkills, getMostRepeatedMistakes,
  handleDailyLogin, claimDailyCoins,
} from "./services/profileService.js";
import {
  initSimilarityService, storeSessionEmbedding, findSimilarSessions
} from "./services/similarityService.js";
import { buildPersonalizedContext } from "./services/contextService.js";

const app = express();
const PORT = process.env.PORT || 3001;

const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: { origin: true, credentials: true },
});

// ── Active Users Registry ─────────────────────────────────────────────
const activeUsers = new Map(); // userId -> { socketId, name, username, level }

// Make io and activeUsers available to routes
app.set("io", io);
app.set("activeUsers", activeUsers);

app.use(cors({
  origin: true,
  credentials: true,
}));
app.use(express.json({ limit: "1mb" }));
app.use(cookieParser());

const HF_TOKEN = process.env.HF_TOKEN;
const HF_MODEL = "Qwen/Qwen2.5-Coder-32B-Instruct";
const hf = new HfInference(HF_TOKEN);

initSimilarityService(hf);

// ── Auth Routes ───────────────────────────────────────────────────────

app.use("/api/auth", authRouter);
app.use("/api/social", socialRouter);
app.use("/api/leetcode", leetcodeRouter);
app.use("/api/prescriptions", prescriptionsRouter);

// ── Prompts ──────────────────────────────────────────────────────────

function formatFiles(files) {
  return files.map(f => `--- ${f.name} ---\n${f.content}`).join("\n\n");
}

function buildDebugPrompt(files, language, contextBlock = "") {
  const codeContext = formatFiles(files);
  return `You are VanillaCodicAI, a world-class code debugger.
Analyze the following ${language} code for errors, logical flaws, and code smells.
Return ONLY a valid JSON object (no markdown fences, no extra text) with exactly this structure:

{
  "summary": "A one-line summary of the code's intent.",
  "errors": [
    {
      "type": "syntax | logical | runtime",
      "severity": "critical | warning | info",
      "line": number_or_null,
      "title": "Short error title",
      "explanation": "Beginner-friendly explanation of what is wrong and WHY it matters.",
      "suggestion": "What the developer should do to fix it.",
      "concepts": ["related programming concepts"]
    }
  ],
  "codeSmells": [
    {
      "title": "Short title of the code smell",
      "explanation": "Why this is a bad practice.",
      "suggestion": "How to improve it."
    }
  ],
  "timeComplexity": "e.g. O(n)",
  "spaceComplexity": "e.g. O(1)",
  "overallAssessment": "A short, encouraging paragraph summarizing the code quality and offering tips."
}
${contextBlock}
Rules:
- If there are NO errors, return an empty "errors" array and praise the code.
- "codeSmells" are NOT errors — they are style/practice improvements. Return empty array if none.
- Always use simple, beginner-friendly language.
- Mention potential runtime issues even if they might not always trigger.
- If the personalized context mentions repeated mistakes, gently remind the user.
- Be thorough but concise.
- IMPORTANT: Return ONLY the JSON object.

CODE:
${codeContext}`;
}

function buildFixPrompt(files, language, errorContext = null) {
  const codeContext = formatFiles(files);
  const errorInstruction = errorContext ? `\nThe user tried to run or debug this code and received the following error:\n${errorContext}\n\nPlease analyze this specific error and ensure your fix explicitly resolves it, while still fixing any other issues.\n` : "";
  
  return `You are VanillaCodicAI, a world-class code debugger.
Fix ALL errors (syntax, logical, runtime) in the following ${language} code.${errorInstruction}
Return ONLY a valid JSON object (no markdown fences, no extra text) with exactly this structure:

{
  "correctedCode": "The full corrected source code as a string. If multiple files were provided, concatenate the corrected versions using '--- filename ---' headers.",
  "changesMade": [
    "Human-readable description of each fix applied."
  ],
  "tips": [
    "Optional best-practice tips for the developer."
  ]
}

Rules:
- Preserve the developer's intent and coding style where possible.
- If the code is already correct, return the original code and mention that.
- Use simple, beginner-friendly language.
- IMPORTANT: Return ONLY the JSON object.

CODE:
${codeContext}`;
}

// ── HuggingFace Helper ────────────────────────────────────────────────

async function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function callHF(prompt, retries = 3, systemMessage = "You are VanillaCodicAI. You MUST respond with ONLY valid JSON. No markdown code fences, no extra text before or after the JSON.") {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const response = await hf.chatCompletion({
        model: HF_MODEL,
        messages: [
          {
            role: "system",
            content: systemMessage,
          },
          { role: "user", content: prompt },
        ],
        max_tokens: 4096,
        temperature: 0.3,
      });

      let text = response.choices[0].message.content.trim();
      if (text.startsWith("```")) {
        text = text.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
      }
      return JSON.parse(text);
    } catch (err) {
      console.error(`HF call attempt ${attempt}/${retries} failed:`, err.message);
      if (attempt < retries) {
        console.log(`Retrying in 2s...`);
        await sleep(2000);
      } else {
        throw err;
      }
    }
  }
}

// ── Routes ────────────────────────────────────────────────────────────

app.post("/api/debug", requireAuth, async (req, res) => {
  try {
    const { files, mainFile, language } = req.body;
    if (!files || files.length === 0 || !language) {
      return res.status(400).json({ error: "files and language are required." });
    }

    const fullCodeSnippet = files.map(f => f.content).join("\n");
    const { contextString, metadata: contextMeta } =
      await buildPersonalizedContext(req.userId, fullCodeSnippet, language, mainFile);

    const result = await callHF(buildDebugPrompt(files, language, contextString));

    // Store in DB (per-user)
    const session = await addUserSession(req.userId, {
      language,
      mainFile,
      codeSnippet: fullCodeSnippet.slice(0, 500),
      summary: result.summary,
      errorTitles: (result.errors || []).map(e => e.title),
      errorTypes: (result.errors || []).map(e => e.type),
      errorCount: (result.errors || []).length,
      codeSmellCount: (result.codeSmells || []).length,
    });

    // Also store in per-user memory for similarity/context
    addSession(req.userId, {
      language, mainFile,
      codeSnippet: fullCodeSnippet.slice(0, 500),
      summary: result.summary,
      errorTitles: (result.errors || []).map(e => e.title),
      errorTypes: (result.errors || []).map(e => e.type),
      errorCount: (result.errors || []).length,
      codeSmellCount: (result.codeSmells || []).length,
    });

    const memProfile = updateProfileAfterDebug(req.userId, result, language);

    storeSessionEmbedding(req.userId, session).catch(err =>
      console.error("Embedding storage failed:", err.message)
    );

    res.json({
      ...result,
      personalization: {
        difficulty: contextMeta.difficulty,
        weakSkills: contextMeta.weakSkills,
        similarSessions: contextMeta.similarSessions,
        repeatedMistakes: contextMeta.repeatedMistakes,
      },
      profile: {
        xp: memProfile.xp,
        level: memProfile.level,
        levelTitle: getLevelTitle(memProfile.level),
        currentStreak: memProfile.currentStreak,
        totalSessions: memProfile.totalSessions,
      },
    });
  } catch (err) {
    console.error("Debug endpoint error:", err.message);
    res.status(500).json({ error: `AI analysis failed: ${err.message}` });
  }
});

app.post("/api/fix", requireAuth, async (req, res) => {
  try {
    const { files, mainFile, language, errorContext } = req.body;
    if (!files || files.length === 0 || !language) {
      return res.status(400).json({ error: "files and language are required." });
    }
    const result = await callHF(buildFixPrompt(files, language, errorContext));
    const profile = updateProfileAfterFix(req.userId, language);
    res.json({
      ...result,
      profile: {
        xp: profile.xp,
        level: profile.level,
        levelTitle: getLevelTitle(profile.level),
      },
    });
  } catch (err) {
    console.error("Fix endpoint error:", err.message);
    res.status(500).json({ error: `AI fix failed: ${err.message}` });
  }
});

app.get("/api/config", (req, res) => {
  res.json({ model: HF_MODEL });
});

app.post("/api/suggest-input", requireAuth, async (req, res) => {
  try {
    const { code, language } = req.body;
    if (!code) return res.status(400).json({ error: "Code is required" });

    const prompt = `Analyze this ${language} code and provide a sample standard input (stdin) that would be appropriate to run it.
Code:
${code}

Return ONLY the raw input text that should be typed into stdin. Do not include markdown formatting, explanations, or quotes. If the code does not require any input, return an empty string.`;

    const response = await hf.chatCompletion({
      model: HF_MODEL,
      messages: [{ role: "user", content: prompt }],
      max_tokens: 500,
      temperature: 0.2,
    });
    
    let suggestedInput = response.choices[0].message.content.trim();
    // remove markdown code blocks if the model mistakenly included them
    if (suggestedInput.startsWith("\`\`\`")) {
       suggestedInput = suggestedInput.replace(/\`\`\`[a-z]*\n/g, "").replace(/\`\`\`/g, "").trim();
    }
    
    res.json({ input: suggestedInput });
  } catch (err) {
    console.error("Suggest input error:", err.message);
    res.status(500).json({ error: "Failed to suggest input" });
  }
});

app.get("/api/profile", requireAuth, async (req, res) => {
  try {
    const { profile, claimAvailable } = handleDailyLogin(req.userId);
    const radarData = getSkillRadarData(profile);
    const difficulty = getDifficultyLevel(profile);
    const weakSkills = getWeakestSkills(profile);
    const repeatedMistakes = getMostRepeatedMistakes(profile);
    res.json({
      ...profile,
      claimAvailable,
      levelTitle: getLevelTitle(profile.level),
      difficulty,
      radarData,
      weakSkills,
      repeatedMistakes,
    });
  } catch (err) {
    console.error("Profile endpoint error:", err.message);
    res.status(500).json({ error: "Failed to load profile." });
  }
});

app.post("/api/profile/claim", requireAuth, async (req, res) => {
  try {
    const { profile, claimed } = claimDailyCoins(req.userId);
    res.json({ success: true, claimed, profile });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.get("/api/history", requireAuth, async (req, res) => {
  try {
    const sessions = await getUserSessions(req.userId, 30);
    res.json({ sessions });
  } catch (err) {
    console.error("History endpoint error:", err.message);
    res.status(500).json({ error: "Failed to load history." });
  }
});

// ── Run Code ──────────────────────────────────────────────────────────

import { execSync } from "child_process";

function detectCmd(candidates, label, emoji) {
  for (const cmd of candidates) {
    try {
      execSync(`${cmd} --version`, { stdio: "ignore", timeout: 3000 });
      console.log(`${emoji} ${label} detected: ${cmd}`);
      return cmd;
    } catch {}
  }
  console.warn(`⚠️ No ${label} installation detected`);
  return null;
}

const PYTHON_CMD = detectCmd(["py", "python3", "python"], "Python", "🐍");
const JAVA_CMD = detectCmd(["javac"], "Java compiler", "☕") ? "java" : null;
const GPP_CMD = detectCmd(["g++"], "C++ compiler", "⚙️");

function extractJavaClassName(content) {
  const match = content.match(/(?:public\s+)?class\s+(\w+)/);
  return match ? match[1] : "Main";
}

app.post("/api/run", requireAuth, async (req, res) => {
  let { files, mainFile, language, stdinInput } = req.body;
  if (!files || files.length === 0 || !mainFile || !language) {
    return res.status(400).json({ error: "files, mainFile, and language are required." });
  }

  const startTime = Date.now();
  const sessionDir = join(TEMP_DIR, `run_${Date.now()}`);

  try {
    if (!existsSync(sessionDir)) {
      mkdirSync(sessionDir, { recursive: true });
    }

    for (const file of files) {
      let fileName = file.name;
      if (language === "java" && fileName === req.body.mainFile) {
        const className = extractJavaClassName(file.content);
        if (className) {
          fileName = `${className}.java`;
          mainFile = fileName;
        }
      }
      writeFileSync(join(sessionDir, fileName), file.content, "utf-8");
    }

    if (language === "javascript") {
      writeFileSync(join(sessionDir, "package.json"), JSON.stringify({ type: "commonjs" }));
    }

    const mainFilePath = join(sessionDir, mainFile);
    let result;

    if (language === "javascript") {
      result = await execPromise(`node "${mainFilePath}"`, sessionDir, stdinInput);
    } else if (language === "python") {
      if (!PYTHON_CMD) {
        return res.status(400).json({ error: "Python is not installed on this server." });
      }
      result = await execPromise(`${PYTHON_CMD} "${mainFilePath}"`, sessionDir, stdinInput);
    } else if (language === "java") {
      if (!JAVA_CMD) {
        return res.status(400).json({ error: "Java (JDK) is not installed on this server." });
      }
      // Extract class name from the file that WAS mainFile (req.body.mainFile is the original name)
      const originalMainContent = files.find(f => f.name === req.body.mainFile)?.content || "";
      const className = extractJavaClassName(originalMainContent);
      
      const compileResult = await execPromise(`javac "${mainFilePath}"`, sessionDir);
      if (compileResult.exitCode !== 0) {
        result = { ...compileResult, stderr: "Compilation Error:\n" + compileResult.stderr };
      } else {
        result = await execPromise(`java -cp "${sessionDir}" ${className}`, sessionDir, stdinInput);
      }
    } else if (language === "cpp") {
      if (!GPP_CMD) {
        return res.status(400).json({ error: "g++ (C++ compiler) is not installed on this server." });
      }
      const outPath = join(sessionDir, `run_${Date.now()}.exe`);
      const cppFiles = files.filter(f => f.name.endsWith('.cpp')).map(f => `"${f.name}"`).join(' ');
      const compileResult = await execPromise(`g++ ${cppFiles} -o "${outPath}"`, sessionDir);
      if (compileResult.exitCode !== 0) {
        result = { ...compileResult, stderr: "Compilation Error:\n" + compileResult.stderr };
      } else {
        result = await execPromise(`"${outPath}"`, sessionDir, stdinInput);
      }
    } else {
      return res.status(400).json({ error: `Running ${language} is not supported yet.` });
    }

    const executionTime = Date.now() - startTime;
    res.json({ ...result, executionTime, language });
  } catch (err) {
    console.error("Run endpoint error:", err.message);
    res.status(500).json({ error: "Failed to execute code." });
  } finally {
    setTimeout(() => {
      try {
        if (existsSync(sessionDir)) rmSync(sessionDir, { recursive: true, force: true });
      } catch (e) {
        console.warn("Cleanup deferred:", e.message);
      }
    }, 2000);
  }
});

function execPromise(cmd, cwd, stdinInput = "") {
  return new Promise((resolve) => {
    let stdout = "";
    let stderr = "";
    let killed = false;

    const child = spawn(cmd, [], {
      cwd, shell: true, stdio: ["pipe", "pipe", "pipe"], windowsHide: true,
    });

    const timer = setTimeout(() => {
      killed = true;
      child.kill("SIGKILL");
    }, 30000);

    child.stdout.on("data", (data) => {
      if (stdout.length < 512 * 1024) {
        stdout += data.toString();
      }
      if (!killed && stdout.length >= 512 * 1024) { 
        killed = true; 
        child.kill("SIGKILL"); 
      }
    });
    child.stderr.on("data", (data) => {
      if (stderr.length < 512 * 1024) {
        stderr += data.toString();
      }
      if (!killed && stderr.length >= 512 * 1024) {
        killed = true;
        child.kill("SIGKILL");
      }
    });
    child.on("close", (code) => {
      clearTimeout(timer);
      resolve({ stdout, stderr, exitCode: code ?? 1, timedOut: killed });
    });
    child.on("error", (err) => {
      clearTimeout(timer);
      resolve({ stdout, stderr: stderr || err.message, exitCode: 1, timedOut: false });
    });

    if (stdinInput) child.stdin.write(stdinInput);
    child.stdin.end();
  });
}

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", model: HF_MODEL });
});

// ── Socket.io Authentication & Events ─────────────────────────────────
import jwt from "jsonwebtoken";
import { query as dbQuery } from "./db/index.js";

io.use(async (socket, next) => {
  try {
    const token = socket.handshake.auth?.token ||
      socket.handshake.headers?.cookie
        ?.split("; ")
        .find(c => c.startsWith("token="))
        ?.split("=")[1];
    if (!token) return next(new Error("Authentication required"));
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    socket.userId = decoded.userId || decoded.id;
    // Fetch user details
    const userResult = await dbQuery(
      "SELECT id, name, username, avatar_url FROM users WHERE id = $1",
      [socket.userId]
    );
    if (userResult.rows[0]) {
      socket.userDetails = userResult.rows[0];
    }
    next();
  } catch (err) {
    next(new Error("Invalid token"));
  }
});

io.on("connection", (socket) => {
  const userId = socket.userId;
  const userDetails = socket.userDetails || {};
  const profile = getProfile(userId);

  activeUsers.set(userId, {
    socketId: socket.id,
    id: userId,
    name: userDetails.name || "Unknown",
    username: userDetails.username || "unknown",
    avatar_url: userDetails.avatar_url || null,
    level: profile?.level || 1,
  });

  console.log(`🔌 User connected: ${userDetails.name || userId} (socket ${socket.id})`);

  // Broadcast updated online list to all clients
  io.emit("online_users", Array.from(activeUsers.values()).map(u => ({
    id: u.id, name: u.name, username: u.username, avatar_url: u.avatar_url, level: u.level
  })));

  // ── Challenge a player ──────────────────────────────────────────────
  socket.on("challenge_player", (data) => {
    const { targetUserId, problemId, problemTitle, problemDifficulty } = data;
    const target = activeUsers.get(targetUserId);
    if (!target) {
      socket.emit("challenge_error", { message: "Player is no longer online." });
      return;
    }
    const challenger = activeUsers.get(userId);
    io.to(target.socketId).emit("incoming_challenge", {
      challengerId: userId,
      challengerName: challenger?.name || "Unknown",
      challengerUsername: challenger?.username || "unknown",
      challengerLevel: challenger?.level || 1,
      problemId,
      problemTitle,
      problemDifficulty,
    });
  });

  // ── Accept challenge ────────────────────────────────────────────────
  socket.on("accept_challenge", (data) => {
    const { challengerId, problemId } = data;
    const challenger = activeUsers.get(challengerId);
    if (!challenger) {
      socket.emit("challenge_error", { message: "Challenger disconnected." });
      return;
    }
    const accepter = activeUsers.get(userId);
    const roomCode = `duel_${Math.min(userId, challengerId)}_${Math.max(userId, challengerId)}_${Date.now()}`;

    // Both join the room
    socket.join(roomCode);
    const challengerSocket = io.sockets.sockets.get(challenger.socketId);
    if (challengerSocket) challengerSocket.join(roomCode);

    const startPayload = {
      roomCode,
      problemId,
      startTime: Date.now(),
      players: [
        { id: challengerId, name: challenger.name, username: challenger.username, level: challenger.level },
        { id: userId, name: accepter?.name || "Unknown", username: accepter?.username || "unknown", level: accepter?.level || 1 },
      ],
    };

    io.to(challenger.socketId).emit("challenge_accepted", startPayload);
    socket.emit("challenge_accepted", startPayload);
  });

  // ── Decline challenge ───────────────────────────────────────────────
  socket.on("decline_challenge", (data) => {
    const { challengerId } = data;
    const challenger = activeUsers.get(challengerId);
    if (challenger) {
      io.to(challenger.socketId).emit("challenge_declined", {
        declinedBy: userDetails.name || "Player",
      });
    }
  });

  // ── Submit progress during duel ─────────────────────────────────────
  socket.on("submit_progress", (data) => {
    const { roomCode, progressPercent, statusText } = data;
    socket.to(roomCode).emit("peer_progress", {
      senderId: userId,
      progressPercent,
      statusText,
    });
  });

  // ── Submit victory ──────────────────────────────────────────────────
  socket.on("submit_victory", (data) => {
    const { roomCode } = data;
    socket.to(roomCode).emit("duel_finished", {
      winnerId: userId,
      winnerName: userDetails.name || "Unknown",
    });
  });

  // ── Disconnect ──────────────────────────────────────────────────────
  socket.on("disconnect", () => {
    activeUsers.delete(userId);
    console.log(`🔌 User disconnected: ${userDetails.name || userId}`);
    io.emit("online_users", Array.from(activeUsers.values()).map(u => ({
      id: u.id, name: u.name, username: u.username, avatar_url: u.avatar_url, level: u.level
    })));
  });
});

// ── Start ─────────────────────────────────────────────────────────────

runMigrations()
  .then(() => {
    httpServer.listen(PORT, () => {
      console.log(`🩺 VanillaCodicAI backend running on http://localhost:${PORT}`);
      console.log(`🤖 Model: ${HF_MODEL}`);
      console.log(`🧠 Memory system: ACTIVE`);
      console.log(`🗄️  Database: CONNECTED`);
      console.log(`🔌 Socket.io: ACTIVE`);
      // Start LeetCode data background download
      downloadLeetCodeQuestions().catch(err => console.error("LeetCode download failed:", err.message));
    });
  })
  .catch(err => {
    console.error("Failed to start server:", err.message);
    process.exit(1);
  });
