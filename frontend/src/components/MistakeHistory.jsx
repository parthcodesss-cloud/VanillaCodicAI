import { FiClock, FiRepeat, FiAlertCircle } from "react-icons/fi";

export default function MistakeHistory({ personalization }) {
  if (!personalization) return null;

  const { similarSessions, repeatedMistakes } = personalization;
  const hasSimilar = similarSessions && similarSessions.length > 0;
  const hasRepeated = repeatedMistakes && repeatedMistakes.length > 0;

  if (!hasSimilar && !hasRepeated) return null;

  return (
    <div className="animate-fade-in-up" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {/* Similar Past Sessions */}
      {hasSimilar && (
        <div style={{
          padding: "16px 18px", borderRadius: 12,
          background: "rgba(99,102,241,0.05)",
          border: "1px solid rgba(99,102,241,0.12)",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
            <FiClock size={14} color="var(--accent-primary)" />
            <p style={{ fontSize: "0.78rem", color: "var(--accent-primary)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.04em" }}>
              You've seen this before
            </p>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {similarSessions.map((s, i) => (
              <div key={i} style={{
                display: "flex", alignItems: "flex-start", gap: 10,
                padding: "10px 14px", borderRadius: 8,
                background: "rgba(255,255,255,0.02)",
                border: "1px solid rgba(255,255,255,0.05)",
              }}>
                <span style={{
                  flexShrink: 0, padding: "2px 8px", borderRadius: 6,
                  background: "rgba(99,102,241,0.12)", fontSize: "0.7rem",
                  fontWeight: 700, color: "var(--accent-primary)",
                  fontFamily: "var(--font-mono)",
                }}>
                  {s.similarity}%
                </span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: "0.8rem", color: "var(--text-secondary)", lineHeight: 1.5 }}>
                    {s.summary || "Previous debugging session"}
                  </p>
                  {s.errorTitles && s.errorTitles.length > 0 && (
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginTop: 6 }}>
                      {s.errorTitles.map((title, j) => (
                        <span key={j} style={{
                          padding: "2px 8px", borderRadius: 4,
                          background: "rgba(248,113,113,0.08)",
                          border: "1px solid rgba(248,113,113,0.15)",
                          fontSize: "0.68rem", color: "var(--error)",
                        }}>
                          {title}
                        </span>
                      ))}
                    </div>
                  )}
                  <p style={{ fontSize: "0.68rem", color: "var(--text-muted)", marginTop: 4 }}>
                    {s.language} • {new Date(s.timestamp).toLocaleDateString()}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Repeated Mistakes */}
      {hasRepeated && (
        <div style={{
          padding: "16px 18px", borderRadius: 12,
          background: "rgba(251,191,36,0.05)",
          border: "1px solid rgba(251,191,36,0.12)",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
            <FiRepeat size={14} color="var(--warning)" />
            <p style={{ fontSize: "0.78rem", color: "var(--warning)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.04em" }}>
              Patterns to watch
            </p>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {repeatedMistakes.map((m, i) => (
              <div key={i} style={{
                display: "flex", alignItems: "center", justifyContent: "space-between",
                padding: "8px 12px", borderRadius: 8,
                background: "rgba(255,255,255,0.02)",
              }}>
                <span style={{ fontSize: "0.8rem", color: "var(--text-secondary)", textTransform: "capitalize" }}>
                  {m.mistake.replace(/^[^:]+:/, "")}
                </span>
                <span style={{
                  padding: "2px 8px", borderRadius: 6,
                  background: m.count >= 3 ? "rgba(248,113,113,0.12)" : "rgba(251,191,36,0.12)",
                  fontSize: "0.72rem", fontWeight: 700,
                  color: m.count >= 3 ? "var(--error)" : "var(--warning)",
                  fontFamily: "var(--font-mono)",
                }}>
                  {m.count}x
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
