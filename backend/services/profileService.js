import { getProfile, saveProfile, getSessions } from "./memoryStore.js";

// ── XP & Level Calculation ───────────────────────────────────────────

const XP_PER_DEBUG = 10;
const XP_PER_FIX = 15;
const XP_BONUS_CLEAN_CODE = 25;
const XP_PER_LEVEL = 100;

export function calculateLevel(xp) {
  return Math.floor(xp / XP_PER_LEVEL) + 1;
}

export function getLevelTitle(level) {
  const titles = [
    "Bug Spotter",        // 1
    "Code Rookie",        // 2
    "Debug Apprentice",   // 3
    "Bug Hunter",         // 4
    "Code Surgeon",       // 5
    "Debug Specialist",   // 6
    "Error Eliminator",   // 7
    "Code Medic",         // 8
    "Debug Master",       // 9
    "Code Architect",     // 10+
  ];
  return titles[Math.min(level - 1, titles.length - 1)];
}

// ── Daily Login & Streak ──────────────────────────────────────────────

export function handleDailyLogin(userId) {
  const profile = getProfile(userId);
  const today = new Date().toISOString().split("T")[0];
  const lastDate = profile.lastActiveDate;

  if (!lastDate) {
    profile.currentStreak = 1;
  } else if (lastDate !== today) {
    const last = new Date(lastDate);
    const now = new Date(today);
    const diffDays = Math.floor((now - last) / (1000 * 60 * 60 * 24));

    if (diffDays === 1) {
      profile.currentStreak += 1;
    } else {
      profile.currentStreak = 1;
    }
  }

  profile.longestStreak = Math.max(profile.longestStreak, profile.currentStreak);
  profile.lastActiveDate = today;
  
  const claimAvailable = profile.lastClaimDate !== today;
  
  saveProfile(userId, profile);
  
  return { profile, claimAvailable };
}

export function claimDailyCoins(userId) {
  const profile = getProfile(userId);
  const today = new Date().toISOString().split("T")[0];

  if (profile.lastClaimDate === today) {
    throw new Error("Already claimed vanilla points today");
  }

  const bonus = profile.currentStreak > 1 ? 5 : 0;
  profile.coins = (profile.coins || 0) + 10 + bonus;
  profile.lastClaimDate = today;

  saveProfile(userId, profile);
  return { profile, claimed: 10 + bonus };
}

// ── Skill Score Updates ──────────────────────────────────────────────

const ERROR_TYPE_TO_SKILL = {
  syntax: "syntax",
  logical: "logic",
  runtime: "runtime",
};

const CONCEPT_TO_SKILL = {
  "error handling": "errorHandling",
  "try catch": "errorHandling",
  "exception": "errorHandling",
  "array": "dataStructures",
  "list": "dataStructures",
  "map": "dataStructures",
  "hash": "dataStructures",
  "tree": "dataStructures",
  "stack": "dataStructures",
  "queue": "dataStructures",
  "linked list": "dataStructures",
  "async": "async",
  "await": "async",
  "promise": "async",
  "callback": "async",
  "thread": "async",
  "concurrent": "async",
};

function mapConceptToSkill(conceptStr) {
  const lower = conceptStr.toLowerCase();
  for (const [keyword, skill] of Object.entries(CONCEPT_TO_SKILL)) {
    if (lower.includes(keyword)) return skill;
  }
  return null;
}

// ── Main Profile Update After Debug ──────────────────────────────────

