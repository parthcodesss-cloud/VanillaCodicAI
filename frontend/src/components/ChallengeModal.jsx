import { useState, useEffect } from "react";
import { FiX, FiZap } from "react-icons/fi";

export default function ChallengeModal({ challenge, onAccept, onDecline }) {
  const [timeLeft, setTimeLeft] = useState(15);

  useEffect(() => {
    if (!challenge) return;
    setTimeLeft(15);
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          onDecline();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [challenge]);

  if (!challenge) return null;

  return (
    <div style={{
      position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
      background: "rgba(10, 11, 18, 0.88)", backdropFilter: "blur(10px)",
      display: "flex", alignItems: "center", justifyContent: "center",
      zIndex: 100000, padding: 20,
    }} className="animate-fade-in">
      <div style={{
        background: "rgba(22, 24, 37, 0.96)",
        border: "2px solid rgba(139, 92, 246, 0.4)",
        borderRadius: 24, padding: "36px 44px",
        width: "100%", maxWidth: 420, textAlign: "center",
        boxShadow: "0 20px 60px rgba(139, 92, 246, 0.3)",
        position: "relative",
      }} className="animate-pop-in">
        {/* Close */}
        <button onClick={onDecline} style={{
          position: "absolute", top: 16, right: 16,
          background: "none", border: "none", color: "#94a3b8",
          cursor: "pointer", padding: 4, borderRadius: "50%",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <FiX size={18} />
        </button>

        {/* Challenger Avatar */}
        <div style={{
          width: 72, height: 72, borderRadius: "50%",
          background: "linear-gradient(135deg, #8b5cf6, #6d28d9)",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 28, fontWeight: "800", color: "#fff",
          margin: "0 auto 16px",
          boxShadow: "0 0 30px rgba(139, 92, 246, 0.5)",
          border: "3px solid #a78bfa",
          animation: "pulse 1.5s infinite",
        }}>
          {challenge.challengerName?.[0]?.toUpperCase() || "?"}
        </div>

        {/* Title */}
        <h2 style={{
          margin: "0 0 6px", fontSize: 22, fontWeight: 800,
          background: "linear-gradient(135deg, #a78bfa, #c084fc)",
          WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
          textTransform: "uppercase", letterSpacing: "0.05em",
        }}>⚔️ Duel Challenge!</h2>

        <p style={{ margin: "0 0 4px", color: "#e2e8f0", fontSize: 15, fontWeight: 600 }}>
          {challenge.challengerName}
        </p>
        <p style={{ margin: "0 0 16px", color: "#94a3b8", fontSize: 12 }}>
          @{challenge.challengerUsername} • Lv.{challenge.challengerLevel}
        </p>

        {/* Problem Info */}
        <div style={{
          background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)",
          borderRadius: 12, padding: "12px 16px", marginBottom: 20,
        }}>
          <span style={{ fontSize: 11, color: "#94a3b8", textTransform: "uppercase", fontWeight: 700 }}>Challenge Problem</span>
          <p style={{ margin: "6px 0 0", fontSize: 14, fontWeight: 600, color: "#e2e8f0" }}>
            #{challenge.problemId} {challenge.problemTitle}
          </p>
          <span style={{
            fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 4,
            color: challenge.problemDifficulty === "Easy" ? "#10b981" : (challenge.problemDifficulty === "Medium" ? "#f59e0b" : "#ef4444"),
            background: challenge.problemDifficulty === "Easy" ? "rgba(16,185,129,0.1)" : (challenge.problemDifficulty === "Medium" ? "rgba(245,158,11,0.1)" : "rgba(239,68,68,0.1)"),
            textTransform: "uppercase",
          }}>{challenge.problemDifficulty}</span>
        </div>

        {/* Countdown */}
        <div style={{
          fontSize: 12, color: "#f87171", fontWeight: 700, marginBottom: 18,
          fontFamily: "var(--font-mono)",
        }}>
          ⏳ Auto-declining in {timeLeft}s
        </div>

        {/* Buttons */}
        <div style={{ display: "flex", gap: 12 }}>
          <button onClick={onDecline} style={{
            flex: 1, padding: "12px", borderRadius: 12,
            background: "rgba(239, 68, 68, 0.12)", border: "1px solid rgba(239, 68, 68, 0.3)",
            color: "#f87171", fontWeight: 700, fontSize: 14, cursor: "pointer",
            transition: "all 0.2s",
          }}
          onMouseEnter={e => e.currentTarget.style.background = "rgba(239, 68, 68, 0.25)"}
          onMouseLeave={e => e.currentTarget.style.background = "rgba(239, 68, 68, 0.12)"}
          >
            Decline
          </button>
          <button onClick={onAccept} style={{
            flex: 1, padding: "12px", borderRadius: 12,
            background: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
            border: "none", color: "#fff", fontWeight: 700, fontSize: 14,
            cursor: "pointer", transition: "all 0.2s",
            boxShadow: "0 4px 20px rgba(16, 185, 129, 0.3)",
            display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
          }}
          onMouseEnter={e => e.currentTarget.style.transform = "translateY(-2px)"}
          onMouseLeave={e => e.currentTarget.style.transform = "translateY(0)"}
          >
            <FiZap size={16} /> Accept
          </button>
        </div>
      </div>
    </div>
  );
}
