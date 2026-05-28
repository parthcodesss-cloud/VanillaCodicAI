import express from "express";
import crypto from "crypto";
import jwt from "jsonwebtoken";
import {
  registerUser, loginUser, findOrCreateGoogleUser, findUserById
} from "../services/authService.js";
import { generateToken, requireAuth } from "../middleware/auth.js";
import { query } from "../db/index.js";
import {
  sendVerificationEmail, sendPasswordResetEmail,
  sendOtpEmail, isEmailConfigured
} from "../services/emailService.js";

const router = express.Router();

// ── In-memory store for pending registrations (NOT saved to DB until OTP verified) ──
const pendingRegistrations = new Map();

// Auto-cleanup expired pending registrations every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, reg] of pendingRegistrations) {
    if (now > reg.otpExpires) pendingRegistrations.delete(key);
  }
}, 5 * 60 * 1000);

const COOKIE_OPTS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax",
  maxAge: 30 * 24 * 60 * 60 * 1000,
};

function genToken() {
  return crypto.randomBytes(32).toString("hex");
}

function genOtp() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

// Sign a short-lived "pending OTP" token (10 min, not an auth token)
function signPendingToken(userId, scope = "otp_pending") {
  return jwt.sign(
    { userId, scope },
    process.env.JWT_SECRET || "fallback-secret",
    { expiresIn: "10m" }
  );
}

function verifyPendingToken(token) {
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || "fallback-secret");
    if (decoded.scope !== "otp_pending" && decoded.scope !== "otp_pending_register") return null;
    return decoded;
  } catch {
    return null;
  }
}

// Store OTP in DB and send to email
async function issueOtp(userId, email, name, purpose) {
  const otp = genOtp();
  const expires = new Date(Date.now() + 10 * 60 * 1000);
  await query(
    "UPDATE users SET otp_code = $1, otp_expires = $2, otp_purpose = $3 WHERE id = $4",
    [otp, expires, purpose, userId]
  );

  console.log("\n========================================================");
  console.log(`🔑 [VanillaCodicAI] OTP Code for ${email} (${purpose}):`);
  console.log(`👉 CODE: ${otp} 👈`);
  console.log("========================================================\n");

  const sent = await sendOtpEmail(email, name, otp, purpose).catch(err => {
    console.error("❌ OTP email failed to send:", err.message);
    if (err.stack) console.error(err.stack);
    return false;
  });

  if (!sent) {
    console.warn(`⚠️  Email delivery failed for ${email}. Use the printed code above to complete verification.`);
  }

  return { otp, sent };
}

// ── Register ───────────────────────────────────────────────────────────
// User data is NOT saved to the database here.
// It is stored in-memory until OTP is verified in /verify-otp.

router.post("/register", async (req, res) => {
  try {
    const { name, email, phone, password } = req.body;
    if (!name?.trim()) return res.status(400).json({ error: "Full name is required." });
    if (!email?.trim()) return res.status(400).json({ error: "Email is required." });
    if (!phone?.trim()) return res.status(400).json({ error: "Phone number is required." });
    if (!password || password.length < 8) return res.status(400).json({ error: "Password must be at least 8 characters." });

    // Check if email already exists in DB (don't create user yet)
    const existing = await query("SELECT id FROM users WHERE email = $1", [email.toLowerCase()]);
    if (existing.rows.length > 0) {
      return res.status(400).json({ error: "An account with this email already exists." });
    }

    // Hash the password (we'll need it later when we actually create the user)
    const bcrypt = await import("bcryptjs");
    const passwordHash = await bcrypt.default.hash(password, 12);

    // Generate OTP
    const otp = genOtp();
    const otpExpires = Date.now() + 10 * 60 * 1000;

    // Generate a unique registration ID
    const regId = crypto.randomBytes(16).toString("hex");

    // Store EVERYTHING in memory — nothing goes to the database
    pendingRegistrations.set(regId, {
      name: name.trim(),
      email: email.toLowerCase().trim(),
      phone: phone.trim(),
      passwordHash,
      otp,
      otpExpires,
      purpose: "register",
    });

    console.log("\n========================================================");
    console.log(`🔑 [VanillaCodicAI] OTP Code for ${email} (register):`);
    console.log(`👉 CODE: ${otp} 👈`);
    console.log("========================================================\n");

    // Send OTP email via Brevo/SMTP
    const sent = await sendOtpEmail(email, name, otp, "register").catch(err => {
      console.error("❌ OTP email failed to send:", err.message);
      return false;
    });

    if (!sent) {
      // Clean up the in-memory entry (no DB cleanup needed!)
      pendingRegistrations.delete(regId);
      return res.status(500).json({
        error: "Failed to send OTP to your email. Please check SMTP configuration."
      });
    }

    // Sign a pending token with the registration ID (NOT a userId — user doesn't exist in DB yet)
    const pendingToken = signPendingToken(regId, "otp_pending_register");
    res.json({
      pendingOtp: true,
      pendingToken,
      emailSent: true,
      email: email.toLowerCase(),
      maskedEmail: maskEmail(email),
    });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// ── Login ──────────────────────────────────────────────────────────────

router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: "Email and password are required." });

    const user = await loginUser({ email, password });

    // Issue OTP
    const { sent } = await issueOtp(user.id, user.email, user.name, "login");

    if (!sent) {
      return res.status(500).json({
        error: "Failed to send OTP to your email address. Please make sure your SMTP/Gmail credentials in the backend/.env file are correct."
      });
    }

    const pendingToken = signPendingToken(user.id);
    res.json({
      pendingOtp: true,
      pendingToken,
      emailSent: sent,
      maskedEmail: maskEmail(user.email),
    });
  } catch (err) {
    res.status(401).json({ error: err.message });
  }
});

