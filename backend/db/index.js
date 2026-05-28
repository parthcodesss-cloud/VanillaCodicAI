import pg from "pg";
import fs from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const { Pool } = pg;

const hasDBUrl = !!process.env.DATABASE_URL;

// Local JSON File DB Fallback Config
const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(__dirname, "..", "data");
const LOCAL_DB_PATH = join(DATA_DIR, "local_db.json");

function readLocalDB() {
  if (!fs.existsSync(LOCAL_DB_PATH)) {
    const parentDir = dirname(LOCAL_DB_PATH);
    if (!fs.existsSync(parentDir)) {
      fs.mkdirSync(parentDir, { recursive: true });
    }
    fs.writeFileSync(
      LOCAL_DB_PATH,
      JSON.stringify({ users: [], user_profiles: [], user_sessions: [], follows: [] }, null, 2)
    );
  }
  try {
    const data = JSON.parse(fs.readFileSync(LOCAL_DB_PATH, "utf-8"));
    if (!data.follows) data.follows = [];
    
    // Seed mock users if not present
    let changed = false;
    const mockUsers = [
      { id: 999, name: "Alex Wizard", email: "alex@codemedic.ai", username: "dev_wizard", email_verified: true, created_at: new Date().toISOString() },
      { id: 998, name: "Sarah Ninja", email: "sarah@codemedic.ai", username: "debug_ninja", email_verified: true, created_at: new Date().toISOString() },
      { id: 997, name: "John Medic", email: "john@codemedic.ai", username: "code_healer", email_verified: true, created_at: new Date().toISOString() }
    ];
    for (const mu of mockUsers) {
      if (!data.users.some(u => u.id === mu.id)) {
        data.users.push(mu);
        changed = true;
      }
    }
    if (changed) {
      fs.writeFileSync(LOCAL_DB_PATH, JSON.stringify(data, null, 2), "utf-8");
    }

    // Seed mock user profiles if not present in users folder
    const mockProfiles = {
      999: {
        xp: 680,
        level: 7,
        totalSessions: 42,
        totalErrors: 18,
        totalFixes: 25,
        currentStreak: 5,
        longestStreak: 12,
        lastActiveDate: new Date().toISOString().split("T")[0],
        skills: {
          syntax: { score: 85, sessions: 20 },
          logic: { score: 90, sessions: 22 },
          runtime: { score: 75, sessions: 15 },
          errorHandling: { score: 80, sessions: 18 },
          dataStructures: { score: 70, sessions: 12 },
          async: { score: 65, sessions: 10 },
        },
        languageStats: { python: { sessions: 25, errors: 10 }, javascript: { sessions: 17, errors: 8 } },
        mistakeFrequency: {},
        conceptWeaknesses: [],
        achievements: [],
        coins: 120,
        activityMap: {},
      },
      998: {
        xp: 450,
        level: 5,
        totalSessions: 30,
        totalErrors: 12,
        totalFixes: 18,
        currentStreak: 3,
        longestStreak: 8,
        lastActiveDate: new Date().toISOString().split("T")[0],
        skills: {
          syntax: { score: 70, sessions: 15 },
          logic: { score: 80, sessions: 18 },
          runtime: { score: 65, sessions: 10 },
          errorHandling: { score: 72, sessions: 12 },
          dataStructures: { score: 60, sessions: 8 },
          async: { score: 58, sessions: 6 },
        },
        languageStats: { python: { sessions: 18, errors: 6 }, javascript: { sessions: 12, errors: 6 } },
        mistakeFrequency: {},
        conceptWeaknesses: [],
        achievements: [],
        coins: 70,
        activityMap: {},
      },
      997: {
        xp: 240,
        level: 3,
        totalSessions: 15,
        totalErrors: 8,
        totalFixes: 7,
        currentStreak: 2,
        longestStreak: 4,
        lastActiveDate: new Date().toISOString().split("T")[0],
        skills: {
          syntax: { score: 60, sessions: 8 },
          logic: { score: 55, sessions: 6 },
          runtime: { score: 70, sessions: 9 },
          errorHandling: { score: 50, sessions: 5 },
          dataStructures: { score: 45, sessions: 3 },
          async: { score: 40, sessions: 2 },
        },
        languageStats: { python: { sessions: 9, errors: 5 }, javascript: { sessions: 6, errors: 3 } },
        mistakeFrequency: {},
        conceptWeaknesses: [],
        achievements: [],
        coins: 30,
        activityMap: {},
      }
    };

    for (const [id, prof] of Object.entries(mockProfiles)) {
      const userDir = join(DATA_DIR, "users", String(id));
      if (!fs.existsSync(userDir)) {
        fs.mkdirSync(userDir, { recursive: true });
      }
      const profilePath = join(userDir, "profile.json");
      if (!fs.existsSync(profilePath)) {
        fs.writeFileSync(profilePath, JSON.stringify(prof, null, 2), "utf-8");
      }
    }

    return data;
  } catch (e) {
    return { users: [], user_profiles: [], user_sessions: [], follows: [] };
  }
}

