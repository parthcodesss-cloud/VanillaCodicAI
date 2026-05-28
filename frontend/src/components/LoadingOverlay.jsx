import { FiAperture } from "react-icons/fi";

export default function LoadingOverlay({ action, model, onCancel }) {
  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 1000,
      background: "rgba(8, 8, 16, 0.85)", backdropFilter: "blur(12px)",
      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 24,
    }} className="animate-fade-in">
      
      {/* ── Beautiful Animated Orb ── */}
      <div style={{ position: "relative", display: "flex", alignItems: "center", justifyContent: "center", width: 80, height: 80 }}>
        {/* Ambient glow */}
        <div style={{
          position: "absolute", inset: -30,
          borderRadius: "50%", background: "radial-gradient(circle, rgba(139,92,246,0.2) 0%, transparent 70%)",
          animation: "pulse 2s ease-in-out infinite",
        }} />
        
        {/* Outer Ring */}
        <div style={{
          position: "absolute", inset: 0,
          border: "2px solid rgba(139,92,246,0.1)", borderTopColor: "var(--accent-primary)", borderBottomColor: "var(--accent-primary)",
          borderRadius: "50%", animation: "spin 2s cubic-bezier(0.68, -0.55, 0.265, 1.55) infinite",
        }} />
        
        {/* Inner Ring */}
        <div style={{
          position: "absolute", inset: 12,
          border: "2px solid rgba(56,189,248,0.1)", borderLeftColor: "var(--accent-secondary)", borderRightColor: "var(--accent-secondary)",
          borderRadius: "50%", animation: "spin 2.5s cubic-bezier(0.68, -0.55, 0.265, 1.55) infinite reverse",
        }} />
        
        {/* Core Icon */}
        <div style={{
          background: "linear-gradient(135deg, var(--accent-primary), var(--accent-secondary))",
          WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
          animation: "pulse 1.5s ease-in-out infinite",
        }}>
          <FiAperture size={32} />
        </div>
      </div>

      <div style={{ textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center" }}>
        <p style={{ 
          fontSize: "1.1rem", fontWeight: 700, 
          background: "linear-gradient(135deg, #fff, #a5b4fc)",
          WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
          letterSpacing: "0.5px", marginBottom: 8
        }}>
          {action}
        </p>
        <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "4px 12px", borderRadius: 20, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", marginBottom: onCancel ? 24 : 0 }}>
          <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>Powered by</span>
          <span style={{ fontSize: "0.75rem", color: "var(--accent-secondary)", fontWeight: 700 }}>{model || "AI"}</span>
        </div>
      </div>
      
      {onCancel && (
        <button
          onClick={onCancel}
          style={{
            padding: "8px 24px", borderRadius: 12,
            background: "rgba(248,113,113,0.1)", border: "1px solid rgba(248,113,113,0.25)",
            color: "var(--error)", fontSize: "0.8rem", fontWeight: 600, letterSpacing: "0.05em",
            textTransform: "uppercase",
            cursor: "pointer", transition: "all 0.2s",
          }}
          onMouseEnter={(e) => {
            e.target.style.background = "rgba(248,113,113,0.2)";
            e.target.style.transform = "translateY(-1px)";
          }}
          onMouseLeave={(e) => {
            e.target.style.background = "rgba(248,113,113,0.1)";
            e.target.style.transform = "translateY(0)";
          }}
          onMouseDown={(e) => e.target.style.transform = "translateY(1px)"}
        >
          Cancel Operation
        </button>
      )}
    </div>
  );
}
