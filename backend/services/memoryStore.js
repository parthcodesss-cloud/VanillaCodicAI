import { readFileSync, writeFileSync, existsSync, mkdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(__dirname, "..", "data");

// Ensure data directory exists
if (!existsSync(DATA_DIR)) {
  mkdirSync(DATA_DIR, { recursive: true });
}

// ── Per-user directory helper ────────────────────────────────────────

function getUserDir(userId) {
  if (!userId) throw new Error("userId is required for per-user storage");
  const dir = join(DATA_DIR, "users", String(userId));
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
  return dir;
}

// ── Generic JSON file helpers ────────────────────────────────────────

function readJSON(filepath, fallback = null) {
  if (!existsSync(filepath)) return fallback;
  try {
    return JSON.parse(readFileSync(filepath, "utf-8"));
  } catch {
    return fallback;
  }
}

function writeJSON(filepath, data) {
  writeFileSync(filepath, JSON.stringify(data, null, 2), "utf-8");
}

// ── Sessions Store (per-user) ────────────────────────────────────────

export function getSessions(userId) {
  const filepath = join(getUserDir(userId), "sessions.json");
  return readJSON(filepath, []);
}

export function addSession(userId, session) {
  const filepath = join(getUserDir(userId), "sessions.json");
  const sessions = readJSON(filepath, []);
  const entry = {
    id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
    timestamp: new Date().toISOString(),
    ...session,
  };
  sessions.push(entry);
  // Keep last 500 sessions max
  if (sessions.length > 500) sessions.splice(0, sessions.length - 500);
  writeJSON(filepath, sessions);
  return entry;
}

export function getSessionsByLanguage(userId, language) {
  return getSessions(userId).filter((s) => s.language === language);
}

export function getRecentSessions(userId, count = 20) {
  const sessions = getSessions(userId);
  return sessions.slice(-count);
}

// ── Profile Store (per-user) ─────────────────────────────────────────

const DEFAULT_PROFILE = {
  xp: 0,
  level: 1,
  totalSessions: 0,
  totalErrors: 0,
  totalFixes: 0,
  currentStreak: 0,
  longestStreak: 0,
  lastActiveDate: null,
  skills: {
    syntax: { score: 50, sessions: 0 },
    logic: { score: 50, sessions: 0 },
    runtime: { score: 50, sessions: 0 },
    errorHandling: { score: 50, sessions: 0 },
    dataStructures: { score: 50, sessions: 0 },
    async: { score: 50, sessions: 0 },
  },
  languageStats: {},
  mistakeFrequency: {},
  conceptWeaknesses: [],
  achievements: [],
  coins: 0,
  activityMap: {},
};

export function getProfile(userId) {
  const filepath = join(getUserDir(userId), "profile.json");
  const saved = readJSON(filepath, null);
  if (!saved) {
    // Brand new user — return fresh default profile
    return { ...DEFAULT_PROFILE, skills: JSON.parse(JSON.stringify(DEFAULT_PROFILE.skills)) };
  }
  return saved;
}

export function updateProfile(userId, updates) {
  const profile = getProfile(userId);
  const merged = deepMerge(profile, updates);
  const filepath = join(getUserDir(userId), "profile.json");
  writeJSON(filepath, merged);
  return merged;
}

export function saveProfile(userId, profile) {
  const filepath = join(getUserDir(userId), "profile.json");
  writeJSON(filepath, profile);
  return profile;
}

// ── Embeddings Store (per-user) ──────────────────────────────────────

export function getEmbeddings(userId) {
  const filepath = join(getUserDir(userId), "embeddings.json");
  return readJSON(filepath, []);
}

export function addEmbedding(userId, entry) {
  const filepath = join(getUserDir(userId), "embeddings.json");
  const embeddings = readJSON(filepath, []);
  embeddings.push(entry);
  // Keep last 300 embeddings
  if (embeddings.length > 300) embeddings.splice(0, embeddings.length - 300);
  writeJSON(filepath, embeddings);
}

// ── Prescriptions Store (per-user) ───────────────────────────────────

export function getPrescription(userId) {
  const filepath = join(getUserDir(userId), "prescription.json");
  return readJSON(filepath, null);
}

export function savePrescription(userId, prescription) {
  const filepath = join(getUserDir(userId), "prescription.json");
  writeJSON(filepath, prescription);
  return prescription;
}

export function deletePrescription(userId) {
  const filepath = join(getUserDir(userId), "prescription.json");
  writeJSON(filepath, null);
}

// ── Utility ──────────────────────────────────────────────────────────

function deepMerge(target, source) {
  const output = { ...target };
  for (const key of Object.keys(source)) {
    if (
      source[key] &&
      typeof source[key] === "object" &&
      !Array.isArray(source[key]) &&
      target[key] &&
      typeof target[key] === "object" &&
      !Array.isArray(target[key])
    ) {
      output[key] = deepMerge(target[key], source[key]);
    } else {
      output[key] = source[key];
    }
  }
  return output;
}
