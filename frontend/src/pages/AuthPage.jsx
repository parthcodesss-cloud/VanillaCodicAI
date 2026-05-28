import { useState, useEffect, useRef } from "react";
import { useAuth } from "../context/AuthContext.jsx";
import {
  FiActivity, FiMail, FiLock, FiUser, FiPhone,
  FiEye, FiEyeOff, FiAlertCircle, FiCheckCircle, FiArrowLeft, FiRefreshCw
} from "react-icons/fi";
import { FcGoogle } from "react-icons/fc";
import Logo from "../components/Logo.jsx";

const API_BASE = import.meta.env.VITE_API_URL
  ? `${import.meta.env.VITE_API_URL}/api`
  : "/api";

export default function AuthPage({ embedded = false }) {
  const [mode, setMode] = useState("login"); // login | signup | otp | forgot | reset
  const [form, setForm] = useState({ name: "", email: "", phone: "", password: "", confirmPassword: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // OTP state
  const [otpDigits, setOtpDigits] = useState(["", "", "", "", "", ""]);
  const [pendingToken, setPendingToken] = useState("");
  const [maskedEmail, setMaskedEmail] = useState("");
  const [resendCooldown, setResendCooldown] = useState(0);
  const otpRefs = useRef([]);

  // Password reset
  const [resetToken, setResetToken] = useState("");

  const { login, register, loginWithGoogle, refreshUser } = useAuth();

  // Handle redirect params
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const verified = params.get("verified");
    const reset = params.get("reset_token");
    if (verified === "success") {
      setSuccessMsg("✅ Email verified! You can now sign in.");
      setMode("login");
      window.history.replaceState({}, "", "/");
    } else if (verified === "expired") {
      setError("Verification link expired. Please sign in and request a new one.");
      setMode("login");
      window.history.replaceState({}, "", "/");
    }
    if (reset) {
      setResetToken(reset);
      setMode("reset");
      window.history.replaceState({}, "", "/");
    }
  }, []);

  // Resend cooldown timer
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const t = setTimeout(() => setResendCooldown(c => c - 1), 1000);
    return () => clearTimeout(t);
  }, [resendCooldown]);

  const handleChange = (e) => {
    setForm(f => ({ ...f, [e.target.name]: e.target.value }));
    setError(""); setSuccessMsg("");
  };

  // ── OTP input handlers ─────────────────────────────────────────────

  const handleOtpChange = (i, val) => {
    if (!/^\d*$/.test(val)) return;
    const next = [...otpDigits];
    next[i] = val.slice(-1);
    setOtpDigits(next);
    setError("");
    if (val && i < 5) otpRefs.current[i + 1]?.focus();
  };

  const handleOtpKeyDown = (i, e) => {
    if (e.key === "Backspace" && !otpDigits[i] && i > 0) {
      otpRefs.current[i - 1]?.focus();
    }
  };

  const handleOtpPaste = (e) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    const next = [...otpDigits];
    for (let i = 0; i < 6; i++) next[i] = pasted[i] || "";
    setOtpDigits(next);
    const focusIdx = Math.min(pasted.length, 5);
    otpRefs.current[focusIdx]?.focus();
  };

  // ── Submit handlers ────────────────────────────────────────────────

  const handleLoginOrRegister = async (e) => {
    e.preventDefault();
    setError(""); setSuccessMsg("");

    if (mode === "signup") {
      if (!form.name.trim()) return setError("Full name is required.");
      if (!form.email.trim()) return setError("Email is required.");
      if (!form.phone.trim()) return setError("Phone number is required.");
      if (form.password.length < 8) return setError("Password must be at least 8 characters.");
      if (form.password !== form.confirmPassword) return setError("Passwords do not match.");
    } else {
      if (!form.email.trim()) return setError("Email is required.");
      if (!form.password) return setError("Password is required.");
    }

    setSubmitting(true);
    try {
      const endpoint = mode === "signup" ? "/auth/register" : "/auth/login";
      const body = mode === "signup"
        ? { name: form.name, email: form.email, phone: form.phone, password: form.password }
        : { email: form.email, password: form.password };

      const res = await fetch(`${API_BASE}${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(body),
      });
      let data = {};
      try {
        data = await res.json();
      } catch (e) {
        throw new Error(res.status === 500 ? "Server is temporarily unavailable. Please try again." : "Invalid response from server");
      }
      if (!res.ok) throw new Error(data.error || "Request failed");

      if (data.pendingOtp) {
        setPendingToken(data.pendingToken);
        setMaskedEmail(data.maskedEmail || form.email);
        setOtpDigits(["", "", "", "", "", ""]);
        setResendCooldown(30);
        setMode("otp");
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleVerifyOtp = async (e) => {
    e?.preventDefault();
    const code = otpDigits.join("");
    if (code.length < 6) return setError("Please enter the full 6-digit code.");
    setSubmitting(true); setError("");
    try {
      const res = await fetch(`${API_BASE}/auth/verify-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ pendingToken, code }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Verification failed");
      await refreshUser();
    } catch (err) {
      setError(err.message);
      setOtpDigits(["", "", "", "", "", ""]);
      otpRefs.current[0]?.focus();
    } finally {
      setSubmitting(false);
    }
  };

  const handleResendOtp = async () => {
    if (resendCooldown > 0) return;
    setSubmitting(true); setError(""); setSuccessMsg("");
    try {
      const res = await fetch(`${API_BASE}/auth/resend-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pendingToken }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to resend");
      setPendingToken(data.pendingToken);
      setOtpDigits(["", "", "", "", "", ""]);
      otpRefs.current[0]?.focus();
      setSuccessMsg("New code sent to your email!");
      setResendCooldown(30);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleForgot = async (e) => {
    e.preventDefault();
    if (!form.email.trim()) return setError("Please enter your email.");
    setSubmitting(true); setError(""); setSuccessMsg("");
    try {
      const res = await fetch(`${API_BASE}/auth/forgot-password`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: form.email }),
      });
      const data = await res.json();
      setSuccessMsg(data.message || "Reset link sent!");
    } catch {
      setError("Request failed. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleReset = async (e) => {
    e.preventDefault();
    if (form.password.length < 8) return setError("Password must be at least 8 characters.");
    if (form.password !== form.confirmPassword) return setError("Passwords do not match.");
    setSubmitting(true); setError(""); setSuccessMsg("");
    try {
      const res = await fetch(`${API_BASE}/auth/reset-password`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: resetToken, password: form.password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Reset failed");
      setSuccessMsg(data.message);
      setTimeout(() => { switchMode("login"); setSuccessMsg(""); }, 2500);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const switchMode = (m) => {
    setMode(m); setError(""); setSuccessMsg("");
    setForm({ name: "", email: "", phone: "", password: "", confirmPassword: "" });
    setOtpDigits(["", "", "", "", "", ""]);
  };

  // Auto-submit when all 6 digits filled
  useEffect(() => {
    if (mode === "otp" && otpDigits.every(d => d !== "") && !submitting) {
      handleVerifyOtp();
    }
  }, [otpDigits]);

  return (
    <div style={embedded ? { display: "flex", justifyContent: "center", width: "100%", padding: "24px" } : {
      minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center",
      background: "var(--bg-primary)", backgroundImage: "var(--gradient-bg)", padding: "24px",
    }}>
      {!embedded && (
        <div style={{
          position: "fixed", top: "20%", left: "50%", transform: "translateX(-50%)",
          width: 600, height: 600, borderRadius: "50%",
          background: "radial-gradient(circle, rgba(245, 158, 11, 0.08) 0%, transparent 70%)",
          pointerEvents: "none",
        }} />
      )}

      <div style={{
        width: "100%", maxWidth: 440,
        background: "var(--bg-card)", border: "1px solid var(--border-glass)",
        backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)",
        borderRadius: 20, padding: "40px 36px",
        boxShadow: "0 20px 60px rgba(0,0,0,0.4)", position: "relative", zIndex: 1,
      }}>
        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <div style={{
            width: 56, height: 56, borderRadius: 16,
            background: "linear-gradient(135deg, rgba(245, 158, 11, 0.2), rgba(245, 158, 11, 0.05))",
            border: "1px solid rgba(245, 158, 11, 0.3)",
            display: "flex", alignItems: "center", justifyContent: "center",
            margin: "0 auto 14px", boxShadow: "0 8px 32px rgba(245, 158, 11, 0.15)",
          }}>
            <Logo size={36} bracketsColor="var(--accent-primary)" />
          </div>
          <h1 style={{ fontSize: "1.5rem", fontWeight: 800, letterSpacing: "-0.02em", marginBottom: 4 }}>
            <span className="gradient-text">VanillaCodic</span>
            <span style={{ color: "var(--text-secondary)", fontWeight: 500 }}>AI</span>
          </h1>
          <p style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>AI-Powered Adaptive Code Mentor</p>
        </div>

        {/* ── OTP Screen ── */}
        {mode === "otp" && (
          <OtpScreen
            maskedEmail={maskedEmail}
            otpDigits={otpDigits}
            otpRefs={otpRefs}
            onChange={handleOtpChange}
            onKeyDown={handleOtpKeyDown}
            onPaste={handleOtpPaste}
            onSubmit={handleVerifyOtp}
            onResend={handleResendOtp}
            onBack={() => switchMode("login")}
            resendCooldown={resendCooldown}
            submitting={submitting}
            error={error}
            successMsg={successMsg}
          />
        )}

        {/* ── Forgot Password ── */}
        {mode === "forgot" && (
          <form onSubmit={handleForgot} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <BackButton onClick={() => switchMode("login")} />
            <div style={{ marginBottom: 4 }}>
              <h2 style={{ fontSize: "1.05rem", fontWeight: 700, color: "var(--text-primary)", margin: "0 0 6px" }}>Forgot your password?</h2>
              <p style={{ fontSize: "0.82rem", color: "var(--text-muted)", margin: 0 }}>Enter your email and we'll send you a reset link.</p>
            </div>
            <InputField icon={<FiMail size={15} />} name="email" placeholder="Email address" type="email" value={form.email} onChange={handleChange} />
            <Feedback error={error} success={successMsg} />
            <SubmitBtn submitting={submitting} label="Send Reset Link" />
            <p style={{ textAlign: "center", fontSize: "0.82rem", color: "var(--text-muted)", margin: 0 }}>
              Remembered it?{" "}
              <span onClick={() => switchMode("login")} style={{ color: "var(--accent-primary)", cursor: "pointer", fontWeight: 600 }}>Sign in</span>
            </p>
          </form>
        )}

        {/* ── Reset Password ── */}
        {mode === "reset" && (
          <form onSubmit={handleReset} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div style={{ marginBottom: 4 }}>
              <h2 style={{ fontSize: "1.05rem", fontWeight: 700, color: "var(--text-primary)", margin: "0 0 6px" }}>Choose a new password</h2>
              <p style={{ fontSize: "0.82rem", color: "var(--text-muted)", margin: 0 }}>Pick something strong and memorable.</p>
            </div>
            <InputField icon={<FiLock size={15} />} name="password" placeholder="New password (min 8 chars)" type={showPassword ? "text" : "password"} value={form.password} onChange={handleChange}
              suffix={<EyeToggle show={showPassword} toggle={() => setShowPassword(s => !s)} />} />
            <InputField icon={<FiLock size={15} />} name="confirmPassword" placeholder="Confirm new password" type={showPassword ? "text" : "password"} value={form.confirmPassword} onChange={handleChange} />
            <Feedback error={error} success={successMsg} />
            <SubmitBtn submitting={submitting} label="Update Password" />
          </form>
        )}

        {/* ── Login / Signup ── */}
        {(mode === "login" || mode === "signup") && (
          <>
            <div style={{
              display: "flex", background: "var(--bg-secondary)", borderRadius: 12,
              padding: 4, marginBottom: 24, border: "1px solid var(--border-primary)",
            }}>
              {["login", "signup"].map(tab => (
                <button key={tab} onClick={() => switchMode(tab)} style={{
                  flex: 1, padding: "8px 0", borderRadius: 9, border: "none",
                  cursor: "pointer", fontWeight: 600, fontSize: "0.85rem", transition: "all 0.2s",
                  background: mode === tab ? "var(--accent-primary)" : "transparent",
                  color: mode === tab ? "#fff" : "var(--text-muted)",
                }}>
                  {tab === "login" ? "Sign In" : "Create Account"}
                </button>
              ))}
            </div>

            <button onClick={loginWithGoogle} style={{
              width: "100%", display: "flex", alignItems: "center", justifyContent: "center",
              gap: 10, padding: "11px 0", borderRadius: 12,
              background: "var(--bg-secondary)", border: "1px solid var(--border-primary)",
              color: "var(--text-primary)", fontWeight: 600, fontSize: "0.88rem",
              cursor: "pointer", marginBottom: 18, transition: "all 0.2s",
            }}
              onMouseOver={e => e.currentTarget.style.borderColor = "rgba(99,102,241,0.5)"}
              onMouseOut={e => e.currentTarget.style.borderColor = "var(--border-primary)"}
            >
              <FcGoogle size={20} /> Continue with Google
            </button>

            <Divider />

            <form onSubmit={handleLoginOrRegister} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {mode === "signup" && (
                <InputField icon={<FiUser size={15} />} name="name" placeholder="Full name" value={form.name} onChange={handleChange} />
              )}
              <InputField icon={<FiMail size={15} />} name="email" placeholder="Email address" type="email" value={form.email} onChange={handleChange} />
              {mode === "signup" && (
                <InputField icon={<FiPhone size={15} />} name="phone" placeholder="Phone number (required)" type="tel" value={form.phone} onChange={handleChange} required />
              )}
              <InputField
                icon={<FiLock size={15} />} name="password"
                placeholder={mode === "login" ? "Password" : "Password (min 8 chars)"}
                type={showPassword ? "text" : "password"} value={form.password} onChange={handleChange}
                suffix={<EyeToggle show={showPassword} toggle={() => setShowPassword(s => !s)} />}
              />
              {mode === "signup" && (
                <InputField icon={<FiLock size={15} />} name="confirmPassword" placeholder="Confirm password" type={showPassword ? "text" : "password"} value={form.confirmPassword} onChange={handleChange} />
              )}
              {mode === "login" && (
                <div style={{ textAlign: "right", marginTop: -8 }}>
                  <span onClick={() => switchMode("forgot")} style={{ fontSize: "0.78rem", color: "var(--accent-primary)", cursor: "pointer", fontWeight: 500 }}>
                    Forgot password?
                  </span>
                </div>
              )}
              <Feedback error={error} success={successMsg} />
              <SubmitBtn submitting={submitting} label={mode === "login" ? "Sign In" : "Create Account"} />
            </form>

            <p style={{ textAlign: "center", marginTop: 20, fontSize: "0.82rem", color: "var(--text-muted)" }}>
              {mode === "login" ? "Don't have an account? " : "Already have an account? "}
              <span onClick={() => switchMode(mode === "login" ? "signup" : "login")} style={{ color: "var(--accent-primary)", cursor: "pointer", fontWeight: 600 }}>
                {mode === "login" ? "Sign up" : "Sign in"}
              </span>
            </p>
          </>
        )}
      </div>
    </div>
  );
}

// ── OTP Screen ─────────────────────────────────────────────────────────

function OtpScreen({ maskedEmail, otpDigits, otpRefs, onChange, onKeyDown, onPaste, onSubmit, onResend, onBack, resendCooldown, submitting, error, successMsg }) {
  return (
    <div>
      <BackButton onClick={onBack} />
      <div style={{ textAlign: "center", marginBottom: 28 }}>
        <div style={{
          width: 60, height: 60, borderRadius: "50%",
          background: "rgba(99,102,241,0.1)", border: "2px solid rgba(99,102,241,0.25)",
          display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px",
        }}>
          <FiMail size={26} color="var(--accent-primary)" />
        </div>
        <h2 style={{ fontSize: "1.1rem", fontWeight: 700, color: "var(--text-primary)", margin: "0 0 8px" }}>Check your email</h2>
        <p style={{ fontSize: "0.83rem", color: "var(--text-muted)", margin: 0, lineHeight: 1.7 }}>
          We sent a 6-digit code to
        </p>
        <p style={{ fontSize: "0.9rem", fontWeight: 700, color: "var(--accent-primary)", margin: "4px 0 0" }}>{maskedEmail}</p>
      </div>

      {/* OTP digit boxes */}
      <form onSubmit={onSubmit}>
        <div style={{ display: "flex", gap: 8, justifyContent: "center", marginBottom: 20 }}>
          {otpDigits.map((digit, i) => (
            <input
              key={i}
              ref={el => otpRefs.current[i] = el}
              type="text"
              inputMode="numeric"
              maxLength={1}
              value={digit}
              onChange={e => onChange(i, e.target.value)}
              onKeyDown={e => onKeyDown(i, e)}
              onPaste={i === 0 ? onPaste : undefined}
              style={{
                width: 46, height: 54, textAlign: "center",
                fontSize: "1.4rem", fontWeight: 800, fontFamily: "var(--font-mono)",
                background: digit ? "rgba(99,102,241,0.12)" : "var(--bg-secondary)",
                border: `2px solid ${digit ? "rgba(99,102,241,0.5)" : "var(--border-primary)"}`,
                borderRadius: 12, color: "var(--text-primary)",
                outline: "none", transition: "all 0.15s", cursor: "text",
              }}
              onFocus={e => e.target.style.borderColor = "rgba(99,102,241,0.7)"}
              onBlur={e => e.target.style.borderColor = digit ? "rgba(99,102,241,0.5)" : "var(--border-primary)"}
            />
          ))}
        </div>

        <Feedback error={error} success={successMsg} />

        <button type="submit" disabled={submitting || otpDigits.some(d => !d)} style={{
          width: "100%", padding: "12px 0", borderRadius: 12, border: "none",
          background: (submitting || otpDigits.some(d => !d)) ? "var(--bg-secondary)" : "var(--gradient-primary)",
          color: (submitting || otpDigits.some(d => !d)) ? "var(--text-muted)" : "#fff",
          fontWeight: 700, fontSize: "0.92rem", cursor: (submitting || otpDigits.some(d => !d)) ? "not-allowed" : "pointer",
          marginTop: 16, transition: "all 0.2s",
          boxShadow: (submitting || otpDigits.some(d => !d)) ? "none" : "0 4px 20px rgba(99,102,241,0.35)",
        }}>
          {submitting ? "Verifying…" : "Verify Code"}
        </button>
      </form>

      <div style={{ textAlign: "center", marginTop: 20 }}>
        <p style={{ fontSize: "0.8rem", color: "var(--text-muted)", margin: "0 0 8px" }}>Didn't receive it?</p>
        <button
          onClick={onResend}
          disabled={resendCooldown > 0 || submitting}
          style={{
            display: "inline-flex", alignItems: "center", gap: 6,
            background: "none", border: "none", cursor: resendCooldown > 0 ? "not-allowed" : "pointer",
            color: resendCooldown > 0 ? "var(--text-muted)" : "var(--accent-primary)",
            fontSize: "0.84rem", fontWeight: 600, padding: 0,
          }}
        >
          <FiRefreshCw size={13} />
          {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : "Resend code"}
        </button>
      </div>
    </div>
  );
}

// ── Shared UI ──────────────────────────────────────────────────────────

function InputField({ icon, name, placeholder, type = "text", value, onChange, suffix }) {
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 10,
      background: "var(--bg-secondary)", border: "1px solid var(--border-primary)",
      borderRadius: 12, padding: "0 14px", transition: "border-color 0.2s",
    }}
      onFocusCapture={e => e.currentTarget.style.borderColor = "rgba(99,102,241,0.5)"}
      onBlurCapture={e => e.currentTarget.style.borderColor = "var(--border-primary)"}
    >
      <span style={{ color: "var(--text-muted)", display: "flex", alignItems: "center" }}>{icon}</span>
      <input name={name} type={type} placeholder={placeholder} value={value} onChange={onChange}
        autoComplete={type === "password" ? "current-password" : name}
        style={{ flex: 1, background: "none", border: "none", outline: "none", color: "var(--text-primary)", fontSize: "0.88rem", padding: "12px 0" }}
      />
      {suffix}
    </div>
  );
}

function EyeToggle({ show, toggle }) {
  return (
    <button type="button" onClick={toggle} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", display: "flex", alignItems: "center", padding: 0 }}>
      {show ? <FiEyeOff size={15} /> : <FiEye size={15} />}
    </button>
  );
}

function Feedback({ error, success }) {
  if (!error && !success) return null;
  const isErr = !!error;
  return (
    <div style={{
      display: "flex", alignItems: "flex-start", gap: 8, padding: "10px 14px", borderRadius: 10,
      background: isErr ? "rgba(239,68,68,0.1)" : "rgba(52,211,153,0.1)",
      border: `1px solid ${isErr ? "rgba(239,68,68,0.25)" : "rgba(52,211,153,0.25)"}`,
      color: isErr ? "var(--error)" : "var(--success)", fontSize: "0.82rem",
    }}>
      {isErr ? <FiAlertCircle size={14} style={{ flexShrink: 0, marginTop: 2 }} /> : <FiCheckCircle size={14} style={{ flexShrink: 0, marginTop: 2 }} />}
      {error || success}
    </div>
  );
}

function SubmitBtn({ submitting, label }) {
  return (
    <button type="submit" disabled={submitting} style={{
      padding: "12px 0", borderRadius: 12, border: "none",
      background: submitting ? "var(--bg-secondary)" : "var(--gradient-primary)",
      color: submitting ? "var(--text-muted)" : "#fff",
      fontWeight: 700, fontSize: "0.92rem", cursor: submitting ? "not-allowed" : "pointer",
      marginTop: 4, transition: "all 0.2s",
      boxShadow: submitting ? "none" : "0 4px 20px rgba(99,102,241,0.35)",
    }}>
      {submitting ? "Please wait…" : label}
    </button>
  );
}

function BackButton({ onClick }) {
  return (
    <button type="button" onClick={onClick} style={{
      display: "flex", alignItems: "center", gap: 6,
      background: "none", border: "none", cursor: "pointer",
      color: "var(--text-muted)", fontSize: "0.82rem", padding: 0, marginBottom: 16,
      transition: "color 0.2s",
    }}
      onMouseOver={e => e.currentTarget.style.color = "var(--text-primary)"}
      onMouseOut={e => e.currentTarget.style.color = "var(--text-muted)"}
    >
      <FiArrowLeft size={14} /> Back
    </button>
  );
}

function Divider() {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 18 }}>
      <div style={{ flex: 1, height: 1, background: "var(--border-primary)" }} />
      <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>or</span>
      <div style={{ flex: 1, height: 1, background: "var(--border-primary)" }} />
    </div>
  );
}
