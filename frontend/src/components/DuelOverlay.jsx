import { useState, useEffect } from "react";
import { FiClock, FiCpu, FiAward, FiX, FiCheckCircle, FiFrown, FiZap } from "react-icons/fi";

const formatTime = (seconds) => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
};

// 1. TOP STATUS PANEL (inline component inside layout)
export default function DuelOverlay({ activeDuel, userProfile, onLeave }) {
  if (!activeDuel) return null;

  const { opponent, problem, timeLeft, opponentProgress, opponentStatus, status } = activeDuel;

  const playerInitial = userProfile?.name ? userProfile.name[0].toUpperCase() : "Y";
  const opponentInitial = opponent?.name ? opponent.name[0].toUpperCase() : "O";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16, marginBottom: 16 }} className="animate-fade-in">
      {/* Duel Header Status Panel */}
      <div style={{
        background: "rgba(30, 27, 75, 0.4)", // Dark Indigo glass
        backdropFilter: "blur(12px)",
        border: "1px solid rgba(139, 92, 246, 0.25)",
        boxShadow: "0 8px 32px 0 rgba(139, 92, 246, 0.15), inset 0 0 12px rgba(139, 92, 246, 0.1)",
        borderRadius: 16,
        padding: "16px 20px",
        position: "relative",
        overflow: "hidden"
      }}>
        {/* Decorative Grid Line/Pulse background */}
        <div style={{
          position: "absolute",
          top: 0, left: 0, right: 0, bottom: 0,
          background: "linear-gradient(90deg, rgba(59,130,246,0.05) 0%, rgba(239,68,68,0.05) 100%)",
          zIndex: 0,
          pointerEvents: "none"
        }} />

        {/* VS Avatars & Timer Container */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", position: "relative", zIndex: 1 }}>
          {/* Player avatar (Blue) */}
          <div style={{ display: "flex", alignItems: "center", gap: 12, flex: 1 }}>
            <div style={{ position: "relative" }}>
              <div style={{
                width: 44, height: 44, borderRadius: "50%",
                background: "linear-gradient(135deg, #3b82f6, #1d4ed8)",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontWeight: "bold", fontSize: 18, color: "#fff",
                boxShadow: "0 0 15px rgba(59, 130, 246, 0.6)",
                border: "2px solid #60a5fa"
              }}>
                {playerInitial}
              </div>
              <div style={{
                position: "absolute", bottom: -2, right: -2,
                background: "#1d4ed8", border: "1px solid #60a5fa",
                borderRadius: 8, padding: "1px 5px", fontSize: 9, fontWeight: "bold"
              }}>
                Lv.{userProfile?.level || 1}
              </div>
            </div>
            <div>
              <span style={{ display: "block", fontSize: 13, fontWeight: "600", color: "#e2e8f0" }}>
                {userProfile?.name || "You"}
              </span>
              <span style={{ display: "block", fontSize: 10, color: "#93c5fd", fontWeight: "500" }}>
                Coding Solution...
              </span>
            </div>
          </div>

          {/* VS & Timer Panel */}
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 4, minWidth: 100 }}>
            <div style={{
              fontSize: 10, fontWeight: "800", textTransform: "uppercase", letterSpacing: "0.15em",
              color: "#f87171", background: "rgba(239, 68, 68, 0.15)", padding: "2px 8px", borderRadius: 12
            }}>
              DUEL ACTIVE
            </div>
            
            <div style={{ display: "flex", alignItems: "center", gap: 6, margin: "2px 0" }}>
              <FiClock size={16} style={{ color: "#fb7185", animation: "pulse 1s infinite" }} />
              <span style={{
                fontFamily: "monospace", fontSize: 18, fontWeight: "700",
                color: timeLeft < 60 ? "#f87171" : "#e2e8f0",
                textShadow: timeLeft < 60 ? "0 0 10px rgba(239, 68, 68, 0.5)" : "none"
              }}>
                {formatTime(timeLeft)}
              </span>
            </div>

            <span style={{ fontSize: 11, color: "#94a3b8", fontWeight: "600", textAlign: "center" }}>
              {problem ? `#${problem.frontend_id} ${problem.title}` : "LeetCode Challenge"}
            </span>

            {status === "running" && (
              <button
                onClick={onLeave}
                style={{
                  marginTop: 6,
                  background: "rgba(239, 68, 68, 0.12)",
                  border: "1px solid rgba(239, 68, 68, 0.35)",
                  color: "#f87171",
                  padding: "4px 10px",
                  borderRadius: 8,
                  fontSize: 10,
                  fontWeight: "700",
                  cursor: "pointer",
                  transition: "all 0.2s"
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.background = "rgba(239, 68, 68, 0.25)";
                  e.currentTarget.style.borderColor = "rgba(239, 68, 68, 0.6)";
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.background = "rgba(239, 68, 68, 0.12)";
                  e.currentTarget.style.borderColor = "rgba(239, 68, 68, 0.35)";
                }}
                title="Forfeit the match and lose 30 XP"
              >
                🏳️ Leave Duel
              </button>
            )}
          </div>

          {/* Opponent avatar (Red) */}
          <div style={{ display: "flex", alignItems: "center", gap: 12, flex: 1, justifyContent: "flex-end", textAlign: "right" }}>
            <div>
              <span style={{ display: "block", fontSize: 13, fontWeight: "600", color: "#e2e8f0" }}>
                {opponent?.name || "Competitor"}
              </span>
              <span style={{ display: "block", fontSize: 10, color: "#fca5a5", fontWeight: "500", fontFamily: "var(--font-sans)" }}>
                @{opponent?.username || "opponent"}
              </span>
            </div>
            <div style={{ position: "relative" }}>
              <div style={{
                width: 44, height: 44, borderRadius: "50%",
                background: "linear-gradient(135deg, #ef4444, #b91c1c)",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontWeight: "bold", fontSize: 18, color: "#fff",
                boxShadow: "0 0 15px rgba(239, 68, 68, 0.6)",
                border: "2px solid #f87171",
                animation: "pulse 2s infinite"
              }}>
                {opponentInitial}
              </div>
              <div style={{
                position: "absolute", bottom: -2, right: -2,
                background: "#b91c1c", border: "1px solid #f87171",
                borderRadius: 8, padding: "1px 5px", fontSize: 9, fontWeight: "bold"
              }}>
                Lv.{opponent?.level || 1}
              </div>
            </div>
          </div>
        </div>

        {/* Live Opponent Progress Bar Section */}
        <div style={{ marginTop: 16, borderTop: "1px solid rgba(255, 255, 255, 0.06)", paddingTop: 12, position: "relative", zIndex: 1 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
            <span style={{ fontSize: 12, color: "#cbd5e1", fontWeight: "500", display: "flex", alignItems: "center", gap: 6 }}>
              <FiCpu size={14} style={{ color: "#f87171" }} />
              <span>{opponent?.name || "Competitor"}'s Live Status:</span>
              <span style={{ color: "#fb7185", fontWeight: "600", fontSize: 12, fontStyle: "italic" }}>
                "{opponentStatus}"
              </span>
            </span>
            <span style={{ fontSize: 12, fontFamily: "monospace", color: "#fca5a5", fontWeight: "700" }}>
              {opponentProgress}%
            </span>
          </div>

          <div style={{
            height: 10,
            background: "rgba(0,0,0,0.3)",
            borderRadius: 5,
            overflow: "hidden",
            border: "1px solid rgba(255,255,255,0.05)"
          }}>
            <div style={{
              width: `${opponentProgress}%`,
              height: "100%",
              backgroundImage: "linear-gradient(90deg, #ec4899 0%, #ef4444 100%)",
              boxShadow: "0 0 8px rgba(239, 68, 68, 0.6)",
              borderRadius: 5,
              transition: "width 0.8s cubic-bezier(0.4, 0, 0.2, 1)"
            }} />
          </div>
        </div>
      </div>
    </div>
  );
}

