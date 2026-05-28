import nodemailer from "nodemailer"; // brevo verified sender

function createTransport() {
  const host = process.env.SMTP_HOST || "smtp.gmail.com";
  const port = parseInt(process.env.SMTP_PORT || "587");
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  console.log(`✉️  Creating nodemailer transport (user: ${user || "not set"})`);

  const config = {};
  if (host.includes("gmail.com")) {
    config.service = "gmail";
    config.auth = { user, pass };
  } else {
    config.host = host;
    config.port = port;
    config.secure = port === 465;
    config.auth = { user, pass };
    config.tls = {
      rejectUnauthorized: false
    };
  }

  // Enable SMTP level logging in development or if SMTP_DEBUG is true
  if (process.env.NODE_ENV !== "production" || process.env.SMTP_DEBUG === "true") {
    config.debug = true;
    config.logger = true;
  }

  return nodemailer.createTransport(config);
}

// Extract a clean email address from EMAIL_FROM (strip any display name, quotes, angle brackets)
function cleanEmail(raw) {
  if (!raw) return null;
  // Match email inside angle brackets: "Name" <email> or <email>
  const match = raw.match(/<([^>]+)>/);
  if (match) return match[1].trim();
  // Strip any surrounding quotes
  return raw.replace(/^["']+|["']+$/g, "").trim();
}
const FROM_EMAIL = cleanEmail(process.env.EMAIL_FROM) || process.env.SMTP_USER || "noreply@vanillacodic.ai";
const APP_NAME = "VanillaCodicAI";
const BASE_URL = process.env.APP_URL ||
  (process.env.REPLIT_DEV_DOMAIN ? `https://${process.env.REPLIT_DEV_DOMAIN}` : "http://localhost:5000");

export function isEmailConfigured() {
  return !!(process.env.SMTP_USER && process.env.SMTP_PASS);
}

// ── OTP Email ──────────────────────────────────────────────────────────

export async function sendOtpEmail(toEmail, toName, otp, purpose = "login") {
  if (!isEmailConfigured()) {
    console.warn("⚠️  Email not configured — skipping OTP email");
    return false;
  }

  const purposeLabel = purpose === "register" ? "verify your account" : "sign in to your account";
  const html = `
    <!DOCTYPE html>
    <html>
    <head><meta charset="utf-8"></head>
    <body style="margin:0;padding:0;background:#0a0a0f;font-family:system-ui,sans-serif;">
      <div style="max-width:520px;margin:40px auto;background:#12121a;border:1px solid rgba(99,102,241,0.2);border-radius:20px;overflow:hidden;">
        <div style="background:linear-gradient(135deg,#6366f1,#8b5cf6);padding:32px;text-align:center;">
          <div style="width:52px;height:52px;background:rgba(255,255,255,0.15);border-radius:14px;display:inline-flex;align-items:center;justify-content:center;margin-bottom:16px;">
            <span style="font-size:26px;">🔐</span>
          </div>
          <h1 style="color:#fff;margin:0;font-size:1.5rem;font-weight:800;">${APP_NAME}</h1>
          <p style="color:rgba(255,255,255,0.7);margin:6px 0 0;font-size:0.85rem;">Your verification code</p>
        </div>
        <div style="padding:36px 32px;text-align:center;">
          <h2 style="color:#e2e8f0;margin:0 0 10px;font-size:1.1rem;">Hi ${toName || "there"} 👋</h2>
          <p style="color:#94a3b8;margin:0 0 32px;line-height:1.7;font-size:0.9rem;">
            Use the code below to ${purposeLabel}. It expires in <strong style="color:#e2e8f0;">10 minutes</strong>.
          </p>
          <div style="background:linear-gradient(135deg,rgba(99,102,241,0.15),rgba(139,92,246,0.15));border:2px solid rgba(99,102,241,0.3);border-radius:16px;padding:24px 32px;display:inline-block;margin-bottom:28px;">
            <span style="font-size:2.8rem;font-weight:900;letter-spacing:0.3em;color:#a5b4fc;font-family:monospace;">${otp}</span>
          </div>
          <p style="color:#64748b;font-size:0.8rem;margin:0;line-height:1.6;">
            If you didn't request this code, you can safely ignore this email.
          </p>
        </div>
        <div style="padding:20px 32px;border-top:1px solid rgba(255,255,255,0.06);text-align:center;">
          <p style="color:#475569;font-size:0.72rem;margin:0;">&copy; ${new Date().getFullYear()} ${APP_NAME}. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  const transporter = createTransport();
  await transporter.sendMail({
    from: `"${APP_NAME}" <${FROM_EMAIL}>`,
    to: toEmail,
    subject: `${otp} is your ${APP_NAME} verification code`,
    html,
    text: `Hi ${toName || "there"},\n\nYour ${APP_NAME} verification code is: ${otp}\n\nIt expires in 10 minutes.\n\nIf you didn't request this, ignore this email.`,
  });
  return true;
}

// ── Verification Email ─────────────────────────────────────────────────

