import express from "express";
import { requireAuth } from "../middleware/auth.js";
import { getProfile, saveProfile, getPrescription, savePrescription, deletePrescription } from "../services/memoryStore.js";
import { calculateLevel, getLevelTitle } from "../services/profileService.js";

const router = express.Router();

// Memory cache to track consecutive errors per user: { userId: { count: number, lastErrorType: string } }
const errorTracker = {};

const AILMENTS = {
  bounds: {
    ailment: "Index Out of Bounds Syndrome",
    doctorNote: "Your code has crashed with index boundary errors. This indicates difficulties with loop conditions. Let's practice index bounds.",
    exercises: [
      { frontend_id: "704", title: "Binary Search", completed: false },
      { frontend_id: "27", title: "Remove Element", completed: false },
      { frontend_id: "35", title: "Search Insert Position", completed: false }
    ]
  },
  timeout: {
    ailment: "Stack Overflow / Infinite Loop Fever",
    doctorNote: "Your execution timed out or exceeded memory bounds, indicating potential infinite loops or recursive overflows. Let's practice base cases.",
    exercises: [
      { frontend_id: "509", title: "Fibonacci Number", completed: false },
      { frontend_id: "70", title: "Climbing Stairs", completed: false },
      { frontend_id: "104", title: "Maximum Depth of Binary Tree", completed: false }
    ]
  },
  generic: {
    ailment: "Logic & Syntax Ailment",
    doctorNote: "Multiple consecutive compiler logic or syntax errors detected. Let's rebuild your fundamentals with core array/string traversal.",
    exercises: [
      { frontend_id: "1", title: "Two Sum", completed: false },
      { frontend_id: "9", title: "Palindrome Number", completed: false },
      { frontend_id: "13", title: "Roman to Integer", completed: false }
    ]
  }
};

// 1. GET active prescription
router.get("/active", requireAuth, (req, res) => {
  try {
    const prescription = getPrescription(req.userId);
    res.json({ prescription });
  } catch (err) {
    console.error("Error fetching active prescription:", err.message);
    res.status(500).json({ error: "Failed to load active prescription." });
  }
});

// 2. Clear current prescription (dismiss / complete)
router.post("/clear", requireAuth, (req, res) => {
  try {
    deletePrescription(req.userId);
    res.json({ success: true });
  } catch (err) {
    console.error("Error clearing prescription:", err.message);
    res.status(500).json({ error: "Failed to clear prescription." });
  }
});

// 3. Log compiler/runner result
router.post("/log-run", requireAuth, (req, res) => {
  try {
    const { success, stderr, problemId } = req.body;
    const userId = req.userId;
    const activePrescription = getPrescription(userId);

    // --- SUCCESS PATH: Check if solving a prescribed problem ---
    if (success) {
      // Clear error tracker on success
      errorTracker[userId] = { count: 0, lastErrorType: "" };

      if (activePrescription && activePrescription.status === "active") {
        let updated = false;
        const exercises = activePrescription.exercises.map(ex => {
          if (String(ex.frontend_id) === String(problemId) && !ex.completed) {
            updated = true;
            return { ...ex, completed: true };
          }
          return ex;
        });

        if (updated) {
          activePrescription.exercises = exercises;
          const allDone = exercises.every(ex => ex.completed);

          if (allDone) {
            // Complete Prescription! Award rewards
            activePrescription.status = "completed";
            savePrescription(userId, activePrescription);

            const profile = getProfile(userId);
            const xpEarned = activePrescription.xpReward || 200;
            const coinsEarned = activePrescription.coinsReward || 50;

            profile.xp = (profile.xp || 0) + xpEarned;
            profile.coins = (profile.coins || 0) + coinsEarned;
            profile.level = calculateLevel(profile.xp);
            saveProfile(userId, profile);

            return res.json({
              completed: true,
              prescription: activePrescription,
              rewards: {
                xpEarned,
                coinsEarned,
                newProfile: {
                  xp: profile.xp,
                  level: profile.level,
                  coins: profile.coins,
                  levelTitle: getLevelTitle(profile.level)
                }
              }
            });
          } else {
            savePrescription(userId, activePrescription);
            return res.json({ completed: false, prescription: activePrescription });
          }
        }
      }
      return res.json({ success: true, prescription: activePrescription });
    }

    // --- FAILURE PATH: Increment error counts and check if new diagnosis is triggered ---
    if (!activePrescription) {
      if (!errorTracker[userId]) {
        errorTracker[userId] = { count: 0, lastErrorType: "" };
      }

      errorTracker[userId].count += 1;

      // Classify error type
      const errStr = String(stderr || "").toLowerCase();
      if (errStr.includes("index") || errStr.includes("out of range") || errStr.includes("bounds")) {
        errorTracker[userId].lastErrorType = "bounds";
      } else if (errStr.includes("recursion") || errStr.includes("timeout") || errStr.includes("timed out")) {
        errorTracker[userId].lastErrorType = "timeout";
      } else {
        errorTracker[userId].lastErrorType = "generic";
      }

      // Diagnose after 3 consecutive failures
      if (errorTracker[userId].count >= 3) {
        const errorType = errorTracker[userId].lastErrorType || "generic";
        const template = AILMENTS[errorType] || AILMENTS.generic;

        const newPrescription = {
          id: "presc_" + Date.now().toString(36),
          userId,
          ailment: template.ailment,
          doctorNote: template.doctorNote,
          exercises: JSON.parse(JSON.stringify(template.exercises)),
          xpReward: 200,
          coinsReward: 50,
          status: "active"
        };

        savePrescription(userId, newPrescription);
        errorTracker[userId] = { count: 0, lastErrorType: "" }; // Reset count

        return res.json({
          diagnosed: true,
          prescription: newPrescription
        });
      }
    }

    res.json({ success: false, prescription: activePrescription });
  } catch (err) {
    console.error("Error logging run for prescription:", err.message);
    res.status(500).json({ error: "Failed to process prescription checks." });
  }
});

export default router;
