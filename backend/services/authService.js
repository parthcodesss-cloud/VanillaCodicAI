import bcrypt from "bcryptjs";
import { query } from "../db/index.js";

// ── User CRUD ──────────────────────────────────────────────────────────

export async function findUserById(id) {
  const result = await query("SELECT * FROM users WHERE id = $1", [id]);
  const user = result.rows[0] || null;
  if (user && !user.username) {
    const cleanName = user.name ? user.name.toLowerCase().replace(/[^a-z0-9]/g, "_") : "user";
    const username = `${cleanName}_${Math.floor(1000 + Math.random() * 9000)}`;
    await query("UPDATE users SET username = $1 WHERE id = $2", [username, user.id]);
    user.username = username;
  }
  return user;
}

export async function findUserByEmail(email) {
  const result = await query("SELECT * FROM users WHERE email = $1", [email.toLowerCase()]);
  const user = result.rows[0] || null;
  if (user && !user.username) {
    const cleanName = user.name ? user.name.toLowerCase().replace(/[^a-z0-9]/g, "_") : "user";
    const username = `${cleanName}_${Math.floor(1000 + Math.random() * 9000)}`;
    await query("UPDATE users SET username = $1 WHERE id = $2", [username, user.id]);
    user.username = username;
  }
  return user;
}

export async function findUserByGoogleId(googleId) {
  const result = await query("SELECT * FROM users WHERE google_id = $1", [googleId]);
  const user = result.rows[0] || null;
  if (user && !user.username) {
    const cleanName = user.name ? user.name.toLowerCase().replace(/[^a-z0-9]/g, "_") : "user";
    const username = `${cleanName}_${Math.floor(1000 + Math.random() * 9000)}`;
    await query("UPDATE users SET username = $1 WHERE id = $2", [username, user.id]);
    user.username = username;
  }
  return user;
}

// ── Registration ───────────────────────────────────────────────────────

export async function registerUser({ name, email, phone, password }) {
  const existing = await findUserByEmail(email);
  if (existing) {
    throw new Error("An account with this email already exists.");
  }

  const cleanName = name.toLowerCase().replace(/[^a-z0-9]/g, "_");
  const randomSuffix = Math.floor(1000 + Math.random() * 9000);
  const username = `${cleanName}_${randomSuffix}`;

  const passwordHash = await bcrypt.hash(password, 12);
  const result = await query(
    `INSERT INTO users (name, email, phone, password_hash, username)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id, name, email, phone, avatar_url, username, created_at`,
    [name, email.toLowerCase(), phone || null, passwordHash, username]
  );
  const user = result.rows[0];
  await createDefaultProfile(user.id);
  return user;
}

// ── Login ──────────────────────────────────────────────────────────────

export async function loginUser({ email, password }) {
  const user = await findUserByEmail(email);
  if (!user) {
    throw new Error("No account found with this email.");
  }
  if (!user.password_hash) {
    throw new Error("This account uses Google Sign-In. Please use that instead.");
  }
  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) {
    throw new Error("Incorrect password.");
  }
  return sanitizeUser(user);
}

// ── Google OAuth ───────────────────────────────────────────────────────

export async function findOrCreateGoogleUser({ googleId, email, name, avatarUrl }) {
  // Try to find by Google ID first
  let user = await findUserByGoogleId(googleId);
  if (user) return sanitizeUser(user);

  // Check if email already exists — link accounts
  if (email) {
    const existing = await findUserByEmail(email);
    if (existing) {
      // Link Google ID to existing account
      const result = await query(
        `UPDATE users SET google_id = $1, avatar_url = COALESCE(avatar_url, $2)
         WHERE id = $3
         RETURNING id, name, email, phone, avatar_url, username, created_at`,
        [googleId, avatarUrl, existing.id]
      );
      return result.rows[0];
    }
  }

  const cleanName = name.toLowerCase().replace(/[^a-z0-9]/g, "_");
  const randomSuffix = Math.floor(1000 + Math.random() * 9000);
  const username = `${cleanName}_${randomSuffix}`;

  // Create new user
  const result = await query(
    `INSERT INTO users (name, email, google_id, avatar_url, username)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id, name, email, phone, avatar_url, username, created_at`,
    [name, email?.toLowerCase() || null, googleId, avatarUrl || null, username]
  );
  const newUser = result.rows[0];
  await createDefaultProfile(newUser.id);
  return newUser;
}

// ── Profile ────────────────────────────────────────────────────────────

async function createDefaultProfile(userId) {
  await query(
    `INSERT INTO user_profiles (user_id) VALUES ($1) ON CONFLICT (user_id) DO NOTHING`,
    [userId]
  );
}

export async function getUserProfile(userId) {
  const result = await query(
    "SELECT * FROM user_profiles WHERE user_id = $1",
    [userId]
  );
  if (!result.rows[0]) {
    await createDefaultProfile(userId);
    return getUserProfile(userId);
  }
  return result.rows[0];
}

export async function updateUserProfile(userId, updates) {
  const fields = Object.entries(updates)
    .map(([k, v], i) => `${k} = $${i + 2}`)
    .join(", ");
  const values = Object.values(updates);
  const result = await query(
    `UPDATE user_profiles SET ${fields}, updated_at = NOW() WHERE user_id = $1 RETURNING *`,
    [userId, ...values]
  );
  return result.rows[0];
}

// ── Sessions ───────────────────────────────────────────────────────────

export async function addUserSession(userId, sessionData) {
  const result = await query(
    `INSERT INTO user_sessions (user_id, language, main_file, code_snippet, summary, error_titles, error_types, error_count, code_smell_count)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
     RETURNING *`,
    [
      userId,
      sessionData.language,
      sessionData.mainFile,
      sessionData.codeSnippet?.slice(0, 500),
      sessionData.summary,
      JSON.stringify(sessionData.errorTitles || []),
      JSON.stringify(sessionData.errorTypes || []),
      sessionData.errorCount || 0,
      sessionData.codeSmellCount || 0,
    ]
  );
  return result.rows[0];
}

export async function getUserSessions(userId, limit = 30) {
  const result = await query(
    `SELECT * FROM user_sessions WHERE user_id = $1 ORDER BY created_at DESC LIMIT $2`,
    [userId, limit]
  );
  return result.rows;
}

// ── Helpers ────────────────────────────────────────────────────────────

function sanitizeUser(user) {
  const { password_hash, ...safe } = user;
  return safe;
}