// ── Verify OTP ─────────────────────────────────────────────────────────

router.post("/verify-otp", async (req, res) => {
  try {
    const { pendingToken, code } = req.body;
    if (!pendingToken || !code) return res.status(400).json({ error: "Token and code are required." });

    const decoded = verifyPendingToken(pendingToken);
    if (!decoded) return res.status(401).json({ error: "Session expired. Please start again." });

    // ── REGISTRATION flow: user does NOT exist in DB yet ──
    if (decoded.scope === "otp_pending_register") {
      const regId = decoded.userId; // this is actually the regId for register tokens
      const reg = pendingRegistrations.get(regId);

      if (!reg) {
        return res.status(401).json({ error: "Registration session expired. Please register again." });
      }

      // Verify OTP
      if (reg.otp !== code.trim() || Date.now() > reg.otpExpires) {
        return res.status(400).json({ error: "Invalid or expired code. Please try again." });
      }

      // OTP is correct! NOW create the user in the database for the first time.
      const insertResult = await query(
        `INSERT INTO users (name, email, phone, password_hash, email_verified)
         VALUES ($1, $2, $3, $4, TRUE)
         RETURNING id, name, email, phone, avatar_url, created_at, email_verified`,
        [reg.name, reg.email, reg.phone, reg.passwordHash]
      );
      const user = insertResult.rows[0];

      // Create default profile
      await query(
        `INSERT INTO user_profiles (user_id) VALUES ($1) ON CONFLICT (user_id) DO NOTHING`,
        [user.id]
      );

      // Clean up the in-memory pending registration
      pendingRegistrations.delete(regId);

      console.log(`✅ User ${user.email} successfully registered and verified!`);

      // Issue real auth cookie
      const token = generateToken(user.id);
      res.cookie("token", token, COOKIE_OPTS);
      return res.json({ user, token });
    }

    // ── LOGIN flow: user already exists in DB ──
    const result = await query(
      "SELECT * FROM users WHERE id = $1 AND otp_code = $2 AND otp_expires > NOW()",
      [decoded.userId, code.trim()]
    );
    if (result.rows.length === 0) {
      return res.status(400).json({ error: "Invalid or expired code. Please try again." });
    }

    const user = result.rows[0];

    // Clear OTP + mark email verified
    await query(
      "UPDATE users SET otp_code = NULL, otp_expires = NULL, otp_purpose = NULL, email_verified = TRUE WHERE id = $1",
      [user.id]
    );

    // Issue real auth cookie
    const token = generateToken(user.id);
    res.cookie("token", token, COOKIE_OPTS);

    const { password_hash, verification_token, reset_token, otp_code, ...safe } = user;
    res.json({ user: { ...safe, email_verified: true }, token });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Resend OTP ─────────────────────────────────────────────────────────

router.post("/resend-otp", async (req, res) => {
  try {
    const { pendingToken } = req.body;
    if (!pendingToken) return res.status(400).json({ error: "Missing token." });

    const decoded = verifyPendingToken(pendingToken);
    if (!decoded) return res.status(401).json({ error: "Session expired. Please start again." });

    // ── REGISTRATION resend: user is in memory, not in DB ──
    if (decoded.scope === "otp_pending_register") {
      const regId = decoded.userId;
      const reg = pendingRegistrations.get(regId);
      if (!reg) return res.status(401).json({ error: "Registration session expired. Please register again." });

      // Rate limit: don't resend if existing OTP still has > 8 min left
      if (reg.otpExpires > Date.now() + 8 * 60 * 1000) {
        return res.status(429).json({ error: "Please wait before requesting a new code." });
      }

      // Generate new OTP
      const otp = genOtp();
      reg.otp = otp;
      reg.otpExpires = Date.now() + 10 * 60 * 1000;

      console.log("\n========================================================");
      console.log(`🔑 [VanillaCodicAI] OTP Code for ${reg.email} (register resend):`);
      console.log(`👉 CODE: ${otp} 👈`);
      console.log("========================================================\n");

      const sent = await sendOtpEmail(reg.email, reg.name, otp, "register").catch(err => {
        console.error("❌ OTP email failed to send:", err.message);
        return false;
      });

      if (!sent) {
        return res.status(500).json({ error: "Failed to resend OTP. Please check SMTP configuration." });
      }

      const newPendingToken = signPendingToken(regId, "otp_pending_register");
      return res.json({ success: true, pendingToken: newPendingToken, emailSent: true, maskedEmail: maskEmail(reg.email) });
    }

    // ── LOGIN resend: user exists in DB ──
    const result = await query("SELECT * FROM users WHERE id = $1", [decoded.userId]);
    if (!result.rows.length) return res.status(404).json({ error: "User not found." });
    const user = result.rows[0];

    // Rate limit: don't resend if existing OTP still has > 8 min left
    if (user.otp_expires && new Date(user.otp_expires) > new Date(Date.now() + 8 * 60 * 1000)) {
      return res.status(429).json({ error: "Please wait before requesting a new code." });
    }

    const { sent } = await issueOtp(user.id, user.email, user.name, user.otp_purpose || "login");

    if (!sent) {
      return res.status(500).json({
        error: "Failed to send OTP to your email address. Please check your SMTP credentials."
      });
    }

    // New pending token (reset 10 min window)
    const newPendingToken = signPendingToken(user.id);
    res.json({ success: true, pendingToken: newPendingToken, emailSent: sent, maskedEmail: maskEmail(user.email) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Verify Email (link) ────────────────────────────────────────────────

router.get("/verify-email", async (req, res) => {
  const frontendUrl = process.env.FRONTEND_URL ||
    (process.env.REPLIT_DEV_DOMAIN ? `https://${process.env.REPLIT_DEV_DOMAIN}` : "http://localhost:5000");
  const { token } = req.query;
  if (!token) return res.redirect(`${frontendUrl}?verified=invalid`);
  try {
    const result = await query(
      "SELECT id FROM users WHERE verification_token = $1 AND verification_expires > NOW()",
      [token]
    );
    if (!result.rows.length) return res.redirect(`${frontendUrl}?verified=expired`);
    await query(
      "UPDATE users SET email_verified = TRUE, verification_token = NULL, verification_expires = NULL WHERE id = $1",
      [result.rows[0].id]
    );
    res.redirect(`${frontendUrl}?verified=success`);
  } catch (err) {
    res.redirect(`${frontendUrl}?verified=error`);
  }
});

// ── Resend Verification Email ──────────────────────────────────────────

router.post("/resend-verification", requireAuth, async (req, res) => {
  try {
    const user = await findUserById(req.userId);
    if (!user) return res.status(404).json({ error: "User not found." });
    if (user.email_verified) return res.json({ message: "Email is already verified." });
    const vToken = genToken();
    const vExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);
    await query(
      "UPDATE users SET verification_token = $1, verification_expires = $2 WHERE id = $3",
      [vToken, vExpires, user.id]
    );
    const sent = await sendVerificationEmail(user.email, user.name, vToken);
    res.json({ success: true, emailSent: sent, message: sent ? "Verification email sent!" : "Email service not configured." });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Forgot Password ────────────────────────────────────────────────────

router.post("/forgot-password", async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: "Email is required." });
    const result = await query("SELECT * FROM users WHERE email = $1", [email.toLowerCase()]);
    const user = result.rows[0];
    if (!user || !user.password_hash) {
      return res.json({ success: true, message: "If that email exists, a reset link has been sent." });
    }
    const rToken = genToken();
    const rExpires = new Date(Date.now() + 60 * 60 * 1000);
    await query("UPDATE users SET reset_token = $1, reset_expires = $2 WHERE id = $3", [rToken, rExpires, user.id]);
    sendPasswordResetEmail(user.email, user.name, rToken).catch(err => console.error("Reset email failed:", err.message));
    res.json({ success: true, message: "If that email exists, a reset link has been sent." });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Reset Password ─────────────────────────────────────────────────────

router.post("/reset-password", async (req, res) => {
  try {
    const { token, password } = req.body;
    if (!token || !password) return res.status(400).json({ error: "Token and new password are required." });
    if (password.length < 8) return res.status(400).json({ error: "Password must be at least 8 characters." });
    const result = await query("SELECT id FROM users WHERE reset_token = $1 AND reset_expires > NOW()", [token]);
    if (!result.rows.length) return res.status(400).json({ error: "This reset link has expired or is invalid." });
    const bcrypt = await import("bcryptjs");
    const hash = await bcrypt.default.hash(password, 12);
    await query("UPDATE users SET password_hash = $1, reset_token = NULL, reset_expires = NULL WHERE id = $2", [hash, result.rows[0].id]);
    res.json({ success: true, message: "Password updated successfully. You can now sign in." });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Change Password ────────────────────────────────────────────────────

router.post("/change-password", requireAuth, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) return res.status(400).json({ error: "Both passwords are required." });
    if (newPassword.length < 8) return res.status(400).json({ error: "New password must be at least 8 characters." });
    const result = await query("SELECT password_hash FROM users WHERE id = $1", [req.userId]);
    const user = result.rows[0];
    if (!user?.password_hash) return res.status(400).json({ error: "No password set. Use forgot password instead." });
    const bcrypt = await import("bcryptjs");
    const valid = await bcrypt.default.compare(currentPassword, user.password_hash);
    if (!valid) return res.status(401).json({ error: "Current password is incorrect." });
    const hash = await bcrypt.default.hash(newPassword, 12);
    await query("UPDATE users SET password_hash = $1 WHERE id = $2", [hash, req.userId]);
    res.json({ success: true, message: "Password updated successfully." });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Google OAuth ───────────────────────────────────────────────────────

router.get("/google", (req, res) => {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  if (!clientId) return res.status(500).json({ error: "Google OAuth is not configured." });
  const baseUrl = process.env.APP_URL ||
    (process.env.REPLIT_DEV_DOMAIN ? `https://${process.env.REPLIT_DEV_DOMAIN}` : "http://localhost:5000");
  const redirectUri = `${baseUrl}/api/auth/google/callback`;
  const scope = encodeURIComponent("openid email profile");
  const url = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=${scope}&access_type=offline&prompt=select_account`;
  res.redirect(url);
});

router.get("/google/callback", async (req, res) => {
  const frontendUrl = process.env.FRONTEND_URL ||
    (process.env.REPLIT_DEV_DOMAIN ? `https://${process.env.REPLIT_DEV_DOMAIN}` : "http://localhost:5000");
  const { code, error } = req.query;
  if (error || !code) return res.redirect(`${frontendUrl}?auth_error=google_denied`);
  try {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    const baseUrl = process.env.APP_URL ||
      (process.env.REPLIT_DEV_DOMAIN ? `https://${process.env.REPLIT_DEV_DOMAIN}` : "http://localhost:5000");
    const redirectUri = `${baseUrl}/api/auth/google/callback`;
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ code, client_id: clientId, client_secret: clientSecret, redirect_uri: redirectUri, grant_type: "authorization_code" }),
    });
    const tokens = await tokenRes.json();
    if (tokens.error) throw new Error(tokens.error_description || tokens.error);
    const userInfoRes = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    });
    const googleUser = await userInfoRes.json();
    const user = await findOrCreateGoogleUser({
      googleId: googleUser.id, email: googleUser.email,
      name: googleUser.name, avatarUrl: googleUser.picture,
    });
    await query("UPDATE users SET email_verified = TRUE WHERE id = $1", [user.id]);
    const token = generateToken(user.id);
    res.cookie("token", token, COOKIE_OPTS);
    res.redirect(`${frontendUrl}?auth_success=1`);
  } catch (err) {
    console.error("Google OAuth error:", err.message);
    res.redirect(`${frontendUrl}?auth_error=${encodeURIComponent(err.message)}`);
  }
});

// ── Me ─────────────────────────────────────────────────────────────────

router.get("/me", requireAuth, async (req, res) => {
  try {
    const user = await findUserById(req.userId);
    if (!user) return res.status(404).json({ error: "User not found." });
    const { password_hash, verification_token, reset_token, otp_code, ...safe } = user;
    res.json({ user: safe });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Logout ─────────────────────────────────────────────────────────────

router.post("/logout", (req, res) => {
  res.clearCookie("token", { httpOnly: true, sameSite: "lax" });
  res.json({ success: true });
});

// ── Update Profile ─────────────────────────────────────────────────────

router.patch("/profile", requireAuth, async (req, res) => {
  try {
    const { name, phone } = req.body;
    const updates = {};
    if (name) updates.name = name;
    if (phone !== undefined) updates.phone = phone;
    if (!Object.keys(updates).length) return res.status(400).json({ error: "Nothing to update." });
    const fields = Object.keys(updates).map((k, i) => `${k} = $${i + 2}`).join(", ");
    const result = await query(
      `UPDATE users SET ${fields} WHERE id = $1 RETURNING id, name, email, phone, avatar_url, created_at, email_verified`,
      [req.userId, ...Object.values(updates)]
    );
    res.json({ user: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Helpers ────────────────────────────────────────────────────────────

function maskEmail(email) {
  if (!email) return "";
  const [user, domain] = email.split("@");
  const masked = user.length <= 2
    ? user[0] + "*"
    : user[0] + "*".repeat(user.length - 2) + user[user.length - 1];
  return `${masked}@${domain}`;
}

export default router;
