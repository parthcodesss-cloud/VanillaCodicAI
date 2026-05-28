import { useState } from "react";
import { useAuth } from "../context/AuthContext.jsx";
import {
  FiUser, FiMail, FiPhone, FiLock, FiSave, FiArrowLeft,
  FiCheckCircle, FiAlertCircle, FiShield, FiEye, FiEyeOff, FiTrash2
} from "react-icons/fi";
import { FcGoogle } from "react-icons/fc";

const API_BASE = import.meta.env.VITE_API_URL
  ? `${import.meta.env.VITE_API_URL}/api`
  : "/api";

export default function SettingsPage({ onBack }) {
  const { user, refreshUser, logout } = useAuth();
  const [activeSection, setActiveSection] = useState("profile");

  return (
    <div style={{
      minHeight: "100vh", display: "flex", flexDirection: "column",
      background: "var(--bg-primary)", backgroundImage: "var(--gradient-bg)",
    }}>
      {/* Top bar */}
      <div style={{
        padding: "18px 28px", display: "flex", alignItems: "center", gap: 14,
        borderBottom: "1px solid var(--border-primary)",
        background: "var(--bg-card)",
      }}>
        <button onClick={onBack} style={{
          display: "flex", alignItems: "center", gap: 7,
          background: "none", border: "1px solid var(--border-primary)",
          borderRadius: 10, padding: "7px 14px", cursor: "pointer",
          color: "var(--text-secondary)", fontSize: "0.84rem", fontWeight: 500,
          transition: "all 0.2s",
        }}
          onMouseOver={e => { e.currentTarget.style.borderColor = "rgba(99,102,241,0.4)"; e.currentTarget.style.color = "var(--text-primary)"; }}
          onMouseOut={e => { e.currentTarget.style.borderColor = "var(--border-primary)"; e.currentTarget.style.color = "var(--text-secondary)"; }}
        >
          <FiArrowLeft size={15} /> Back
        </button>
        <div>
          <h1 style={{ fontSize: "1.05rem", fontWeight: 700, color: "var(--text-primary)", margin: 0 }}>Account Settings</h1>
          <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", margin: 0 }}>Manage your profile and security</p>
        </div>
      </div>

      <div style={{ display: "flex", flex: 1, maxWidth: 900, width: "100%", margin: "32px auto", gap: 24, padding: "0 24px" }}>
        {/* Sidebar nav */}
        <nav style={{ width: 180, flexShrink: 0 }}>
          {[
            { id: "profile", icon: <FiUser size={15} />, label: "Profile" },
            { id: "security", icon: <FiShield size={15} />, label: "Security" },
          ].map(item => (
            <button key={item.id} onClick={() => setActiveSection(item.id)} style={{
              width: "100%", display: "flex", alignItems: "center", gap: 9,
              padding: "10px 14px", borderRadius: 10, border: "none",
              background: activeSection === item.id ? "rgba(99,102,241,0.12)" : "none",
              color: activeSection === item.id ? "var(--accent-primary)" : "var(--text-secondary)",
              fontWeight: activeSection === item.id ? 700 : 500,
              fontSize: "0.86rem", cursor: "pointer", textAlign: "left",
              marginBottom: 4, transition: "all 0.15s",
              borderLeft: activeSection === item.id ? "2px solid var(--accent-primary)" : "2px solid transparent",
            }}>
              {item.icon} {item.label}
            </button>
          ))}
        </nav>

        {/* Content */}
        <div style={{ flex: 1, minWidth: 0 }}>
          {activeSection === "profile" && <ProfileSection user={user} refreshUser={refreshUser} />}
          {activeSection === "security" && <SecuritySection user={user} logout={logout} />}
        </div>
      </div>
    </div>
  );
}

// ── Profile Section ────────────────────────────────────────────────────