function writeLocalDB(data) {
  fs.writeFileSync(LOCAL_DB_PATH, JSON.stringify(data, null, 2));
}

export async function query(text, params = []) {
  if (hasDBUrl) {
    const client = await pool.connect();
    try {
      return await client.query(text, params);
    } finally {
      client.release();
    }
  }

  // --- Fallback Local Database Processing (SQL Simulation on JSON) ---
  const sql = text.trim().replace(/\s+/g, " ");
  const db = readLocalDB();

  const match = (pattern) => {
    return new RegExp(pattern, "i").test(sql);
  };

  // 1. DDL (Migrations) -> Just succeed!
  if (match("CREATE TABLE") || match("ALTER TABLE") || match("CREATE INDEX")) {
    return { rows: [] };
  }

  // 2. SELECT FROM users
  if (match("SELECT.*FROM users")) {
    let rows = db.users.map((u) => {
      if (!u.username) {
        const cleanName = u.name ? u.name.toLowerCase().replace(/[^a-z0-9]/g, "_") : "user";
        u.username = `${cleanName}_${u.id || Math.floor(1000 + Math.random() * 9000)}`;
      }
      return u;
    });

    if (match("id = \\$1")) {
      rows = rows.filter((u) => u.id === Number(params[0]));
    } else if (match("email = \\$1")) {
      rows = rows.filter((u) => u.email === String(params[0]).toLowerCase());
    } else if (match("google_id = \\$1")) {
      rows = rows.filter((u) => u.google_id === String(params[0]));
    } else if (match("otp_code = \\$2")) {
      const userId = Number(params[0]);
      const otpCode = String(params[1]).trim();
      rows = rows.filter(
        (u) =>
          u.id === userId &&
          u.otp_code === otpCode &&
          new Date(u.otp_expires) > new Date()
      );
    } else if (match("reset_token = \\$1")) {
      rows = rows.filter(
        (u) =>
          u.reset_token === String(params[0]) &&
          new Date(u.reset_expires) > new Date()
      );
    } else if (match("verification_token = \\$1")) {
      rows = rows.filter(
        (u) =>
          u.verification_token === String(params[0]) &&
          new Date(u.verification_expires) > new Date()
      );
    } else if (match("username = \\$1")) {
      rows = rows.filter((u) => u.username === String(params[0]));
    } else if (match("username ILIKE") || match("name ILIKE") || match("username = \\$1") || match("ILIKE")) {
      const searchVal = String(params[0] || "").toLowerCase().replace(/%/g, "");
      rows = rows.filter((u) => 
        (u.name && u.name.toLowerCase().includes(searchVal)) ||
        (u.username && u.username.toLowerCase().includes(searchVal))
      );
      if (params[1]) {
        rows = rows.filter((u) => u.id !== Number(params[1]));
      }
    }

    return { rows };
  }

  // 3. INSERT INTO users
  if (match("INSERT INTO users")) {
    const isGoogle = match("google_id");
    let newUser = {};

    if (isGoogle) {
      newUser = {
        id: db.users.length + 1,
        name: params[0],
        email: params[1] ? String(params[1]).toLowerCase() : null,
        google_id: params[2],
        avatar_url: params[3] || null,
        phone: null,
        password_hash: null,
        email_verified: true,
        created_at: new Date().toISOString(),
      };
    } else {
      const isEmailVerified = match("TRUE") || match("true");
      newUser = {
        id: db.users.length + 1,
        name: params[0],
        email: String(params[1]).toLowerCase(),
        phone: params[2] || null,
        password_hash: params[3],
        avatar_url: null,
        email_verified: isEmailVerified,
        created_at: new Date().toISOString(),
      };
    }

    const usernameParam = params[4] || (newUser.name ? newUser.name.toLowerCase().replace(/[^a-z0-9]/g, "_") + "_" + Math.floor(1000 + Math.random() * 9000) : "user_" + Math.floor(1000 + Math.random() * 9000));
    newUser.username = usernameParam;

    db.users.push(newUser);
    writeLocalDB(db);
    return { rows: [newUser] };
  }

  // 4. UPDATE users
  if (match("UPDATE users")) {
    let affectedRows = [];

    if (
      match("WHERE id = \\$1") ||
      match("WHERE id = \\$2") ||
      match("WHERE id = \\$3") ||
      match("WHERE id = \\$4")
    ) {
      let userId;
      if (match("otp_code = \\$1")) {
        userId = Number(params[3]);
      } else if (match("google_id = \\$1")) {
        userId = Number(params[2]);
      } else if (match("username = \\$1") && match("WHERE id = \\$2")) {
        userId = Number(params[1]);
      } else {
        userId = Number(params[0]);
      }

      const userIndex = db.users.findIndex((u) => u.id === userId);
      if (userIndex !== -1) {
        const user = db.users[userIndex];

        if (match("otp_code = \\$1")) {
          user.otp_code = params[0];
          user.otp_expires = params[1] ? new Date(params[1]).toISOString() : null;
          user.otp_purpose = params[2];
        } else if (match("otp_code = NULL")) {
          user.otp_code = null;
          user.otp_expires = null;
          user.otp_purpose = null;
          user.email_verified = true;
        } else if (match("google_id = \\$1")) {
          user.google_id = params[0];
          user.avatar_url = user.avatar_url || params[1];
        } else if (match("verification_token = \\$1")) {
          user.verification_token = params[0];
          user.verification_expires = params[1] ? new Date(params[1]).toISOString() : null;
        } else if (match("reset_token = \\$1")) {
          user.reset_token = params[0];
          user.reset_expires = params[1] ? new Date(params[1]).toISOString() : null;
        } else if (match("password_hash = \\$1")) {
          user.password_hash = params[0];
          user.reset_token = null;
          user.reset_expires = null;
        } else if (match("phone = \\$1")) {
          user.phone = params[0];
        } else if (match("username = \\$1")) {
          user.username = params[0];
        } else {
          if (match("name = \\$2")) user.name = params[1];
          if (match("phone = \\$3")) user.phone = params[2];
          else if (match("phone = \\$2")) user.phone = params[1];
        }

        db.users[userIndex] = user;
        affectedRows.push(user);
      }
    }

    writeLocalDB(db);
    return { rows: affectedRows };
  }

  // 5. SELECT FROM user_profiles
  if (match("SELECT.*FROM user_profiles")) {
    let rows = [...db.user_profiles];
    if (match("user_id = \\$1")) {
      rows = rows.filter((p) => p.user_id === Number(params[0]));
    }
    return { rows };
  }

  // 6. INSERT INTO user_profiles
  if (match("INSERT INTO user_profiles")) {
    const userId = Number(params[0]);
    let profile = db.user_profiles.find((p) => p.user_id === userId);
    if (!profile) {
      profile = {
        id: db.user_profiles.length + 1,
        user_id: userId,
        xp: 0,
        level: 1,
        current_streak: 0,
        longest_streak: 0,
        total_sessions: 0,
        total_fixes: 0,
        last_session_date: null,
        skills: {
          syntax: { score: 50, sessions: 0 },
          logic: { score: 50, sessions: 0 },
          runtime: { score: 50, sessions: 0 },
          errorHandling: { score: 50, sessions: 0 },
          dataStructures: { score: 50, sessions: 0 },
          async: { score: 50, sessions: 0 },
        },
        achievements: [],
        language_counts: {},
        updated_at: new Date().toISOString(),
      };
      db.user_profiles.push(profile);
      writeLocalDB(db);
    }
    return { rows: [profile] };
  }

  // 7. UPDATE user_profiles
  if (match("UPDATE user_profiles")) {
    let affectedRows = [];
    if (match("WHERE user_id = \\$1")) {
      const userId = Number(params[0]);
      const profileIdx = db.user_profiles.findIndex((p) => p.user_id === userId);
      if (profileIdx !== -1) {
        const profile = db.user_profiles[profileIdx];
        const assignmentPart = sql.split(/SET/i)[1].split(/WHERE/i)[0];
        const assignments = assignmentPart.split(",").map((item) => item.trim());

        assignments.forEach((assignment) => {
          const parts = assignment.split("=");
          const field = parts[0].trim();
          const placeholder = parts[1].trim();
          const matchPlaceholder = placeholder.match(/\$(\d+)/);
          if (matchPlaceholder) {
            const paramIdx = Number(matchPlaceholder[1]) - 1;
            let val = params[paramIdx];
            // Handle parsing JSON strings
            if (typeof val === "string" && (val.startsWith("{") || val.startsWith("["))) {
              try {
                val = JSON.parse(val);
              } catch {}
            }
            profile[field] = val;
          }
        });

        profile.updated_at = new Date().toISOString();
        db.user_profiles[profileIdx] = profile;
        affectedRows.push(profile);
      }
    }
    writeLocalDB(db);
    return { rows: affectedRows };
  }

  // 8. INSERT INTO user_sessions
  if (match("INSERT INTO user_sessions")) {
    const newSession = {
      id: db.user_sessions.length + 1,
      user_id: Number(params[0]),
      language: params[1],
      main_file: params[2],
      code_snippet: params[3],
      summary: params[4],
      error_titles: typeof params[5] === "string" ? JSON.parse(params[5]) : params[5] || [],
      error_types: typeof params[6] === "string" ? JSON.parse(params[6]) : params[6] || [],
      error_count: Number(params[7] || 0),
      code_smell_count: Number(params[8] || 0),
      created_at: new Date().toISOString(),
    };
    db.user_sessions.push(newSession);
    writeLocalDB(db);
    return { rows: [newSession] };
  }

  // 9. SELECT FROM user_sessions
  if (match("SELECT.*FROM user_sessions")) {
    let rows = [...db.user_sessions];
    if (match("user_id = \\$1")) {
      rows = rows.filter((s) => s.user_id === Number(params[0]));
    }
    rows.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    if (params[1]) {
      rows = rows.slice(0, Number(params[1]));
    }
    return { rows };
  }

  // 10. DELETE FROM users
  if (match("DELETE FROM users")) {
    if (match("WHERE id = \\$1")) {
      const userId = Number(params[0]);
      db.users = db.users.filter((u) => u.id !== userId);
    }
    writeLocalDB(db);
    return { rows: [] };
  }

  // 11. DELETE FROM user_profiles
  if (match("DELETE FROM user_profiles")) {
    if (match("WHERE user_id = \\$1")) {
      const userId = Number(params[0]);
      db.user_profiles = db.user_profiles.filter((p) => p.user_id !== userId);
    }
    writeLocalDB(db);
    return { rows: [] };
  }

  // 12. INSERT INTO follows
  if (match("INSERT INTO follows")) {
    const followerId = Number(params[0]);
    const followingId = Number(params[1]);
    let exists = db.follows.some(f => f.follower_id === followerId && f.following_id === followingId);
    let newFollow = null;
    if (!exists) {
      newFollow = {
        id: db.follows.length + 1,
        follower_id: followerId,
        following_id: followingId,
        created_at: new Date().toISOString()
      };
      db.follows.push(newFollow);
      writeLocalDB(db);
    }
    return { rows: newFollow ? [newFollow] : [] };
  }

  // 13. DELETE FROM follows
  if (match("DELETE FROM follows")) {
    const followerId = Number(params[0]);
    const followingId = Number(params[1]);
    db.follows = db.follows.filter(f => !(f.follower_id === followerId && f.following_id === followingId));
    writeLocalDB(db);
    return { rows: [] };
  }

  // 14. SELECT FROM follows
  if (match("SELECT.*FROM follows")) {
    let rows = [...db.follows];
    if (match("follower_id = \\$1 AND following_id = \\$2")) {
      rows = rows.filter(f => f.follower_id === Number(params[0]) && f.following_id === Number(params[1]));
    } else if (match("follower_id = \\$1")) {
      rows = rows.filter(f => f.follower_id === Number(params[0]));
    }
    return { rows };
  }

  console.warn("⚠️ Unmatched Mock Query:", sql, "with params:", params);
  return { rows: [] };
}

export const pool = hasDBUrl
  ? new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : false,
    })
  : {
      connect: async () => ({
        query: async (text, params) => query(text, params),
        release: () => {},
      }),
      query: async (text, params) => query(text, params),
    };
