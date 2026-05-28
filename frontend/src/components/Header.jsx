import { useState, useRef, useEffect } from "react";
import { FiActivity, FiZap, FiLogOut, FiUser, FiChevronDown, FiSettings, FiGift, FiCheck } from "react-icons/fi";
import ThemeToggle from "./ThemeToggle.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import ActivityHeatmap from "./ActivityHeatmap.jsx";
import Logo from "./Logo.jsx";

export default function Header({ profile, theme, setTheme, onOpenSettings, fetchProfile, onStartTest }) {
  const { user, logout } = useAuth();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [dropdownPos, setDropdownPos] = useState({ top: 0, right: 0 });
  const [streakPopoverOpen, setStreakPopoverOpen] = useState(false);
  const [claiming, setClaiming] = useState(false);
  const buttonRef = useRef(null);
  const streakBtnRef = useRef(null);
  const streakPopoverRef = useRef(null);
  const dropdownRef = useRef(null);

  // Close on outside click
  useEffect(() => {
    const handler = (e) => {
      if (dropdownOpen) {
        if (!buttonRef.current?.contains(e.target) && !dropdownRef.current?.contains(e.target)) {
          setDropdownOpen(false);
        }
      }
      if (streakPopoverOpen) {
        if (!streakBtnRef.current?.contains(e.target) && !streakPopoverRef.current?.contains(e.target)) {
          setStreakPopoverOpen(false);
        }
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [dropdownOpen, streakPopoverOpen]);

  const toggleDropdown = () => {
    if (!dropdownOpen && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setDropdownPos({
        top: rect.bottom + 8,
        right: window.innerWidth - rect.right,
      });
    }
    setDropdownOpen(o => !o);
  };

  const initials = user?.name
    ? user.name.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2)
    : "?";

  return (
    <>
      <header style={{
        padding: "16px 24px", display: "flex", alignItems: "center",
        justifyContent: "space-between", maxWidth: "1800px", width: "100%", margin: "0 auto",
        position: "relative", zIndex: 100,
      }}>
        {/* Logo */}
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{
            width: 42, height: 42, borderRadius: 12,
            background: "linear-gradient(135deg, rgba(245, 158, 11, 0.2), rgba(245, 158, 11, 0.05))",
            border: "1px solid rgba(245, 158, 11, 0.3)",
            display: "flex", alignItems: "center", justifyContent: "center",
            boxShadow: "0 4px 15px rgba(245, 158, 11, 0.15)",
          }}>
            <Logo size={28} bracketsColor="var(--accent-primary)" />
          </div>
          <div>
            <h1 style={{ fontSize: "1.35rem", fontWeight: 800, letterSpacing: "-0.02em", lineHeight: 1.1 }}>
              <span className="gradient-text">VanillaCodic</span>
              <span style={{ color: "var(--text-secondary)", fontWeight: 500 }}>AI</span>
            </h1>
            <p style={{ fontSize: "0.7rem", color: "var(--text-muted)", marginTop: 2 }}>
              AI-Powered Adaptive Code Mentor
            </p>
          </div>
        </div>

        {/* Right side */}
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          {/* Vanilla Points Pill */}
          {profile && (
            <div style={{
              display: "flex", alignItems: "center", gap: 6,
              padding: "6px 14px", borderRadius: 20,
              background: "rgba(234,179,8,0.15)", border: "1px solid rgba(234,179,8,0.3)",
              boxShadow: "0 0 10px rgba(234,179,8,0.1)",
            }}>
              <span style={{ fontSize: "14px" }}>🍦</span>
              <span style={{ fontSize: "0.78rem", fontWeight: 700, color: "#eab308", fontFamily: "var(--font-mono)" }}>
                {profile.coins || 0}
              </span>
            </div>
          )}

          {/* XP Pill */}
          {profile && (
            <div style={{
              display: "flex", alignItems: "center", gap: 6,
              padding: "6px 14px", borderRadius: 20,
              background: "rgba(99,102,241,0.1)", border: "1px solid rgba(99,102,241,0.2)",
            }}>
              <FiZap size={13} color="var(--accent-primary)" />
              <span style={{ fontSize: "0.78rem", fontWeight: 700, color: "var(--accent-primary)", fontFamily: "var(--font-mono)" }}>
                {profile.xp || 0} XP
              </span>
              <span style={{
                padding: "1px 6px", borderRadius: 4,
                background: "rgba(99,102,241,0.15)",
                fontSize: "0.65rem", fontWeight: 700, color: "var(--accent-primary)",
              }}>
                Lv.{profile.level || 1}
              </span>
            </div>
          )}

          {/* Streak Button */}
          {profile && profile.currentStreak > 0 && (
            <div style={{ position: "relative" }}>
              <button
                ref={streakBtnRef}
                onClick={() => setStreakPopoverOpen(!streakPopoverOpen)}
                style={{
                  padding: "6px 14px", borderRadius: 20,
                  background: "rgba(251,191,36,0.1)", border: "1px solid rgba(251,191,36,0.2)",
                  fontSize: "0.78rem", color: "var(--warning)", fontWeight: 600,
                  cursor: "pointer", transition: "transform 0.2s, background 0.2s",
                }}
                onMouseOver={e => { e.currentTarget.style.transform = "scale(1.05)"; e.currentTarget.style.background = "rgba(251,191,36,0.15)"; }}
                onMouseOut={e => { e.currentTarget.style.transform = "scale(1)"; e.currentTarget.style.background = "rgba(251,191,36,0.1)"; }}
              >
                🔥 {profile.currentStreak}d streak
              </button>

              {/* Streak Calendar Popover */}
              {streakPopoverOpen && (
                <div
                  ref={streakPopoverRef}
                  className="glass-card animate-pop-in"
                  style={{
                    position: "absolute", top: "calc(100% + 12px)", right: 0,
                    width: 320, padding: 16, zIndex: 10000,
                    boxShadow: "0 12px 40px rgba(0,0,0,0.5), 0 0 0 1px rgba(251,191,36,0.2)",
                  }}
                >
                  <h3 style={{ fontSize: "0.9rem", fontWeight: 700, margin: "0 0 12px", color: "var(--text-primary)" }}>Activity Calendar</h3>
                  
                  <div style={{ margin: "0 -8px 12px" }}>
                    <ActivityHeatmap profile={profile} hideTitle={true} />
                  </div>

                  {profile.claimAvailable ? (
                    <button
                      className="btn-glow animate-pulse-glow"
                      style={{ width: "100%", padding: "8px", fontSize: "0.85rem", background: "linear-gradient(135deg, #f59e0b, #fbbf24)" }}
                      disabled={claiming}
                      onClick={async () => {
                        setClaiming(true);
                        try {
                          const API_BASE = import.meta.env.VITE_API_URL ? `${import.meta.env.VITE_API_URL}/api` : "/api";
                          const res = await fetch(`${API_BASE}/profile/claim`, {
                            method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include"
                          });
                          if (res.ok) fetchProfile?.();
                        } catch { /* ignore */ }
                        setClaiming(false);
                      }}
                    >
                      <FiGift size={16} /> {claiming ? "Claiming..." : "Claim Daily Vanilla Points"}
                    </button>
                  ) : (
                    <div style={{
                      width: "100%", padding: "8px", fontSize: "0.85rem", borderRadius: 8,
                      background: "rgba(34,197,94,0.1)", color: "var(--success)", fontWeight: 600,
                      display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                    }}>
                      <FiCheck size={16} /> Claimed today
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {profile && (
            <button
              onClick={onStartTest}
              style={{
                display: "flex", alignItems: "center", gap: 6,
                padding: "6px 14px", borderRadius: 20,
                background: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.2)",
                fontSize: "0.78rem", color: "#10b981", fontWeight: 700,
                cursor: "pointer", transition: "all 0.2s"
              }}
              onMouseEnter={e => { e.currentTarget.style.transform = "scale(1.05)"; e.currentTarget.style.background = "rgba(16,185,129,0.15)"; }}
              onMouseLeave={e => { e.currentTarget.style.transform = "scale(1)"; e.currentTarget.style.background = "rgba(16,185,129,0.1)"; }}
            >
              📝 Take Test
            </button>
          )}

          <ThemeToggle theme={theme} setTheme={setTheme} />

          {/* User Avatar Button */}
          {user && (
            <button
              ref={buttonRef}
              onClick={toggleDropdown}
              style={{
                display: "flex", alignItems: "center", gap: 8,
                padding: "6px 12px 6px 6px", borderRadius: 20,
                background: "var(--bg-card)", border: `1px solid ${dropdownOpen ? "rgba(99,102,241,0.5)" : "var(--border-primary)"}`,
                cursor: "pointer", transition: "all 0.2s",
              }}
              onMouseOver={e => e.currentTarget.style.borderColor = "rgba(99,102,241,0.4)"}
              onMouseOut={e => { if (!dropdownOpen) e.currentTarget.style.borderColor = "var(--border-primary)"; }}
            >
              {user.avatar_url ? (
                <img
                  src={user.avatar_url}
                  alt={user.name}
                  style={{ width: 28, height: 28, borderRadius: "50%", objectFit: "cover" }}
                />
              ) : (
                <div style={{
                  width: 28, height: 28, borderRadius: "50%",
                  background: "var(--gradient-primary)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: "0.7rem", fontWeight: 700, color: "#fff",
                }}>
                  {initials}
                </div>
              )}
              <span style={{
                fontSize: "0.82rem", fontWeight: 600, color: "var(--text-primary)",
                maxWidth: 100, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
              }}>
                {user.name || user.email}
              </span>
              <FiChevronDown size={13} color="var(--text-muted)" style={{
                transform: dropdownOpen ? "rotate(180deg)" : "none", transition: "transform 0.2s",
              }} />
            </button>
          )}
        </div>
      </header>

      {/* Dropdown — rendered as fixed so it escapes any stacking context / overflow */}
      {dropdownOpen && (
        <div
          ref={dropdownRef}
          style={{
            position: "fixed",
            top: dropdownPos.top,
            right: dropdownPos.right,
            background: "var(--bg-secondary)",
            border: "1px solid var(--border-primary)",
            borderRadius: 14, padding: 8, minWidth: 210,
            boxShadow: "0 12px 40px rgba(0,0,0,0.5), 0 0 0 1px rgba(99,102,241,0.1)",
            zIndex: 10000,
            backdropFilter: "blur(20px)",
            WebkitBackdropFilter: "blur(20px)",
          }}
        >
          {/* User info */}
          <div style={{ padding: "8px 12px 10px", borderBottom: "1px solid var(--border-primary)", marginBottom: 6 }}>
            <div style={{ fontSize: "0.85rem", fontWeight: 700, color: "var(--text-primary)" }}>
              {user.name || "User"}
            </div>
            <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: 2 }}>
              {user.email}
            </div>
            {user?.phone && (
              <div style={{ fontSize: "0.72rem", color: "var(--text-muted)", marginTop: 2 }}>
                {user.phone}
              </div>
            )}
          </div>

          {/* Settings */}
          <DropdownItem
            icon={<FiSettings size={15} />}
            label="Settings"
            onClick={() => { onOpenSettings?.(); setDropdownOpen(false); }}
          />

          {/* Logout */}
          <DropdownItem
            icon={<FiLogOut size={15} />}
            label="Sign out"
            color="var(--error)"
            hoverBg="rgba(239,68,68,0.08)"
            onClick={() => { logout(); setDropdownOpen(false); }}
          />
        </div>
      )}
    </>
  );
}

function DropdownItem({ icon, label, onClick, color = "var(--text-secondary)", hoverBg = "var(--bg-secondary)" }) {
  return (
    <button
      onClick={onClick}
      style={{
        width: "100%", display: "flex", alignItems: "center", gap: 8,
        padding: "9px 12px", borderRadius: 9, border: "none",
        background: "none", cursor: "pointer", color,
        fontSize: "0.84rem", fontWeight: 500, textAlign: "left",
        transition: "background 0.15s",
      }}
      onMouseOver={e => e.currentTarget.style.background = hoverBg}
      onMouseOut={e => e.currentTarget.style.background = "none"}
    >
      {icon} {label}
    </button>
  );
}