function ProfileSection({ user, refreshUser }) {
  const [name, setName] = useState(user?.name || "");
  const [phone, setPhone] = useState(user?.phone || "");
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState(null);

  const handleSave = async (e) => {
    e.preventDefault();
    if (!name.trim()) return setFeedback({ type: "error", msg: "Name cannot be empty." });
    setSaving(true);
    setFeedback(null);
    try {
      const res = await fetch(`${API_BASE}/auth/profile`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ name: name.trim(), phone: phone.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Save failed");
      await refreshUser();
      setFeedback({ type: "success", msg: "Profile updated successfully!" });
    } catch (err) {
      setFeedback({ type: "error", msg: err.message });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card title="Profile Information" subtitle="Update your name and contact details">
      {/* Avatar */}
      <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 28, paddingBottom: 24, borderBottom: "1px solid var(--border-primary)" }}>
        {user?.avatar_url ? (
          <img src={user.avatar_url} alt={user.name} style={{ width: 64, height: 64, borderRadius: "50%", objectFit: "cover", border: "2px solid var(--border-primary)" }} />
        ) : (
          <div style={{
            width: 64, height: 64, borderRadius: "50%", background: "var(--gradient-primary)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: "1.4rem", fontWeight: 800, color: "#fff",
            boxShadow: "0 4px 16px rgba(99,102,241,0.3)",
          }}>
            {user?.name?.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2) || "?"}
          </div>
        )}
        <div>
          <div style={{ fontWeight: 700, fontSize: "1rem", color: "var(--text-primary)" }}>{user?.name}</div>
          <div style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginTop: 3 }}>{user?.email}</div>
          {user?.avatar_url && (
            <div style={{ fontSize: "0.72rem", color: "var(--text-muted)", marginTop: 4, display: "flex", alignItems: "center", gap: 4 }}>
              <FcGoogle size={12} /> Signed in with Google
            </div>
          )}
        </div>
      </div>

      <form onSubmit={handleSave} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <FieldGroup label="Full Name" icon={<FiUser size={14} />}>
          <input value={name} onChange={e => setName(e.target.value)} placeholder="Your full name"
            style={inputStyle} />
        </FieldGroup>

        <FieldGroup label="Email Address" icon={<FiMail size={14} />} hint={user?.email_verified ? "✓ Verified" : "⚠ Not verified"} hintColor={user?.email_verified ? "var(--success)" : "var(--warning)"}>
          <input value={user?.email || ""} disabled placeholder="Email address"
            style={{ ...inputStyle, opacity: 0.5, cursor: "not-allowed" }} />
        </FieldGroup>

        <FieldGroup label="Phone Number" icon={<FiPhone size={14} />} hint="Optional">
          <input value={phone} onChange={e => setPhone(e.target.value)} placeholder="e.g. +1 555 000 0000" type="tel"
            style={inputStyle} />
        </FieldGroup>

        {feedback && <Feedback type={feedback.type} msg={feedback.msg} />}

        <button type="submit" disabled={saving} style={{
          display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
          padding: "11px 24px", borderRadius: 11, border: "none",
          background: saving ? "var(--bg-secondary)" : "var(--gradient-primary)",
          color: saving ? "var(--text-muted)" : "#fff",
          fontWeight: 700, fontSize: "0.88rem", cursor: saving ? "not-allowed" : "pointer",
          alignSelf: "flex-start", transition: "all 0.2s",
          boxShadow: saving ? "none" : "0 4px 16px rgba(99,102,241,0.3)",
        }}>
          <FiSave size={15} />
          {saving ? "Saving…" : "Save Changes"}
        </button>
      </form>
    </Card>
  );
}

// ── Security Section ───────────────────────────────────────────────────

