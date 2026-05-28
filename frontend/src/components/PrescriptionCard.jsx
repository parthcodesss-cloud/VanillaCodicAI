import { useState } from "react";
import { FiActivity, FiArrowRight, FiCheckSquare, FiSquare, FiAlertCircle, FiChevronDown, FiChevronUp } from "react-icons/fi";

export default function PrescriptionCard({ prescription, onLoadProblem, onClear }) {
  const [isCollapsed, setIsCollapsed] = useState(true);

  if (!prescription) return null;

  const { ailment, doctorNote, exercises, status, xpReward, coinsReward } = prescription;

  // Calculate completed count
  const completedCount = exercises.filter((ex) => ex.completed).length;
  const totalCount = exercises.length;
  const progressPercent = Math.round((completedCount / totalCount) * 100);

  const isCompleted = status === "completed";

  if (isCollapsed) {
    return (
      <div 
        onClick={() => setIsCollapsed(false)}
        style={{
          background: "rgba(16, 185, 129, 0.04)", // Soft emerald/teal health theme
          backdropFilter: "blur(12px)",
          border: isCompleted 
            ? "1px solid rgba(16, 185, 129, 0.3)" 
            : "1px solid rgba(245, 158, 11, 0.2)",
          boxShadow: isCompleted
            ? "0 4px 20px 0 rgba(16, 185, 129, 0.05)"
            : "0 4px 20px 0 rgba(245, 158, 11, 0.02)",
          borderRadius: 12,
          padding: "10px 16px",
          marginBottom: 12,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          cursor: "pointer",
          transition: "all 0.2s"
        }}
        className="animate-fade-in"
        onMouseEnter={(e) => {
          e.currentTarget.style.background = "rgba(16, 185, 129, 0.08)";
          e.currentTarget.style.borderColor = isCompleted 
            ? "rgba(16, 185, 129, 0.4)" 
            : "rgba(245, 158, 11, 0.3)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = "rgba(16, 185, 129, 0.04)";
          e.currentTarget.style.borderColor = isCompleted 
            ? "rgba(16, 185, 129, 0.3)" 
            : "rgba(245, 158, 11, 0.2)";
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{
            width: 24, height: 24, borderRadius: "50%",
            background: isCompleted ? "rgba(16, 185, 129, 0.15)" : "rgba(245, 158, 11, 0.15)",
            display: "flex", alignItems: "center", justifyContent: "center",
            color: isCompleted ? "#10b981" : "#f59e0b",
            animation: !isCompleted ? "pulse 2s infinite" : "none"
          }}>
            <FiActivity size={14} />
          </div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <span style={{ fontSize: 9, fontWeight: "800", textTransform: "uppercase", letterSpacing: "0.08em", color: isCompleted ? "#10b981" : "#f59e0b" }}>
              {isCompleted ? "PLAN COMPLETED" : "AI MEDIC DIAGNOSTIC ACTIVE"}
            </span>
            <span style={{ fontSize: 13, fontWeight: "700", color: "#cbd5e1" }}>
              {ailment} <span style={{ color: "#94a3b8", fontWeight: "500", fontSize: 11 }}>({completedCount}/{totalCount} exercises)</span>
            </span>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 12 }} onClick={(e) => e.stopPropagation()}>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <span style={{ fontSize: 10, fontWeight: "600", color: "#60a5fa" }}>
              🍦 +{coinsReward}
            </span>
            <span style={{ fontSize: 10, fontWeight: "600", color: "#fbbf24" }}>
              🔥 +{xpReward} XP
            </span>
          </div>
          <button 
            onClick={() => setIsCollapsed(false)}
            style={{
              background: "rgba(255,255,255,0.03)",
              border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: 6,
              color: "#cbd5e1",
              padding: "4px 8px",
              fontSize: 11,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 4,
              fontWeight: "600",
              transition: "all 0.2s"
            }}
            onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.08)"}
            onMouseLeave={e => e.currentTarget.style.background = "rgba(255,255,255,0.03)"}
          >
            <span>View Prescription</span> <FiChevronDown size={14} />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      background: "rgba(16, 185, 129, 0.04)", // Soft emerald/teal health theme
      backdropFilter: "blur(12px)",
      border: isCompleted 
        ? "1px solid rgba(16, 185, 129, 0.4)" 
        : "1px solid rgba(245, 158, 11, 0.25)",
      boxShadow: isCompleted
        ? "0 8px 32px 0 rgba(16, 185, 129, 0.1)"
        : "0 8px 32px 0 rgba(245, 158, 11, 0.05)",
      borderRadius: 16,
      padding: "16px 20px",
      marginBottom: 16,
      display: "flex",
      flexDirection: "column",
      gap: 12
    }} className="animate-fade-in">
      
      {/* Header Row */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{
            width: 28, height: 28, borderRadius: "50%",
            background: isCompleted ? "rgba(16, 185, 129, 0.15)" : "rgba(245, 158, 11, 0.15)",
            display: "flex", alignItems: "center", justifyContent: "center",
            color: isCompleted ? "#10b981" : "#f59e0b",
            animation: !isCompleted ? "pulse 2s infinite" : "none"
          }}>
            <FiActivity size={16} />
          </div>
          <div>
            <span style={{ fontSize: 10, fontWeight: "800", textTransform: "uppercase", letterSpacing: "0.1em", color: isCompleted ? "#10b981" : "#f59e0b" }}>
              {isCompleted ? "PLAN COMPLETED" : "AI MEDIC PRESCRIPTION"}
            </span>
            <h4 style={{ margin: "2px 0 0", fontSize: 14, fontWeight: "700", color: "#e2e8f0" }}>
              {ailment}
            </h4>
          </div>
        </div>

        {/* Reward Badges & Collapse */}
        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <span style={{ fontSize: 11, fontWeight: "600", color: "#60a5fa" }}>
              🍦 +{coinsReward}
            </span>
            <span style={{ fontSize: 11, fontWeight: "600", color: "#fbbf24" }}>
              🔥 +{xpReward} XP
            </span>
          </div>
          <button 
            onClick={(e) => {
              e.stopPropagation();
              setIsCollapsed(true);
            }}
            style={{
              background: "rgba(255,255,255,0.03)",
              border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: 6,
              color: "#cbd5e1",
              padding: "4px 8px",
              fontSize: 11,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 4,
              fontWeight: "600",
              transition: "all 0.2s"
            }}
            onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.08)"}
            onMouseLeave={e => e.currentTarget.style.background = "rgba(255,255,255,0.03)"}
          >
            <span>Hide</span> <FiChevronUp size={14} />
          </button>
        </div>
      </div>

      {/* Doctor's Note */}
      <div style={{
        background: "rgba(255, 255, 255, 0.015)",
        border: "1px solid rgba(255, 255, 255, 0.04)",
        padding: "10px 14px",
        borderRadius: 10,
        fontSize: 12,
        lineHeight: 1.5,
        color: "#cbd5e1",
        display: "flex",
        alignItems: "flex-start",
        gap: 8
      }}>
        <FiAlertCircle size={14} style={{ color: isCompleted ? "#10b981" : "#f59e0b", marginTop: 2, flexShrink: 0 }} />
        <span>
          <strong>Doc's Note:</strong> {doctorNote}
        </span>
      </div>

      {/* Exercises Checklist */}
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <span style={{ fontSize: 11, color: "#94a3b8", fontWeight: "700", textTransform: "uppercase", letterSpacing: "0.05em" }}>
          Prescribed Exercises ({completedCount}/{totalCount})
        </span>

        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {exercises.map((ex) => (
            <div
              key={ex.frontend_id}
              onClick={() => !ex.completed && onLoadProblem(ex.frontend_id)}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                background: ex.completed ? "rgba(16, 185, 129, 0.03)" : "rgba(255,255,255,0.01)",
                border: ex.completed 
                  ? "1px solid rgba(16, 185, 129, 0.15)" 
                  : "1px solid rgba(255,255,255,0.03)",
                padding: "8px 12px",
                borderRadius: 8,
                cursor: ex.completed ? "default" : "pointer",
                transition: "all 0.2s"
              }}
              onMouseEnter={(e) => {
                if (!ex.completed) {
                  e.currentTarget.style.borderColor = "rgba(245, 158, 11, 0.3)";
                  e.currentTarget.style.background = "rgba(255,255,255,0.03)";
                }
              }}
              onMouseLeave={(e) => {
                if (!ex.completed) {
                  e.currentTarget.style.borderColor = "rgba(255,255,255,0.03)";
                  e.currentTarget.style.background = "rgba(255,255,255,0.01)";
                }
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                {ex.completed ? (
                  <FiCheckSquare size={16} style={{ color: "#10b981" }} />
                ) : (
                  <FiSquare size={16} style={{ color: "#94a3b8" }} />
                )}
                <span style={{
                  fontSize: 12,
                  fontWeight: "500",
                  color: ex.completed ? "#94a3b8" : "#cbd5e1",
                  textDecoration: ex.completed ? "line-through" : "none"
                }}>
                  #{ex.frontend_id} {ex.title}
                </span>
              </div>

              {!ex.completed && (
                <span style={{ fontSize: 10, color: "#f59e0b", display: "flex", alignItems: "center", gap: 4, fontWeight: "600" }}>
                  <span>Code Med</span> <FiArrowRight size={10} />
                </span>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Progress Bar & Recovery Action */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 4 }}>
        <div style={{
          flex: 1,
          height: 6,
          background: "rgba(0,0,0,0.2)",
          borderRadius: 3,
          overflow: "hidden"
        }}>
          <div style={{
            width: `${progressPercent}%`,
            height: "100%",
            background: isCompleted ? "#10b981" : "#f59e0b",
            borderRadius: 3,
            transition: "width 0.4s ease"
          }} />
        </div>

        {isCompleted && (
          <button
            onClick={onClear}
            style={{
              background: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
              border: "none",
              borderRadius: 6,
              color: "#fff",
              padding: "5px 12px",
              fontSize: 11,
              fontWeight: "700",
              cursor: "pointer",
              boxShadow: "0 2px 8px rgba(16, 185, 129, 0.2)",
              transition: "transform 0.1s"
            }}
            onMouseEnter={e => e.currentTarget.style.transform = "scale(1.05)"}
            onMouseLeave={e => e.currentTarget.style.transform = "scale(1)"}
          >
            Claim Rewards & Clear
          </button>
        )}
      </div>
    </div>
  );
}
