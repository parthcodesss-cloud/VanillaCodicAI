import { useState, useEffect } from "react";
import { 
  FiBookOpen, FiX, FiSearch, FiChevronLeft, 
  FiCode, FiZap, FiCpu 
} from "react-icons/fi";

const API_BASE = import.meta.env.VITE_API_URL ? `${import.meta.env.VITE_API_URL}/api` : "/api";

const cleanDescription = (desc) => {
  if (!desc) return "";
  const index = desc.search(/example\s*1/i);
  if (index !== -1) {
    return desc.substring(0, index).trim();
  }
  return desc;
};

export default function LeetCodeDrawer({ currentLanguage, onLoadTemplate, isSidebarOpen, onStartDuel, onlineUsers = [], onRequestDuel }) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [difficulty, setDifficulty] = useState("all");
  const [problems, setProblems] = useState([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalProblems, setTotalProblems] = useState(0);
  const [selectedProblem, setSelectedProblem] = useState(null);
  const [selectedProblemDetails, setSelectedProblemDetails] = useState(null);
  const [approachData, setApproachData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [approachLoading, setApproachLoading] = useState(false);
  const [showDuelSelector, setShowDuelSelector] = useState(false);
  const [following, setFollowing] = useState([]);
  const [loadingFollowing, setLoadingFollowing] = useState(false);
  const [followingError, setFollowingError] = useState(null);

  // Load problems catalog
  useEffect(() => {
    if (isOpen && !selectedProblem) {
      fetchProblems(1, false);
    }
  }, [isOpen, searchQuery, difficulty, selectedProblem]);

  const fetchProblems = async (pageNum = 1, append = false) => {
    setLoading(true);
    try {
      const url = `${API_BASE}/leetcode/problems?page=${pageNum}&limit=30&q=${encodeURIComponent(searchQuery)}&difficulty=${difficulty}`;
      const res = await fetch(url, { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setProblems(prev => append ? [...prev, ...data.problems] : data.problems);
        setPage(data.page);
        setTotalPages(data.totalPages);
        setTotalProblems(data.total);
      }
    } catch (err) {
      console.error("Error fetching LeetCode problems:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchProblems(1, false);
  };

  const loadMore = () => {
    if (page < totalPages) {
      fetchProblems(page + 1, true);
    }
  };

  const handleSelectProblem = async (problem) => {
    setSelectedProblem(problem);
    setLoading(true);
    setApproachData(null);
    setShowDuelSelector(false);
    try {
      const res = await fetch(`${API_BASE}/leetcode/problems/${problem.frontend_id}`, { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setSelectedProblemDetails(data);
      }
    } catch (err) {
      console.error("Error loading problem details:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchApproach = async () => {
    if (!selectedProblem) return;
    setApproachLoading(true);
    try {
      const res = await fetch(`${API_BASE}/leetcode/problems/${selectedProblem.frontend_id}/approach`, { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setApproachData(data);
      }
    } catch (err) {
      console.error("Error fetching approach:", err);
    } finally {
      setApproachLoading(false);
    }
  };

  const handleLoadBoilerplate = () => {
    if (!selectedProblemDetails) return;
    const snippets = selectedProblemDetails.code_snippets || {};
    
    // Find snippet matching current language
    let template = "";
    let langKey = currentLanguage;
    if (currentLanguage === "python") langKey = "python3";
    if (currentLanguage === "cpp") langKey = "cpp";

    // Attempt exact match, fallback to contains, fallback to first snippet, fallback to generic comments
    const keys = Object.keys(snippets);
    const matchedKey = keys.find(k => k.toLowerCase() === langKey.toLowerCase()) || 
                      keys.find(k => k.toLowerCase().includes(currentLanguage.toLowerCase()));

    if (matchedKey && snippets[matchedKey]) {
      template = snippets[matchedKey];
    } else {
      // Create generic starter code if snippet is not available
      if (currentLanguage === "python") {
        template = `def solve():\n    # LeetCode #${selectedProblemDetails.frontend_id}: ${selectedProblemDetails.title}\n    pass\n`;
      } else if (currentLanguage === "javascript") {
        template = `function solve() {\n    // LeetCode #${selectedProblemDetails.frontend_id}: ${selectedProblemDetails.title}\n}\n`;
      } else if (currentLanguage === "java") {
        template = `class Solution {\n    // LeetCode #${selectedProblemDetails.frontend_id}: ${selectedProblemDetails.title}\n    public void solve() {\n        \n    }\n}\n`;
      } else if (currentLanguage === "cpp") {
        template = `#include <iostream>\nusing namespace std;\n\n// LeetCode #${selectedProblemDetails.frontend_id}: ${selectedProblemDetails.title}\nvoid solve() {\n    \n}\n`;
      }
    }

    onLoadTemplate(template, currentLanguage, selectedProblemDetails);
  };

  const fetchFollowing = async () => {
    setLoadingFollowing(true);
    setFollowingError(null);
    try {
      const res = await fetch(`${API_BASE}/social/following`, { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setFollowing(data.following || []);
      } else {
        setFollowingError("Failed to fetch followed users.");
      }
    } catch (err) {
      console.error("Error fetching followed users:", err);
      setFollowingError("Failed to fetch followed users.");
    } finally {
      setLoadingFollowing(false);
    }
  };

  const handleChallenge = (competitor) => {
    handleLoadBoilerplate();
    if (onStartDuel) {
      onStartDuel(competitor, selectedProblemDetails);
    }
    setIsOpen(false);
  };

  // Helper to color difficulty badges
  const getDifficultyColor = (diff) => {
    switch (diff?.toLowerCase()) {
      case "easy": return "#10b981"; // Emerald
      case "medium": return "#f59e0b"; // Amber
      case "hard": return "#ef4444"; // Red
      default: return "#94a3b8";
    }
  };

  const getDifficultyBg = (diff) => {
    switch (diff?.toLowerCase()) {
      case "easy": return "rgba(16, 185, 129, 0.1)";
      case "medium": return "rgba(245, 158, 11, 0.1)";
      case "hard": return "rgba(239, 68, 68, 0.1)";
      default: return "rgba(148, 163, 184, 0.1)";
    }
  };

  return (
    <>
      {/* Floating Action Button (FAB) shifted to the left of the Social FAB */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={{
          position: "fixed",
          bottom: 24,
          right: isSidebarOpen ? 368 : 88, // Shifted to make space for the Social button
          zIndex: 998,
          width: 52,
          height: 52,
          borderRadius: "50%",
          background: "var(--accent-glow)",
          backgroundImage: "linear-gradient(135deg, #f59e0b, #e11d48)",
          border: "1px solid rgba(255, 255, 255, 0.15)",
          boxShadow: "0 4px 20px rgba(245, 158, 11, 0.3)",
          color: "#fff",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: "pointer",
          transition: "transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275), box-shadow 0.3s, right 0.4s cubic-bezier(0.4, 0, 0.2, 1)",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = "scale(1.1) rotate(-5deg)";
          e.currentTarget.style.boxShadow = "0 8px 30px rgba(245, 158, 11, 0.5)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = "scale(1) rotate(0deg)";
          e.currentTarget.style.boxShadow = "0 4px 20px rgba(245, 158, 11, 0.3)";
        }}
        title="LeetCode Challenges (Starter code & AI Hints)"
      >
        <FiBookOpen size={22} />
      </button>

      {/* Slide-Out Drawer Overlay */}
      {isOpen && (
        <div
          onClick={() => setIsOpen(false)}
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100vw",
            height: "100vh",
            background: "rgba(0,0,0,0.4)",
            backdropFilter: "blur(4px)",
            zIndex: 999,
          }}
        />
      )}

      {/* Drawer Panel */}
      <div
        style={{
          position: "fixed",
          right: 0,
          top: 0,
          height: "100vh",
          width: 400,
          zIndex: 1000,
          background: "rgba(15, 17, 26, 0.9)",
          backdropFilter: "blur(20px)",
          borderLeft: "1px solid rgba(255, 255, 255, 0.08)",
          boxShadow: "-10px 0 30px rgba(0, 0, 0, 0.5)",
          transform: isOpen ? "translateX(0)" : "translateX(100%)",
          transition: "transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
          display: "flex",
          flexDirection: "column",
          color: "#fff",
        }}
      >
        {/* Drawer Header */}
        <div style={{ padding: "20px 24px 16px", borderBottom: "1px solid rgba(255, 255, 255, 0.08)" }}>
          <div style={{ display: "flex", alignItems: "center", justifyConstraint: "space-between", justifyContent: "space-between" }}>
            <h3 style={{ margin: 0, fontSize: 18, fontFamily: "Inter", fontWeight: "600", color: "#f59e0b", display: "flex", alignItems: "center", gap: 8 }}>
              <FiZap /> LeetCode Challenges
            </h3>
            <button
              onClick={() => setIsOpen(false)}
              style={{
                background: "none", border: "none", color: "#94a3b8", cursor: "pointer",
                padding: 4, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center"
              }}
              onMouseEnter={e => e.currentTarget.style.color = "#fff"}
              onMouseLeave={e => e.currentTarget.style.color = "#94a3b8"}
            >
              <FiX size={20} />
            </button>
          </div>
        </div>

        {/* Drawer Body */}
        <div style={{ flex: 1, overflowY: "auto", padding: 24, display: "flex", flexDirection: "column", gap: 20 }}>
          
          {selectedProblem ? (
            /* Selected Problem detailed description view */
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <button
                onClick={() => {
                  setSelectedProblem(null);
                  setSelectedProblemDetails(null);
                  setApproachData(null);
                  setShowDuelSelector(false);
                }}
                style={{
                  background: "none", border: "none", color: "#f59e0b", cursor: "pointer",
                  display: "flex", alignItems: "center", gap: 4, alignSelf: "flex-start", padding: 0,
                  fontSize: 13, fontWeight: "500"
                }}
              >
                <FiChevronLeft size={16} /> Back to List
              </button>

              {/* Title & Difficulty info card */}
              <div style={{
                background: "rgba(255,255,255,0.02)",
                padding: 16,
                borderRadius: 12,
                border: "1px solid rgba(255, 255, 255, 0.05)"
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                  <span style={{ fontSize: 12, fontFamily: "monospace", color: "#94a3b8" }}>
                    #{selectedProblem.frontend_id}
                  </span>
                  <span style={{
                    fontSize: 10,
                    fontWeight: "700",
                    padding: "2px 8px",
                    borderRadius: 4,
                    color: getDifficultyColor(selectedProblem.difficulty),
                    background: getDifficultyBg(selectedProblem.difficulty),
                    textTransform: "uppercase"
                  }}>
                    {selectedProblem.difficulty}
                  </span>
                </div>
                <h4 style={{ margin: 0, fontSize: 16, fontWeight: "600", lineHeight: 1.4 }}>
                  {selectedProblem.title}
                </h4>
              </div>

              {/* Loader for details */}
              {loading ? (
                <div style={{ display: "flex", justifyContent: "center", padding: "40px 0" }}>
                  <div style={{
                    width: 28, height: 28, borderRadius: "50%",
                    border: "2px solid rgba(255,255,255,0.1)",
                    borderTopColor: "#f59e0b",
                    animation: "spin 0.6s linear infinite",
                  }} />
                </div>
              ) : selectedProblemDetails && (
                <>
                  {/* Load Template & Duel mode options */}
                  <div style={{ display: "flex", gap: 10 }}>
                    <button
                      onClick={handleLoadBoilerplate}
                      style={{
                        flex: 1,
                        background: "linear-gradient(135deg, rgba(245, 158, 11, 0.1) 0%, rgba(225, 29, 72, 0.1) 100%)",
                        border: "1px solid rgba(245, 158, 11, 0.3)",
                        borderRadius: 8,
                        color: "#fbd38d",
                        padding: "10px 12px",
                        fontSize: 12,
                        fontWeight: "600",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: 6,
                        transition: "transform 0.2s, background-color 0.2s"
                      }}
                      onMouseEnter={e => {
                        e.currentTarget.style.transform = "translateY(-1px)";
                        e.currentTarget.style.background = "linear-gradient(135deg, rgba(245, 158, 11, 0.2) 0%, rgba(225, 29, 72, 0.2) 100%)";
                      }}
                      onMouseLeave={e => {
                        e.currentTarget.style.transform = "none";
                        e.currentTarget.style.background = "linear-gradient(135deg, rgba(245, 158, 11, 0.1) 0%, rgba(225, 29, 72, 0.1) 100%)";
                      }}
                    >
                      <FiCode /> Load Template
                    </button>

                    <button
                      onClick={() => {
                        if (!showDuelSelector) {
                          fetchFollowing();
                        }
                        setShowDuelSelector(!showDuelSelector);
                      }}
                      style={{
                        flex: 1,
                        background: showDuelSelector
                          ? "linear-gradient(135deg, rgba(239, 68, 68, 0.25) 0%, rgba(168, 85, 247, 0.25) 100%)"
                          : "linear-gradient(135deg, rgba(239, 68, 68, 0.12) 0%, rgba(168, 85, 247, 0.12) 100%)",
                        border: showDuelSelector
                          ? "1px solid rgba(239, 68, 68, 0.6)"
                          : "1px solid rgba(239, 68, 68, 0.35)",
                        borderRadius: 8,
                        color: "#fca5a5",
                        padding: "10px 12px",
                        fontSize: 12,
                        fontWeight: "600",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: 6,
                        transition: "transform 0.2s, background-color 0.2s"
                      }}
                      onMouseEnter={e => {
                        e.currentTarget.style.transform = "translateY(-1px)";
                        e.currentTarget.style.background = "linear-gradient(135deg, rgba(239, 68, 68, 0.22) 0%, rgba(168, 85, 247, 0.22) 100%)";
                      }}
                      onMouseLeave={e => {
                        e.currentTarget.style.transform = "none";
                        e.currentTarget.style.background = showDuelSelector
                          ? "linear-gradient(135deg, rgba(239, 68, 68, 0.25) 0%, rgba(168, 85, 247, 0.25) 100%)"
                          : "linear-gradient(135deg, rgba(239, 68, 68, 0.12) 0%, rgba(168, 85, 247, 0.12) 100%)";
                      }}
                    >
                      ⚔️ Duel Competitor
                    </button>
                  </div>

                  {/* Duel Competitor Selector Dropdown */}
                  {showDuelSelector && (
                    <div style={{
                      background: "rgba(255, 255, 255, 0.02)",
                      border: "1px solid rgba(239, 68, 68, 0.2)",
                      borderRadius: 12,
                      padding: 14,
                      display: "flex",
                      flexDirection: "column",
                      gap: 12
                    }} className="animate-pop-in">
                      {/* Online Players Section */}
                      <div style={{ fontSize: 11, color: "#10b981", textTransform: "uppercase", fontWeight: "700", letterSpacing: "0.05em", display: "flex", alignItems: "center", gap: 6 }}>
                        <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#10b981", display: "inline-block", animation: "pulse 1.5s infinite" }} />
                        Online Players ({onlineUsers.length})
                      </div>

                      {onlineUsers.length === 0 ? (
                        <div style={{ fontSize: 12, color: "#94a3b8", lineHeight: 1.5, padding: "8px 0" }}>
                          No other players are online right now. You can challenge a <strong style={{ color: "#f59e0b" }}>Bot</strong> below!
                        </div>
                      ) : (
                        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                          {onlineUsers.map((player) => (
                            <div
                              key={player.id}
                              style={{
                                display: "flex", alignItems: "center", justifyContent: "space-between",
                                background: "rgba(16, 185, 129, 0.04)", border: "1px solid rgba(16, 185, 129, 0.15)",
                                padding: "8px 10px", borderRadius: 8,
                              }}
                            >
                              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                <div style={{ position: "relative" }}>
                                  <div style={{
                                    width: 28, height: 28, borderRadius: "50%",
                                    background: "linear-gradient(135deg, #10b981, #059669)",
                                    display: "flex", alignItems: "center", justifyContent: "center",
                                    fontSize: 12, fontWeight: "bold", textTransform: "uppercase", color: "#fff",
                                  }}>
                                    {player.name[0]}
                                  </div>
                                  <span style={{
                                    position: "absolute", bottom: -1, right: -1,
                                    width: 10, height: 10, borderRadius: "50%",
                                    background: "#10b981", border: "2px solid rgba(15, 17, 26, 0.9)",
                                  }} />
                                </div>
                                <div>
                                  <span style={{ fontSize: 12, fontWeight: "600", display: "block", color: "#e2e8f0" }}>{player.name}</span>
                                  <span style={{ fontSize: 10, color: "#94a3b8" }}>Lv.{player.level} • @{player.username}</span>
                                </div>
                              </div>
                              <button
                                onClick={() => {
                                  if (onRequestDuel && selectedProblemDetails) {
                                    onRequestDuel(player, selectedProblemDetails);
                                  }
                                }}
                                style={{
                                  background: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
                                  border: "none", borderRadius: 6, color: "#fff",
                                  padding: "5px 10px", fontSize: 11, fontWeight: "700",
                                  cursor: "pointer", boxShadow: "0 2px 8px rgba(16, 185, 129, 0.2)",
                                  transition: "transform 0.1s",
                                }}
                                onMouseEnter={e => e.currentTarget.style.transform = "scale(1.05)"}
                                onMouseLeave={e => e.currentTarget.style.transform = "scale(1)"}
                              >
                                Request Duel ⚔️
                              </button>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Divider */}
                      <div style={{ borderTop: "1px solid rgba(255,255,255,0.06)", margin: "4px 0" }} />

                      {/* Bot / Offline Competitors Section */}
                      <div style={{ fontSize: 11, color: "#fca5a5", textTransform: "uppercase", fontWeight: "700", letterSpacing: "0.05em" }}>
                        🤖 Challenge Bot (Offline)
                      </div>

                      {loadingFollowing ? (
                        <div style={{ display: "flex", justifyContent: "center", padding: "10px 0" }}>
                          <div style={{
                            width: 20, height: 20, borderRadius: "50%",
                            border: "2px solid rgba(255,255,255,0.1)",
                            borderTopColor: "#ef4444",
                            animation: "spin 0.6s linear infinite",
                          }} />
                        </div>
                      ) : followingError ? (
                        <span style={{ fontSize: 12, color: "var(--error)" }}>{followingError}</span>
                      ) : following.length === 0 ? (
                        <div style={{ fontSize: 12, color: "#94a3b8", lineHeight: 1.5 }}>
                          You don't follow any competitors yet. Open the{" "}
                          <strong style={{ color: "#a5b4fc" }}>Coders Arena</strong> (purple icon at the bottom right) to search and follow rivals!
                        </div>
                      ) : (
                        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                          {following.map((competitor) => (
                            <div
                              key={competitor.id}
                              style={{
                                display: "flex", alignItems: "center", justifyContent: "space-between",
                                background: "rgba(255, 255, 255, 0.01)", border: "1px solid rgba(255, 255, 255, 0.04)",
                                padding: "8px 10px", borderRadius: 8,
                              }}
                            >
                              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                <div style={{
                                  width: 28, height: 28, borderRadius: "50%",
                                  background: "linear-gradient(135deg, #ec4899, #a855f7)",
                                  display: "flex", alignItems: "center", justifyContent: "center",
                                  fontSize: 12, fontWeight: "bold", textTransform: "uppercase", color: "#fff",
                                }}>
                                  {competitor.name[0]}
                                </div>
                                <div>
                                  <span style={{ fontSize: 12, fontWeight: "600", display: "block", color: "#e2e8f0" }}>{competitor.name}</span>
                                  <span style={{ fontSize: 10, color: "#94a3b8" }}>Lv.{competitor.level} • @{competitor.username}</span>
                                </div>
                              </div>
                              <button
                                onClick={() => handleChallenge(competitor)}
                                style={{
                                  background: "linear-gradient(135deg, #ef4444 0%, #ec4899 100%)",
                                  border: "none", borderRadius: 6, color: "#fff",
                                  padding: "5px 10px", fontSize: 11, fontWeight: "700",
                                  cursor: "pointer", boxShadow: "0 2px 8px rgba(239, 68, 68, 0.2)",
                                  transition: "transform 0.1s",
                                }}
                                onMouseEnter={e => e.currentTarget.style.transform = "scale(1.05)"}
                                onMouseLeave={e => e.currentTarget.style.transform = "scale(1)"}
                              >
                                Duel Bot 🤖
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Problem Description content */}
                  <div>
                    <h5 style={{ margin: "0 0 8px", fontSize: 13, fontWeight: "600", color: "#94a3b8" }}>Description</h5>
                    <div style={{
                      background: "rgba(255,255,255,0.01)",
                      padding: 16,
                      borderRadius: 12,
                      border: "1px solid rgba(255,255,255,0.02)",
                      display: "flex",
                      flexDirection: "column",
                      gap: 16
                    }}>
                      {/* Description Text */}
                      <div style={{ fontSize: 13, lineHeight: 1.6, color: "#cbd5e1", whiteSpace: "pre-wrap" }}>
                        {cleanDescription(selectedProblemDetails.description) || "No description provided."}
                      </div>

                      {/* Examples */}
                      {selectedProblemDetails.examples && selectedProblemDetails.examples.length > 0 && (
                        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                          {selectedProblemDetails.examples.map((ex, idx) => (
                            <div key={idx}>
                              <div style={{ fontSize: 12, fontWeight: "600", color: "#94a3b8", marginBottom: 6 }}>
                                Example {ex.example_num || (idx + 1)}:
                              </div>
                              <pre style={{
                                margin: 0,
                                padding: "10px 12px",
                                background: "rgba(0, 0, 0, 0.2)",
                                border: "1px solid rgba(255, 255, 255, 0.04)",
                                borderRadius: 8,
                                fontSize: 12,
                                fontFamily: "var(--font-mono)",
                                color: "#cbd5e1",
                                whiteSpace: "pre-wrap",
                                lineHeight: 1.5
                              }}>
                                {ex.example_text}
                              </pre>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Constraints */}
                      {selectedProblemDetails.constraints && selectedProblemDetails.constraints.length > 0 && (
                        <div style={{ borderTop: "1px solid rgba(255,255,255,0.04)", paddingTop: 12 }}>
                          <div style={{ fontSize: 12, fontWeight: "600", color: "#94a3b8", marginBottom: 8 }}>
                            Constraints:
                          </div>
                          <ul style={{ margin: 0, paddingLeft: 16, fontSize: 12, color: "#cbd5e1", display: "flex", flexDirection: "column", gap: 6 }}>
                            {selectedProblemDetails.constraints.map((c, idx) => (
                              <li key={idx} style={{ fontFamily: "var(--font-mono)", lineHeight: 1.4 }}>
                                {c}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Hints and Step-by-Step AI algorithm details (spoilers protected) */}
                  <div style={{ borderTop: "1px solid rgba(255,255,255,0.06)", paddingTop: 16 }}>
                    {!approachData ? (
                      <button
                        onClick={fetchApproach}
                        disabled={approachLoading}
                        style={{
                          width: "100%",
                          background: "rgba(255,255,255,0.03)",
                          border: "1px dashed rgba(255,255,255,0.15)",
                          borderRadius: 8,
                          color: "#94a3b8",
                          padding: "16px",
                          fontSize: 13,
                          cursor: "pointer",
                          display: "flex",
                          flexDirection: "column",
                          alignItems: "center",
                          gap: 8,
                          transition: "color 0.2s, border-color 0.2s, background-color 0.2s"
                        }}
                        onMouseEnter={e => {
                          e.currentTarget.style.background = "rgba(255,255,255,0.05)";
                          e.currentTarget.style.borderColor = "#f59e0b";
                          e.currentTarget.style.color = "#f59e0b";
                        }}
                        onMouseLeave={e => {
                          e.currentTarget.style.background = "rgba(255,255,255,0.03)";
                          e.currentTarget.style.borderColor = "rgba(255,255,255,0.15)";
                          e.currentTarget.style.color = "#94a3b8";
                        }}
                      >
                        {approachLoading ? (
                          <div style={{
                            width: 20, height: 20, borderRadius: "50%",
                            border: "2px solid rgba(255,255,255,0.1)",
                            borderTopColor: "#f59e0b",
                            animation: "spin 0.6s linear infinite",
                          }} />
                        ) : (
                          <>
                            <FiCpu size={20} />
                            <span>Show Approach & Algorithm (No Solutions)</span>
                          </>
                        )}
                      </button>
                    ) : (
                      <div style={{
                        background: "rgba(245, 158, 11, 0.03)",
                        border: "1px solid rgba(245, 158, 11, 0.15)",
                        borderRadius: 10,
                        padding: 16
                      }}>
                        <h5 style={{ margin: "0 0 10px", fontSize: 13, fontWeight: "600", color: "#fbd38d", display: "flex", alignItems: "center", gap: 6 }}>
                          <FiCpu /> Recommended Approach
                        </h5>
                        <div 
                          style={{ 
                            fontSize: 12, 
                            lineHeight: 1.6, 
                            color: "#cbd5e1",
                            whiteSpace: "pre-wrap"
                          }}
                        >
                          {approachData.approach}
                        </div>
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          ) : (
            /* Questions listing View with filters */
            <>
              {/* Search catalog */}
              <form onSubmit={handleSearchSubmit} style={{ display: "flex", gap: 8 }}>
                <div style={{ position: "relative", flex: 1 }}>
                  <FiSearch style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "#64748b" }} size={16} />
                  <input
                    type="text"
                    placeholder="Search by ID or title..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    style={{
                      width: "100%", padding: "10px 12px 10px 36px", borderRadius: 8,
                      background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)",
                      color: "#fff", fontSize: 13, outline: "none", transition: "border 0.2s"
                    }}
                    onFocus={e => e.currentTarget.style.border = "1px solid #f59e0b"}
                    onBlur={e => e.currentTarget.style.border = "1px solid rgba(255,255,255,0.08)"}
                  />
                </div>
                <button
                  type="submit"
                  style={{
                    background: "rgba(245, 158, 11, 0.15)", border: "1px solid rgba(245, 158, 11, 0.3)",
                    borderRadius: 8, color: "#fbd38d", padding: "0 16px", fontSize: 13, cursor: "pointer",
                    transition: "background 0.2s"
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = "rgba(245, 158, 11, 0.3)"}
                  onMouseLeave={e => e.currentTarget.style.background = "rgba(245, 158, 11, 0.15)"}
                >
                  Search
                </button>
              </form>

              {/* Difficulty Quick Filter */}
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {["all", "easy", "medium", "hard"].map((level) => (
                  <button
                    key={level}
                    onClick={() => {
                      setDifficulty(level);
                      setProblems([]);
                      // Fetch will be triggered by useEffect
                    }}
                    style={{
                      padding: "4px 10px",
                      borderRadius: 12,
                      fontSize: 11,
                      fontWeight: "600",
                      cursor: "pointer",
                      border: "1px solid",
                      textTransform: "uppercase",
                      borderColor: difficulty === level ? getDifficultyColor(level) : "rgba(255,255,255,0.06)",
                      background: difficulty === level ? getDifficultyBg(level) : "rgba(255,255,255,0.02)",
                      color: difficulty === level ? getDifficultyColor(level) : "#94a3b8",
                      transition: "all 0.2s"
                    }}
                  >
                    {level}
                  </button>
                ))}
              </div>

              {/* Problems list catalog */}
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <span style={{ fontSize: 11, color: "#64748b", textTransform: "uppercase", fontWeight: "600" }}>
                  Problem Catalog ({totalProblems})
                </span>

                {problems.length === 0 && !loading ? (
                  <div style={{
                    textAlign: "center", padding: "40px 10px", borderRadius: 8,
                    background: "rgba(255,255,255,0.01)", border: "1px dashed rgba(255,255,255,0.05)"
                  }}>
                    <span style={{ fontSize: 12, color: "#64748b" }}>
                      No problems match your query.
                    </span>
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {problems.map((prob) => (
                      <div
                        key={prob.frontend_id}
                        onClick={() => handleSelectProblem(prob)}
                        style={{
                          background: "linear-gradient(135deg, rgba(255,255,255,0.02) 0%, rgba(255,255,255,0.005) 100%)",
                          border: "1px solid rgba(255, 255, 255, 0.04)",
                          padding: "10px 14px",
                          borderRadius: 8,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          cursor: "pointer",
                          transition: "transform 0.2s, border-color 0.2s, background-color 0.2s"
                        }}
                        onMouseEnter={e => {
                          e.currentTarget.style.transform = "translateX(-2px)";
                          e.currentTarget.style.borderColor = "rgba(245, 158, 11, 0.25)";
                          e.currentTarget.style.backgroundColor = "rgba(255, 255, 255, 0.04)";
                        }}
                        onMouseLeave={e => {
                          e.currentTarget.style.transform = "none";
                          e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.04)";
                          e.currentTarget.style.backgroundColor = "rgba(255, 255, 255, 0.02)";
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0, flex: 1 }}>
                          <span style={{ fontSize: 11, fontFamily: "monospace", color: "#64748b" }}>
                            #{prob.frontend_id}
                          </span>
                          <span style={{ fontSize: 13, fontWeight: "500", color: "#e2e8f0", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {prob.title}
                          </span>
                        </div>
                        
                        <span style={{
                          fontSize: 9,
                          fontWeight: "700",
                          padding: "2px 6px",
                          borderRadius: 4,
                          color: getDifficultyColor(prob.difficulty),
                          background: getDifficultyBg(prob.difficulty),
                          textTransform: "uppercase"
                        }}>
                          {prob.difficulty}
                        </span>
                      </div>
                    ))}

                    {/* Loader */}
                    {loading && (
                      <div style={{ display: "flex", justifyContent: "center", padding: "10px 0" }}>
                        <div style={{
                          width: 20, height: 20, borderRadius: "50%",
                          border: "2px solid rgba(255,255,255,0.1)",
                          borderTopColor: "#f59e0b",
                          animation: "spin 0.6s linear infinite",
                        }} />
                      </div>
                    )}

                    {/* Load More Button */}
                    {page < totalPages && !loading && (
                      <button
                        onClick={loadMore}
                        style={{
                          background: "rgba(255,255,255,0.02)",
                          border: "1px solid rgba(255,255,255,0.06)",
                          borderRadius: 6,
                          color: "#94a3b8",
                          fontSize: 12,
                          padding: "8px",
                          cursor: "pointer",
                          transition: "color 0.2s, background-color 0.2s"
                        }}
                        onMouseEnter={e => {
                          e.currentTarget.style.background = "rgba(255,255,255,0.05)";
                          e.currentTarget.style.color = "#fff";
                        }}
                        onMouseLeave={e => {
                          e.currentTarget.style.background = "rgba(255,255,255,0.02)";
                          e.currentTarget.style.color = "#94a3b8";
                        }}
                      >
                        Load More Challenges
                      </button>
                    )}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}