export async function sendVerificationEmail(toEmail, toName, token) {
  if (!isEmailConfigured()) {
    console.warn("⚠️  Email not configured — skipping verification email");
    return false;
  }

  const verifyUrl = `${BASE_URL}/api/auth/verify-email?token=${token}`;
  const html = `
    <!DOCTYPE html>
    <html>
    <head><meta charset="utf-8"></head>
    <body style="margin:0;padding:0;background:#0a0a0f;font-family:system-ui,sans-serif;">
      <div style="max-width:520px;margin:40px auto;background:#12121a;border:1px solid rgba(99,102,241,0.2);border-radius:20px;overflow:hidden;">
        <div style="background:linear-gradient(135deg,#6366f1,#8b5cf6);padding:32px;text-align:center;">
          <div style="width:52px;height:52px;background:rgba(255,255,255,0.15);border-radius:14px;display:inline-flex;align-items:center;justify-content:center;margin-bottom:16px;">
            <span style="font-size:26px;">🩺</span>
          </div>
          <h1 style="color:#fff;margin:0;font-size:1.5rem;font-weight:800;">${APP_NAME}</h1>
          <p style="color:rgba(255,255,255,0.7);margin:6px 0 0;font-size:0.85rem;">AI-Powered Adaptive Code Mentor</p>
        </div>
        <div style="padding:36px 32px;">
          <h2 style="color:#e2e8f0;margin:0 0 12px;font-size:1.2rem;">Hi ${toName || "there"} 👋</h2>
          <p style="color:#94a3b8;margin:0 0 24px;line-height:1.7;">
            Thanks for signing up! Please verify your email address to unlock all features of ${APP_NAME}.
          </p>
          <a href="${verifyUrl}" style="display:block;text-align:center;background:linear-gradient(135deg,#6366f1,#8b5cf6);color:#fff;text-decoration:none;padding:14px 32px;border-radius:12px;font-weight:700;font-size:0.95rem;margin-bottom:24px;">
            Verify Email Address
          </a>
          <p style="color:#64748b;font-size:0.8rem;margin:0;line-height:1.6;">
            This link expires in <strong style="color:#94a3b8;">24 hours</strong>.
            If you didn't create an account, you can safely ignore this email.
          </p>
        </div>
        <div style="padding:20px 32px;border-top:1px solid rgba(255,255,255,0.06);text-align:center;">
          <p style="color:#475569;font-size:0.72rem;margin:0;">&copy; ${new Date().getFullYear()} ${APP_NAME}. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  const transporter = createTransport();
  await transporter.sendMail({
    from: `"${APP_NAME}" <${FROM_EMAIL}>`,
    to: toEmail,
    subject: `Verify your ${APP_NAME} account`,
    html,
    text: `Hi ${toName || "there"},\n\nVerify your email by visiting:\n${verifyUrl}\n\nThis link expires in 24 hours.`,
  });
  return true;
}

// ── Password Reset Email ───────────────────────────────────────────────

export async function sendPasswordResetEmail(toEmail, toName, token) {
  if (!isEmailConfigured()) {
    console.warn("⚠️  Email not configured — skipping reset email");
    return false;
  }

  const resetUrl = `${BASE_URL}?reset_token=${token}`;
  const html = `
    <!DOCTYPE html>
    <html>
    <head><meta charset="utf-8"></head>
    <body style="margin:0;padding:0;background:#0a0a0f;font-family:system-ui,sans-serif;">
      <div style="max-width:520px;margin:40px auto;background:#12121a;border:1px solid rgba(99,102,241,0.2);border-radius:20px;overflow:hidden;">
        <div style="background:linear-gradient(135deg,#6366f1,#8b5cf6);padding:32px;text-align:center;">
          <div style="width:52px;height:52px;background:rgba(255,255,255,0.15);border-radius:14px;display:inline-flex;align-items:center;justify-content:center;margin-bottom:16px;">
            <span style="font-size:26px;">🔒</span>
          </div>
          <h1 style="color:#fff;margin:0;font-size:1.5rem;font-weight:800;">${APP_NAME}</h1>
        </div>
        <div style="padding:36px 32px;">
          <h2 style="color:#e2e8f0;margin:0 0 12px;font-size:1.2rem;">Password Reset Request</h2>
          <p style="color:#94a3b8;margin:0 0 24px;line-height:1.7;">
            Hi ${toName || "there"}, we received a request to reset your password. Click below to choose a new one.
          </p>
          <a href="${resetUrl}" style="display:block;text-align:center;background:linear-gradient(135deg,#6366f1,#8b5cf6);color:#fff;text-decoration:none;padding:14px 32px;border-radius:12px;font-weight:700;font-size:0.95rem;margin-bottom:24px;">
            Reset Password
          </a>
          <p style="color:#64748b;font-size:0.8rem;margin:0;line-height:1.6;">
            This link expires in <strong style="color:#94a3b8;">1 hour</strong>.
            If you didn't request this, you can safely ignore this email — your password won't change.
          </p>
        </div>
        <div style="padding:20px 32px;border-top:1px solid rgba(255,255,255,0.06);text-align:center;">
          <p style="color:#475569;font-size:0.72rem;margin:0;">&copy; ${new Date().getFullYear()} ${APP_NAME}. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  const transporter = createTransport();
  await transporter.sendMail({
    from: `"${APP_NAME}" <${FROM_EMAIL}>`,
    to: toEmail,
    subject: `Reset your ${APP_NAME} password`,
    html,
    text: `Hi ${toName || "there"},\n\nReset your password by visiting:\n${resetUrl}\n\nThis link expires in 1 hour.`,
  });
  return true;
}
