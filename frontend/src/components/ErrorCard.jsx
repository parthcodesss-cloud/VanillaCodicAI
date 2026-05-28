import { FiAlertTriangle, FiAlertOctagon, FiInfo, FiMapPin } from "react-icons/fi";

const SEV = {
  critical: { icon: FiAlertOctagon, cls: "severity-critical", label: "Critical", color: "var(--error)", bg: "rgba(248,113,113,0.06)", border: "rgba(248,113,113,0.15)" },
  warning:  { icon: FiAlertTriangle, cls: "severity-warning", label: "Warning", color: "var(--warning)", bg: "rgba(251,191,36,0.06)", border: "rgba(251,191,36,0.15)" },
  info:     { icon: FiInfo, cls: "severity-info", label: "Info", color: "var(--info)", bg: "rgba(96,165,250,0.06)", border: "rgba(96,165,250,0.15)" },
};
const TYPE = { syntax: "Syntax Error", logical: "Logical Error", runtime: "Runtime Issue" };

export default function ErrorCard({ error }) {
  const c = SEV[error.severity] || SEV.info;
  const Icon = c.icon;
  return (
    <div style={{ padding: "18px 20px", borderRadius: 14, background: c.bg, border: `1px solid ${c.border}`, display: "flex", flexDirection: "column", gap: 12, transition: "transform 0.2s, box-shadow 0.2s" }}
      onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = `0 4px 20px ${c.border}`; }}
      onMouseLeave={e => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "none"; }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <Icon size={18} color={c.color} />
          <span style={{ fontSize: "0.9rem", fontWeight: 700, color: "var(--text-primary)" }}>{error.title}</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {error.line && <span style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "3px 10px", borderRadius: 6, background: "rgba(255,255,255,0.05)", fontSize: "0.72rem", color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}><FiMapPin size={10} /> Line {error.line}</span>}
          <span className={c.cls} style={{ padding: "3px 10px", borderRadius: 6, fontSize: "0.72rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em" }}>{c.label}</span>
          <span style={{ padding: "3px 10px", borderRadius: 6, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", fontSize: "0.72rem", fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase" }}>{TYPE[error.type] || error.type}</span>
        </div>
      </div>
      <p style={{ fontSize: "0.84rem", color: "var(--text-secondary)", lineHeight: 1.7 }}>{error.explanation}</p>
      {error.suggestion && (
        <div style={{ padding: "12px 16px", borderRadius: 10, background: "rgba(99,102,241,0.06)", borderLeft: "3px solid var(--accent-primary)" }}>
          <p style={{ fontSize: "0.78rem", color: "var(--text-muted)", fontWeight: 600, marginBottom: 4 }}>💡 Suggestion</p>
          <p style={{ fontSize: "0.84rem", color: "var(--text-secondary)", lineHeight: 1.6 }}>{error.suggestion}</p>
        </div>
      )}
    </div>
  );
}
