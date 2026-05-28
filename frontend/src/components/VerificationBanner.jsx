import { useState } from "react";
import { FiMail, FiX, FiCheckCircle } from "react-icons/fi";

const API_BASE = import.meta.env.VITE_API_URL
  ? `${import.meta.env.VITE_API_URL}/api`
  : "/api";

export default function VerificationBanner({ user, onVerified }) {
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  if (!user || user.email_verified || dismissed) return null;

  const handleResend = async () => {
    setSending(true);
    try {
      const res = await fetch(`${API_BASE}/auth/resend-verification`, {
        method: "POST",
        credentials: "include",
      });
      const data = await res.json();
      setSent(true);
    } catch {
      setSent(true);
    } finally {
      setSending(false);
    }
  };

  return (
    <div style={{
      background: "linear-gradient(135deg, rgba(251,191,36,0.12), rgba(245,158,11,0.08))",
      border: "1px solid rgba(251,191,36,0.25)",
      borderRadius: 12,
      margin: "0 24px 0",
      padding: "10px 16px",
      display: "flex",
      alignItems: "center",
      gap: 12,
      maxWidth: "1800px",
      width: "calc(100% - 48px)",
      marginLeft: "auto",
      marginRight: "auto",
    }}>
      <FiMail size={16} color="var(--warning)" style={{ flexShrink: 0 }} />
      <span style={{ flex: 1, fontSize: "0.83rem", color: "var(--text-secondary)", lineHeight: 1.5 }}>
        {sent
          ? "✅ Verification email sent! Check your inbox and click the link."
          : <>Please verify your email address <strong style={{ color: "var(--text-primary)" }}>{user.email}</strong> to unlock all features.</>
        }
      </span>
      {!sent && (
        <button
          onClick={handleResend}
          disabled={sending}
          style={{
            background: "rgba(251,191,36,0.15)",
            border: "1px solid rgba(251,191,36,0.3)",
            borderRadius: 8,
            color: "var(--warning)",
            fontSize: "0.78rem",
            fontWeight: 600,
            padding: "5px 12px",
            cursor: "pointer",
            flexShrink: 0,
            whiteSpace: "nowrap",
          }}
        >
          {sending ? "Sending…" : "Resend email"}
        </button>
      )}
      <button
        onClick={() => setDismissed(true)}
        style={{
          background: "none", border: "none", cursor: "pointer",
          color: "var(--text-muted)", display: "flex", alignItems: "center",
          padding: 2, flexShrink: 0,
        }}
      >
        <FiX size={14} />
      </button>
    </div>
  );
}
