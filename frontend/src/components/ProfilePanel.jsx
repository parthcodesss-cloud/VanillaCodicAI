import { FiZap, FiTrendingUp, FiAward, FiCalendar } from "react-icons/fi";
import SkillRadar from "./SkillRadar.jsx";
import ActivityHeatmap from "./ActivityHeatmap.jsx";

const LEVEL_COLORS = [
  "#94a3b8", "#60a5fa", "#818cf8", "#a78bfa",
  "#c084fc", "#e879f9", "#f472b6", "#fb7185",
  "#fbbf24", "#34d399",
];

export default function ProfilePanel({ profile }) {
  if (!profile) return null;

  const levelColor = LEVEL_COLORS[Math.min((profile.level || 1) - 1, LEVEL_COLORS.length - 1)];
  const xpInLevel = (profile.xp || 0) % 100;

  return (
    <div className="glass-card animate-fade-in" style={{ padding: "20px", display: "flex", flexDirection: "column", gap: 18 }}>
      {/* Level & XP removed to prevent duplication (now only in header) */}

      {/* Stats Row */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        <StatBox icon={<FiZap size={13} />} label="Sessions" value={profile.totalSessions || 0} color="var(--accent-primary)" />
        <StatBox icon={<FiCalendar size={13} />} label="Fixes" value={profile.totalFixes || 0} color="var(--info)" />
      </div>

      {/* Skill Radar */}
      {profile.radarData && (
        <div>
          <p style={{ fontSize: "0.72rem", color: "var(--text-muted)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 8, textAlign: "center" }}>
            Skill Radar
          </p>
          <SkillRadar radarData={profile.radarData} />
        </div>
      )}

      {/* Weak Areas */}
      {profile.weakSkills && profile.weakSkills.length > 0 && (
        <div>
          <p style={{ fontSize: "0.72rem", color: "var(--text-muted)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 8 }}>
            Focus Areas
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {profile.weakSkills.map((s, i) => (
              <div key={i} style={{
                display: "flex", alignItems: "center", justifyContent: "space-between",
                padding: "8px 12px", borderRadius: 8,
                background: "rgba(248,113,113,0.06)", border: "1px solid rgba(248,113,113,0.12)",
              }}>
                <span style={{ fontSize: "0.78rem", color: "var(--text-secondary)", textTransform: "capitalize" }}>{s.name}</span>
                <span style={{ fontSize: "0.72rem", fontWeight: 700, color: "var(--error)", fontFamily: "var(--font-mono)" }}>{s.score}/100</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Achievements */}
      {profile.achievements && profile.achievements.length > 0 && (
        <div>
          <p style={{ fontSize: "0.72rem", color: "var(--text-muted)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 8 }}>
            Achievements
          </p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {profile.achievements.map((a, i) => (
              <span key={i} title={a.desc} style={{
                padding: "4px 10px", borderRadius: 6,
                background: "rgba(251,191,36,0.08)", border: "1px solid rgba(251,191,36,0.2)",
                fontSize: "0.7rem", fontWeight: 600, color: "var(--warning)", cursor: "default",
              }}>
                🏆 {a.name}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Activity Heatmap removed to prevent duplication */}
    </div>
  );
}

function StatBox({ icon, label, value, color }) {
  return (
    <div style={{
      padding: "10px 12px", borderRadius: 10,
      background: "var(--bg-glass)", border: "1px solid var(--border-glass)",
      textAlign: "center",
    }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 4, marginBottom: 4, color }}>
        {icon}
        <span style={{ fontSize: "0.65rem", fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase" }}>{label}</span>
      </div>
      <span style={{ fontSize: "1rem", fontWeight: 800, color: "var(--text-primary)", fontFamily: "var(--font-mono)" }}>{value}</span>
    </div>
  );
}
