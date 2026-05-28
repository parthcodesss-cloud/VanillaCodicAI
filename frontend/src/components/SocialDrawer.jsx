import { useState, useEffect } from "react";
import { 
  FiUsers, FiX, FiSearch, FiUserPlus, FiUserMinus, 
  FiCopy, FiCheck, FiChevronLeft, FiAward, FiZap 
} from "react-icons/fi";
import { Radar } from "react-chartjs-2";
import {
  Chart as ChartJS,
  RadialLinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
  Legend
} from "chart.js";

ChartJS.register(RadialLinearScale, PointElement, LineElement, Filler, Tooltip, Legend);

const API_BASE = import.meta.env.VITE_API_URL ? `${import.meta.env.VITE_API_URL}/api` : "/api";

export default function SocialDrawer({ currentUser, myProfile, isSidebarOpen }) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [following, setFollowing] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [selectedUserStats, setSelectedUserStats] = useState(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  // Load following list when drawer opens
  useEffect(() => {
    if (isOpen) {
      fetchFollowing();
    }
  }, [isOpen]);

  const fetchFollowing = async () => {
    try {
      const res = await fetch(`${API_BASE}/social/following`, { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setFollowing(data.following || []);
      }
    } catch (err) {
      console.error("Error fetching following:", err);
    }
  };

  const handleSearch = async (e) => {
    e?.preventDefault();
    if (!searchQuery.trim()) return;
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/social/search?q=${encodeURIComponent(searchQuery)}`, { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setSearchResults(data.users || []);
      }
    } catch (err) {
      console.error("Error searching:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleFollow = async (id, isSearchCard = false) => {
    try {
      const res = await fetch(`${API_BASE}/social/follow`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ followingId: id }),
      });
      if (res.ok) {
        // Toggle in search results
        if (isSearchCard) {
          setSearchResults(prev =>
            prev.map(u => u.id === id ? { ...u, isFollowing: true } : u)
          );
        }
        fetchFollowing();
      }
    } catch (err) {
      console.error("Error following:", err);
    }
  };

  const handleUnfollow = async (id, isSearchCard = false) => {
    try {
      const res = await fetch(`${API_BASE}/social/unfollow`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ followingId: id }),
      });
      if (res.ok) {
        // Toggle in search results
        if (isSearchCard) {
          setSearchResults(prev =>
            prev.map(u => u.id === id ? { ...u, isFollowing: false } : u)
          );
        }
        // If viewing stats of this user, clear or refresh
        if (selectedUser && selectedUser.id === id) {
          setSelectedUser(null);
          setSelectedUserStats(null);
        }
        fetchFollowing();
      }
    } catch (err) {
      console.error("Error unfollowing:", err);
    }
  };

  const viewUserStats = async (user) => {
    setSelectedUser(user);
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/social/user/${user.id}/stats`, { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setSelectedUserStats(data);
      }
    } catch (err) {
      console.error("Error loading user stats:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleCopyTag = () => {
    if (currentUser?.username) {
      navigator.clipboard.writeText(`@${currentUser.username}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // Compile comparison radar chart data
  const getComparisonChartData = () => {
    if (!myProfile || !selectedUserStats) return null;
    
    // Fallback if myProfile has no radar data
    const myScores = myProfile.radarData ? myProfile.radarData.data : [50, 50, 50, 50, 50, 50];
    const theirScores = selectedUserStats.radarData ? selectedUserStats.radarData.data : [50, 50, 50, 50, 50, 50];
    const labels = myProfile.radarData ? myProfile.radarData.labels : ["Syntax", "Logic", "Runtime", "Error Handling", "Data Structures", "Async"];

    return {
      labels,
      datasets: [
        {
          label: "You",
          data: myScores,
          backgroundColor: "rgba(99, 102, 241, 0.15)",
          borderColor: "rgba(129, 140, 248, 0.8)",
          borderWidth: 2,
          pointBackgroundColor: "rgba(129, 140, 248, 1)",
          pointBorderColor: "#12121a",
          pointRadius: 3,
        },
        {
          label: selectedUser.name.split(" ")[0],
          data: theirScores,
          backgroundColor: "rgba(236, 72, 153, 0.15)",
          borderColor: "rgba(236, 72, 153, 0.8)",
          borderWidth: 2,
          pointBackgroundColor: "rgba(236, 72, 153, 1)",
          pointBorderColor: "#12121a",
          pointRadius: 3,
        }
      ]
    };
  };

  const comparisonChartData = getComparisonChartData();

  const radarOptions = {
    responsive: true,
    maintainAspectRatio: true,
    plugins: { 
      legend: { 
        display: true,
        labels: { color: "rgba(255, 255, 255, 0.8)", font: { size: 10, family: "Inter" } }
      },
      tooltip: { enabled: true }
    },
    scales: {
      r: {
        beginAtZero: true,
        suggestedMin: 0,
        suggestedMax: 100,
        max: 100,
        min: 0,
        ticks: { stepSize: 25, display: false },
        grid: { color: "rgba(255, 255, 255, 0.06)" },
        angleLines: { color: "rgba(255, 255, 255, 0.06)" },
        pointLabels: {
          color: "rgba(148, 163, 184, 0.9)",
          font: { size: 9, family: "Inter", weight: "500" },
        },
      },
    },
  };

  return (
    <>
      {/* Floating Action Button (FAB) */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={{
          position: "fixed",
          bottom: 24,
          right: isSidebarOpen ? 304 : 24,
          zIndex: 998,
          width: 52,
          height: 52,
          borderRadius: "50%",
          background: "var(--accent-glow)",
          backgroundImage: "linear-gradient(135deg, #6366f1, #a855f7)",
          border: "1px solid rgba(255, 255, 255, 0.15)",
          boxShadow: "0 4px 20px rgba(99, 102, 241, 0.4)",
          color: "#fff",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: "pointer",
          transition: "transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275), box-shadow 0.3s, right 0.4s cubic-bezier(0.4, 0, 0.2, 1)",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = "scale(1.1) rotate(5deg)";
          e.currentTarget.style.boxShadow = "0 8px 30px rgba(99, 102, 241, 0.6)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = "scale(1) rotate(0deg)";
          e.currentTarget.style.boxShadow = "0 4px 20px rgba(99, 102, 241, 0.4)";
        }}
        title="Coders Arena (Social & Competitors)"
      >
        <FiUsers size={22} />
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
          width: 380,
          zIndex: 1000,
          background: "rgba(15, 17, 26, 0.88)",
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
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
            <h3 style={{ margin: 0, fontSize: 18, fontFamily: "Inter", fontWeight: "600", color: "#e2e8f0" }}>
              Coders Arena
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

          {/* User's unique ID block */}
          {currentUser && (
            <div style={{
              background: "rgba(255, 255, 255, 0.03)",
              padding: "10px 14px",
              borderRadius: 8,
              border: "1px solid rgba(255, 255, 255, 0.05)",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between"
            }}>
              <div>
                <span style={{ fontSize: 11, color: "#64748b", display: "block" }}>Your Medic Tag</span>
                <span style={{ fontSize: 14, fontFamily: "monospace", color: "#a5b4fc", fontWeight: "600" }}>
                  @{currentUser.username}
                </span>
              </div>
              <button
                onClick={handleCopyTag}
                title="Copy tag"
                style={{
                  background: "none", border: "none", color: copied ? "#10b981" : "#818cf8", cursor: "pointer",
                  display: "flex", alignItems: "center", padding: 6, borderRadius: 4, transition: "background 0.2s"
                }}
                onMouseEnter={e => e.currentTarget.style.background = "rgba(255, 255, 255, 0.05)"}
                onMouseLeave={e => e.currentTarget.style.background = "none"}
              >
                {copied ? <FiCheck size={16} /> : <FiCopy size={16} />}
              </button>
            </div>
          )}
        </div>

        {/* Drawer Body */}
        <div style={{ flex: 1, overflowY: "auto", padding: 24, display: "flex", flexDirection: "column", gap: 20 }}>
          
          {selectedUser ? (
            /* User Detailed Stats / Comparison View */
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <button
                onClick={() => {
                  setSelectedUser(null);
                  setSelectedUserStats(null);
                }}
                style={{
                  background: "none", border: "none", color: "#818cf8", cursor: "pointer",
                  display: "flex", alignItems: "center", gap: 4, alignSelf: "flex-start", padding: 0,
                  fontSize: 13, fontWeight: "500"
                }}
              >
                <FiChevronLeft size={16} /> Back to Arena
              </button>

              {/* Followed User Header Profile card */}
              <div style={{
                background: "linear-gradient(135deg, rgba(255, 255, 255, 0.03) 0%, rgba(255, 255, 255, 0.01) 100%)",
                borderRadius: 12,
                border: "1px solid rgba(255, 255, 255, 0.06)",
                padding: 16,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                textAlign: "center"
              }}>
                <div style={{
                  width: 60, height: 60, borderRadius: "50%",
                  background: "linear-gradient(135deg, #ec4899, #f43f5e)",
                  color: "#fff", display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 22, fontWeight: "bold", marginBottom: 12, textTransform: "uppercase",
                  boxShadow: "0 4px 12px rgba(236, 72, 153, 0.3)"
                }}>
                  {selectedUser.name[0]}
                </div>
                <h4 style={{ margin: "0 0 4px", fontSize: 16, fontWeight: "600" }}>{selectedUser.name}</h4>
                <span style={{ fontSize: 13, fontFamily: "monospace", color: "#f43f5e", marginBottom: 10, display: "block" }}>
                  @{selectedUser.username}
                </span>

                {selectedUserStats && (
                  <div style={{ display: "flex", alignItems: "center", gap: 8, background: "rgba(236, 72, 153, 0.08)", padding: "4px 10px", borderRadius: 12, border: "1px solid rgba(236, 72, 153, 0.15)", marginBottom: 14 }}>
                    <FiAward style={{ color: "#ec4899" }} size={15} />
                    <span style={{ fontSize: 12, color: "#fda4af", fontWeight: "600" }}>
                      Lv. {selectedUserStats.level} • {selectedUserStats.levelTitle}
                    </span>
                  </div>
                )}

                <button
                  onClick={() => handleUnfollow(selectedUser.id)}
                  style={{
                    background: "rgba(239, 68, 68, 0.1)",
                    border: "1px solid rgba(239, 68, 68, 0.2)",
                    borderRadius: 6, color: "#f87171", cursor: "pointer",
                    fontSize: 12, padding: "5px 12px", transition: "background 0.2s"
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = "rgba(239, 68, 68, 0.2)"}
                  onMouseLeave={e => e.currentTarget.style.background = "rgba(239, 68, 68, 0.1)"}
                >
                  Unfollow
                </button>
              </div>

              {loading ? (
                <div style={{ display: "flex", justifyContent: "center", padding: "40px 0" }}>
                  <div style={{
                    width: 28, height: 28, borderRadius: "50%",
                    border: "2px solid rgba(255,255,255,0.1)",
                    borderTopColor: "#ec4899",
                    animation: "spin 0.6s linear infinite",
                  }} />
                </div>
              ) : selectedUserStats && (
                <>
                  {/* Public Stats Stats Grid */}
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                    <div style={{ background: "rgba(255,255,255,0.02)", padding: 12, borderRadius: 8, border: "1px solid rgba(255,255,255,0.04)" }}>
                      <span style={{ fontSize: 10, color: "#64748b", display: "block", textTransform: "uppercase" }}>Total XP</span>
                      <span style={{ fontSize: 16, fontWeight: "700", color: "#e2e8f0" }}>{selectedUserStats.xp} XP</span>
                    </div>
                    <div style={{ background: "rgba(255,255,255,0.02)", padding: 12, borderRadius: 8, border: "1px solid rgba(255,255,255,0.04)" }}>
                      <span style={{ fontSize: 10, color: "#64748b", display: "block", textTransform: "uppercase" }}>Vanilla Points</span>
                      <span style={{ fontSize: 16, fontWeight: "700", color: "#fbbf24" }}>🍦 {selectedUserStats.coins}</span>
                    </div>
                    <div style={{ background: "rgba(255,255,255,0.02)", padding: 12, borderRadius: 8, border: "1px solid rgba(255,255,255,0.04)" }}>
                      <span style={{ fontSize: 10, color: "#64748b", display: "block", textTransform: "uppercase" }}>Daily Streak</span>
                      <span style={{ fontSize: 16, fontWeight: "700", color: "#f97316" }}>🔥 {selectedUserStats.currentStreak} days</span>
                    </div>
                    <div style={{ background: "rgba(255,255,255,0.02)", padding: 12, borderRadius: 8, border: "1px solid rgba(255,255,255,0.04)" }}>
                      <span style={{ fontSize: 10, color: "#64748b", display: "block", textTransform: "uppercase" }}>Debug & Fixes</span>
                      <span style={{ fontSize: 16, fontWeight: "700", color: "#34d399" }}>🩺 {selectedUserStats.totalSessions + selectedUserStats.totalFixes}</span>
                    </div>
                  </div>

                  {/* Skills Radar Comparison Chart */}
                  <div style={{ marginTop: 8 }}>
                    <h5 style={{ margin: "0 0 12px", fontSize: 13, fontWeight: "600", color: "#94a3b8", textAlign: "center" }}>
                      Skill Overlays: You vs. {selectedUser.name.split(" ")[0]}
                    </h5>
                    {comparisonChartData && (
                      <div style={{ background: "rgba(255,255,255,0.01)", padding: 12, borderRadius: 12, border: "1px solid rgba(255,255,255,0.03)" }}>
                        <Radar data={comparisonChartData} options={radarOptions} />
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          ) : (
            /* Search and Follow list UI */
            <>
              {/* Search Competitors */}
              <form onSubmit={handleSearch} style={{ display: "flex", gap: 8 }}>
                <div style={{ position: "relative", flex: 1 }}>
                  <FiSearch style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "#64748b" }} size={16} />
                  <input
                    type="text"
                    placeholder="Search by name or Medic tag..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    style={{
                      width: "100%", padding: "10px 12px 10px 36px", borderRadius: 8,
                      background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)",
                      color: "#fff", fontSize: 13, outline: "none", transition: "border 0.2s"
                    }}
                    onFocus={e => e.currentTarget.style.border = "1px solid #6366f1"}
                    onBlur={e => e.currentTarget.style.border = "1px solid rgba(255,255,255,0.08)"}
                  />
                </div>
                <button
                  type="submit"
                  style={{
                    background: "rgba(99, 102, 241, 0.15)", border: "1px solid rgba(99, 102, 241, 0.3)",
                    borderRadius: 8, color: "#a5b4fc", padding: "0 16px", fontSize: 13, cursor: "pointer",
                    transition: "background 0.2s"
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = "rgba(99, 102, 241, 0.3)"}
                  onMouseLeave={e => e.currentTarget.style.background = "rgba(99, 102, 241, 0.15)"}
                >
                  Find
                </button>
              </form>

              {/* Search Results list */}
              {searchResults.length > 0 && (
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  <span style={{ fontSize: 11, color: "#64748b", textTransform: "uppercase", fontWeight: "600" }}>Search Results</span>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {searchResults.map((user) => (
                      <div
                        key={user.id}
                        style={{
                          background: "rgba(255, 255, 255, 0.02)",
                          border: "1px solid rgba(255, 255, 255, 0.04)",
                          padding: "10px 12px",
                          borderRadius: 8,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between"
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          <div style={{
                            width: 32, height: 32, borderRadius: "50%",
                            background: "linear-gradient(135deg, #a855f7, #6366f1)",
                            display: "flex", alignItems: "center", justifyContent: "center",
                            fontSize: 13, fontWeight: "bold", textTransform: "uppercase"
                          }}>
                            {user.name[0]}
                          </div>
                          <div>
                            <span style={{ fontSize: 13, fontWeight: "600", display: "block", color: "#e2e8f0" }}>{user.name}</span>
                            <span style={{ fontSize: 11, fontFamily: "monospace", color: "#94a3b8" }}>@{user.username}</span>
                          </div>
                        </div>
                        {user.isFollowing ? (
                          <button
                            onClick={() => handleUnfollow(user.id, true)}
                            style={{
                              background: "rgba(239, 68, 68, 0.08)", border: "1px solid rgba(239, 68, 68, 0.15)",
                              borderRadius: 6, color: "#f87171", cursor: "pointer", padding: "4px 8px", fontSize: 11
                            }}
                            onMouseEnter={e => e.currentTarget.style.background = "rgba(239, 68, 68, 0.15)"}
                            onMouseLeave={e => e.currentTarget.style.background = "rgba(239, 68, 68, 0.08)"}
                          >
                            Unfollow
                          </button>
                        ) : (
                          <button
                            onClick={() => handleFollow(user.id, true)}
                            style={{
                              background: "rgba(99, 102, 241, 0.15)", border: "1px solid rgba(99, 102, 241, 0.3)",
                              borderRadius: 6, color: "#a5b4fc", cursor: "pointer", padding: "4px 8px", fontSize: 11
                            }}
                            onMouseEnter={e => e.currentTarget.style.background = "rgba(99, 102, 241, 0.3)"}
                            onMouseLeave={e => e.currentTarget.style.background = "rgba(99, 102, 241, 0.15)"}
                          >
                            Follow
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Following List */}
              <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 4 }}>
                <span style={{ fontSize: 11, color: "#64748b", textTransform: "uppercase", fontWeight: "600" }}>
                  Following ({following.length})
                </span>
                
                {following.length === 0 ? (
                  <div style={{
                    textAlign: "center", padding: "30px 10px", borderRadius: 8,
                    background: "rgba(255,255,255,0.01)", border: "1px dashed rgba(255,255,255,0.05)"
                  }}>
                    <FiUsers size={28} style={{ color: "#475569", marginBottom: 8 }} />
                    <span style={{ fontSize: 12, color: "#64748b", display: "block" }}>
                      Not following anyone yet. Search for tags like <strong>@dev_wizard</strong> to add competitors!
                    </span>
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {following.map((user) => (
                      <div
                        key={user.id}
                        onClick={() => viewUserStats(user)}
                        style={{
                          background: "linear-gradient(135deg, rgba(255,255,255,0.02) 0%, rgba(255,255,255,0.005) 100%)",
                          border: "1px solid rgba(255, 255, 255, 0.04)",
                          padding: "12px 14px",
                          borderRadius: 10,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          cursor: "pointer",
                          transition: "transform 0.2s, border-color 0.2s, background-color 0.2s"
                        }}
                        onMouseEnter={e => {
                          e.currentTarget.style.transform = "translateX(-2px)";
                          e.currentTarget.style.borderColor = "rgba(99, 102, 241, 0.25)";
                          e.currentTarget.style.backgroundColor = "rgba(255, 255, 255, 0.04)";
                        }}
                        onMouseLeave={e => {
                          e.currentTarget.style.transform = "none";
                          e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.04)";
                          e.currentTarget.style.backgroundColor = "rgba(255, 255, 255, 0.02)";
                        }}
                        title={`Click to compare with ${user.name}`}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          <div style={{
                            width: 34, height: 34, borderRadius: "50%",
                            background: "linear-gradient(135deg, #ec4899, #a855f7)",
                            display: "flex", alignItems: "center", justifyContent: "center",
                            fontSize: 14, fontWeight: "bold", textTransform: "uppercase"
                          }}>
                            {user.name[0]}
                          </div>
                          <div>
                            <span style={{ fontSize: 13, fontWeight: "600", display: "block", color: "#e2e8f0" }}>{user.name}</span>
                            <span style={{ fontSize: 11, fontFamily: "monospace", color: "#94a3b8" }}>@{user.username}</span>
                          </div>
                        </div>
                        
                        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end" }}>
                          <span style={{
                            fontSize: 10, background: "rgba(99, 102, 241, 0.15)",
                            color: "#a5b4fc", border: "1px solid rgba(99, 102, 241, 0.25)",
                            borderRadius: 12, padding: "2px 8px", fontWeight: "600"
                          }}>
                            Lv. {user.level}
                          </span>
                          <span style={{ fontSize: 10, color: "#64748b", marginTop: 4 }}>
                            {user.xp} XP
                          </span>
                        </div>
                      </div>
                    ))}
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