function SecuritySection({ user, logout }) {
  const [form, setForm] = useState({ current: "", next: "", confirm: "" });
  const [showPw, setShowPw] = useState(false);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState(null);

  const isGoogleOnly = !!user?.avatar_url && !user?.password_hash_exists;

  const handleChange = (e) => setForm(f => ({ ...f, [e.target.name]: e.target.value }));

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.current) return setFeedback({ type: "error", msg: "Enter your current password." });
    if (form.next.length < 8) return setFeedback({ type: "error", msg: "New password must be at least 8 characters." });
    if (form.next !== form.confirm) return setFeedback({ type: "error", msg: "Passwords do not match." });
    setSaving(true);
    setFeedback(null);
    try {
      const res = await fetch(`${API_BASE}/auth/change-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ currentPassword: form.current, newPassword: form.next }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to change password");
      setFeedback({ type: "success", msg: "Password changed successfully!" });
      setForm({ current: "", next: "", confirm: "" });
    } catch (err) {
      setFeedback({ type: "error", msg: err.message });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* Password */}
      <Card title="Change Password" subtitle={isGoogleOnly ? "You signed in with Google — set a password to also enable email login" : "Update your account password"}>
        <form onSubmit={handleSave} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <FieldGroup label="Current Password" icon={<FiLock size={14} />}>
            <input name="current" value={form.current} onChange={handleChange}
              type={showPw ? "text" : "password"} placeholder="Current password"
              autoComplete="current-password" style={inputStyle} />
          </FieldGroup>
          <FieldGroup label="New Password" icon={<FiLock size={14} />}
            suffix={
              <button type="button" onClick={() => setShowPw(s => !s)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", display: "flex" }}>
                {showPw ? <FiEyeOff size={14} /> : <FiEye size={14} />}
              </button>
            }>
            <input name="next" value={form.next} onChange={handleChange}
              type={showPw ? "text" : "password"} placeholder="New password (min 8 chars)"
              autoComplete="new-password" style={inputStyle} />
          </FieldGroup>
          <FieldGroup label="Confirm New Password" icon={<FiLock size={14} />}>
            <input name="confirm" value={form.confirm} onChange={handleChange}
              type={showPw ? "text" : "password"} placeholder="Confirm new password"
              autoComplete="new-password" style={inputStyle} />
          </FieldGroup>

          {feedback && <Feedback type={feedback.type} msg={feedback.msg} />}

          <button type="submit" disabled={saving} style={{
            display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
            padding: "11px 24px", borderRadius: 11, border: "none",
            background: saving ? "var(--bg-secondary)" : "var(--gradient-primary)",
            color: saving ? "var(--text-muted)" : "#fff",
            fontWeight: 700, fontSize: "0.88rem", cursor: saving ? "not-allowed" : "pointer",
            alignSelf: "flex-start", transition: "all 0.2s",
            boxShadow: saving ? "none" : "0 4px 16px rgba(99,102,241,0.3)",
          }}>
            <FiLock size={15} />
            {saving ? "Updating…" : "Update Password"}
          </button>
        </form>
      </Card>

      {/* Account actions */}
      <Card title="Account" subtitle="Session and account management">
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            padding: "14px 16px", borderRadius: 12,
            background: "var(--bg-secondary)", border: "1px solid var(--border-primary)",
          }}>
            <div>
              <div style={{ fontSize: "0.86rem", fontWeight: 600, color: "var(--text-primary)" }}>Sign out</div>
              <div style={{ fontSize: "0.76rem", color: "var(--text-muted)", marginTop: 2 }}>End your current session</div>
            </div>
            <button onClick={logout} style={{
              padding: "8px 18px", borderRadius: 9,
              background: "none", border: "1px solid var(--border-primary)",
              color: "var(--text-secondary)", fontWeight: 600, fontSize: "0.82rem",
              cursor: "pointer", transition: "all 0.2s",
            }}
              onMouseOver={e => { e.currentTarget.style.borderColor = "rgba(99,102,241,0.4)"; e.currentTarget.style.color = "var(--text-primary)"; }}
              onMouseOut={e => { e.currentTarget.style.borderColor = "var(--border-primary)"; e.currentTarget.style.color = "var(--text-secondary)"; }}
            >
              Sign out
            </button>
          </div>
        </div>
      </Card>
    </div>
  );
}

// ── Shared UI ──────────────────────────────────────────────────────────

function Card({ title, subtitle, children }) {
  return (
    <div style={{
      background: "var(--bg-card)", border: "1px solid var(--border-primary)",
      borderRadius: 16, padding: "24px 28px",
    }}>
      <div style={{ marginBottom: 20 }}>
        <h2 style={{ fontSize: "0.95rem", fontWeight: 700, color: "var(--text-primary)", margin: 0 }}>{title}</h2>
        {subtitle && <p style={{ fontSize: "0.78rem", color: "var(--text-muted)", margin: "4px 0 0" }}>{subtitle}</p>}
      </div>
      {children}
    </div>
  );
}

function FieldGroup({ label, icon, hint, hintColor, suffix, children }) {
  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
        <label style={{ fontSize: "0.78rem", fontWeight: 600, color: "var(--text-secondary)", display: "flex", alignItems: "center", gap: 5 }}>
          {icon} {label}
        </label>
        {hint && <span style={{ fontSize: "0.72rem", color: hintColor || "var(--text-muted)" }}>{hint}</span>}
      </div>
      <div style={{
        display: "flex", alignItems: "center",
        background: "var(--bg-secondary)", border: "1px solid var(--border-primary)",
        borderRadius: 10, overflow: "hidden", transition: "border-color 0.2s",
      }}
        onFocusCapture={e => e.currentTarget.style.borderColor = "rgba(99,102,241,0.5)"}
        onBlurCapture={e => e.currentTarget.style.borderColor = "var(--border-primary)"}
      >
        {children}
        {suffix && <div style={{ paddingRight: 12 }}>{suffix}</div>}
      </div>
    </div>
  );
}

function Feedback({ type, msg }) {
  const isErr = type === "error";
  return (
    <div style={{
      display: "flex", alignItems: "flex-start", gap: 8, padding: "10px 14px", borderRadius: 10,
      background: isErr ? "rgba(239,68,68,0.08)" : "rgba(52,211,153,0.08)",
      border: `1px solid ${isErr ? "rgba(239,68,68,0.2)" : "rgba(52,211,153,0.2)"}`,
      color: isErr ? "var(--error)" : "var(--success)", fontSize: "0.82rem",
    }}>
      {isErr ? <FiAlertCircle size={14} style={{ flexShrink: 0, marginTop: 2 }} /> : <FiCheckCircle size={14} style={{ flexShrink: 0, marginTop: 2 }} />}
      {msg}
    </div>
  );
}

const inputStyle = {
  flex: 1, background: "none", border: "none", outline: "none",
  color: "var(--text-primary)", fontSize: "0.88rem", padding: "11px 14px",
  width: "100%",
};