export function updateProfileAfterDebug(userId, debugResult, language) {
  const profile = getProfile(userId);

  // Ensure streak is updated if tab was kept open across midnight
  handleDailyLogin(userId);

  // Track activity heatmap
  const today = new Date().toISOString().split("T")[0];
  if (!profile.activityMap) profile.activityMap = {};
  profile.activityMap[today] = (profile.activityMap[today] || 0) + 1;

  // XP
  profile.totalSessions += 1;
  const errorCount = debugResult.errors?.length || 0;
  profile.totalErrors += errorCount;

  if (errorCount === 0) {
    profile.xp += XP_BONUS_CLEAN_CODE;
  } else {
    profile.xp += XP_PER_DEBUG;
  }

  profile.level = calculateLevel(profile.xp);

  // Language stats
  if (!profile.languageStats[language]) {
    profile.languageStats[language] = { sessions: 0, errors: 0 };
  }
  profile.languageStats[language].sessions += 1;
  profile.languageStats[language].errors += errorCount;

  // Skill updates based on errors found
  if (debugResult.errors) {
    for (const err of debugResult.errors) {
      const skillKey = ERROR_TYPE_TO_SKILL[err.type];
      if (skillKey && profile.skills[skillKey]) {
        profile.skills[skillKey].sessions += 1;
        // Score decreases when errors found (max penalty 5 per error)
        profile.skills[skillKey].score = Math.max(
          10,
          profile.skills[skillKey].score - 3
        );
      }

      // Track mistake frequency
      const errKey = `${err.type}:${err.title}`.toLowerCase();
      profile.mistakeFrequency[errKey] =
        (profile.mistakeFrequency[errKey] || 0) + 1;
    }
  }

  // When no errors, improve related skill scores
  if (errorCount === 0) {
    for (const skill of Object.keys(profile.skills)) {
      profile.skills[skill].score = Math.min(
        100,
        profile.skills[skill].score + 2
      );
    }
  }

  // Check achievements
  checkAchievements(profile);

  saveProfile(userId, profile);
  return profile;
}

export function updateProfileAfterFix(userId, language) {
  const profile = getProfile(userId);
  profile.totalFixes += 1;
  profile.xp += XP_PER_FIX;
  profile.level = calculateLevel(profile.xp);
  saveProfile(userId, profile);
  return profile;
}

// ── Difficulty Scaling ───────────────────────────────────────────────

export function getDifficultyLevel(profile) {
  const avgScore =
    Object.values(profile.skills).reduce((sum, s) => sum + s.score, 0) /
    Object.keys(profile.skills).length;

  if (avgScore < 35 || profile.totalSessions < 5) return "beginner";
  if (avgScore < 65) return "intermediate";
  return "advanced";
}

export function getWeakestSkills(profile, topN = 3) {
  return Object.entries(profile.skills)
    .sort((a, b) => a[1].score - b[1].score)
    .slice(0, topN)
    .map(([name, data]) => ({ name, ...data }));
}

export function getMostRepeatedMistakes(profile, topN = 5) {
  return Object.entries(profile.mistakeFrequency)
    .sort((a, b) => b[1] - a[1])
    .slice(0, topN)
    .map(([mistake, count]) => ({ mistake, count }));
}

// ── Achievements ─────────────────────────────────────────────────────

function checkAchievements(profile) {
  const checks = [
    { id: "first_debug", name: "First Steps", desc: "Complete your first debug session", cond: () => profile.totalSessions >= 1 },
    { id: "ten_sessions", name: "Getting Warmed Up", desc: "Complete 10 debug sessions", cond: () => profile.totalSessions >= 10 },
    { id: "fifty_sessions", name: "Dedicated Learner", desc: "Complete 50 debug sessions", cond: () => profile.totalSessions >= 50 },
    { id: "streak_3", name: "On a Roll", desc: "Maintain a 3-day streak", cond: () => profile.longestStreak >= 3 },
    { id: "streak_7", name: "Week Warrior", desc: "Maintain a 7-day streak", cond: () => profile.longestStreak >= 7 },
    { id: "clean_code", name: "Clean Coder", desc: "Submit code with zero errors", cond: () => profile.xp >= XP_BONUS_CLEAN_CODE },
    { id: "level_5", name: "Rising Star", desc: "Reach level 5", cond: () => profile.level >= 5 },
    { id: "polyglot", name: "Polyglot", desc: "Debug in 3+ languages", cond: () => Object.keys(profile.languageStats).length >= 3 },
    { id: "fixer", name: "Fix Machine", desc: "Fix 10 code submissions", cond: () => profile.totalFixes >= 10 },
  ];

  const existing = new Set(profile.achievements.map((a) => a.id));
  for (const ach of checks) {
    if (!existing.has(ach.id) && ach.cond()) {
      profile.achievements.push({
        id: ach.id,
        name: ach.name,
        desc: ach.desc,
        unlockedAt: new Date().toISOString(),
      });
    }
  }
}

// ── Skill Radar Data (for Chart.js) ──────────────────────────────────

export function getSkillRadarData(profile) {
  const labels = {
    syntax: "Syntax",
    logic: "Logic",
    runtime: "Runtime Safety",
    errorHandling: "Error Handling",
    dataStructures: "Data Structures",
    async: "Async/Concurrency",
  };

  return {
    labels: Object.values(labels),
    data: Object.keys(labels).map((k) => profile.skills[k]?.score || 50),
  };
}
