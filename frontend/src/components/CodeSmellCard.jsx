import { FiAlertTriangle } from "react-icons/fi";

export default function CodeSmellCard({ smell }) {
  return (
    <div style={{
      padding: "14px 18px", borderRadius: 12,
      background: "rgba(251,191,36,0.04)",
      border: "1px solid rgba(251,191,36,0.1)",
      display: "flex", flexDirection: "column", gap: 8,
      transition: "transform 0.2s, box-shadow 0.2s",
    }}
      onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-1px)"; e.currentTarget.style.boxShadow = "0 2px 12px rgba(251,191,36,0.1)"; }}
      onMouseLeave={e => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "none"; }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <FiAlertTriangle size={14} color="var(--warning)" />
        <span style={{ fontSize: "0.85rem", fontWeight: 700, color: "var(--text-primary)" }}>
          {smell.title}
        </span>
        <span style={{
          marginLeft: "auto", padding: "2px 8px", borderRadius: 4,
          background: "rgba(251,191,36,0.1)", border: "1px solid rgba(251,191,36,0.2)",
          fontSize: "0.65rem", fontWeight: 600, color: "var(--warning)", textTransform: "uppercase",
        }}>
          Code Smell
        </span>
      </div>
      <p style={{ fontSize: "0.82rem", color: "var(--text-secondary)", lineHeight: 1.6 }}>
        {smell.explanation}
      </p>
      {smell.suggestion && (
        <div style={{
          padding: "10px 14px", borderRadius: 8,
          background: "rgba(99,102,241,0.05)",
          borderLeft: "3px solid var(--accent-primary)",
        }}>
          <p style={{ fontSize: "0.78rem", color: "var(--text-secondary)", lineHeight: 1.5 }}>
            💡 {smell.suggestion}
          </p>
        </div>
      )}
    </div>
  );
}