// 2. VIEWPORT-WIDE RESULTS POPUP MODAL (rendered at root level in App.jsx)
export function DuelResultsModal({ activeDuel, onClose }) {
  if (!activeDuel || activeDuel.status === "running") return null;

  const { opponent, status, rewards } = activeDuel;

  const [displayedXp, setDisplayedXp] = useState(0);
  const [displayedCoins, setDisplayedCoins] = useState(0);

  useEffect(() => {
    if (rewards) {
      let xpCount = 0;
      let coinCount = 0;
      const duration = 1000;
      const steps = 30;
      
      const targetXp = rewards.xpEarned || 0;
      const targetCoins = rewards.coinsEarned || 0;

      const xpStep = Math.ceil(Math.abs(targetXp) / steps) * (targetXp < 0 ? -1 : 1);
      const coinStep = Math.ceil(targetCoins / steps);

      const interval = setInterval(() => {
        if (targetXp < 0) {
          xpCount = Math.max(targetXp, xpCount + xpStep);
        } else {
          xpCount = Math.min(targetXp, xpCount + xpStep);
        }
        coinCount = Math.min(targetCoins, coinCount + coinStep);

        setDisplayedXp(xpCount);
        setDisplayedCoins(coinCount);

        const xpDone = targetXp < 0 ? (xpCount <= targetXp) : (xpCount >= targetXp);
        const coinsDone = coinCount >= targetCoins;

        if (xpDone && coinsDone) {
          clearInterval(interval);
        }
      }, duration / steps);

      return () => clearInterval(interval);
    }
  }, [rewards]);

  const headerText = status === "win" ? "Victory!" : (status === "forfeit" ? "Forfeited!" : "Defeated!");

  return (
    <div style={{
      position: "fixed",
      top: 0, left: 0, right: 0, bottom: 0,
      background: "rgba(10, 11, 18, 0.85)",
      backdropFilter: "blur(8px)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      zIndex: 99999, // Ensure modal is above ALL other content (drawers, panels)
      padding: 20
    }} className="animate-fade-in">
      <div style={{
        background: "rgba(22, 24, 37, 0.95)",
        border: `2px solid ${status === "win" ? "rgba(16, 185, 129, 0.4)" : "rgba(239, 68, 68, 0.4)"}`,
        borderRadius: 24,
        padding: "32px 40px",
        width: "100%",
        maxWidth: 450,
        textAlign: "center",
        boxShadow: status === "win" 
          ? "0 20px 50px rgba(16, 185, 129, 0.3)" 
          : "0 20px 50px rgba(239, 68, 68, 0.3)",
        position: "relative"
      }} className="animate-pop-in">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          style={{
            position: "absolute",
            top: 20, right: 20,
            background: "none", border: "none",
            color: "#94a3b8", cursor: "pointer",
            padding: 6, borderRadius: "50%",
            display: "flex", alignItems: "center", justifyContent: "center"
          }}
          onMouseEnter={e => e.currentTarget.style.color = "#fff"}
          onMouseLeave={e => e.currentTarget.style.color = "#94a3b8"}
        >
          <FiX size={20} />
        </button>

        {status === "win" ? (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
            <div style={{
              width: 80, height: 80, borderRadius: "50%",
              background: "rgba(16, 185, 129, 0.1)",
              border: "2px solid #10b981",
              display: "flex", alignItems: "center", justifyContent: "center",
              boxShadow: "0 0 25px rgba(16, 185, 129, 0.4)"
            }}>
              <FiCheckCircle size={44} style={{ color: "#10b981" }} />
            </div>
            <div>
              <h2 style={{
                margin: 0, fontSize: 32, fontWeight: "800",
                background: "linear-gradient(135deg, #34d399, #059669)",
                WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
                letterSpacing: "0.05em", textTransform: "uppercase"
              }}>
                {headerText}
              </h2>
              <p style={{ margin: "6px 0 0", color: "#cbd5e1", fontSize: 14 }}>
                You compiled a working solution first!
              </p>
            </div>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
            <div style={{
              width: 80, height: 80, borderRadius: "50%",
              background: "rgba(239, 68, 68, 0.1)",
              border: "2px solid #ef4444",
              display: "flex", alignItems: "center", justifyContent: "center",
              boxShadow: "0 0 25px rgba(239, 68, 68, 0.4)"
            }}>
              <FiFrown size={44} style={{ color: "#ef4444" }} />
            </div>
            <div>
              <h2 style={{
                margin: 0, fontSize: 32, fontWeight: "800",
                background: "linear-gradient(135deg, #f87171, #dc2626)",
                WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
                letterSpacing: "0.05em", textTransform: "uppercase"
              }}>
                {headerText}
              </h2>
              <p style={{ margin: "6px 0 0", color: "#cbd5e1", fontSize: 14 }}>
                {status === "forfeit" 
                  ? `You left the battle against ${opponent?.name || "Opponent"}.`
                  : `${opponent?.name || "Opponent"} accepted solution first.`}
              </p>
            </div>
          </div>
        )}

        {/* Rewards Display panel */}
        <div style={{
          background: "rgba(255, 255, 255, 0.02)",
          border: "1px solid rgba(255, 255, 255, 0.05)",
          borderRadius: 16,
          padding: "20px 24px",
          margin: "24px 0",
          display: "flex",
          justifyContent: "space-around"
        }}>
          <div>
            <span style={{ display: "block", fontSize: 11, color: "#94a3b8", textTransform: "uppercase", fontWeight: "600" }}>
              {status === "forfeit" ? "XP Penalty" : "XP Gained"}
            </span>
            <span style={{
              fontSize: 24,
              fontWeight: "800",
              color: status === "forfeit" ? "#ef4444" : "#60a5fa",
              display: "flex",
              alignItems: "center",
              gap: 6,
              justifyContent: "center",
              marginTop: 4
            }}>
              <FiZap size={18} style={{ color: status === "forfeit" ? "#ef4444" : "#60a5fa" }} />
              {displayedXp > 0 ? "+" : ""}{displayedXp}
            </span>
          </div>
          <div style={{ width: 1, background: "rgba(255,255,255,0.08)" }} />
          <div>
            <span style={{ display: "block", fontSize: 11, color: "#94a3b8", textTransform: "uppercase", fontWeight: "600" }}>
              Vanilla Points
            </span>
            <span style={{ fontSize: 24, fontWeight: "800", color: "#fbbf24", display: "flex", alignItems: "center", gap: 6, justifyContent: "center", marginTop: 4 }}>
              🍦 +{displayedCoins}
            </span>
          </div>
        </div>

        {/* Level status overlay */}
        {rewards?.newProfile && (
          <div style={{ marginBottom: 24, fontSize: 14, color: "#e2e8f0" }}>
            <span>Current Level: </span>
            <span style={{
              fontWeight: "700", color: "#ec4899",
              background: "rgba(236, 72, 153, 0.15)",
              padding: "4px 10px", borderRadius: 12,
              border: "1px solid rgba(236, 72, 153, 0.25)",
              fontSize: 12, marginLeft: 6
            }}>
              Lv.{rewards.newProfile.level} • {rewards.newProfile.levelTitle}
            </span>
          </div>
        )}

        {/* Acknowledge Button */}
        <button
          onClick={onClose}
          style={{
            width: "100%",
            background: status === "win"
              ? "linear-gradient(135deg, #10b981 0%, #059669 100%)"
              : "linear-gradient(135deg, #ef4444 0%, #b91c1c 100%)",
            color: "#fff",
            border: "none",
            borderRadius: 12,
            padding: "12px 24px",
            fontSize: 15,
            fontWeight: "700",
            cursor: "pointer",
            boxShadow: "0 4px 15px rgba(0,0,0,0.2)",
            transition: "transform 0.2s"
          }}
          onMouseEnter={e => e.currentTarget.style.transform = "translateY(-1px)"}
          onMouseLeave={e => e.currentTarget.style.transform = "none"}
        >
          {status === "forfeit" ? "Exit Battle" : "Continue Battle"}
        </button>
      </div>
    </div>
  );
}
