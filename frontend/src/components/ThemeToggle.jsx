import { FiSun, FiMoon } from "react-icons/fi";

export default function ThemeToggle({ theme, setTheme }) {
  const isDark = theme === "dark";

  const toggle = () => {
    const next = isDark ? "light" : "dark";
    setTheme(next);
    document.documentElement.setAttribute("data-theme", next);
    localStorage.setItem("vanillacodic-theme", next);
  };

  return (
    <button
      id="theme-toggle"
      onClick={toggle}
      aria-label={`Switch to ${isDark ? "light" : "dark"} mode`}
      title={`Switch to ${isDark ? "light" : "dark"} mode`}
      style={{
        position: "relative", width: 48, height: 26, borderRadius: 13,
        border: "1.5px solid var(--border-glass)",
        background: isDark
          ? "linear-gradient(135deg, #1e1b4b, #312e81)"
          : "linear-gradient(135deg, #fef3c7, #fde68a)",
        cursor: "pointer", padding: 0,
        transition: "all 0.4s cubic-bezier(0.4, 0, 0.2, 1)",
        display: "flex", alignItems: "center",
        overflow: "hidden",
      }}
    >
      {/* Sliding knob */}
      <div style={{
        position: "absolute",
        top: 2, left: isDark ? 2 : 22,
        width: 20, height: 20, borderRadius: "50%",
        background: isDark
          ? "linear-gradient(135deg, #818cf8, #6366f1)"
          : "linear-gradient(135deg, #f59e0b, #d97706)",
        display: "flex", alignItems: "center", justifyContent: "center",
        transition: "left 0.4s cubic-bezier(0.4, 0, 0.2, 1), background 0.4s ease",
        boxShadow: isDark
          ? "0 2px 8px rgba(99,102,241,0.4)"
          : "0 2px 8px rgba(245,158,11,0.4)",
      }}>
        {isDark ? (
          <FiMoon size={11} color="#fff" />
        ) : (
          <FiSun size={11} color="#fff" />
        )}
      </div>
    </button>
  );
}
