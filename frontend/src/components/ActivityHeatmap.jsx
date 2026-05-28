import { useMemo } from "react";

export default function ActivityHeatmap({ profile, hideTitle }) {
  const activityMap = profile?.activityMap || {};
  const longestStreak = profile?.longestStreak || 0;

  const { calendarGrid, totalSessions, activeDays, currentMonthName } = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const year = today.getFullYear();
    const month = today.getMonth();
    const currentMonthName = today.toLocaleString('default', { month: 'long', year: 'numeric' });

    let tSessions = 0;
    let aDays = 0;

    // Calculate total sessions from all time for the stats (optional, or just for this month)
    // Let's calculate for all time just to keep the stats accurate
    Object.values(activityMap).forEach(count => {
      if (count > 0) {
        aDays++;
        tSessions += count;
      }
    });

    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const firstDayOfWeek = new Date(year, month, 1).getDay();

    const grid = [];
    let week = [];

    // Padding for first week
    for (let i = 0; i < firstDayOfWeek; i++) {
      week.push(null);
    }

    for (let day = 1; day <= daysInMonth; day++) {
      const currentD = new Date(year, month, day);
      const offset = currentD.getTimezoneOffset() * 60000;
      const dateStr = (new Date(currentD.getTime() - offset)).toISOString().slice(0, 10);

      const count = activityMap[dateStr] || 0;
      const isToday = currentD.getTime() === today.getTime();
      const isFuture = currentD > today;

      week.push({
        dayNumber: day,
        dateStr,
        count,
        isToday,
        isFuture
      });

      if (week.length === 7) {
        grid.push(week);
        week = [];
      }
    }

    // Padding for last week
    if (week.length > 0) {
      while (week.length < 7) {
        week.push(null);
      }
      grid.push(week);
    }

    return { calendarGrid: grid, totalSessions: tSessions, activeDays: aDays, currentMonthName };
  }, [activityMap]);

  const WEEKDAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

  return (
    <div style={{
      background: "var(--bg-card)",
      borderRadius: 16, padding: "16px",
      border: "1px solid var(--border-glass)",
      boxShadow: "0 4px 20px rgba(0,0,0,0.2)",
    }}>
      {/* Header Stats (if not hidden) */}
      {!hideTitle && (
        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 16 }}>
          <div>
            <span style={{ fontSize: "1.4rem", fontWeight: 800, color: "var(--accent-primary)" }}>{totalSessions}</span>
            <span style={{ fontSize: "0.85rem", color: "var(--text-muted)", marginLeft: 6 }}>total debug sessions</span>
          </div>
          <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", display: "flex", gap: 16 }}>
            <span>Active days: <strong style={{ color: "var(--text-primary)" }}>{activeDays}</strong></span>
            <span>Max streak: <strong style={{ color: "var(--warning)" }}>{longestStreak} 🔥</strong></span>
          </div>
        </div>
      )}

      {/* Calendar Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <h4 style={{ fontSize: "0.9rem", fontWeight: 700, color: "var(--text-primary)" }}>{currentMonthName}</h4>
        <div style={{ fontSize: "0.7rem", color: "var(--accent-primary)", background: "var(--accent-glow)", padding: "2px 8px", borderRadius: 12, fontWeight: 600 }}>
          {activeDays} Active Days
        </div>
      </div>

      {/* Weekdays */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 6, marginBottom: 8 }}>
        {WEEKDAYS.map(d => (
          <div key={d} style={{ textAlign: "center", fontSize: "0.7rem", fontWeight: 600, color: "var(--text-muted)" }}>
            {d}
          </div>
        ))}
      </div>

      {/* Grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 6 }}>
        {calendarGrid.map((week, wIndex) =>
          week.map((day, dIndex) => {
            if (!day) {
              return <div key={`${wIndex}-${dIndex}`} style={{ aspectRatio: "1/1" }} />;
            }

            const hasActivity = day.count > 0;
            const bg = hasActivity
              ? (day.count >= 5 ? "var(--accent-primary)" : "var(--accent-glow)")
              : "rgba(255,255,255,0.02)";
            const color = hasActivity ? (day.count >= 5 ? "#fff" : "var(--accent-primary)") : "var(--text-muted)";
            const border = day.isToday
              ? "1px solid var(--info)"
              : hasActivity ? "1px solid var(--border-glow)" : "1px solid transparent";

            return (
              <div
                key={day.dateStr}
                title={hasActivity ? `${day.count} sessions on ${day.dateStr}` : day.dateStr}
                className="animate-pop-in"
                style={{
                  aspectRatio: "1/1",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: "0.75rem", fontWeight: hasActivity ? 700 : 500,
                  borderRadius: 8, background: bg, color, border,
                  cursor: hasActivity ? "pointer" : "default",
                  opacity: day.isFuture ? 0.3 : 1,
                  transition: "all 0.2s",
                  boxShadow: hasActivity && day.count >= 5 ? "0 0 10px var(--border-glow)" : "none",
                  animationDelay: `${(wIndex * 7 + dIndex) * 0.01}s`,
                }}
                onMouseEnter={e => {
                  if (hasActivity || day.isToday) {
                    e.currentTarget.style.transform = "scale(1.15) translateY(-2px)";
                    e.currentTarget.style.boxShadow = "0 4px 12px var(--border-glow)";
                  }
                }}
                onMouseLeave={e => {
                  if (hasActivity || day.isToday) {
                    e.currentTarget.style.transform = "scale(1) translateY(0)";
                    e.currentTarget.style.boxShadow = hasActivity && day.count >= 5 ? "0 0 10px var(--border-glow)" : "none";
                  }
                }}
              >
                {day.dayNumber}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
