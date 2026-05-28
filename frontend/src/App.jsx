import { useState, useCallback, useEffect, useRef } from "react";
import { FiChevronRight, FiChevronLeft, FiChevronDown } from "react-icons/fi";
import { io as socketIO } from "socket.io-client";

import Header from "./components/Header.jsx";
import CodeInputPanel from "./components/CodeInputPanel.jsx";
import OutputPanel from "./components/OutputPanel.jsx";
import ProfilePanel from "./components/ProfilePanel.jsx";
import LoadingOverlay from "./components/LoadingOverlay.jsx";
import LandingPage from "./pages/LandingPage.jsx";
import AuthPage from "./pages/AuthPage.jsx";
import SettingsPage from "./pages/SettingsPage.jsx";
import VerificationBanner from "./components/VerificationBanner.jsx";
import { useAuth } from "./context/AuthContext.jsx";
import SocialDrawer from "./components/SocialDrawer.jsx";
import LeetCodeDrawer from "./components/LeetCodeDrawer.jsx";
import DuelOverlay, { DuelResultsModal } from "./components/DuelOverlay.jsx";
import PrescriptionCard from "./components/PrescriptionCard.jsx";
import Logo from "./components/Logo.jsx";
import TerminalOutput from "./components/TerminalOutput.jsx";
import ChallengeModal from "./components/ChallengeModal.jsx";

const API_BASE = import.meta.env.VITE_API_URL ? `${import.meta.env.VITE_API_URL}/api` : "/api";
const SOCKET_URL = import.meta.env.VITE_API_URL || "/";

export default function App() {
  const { user, loading: authLoading } = useAuth();
  const [showSettings, setShowSettings] = useState(false);

  const [files, setFiles] = useState([{ id: "1", name: "main.py", content: `# Welcome to VanillaCodicAI!\n# Paste your code here and click "Debug Code"\n\ndef greet(name):\n    print("Hello, " + name)\n\ngreet("World")\ngreet("VanillaCodic")\n` }]);
  const [activeFileId, setActiveFileId] = useState("1");
  const [language, setLanguage] = useState("python");
  const [debugResults, setDebugResults] = useState({});
  const [fixResults, setFixResults] = useState({});
  const [runResults, setRunResults] = useState({});
  const [activeRunFile, setActiveRunFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loadingAction, setLoadingAction] = useState("");
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState("debug");
  const [profile, setProfile] = useState(null);
  const [personalization, setPersonalization] = useState(null);
  const [stdinInput, setStdinInput] = useState("");
  const [aiModel, setAiModel] = useState("AI");
  const abortControllerRef = useRef(null);

  const [theme, setTheme] = useState(() => {
    const saved = localStorage.getItem("vanillacodic-theme");
    const initial = saved || "dark";
    document.documentElement.setAttribute("data-theme", initial);
    return initial;
  });
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [showLanding, setShowLanding] = useState(true);

  const [activeProblem, setActiveProblem] = useState(null);
  const [prescription, setPrescription] = useState(null);

  // Test mode state variables
  const [isTestMode, setIsTestMode] = useState(false);
  const [testProblem, setTestProblem] = useState(null);
  const [testRunResults, setTestRunResults] = useState(null);
  const [testFiles, setTestFiles] = useState([]);
  const [testActiveFileId, setTestActiveFileId] = useState("");
  const [testPassed, setTestPassed] = useState(false);
  const [isTestStarted, setIsTestStarted] = useState(false);
  const [testDuration, setTestDuration] = useState(15);
  const [testTimeLeft, setTestTimeLeft] = useState(0);

  // Socket.io real-time duel state
  const socketRef = useRef(null);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [incomingChallenge, setIncomingChallenge] = useState(null);
  const [duelRoomCode, setDuelRoomCode] = useState(null);
  const [isMultiplayerDuel, setIsMultiplayerDuel] = useState(false);
  const [waitingForAccept, setWaitingForAccept] = useState(false);

  const fetchProfile = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/profile`, { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setProfile(data);
      }
    } catch {
      // Profile not critical
    }
  }, []);

  const fetchActivePrescription = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/prescriptions/active`, { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setPrescription(data.prescription || null);
      }
    } catch (err) {
      console.error("Error fetching active prescription:", err);
    }
  }, []);

  const handleLoadLeetCodeTemplate = useCallback((template, langName, problemDetails) => {
    let ext = "py";
    if (langName === "javascript") ext = "js";
    else if (langName === "java") ext = "java";
    else if (langName === "cpp") ext = "cpp";
    
    const fileName = `solution.${ext}`;
    setFiles([{ id: "leetcode_sol", name: fileName, content: template }]);
    setActiveFileId("leetcode_sol");
    setLanguage(langName);
    setActiveProblem(problemDetails || null);
  }, []);

  const handleLoadPrescribedProblem = useCallback(async (problemId) => {
    try {
      const res = await fetch(`${API_BASE}/leetcode/problems/${problemId}`, { credentials: "include" });
      if (res.ok) {
        const problemDetails = await res.json();
        const snippets = problemDetails.code_snippets || {};
        let template = "";
        let langKey = language;
        if (language === "python") langKey = "python3";
        if (language === "cpp") langKey = "cpp";
        
        const keys = Object.keys(snippets);
        const matchedKey = keys.find(k => k.toLowerCase() === langKey.toLowerCase()) || 
                          keys.find(k => k.toLowerCase().includes(language.toLowerCase()));

        if (matchedKey && snippets[matchedKey]) {
          template = snippets[matchedKey];
        } else {
          if (language === "python") {
            template = `def solve():\n    # LeetCode #${problemDetails.frontend_id}: ${problemDetails.title}\n    pass\n`;
          } else if (language === "javascript") {
            template = `function solve() {\n    // LeetCode #${problemDetails.frontend_id}: ${problemDetails.title}\n}\n`;
          } else if (language === "java") {
            template = `class Solution {\n    public void solve() {\n        // LeetCode #${problemDetails.frontend_id}: ${problemDetails.title}\n    }\n}\n`;
          } else if (language === "cpp") {
            template = `#include <iostream>\nvoid solve() {\n    // LeetCode #${problemDetails.frontend_id}: ${problemDetails.title}\n}\n`;
          }
        }
        
        handleLoadLeetCodeTemplate(template, language, problemDetails);
      }
    } catch (err) {
      console.error("Error loading prescribed problem details:", err);
    }
  }, [language, handleLoadLeetCodeTemplate]);

  const handleClearPrescription = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/prescriptions/clear`, {
        method: "POST",
        credentials: "include"
      });
      if (res.ok) {
        setPrescription(null);
        fetchProfile();
      }
    } catch (err) {
      console.error("Error clearing prescription:", err);
    }
  }, [fetchProfile]);

  useEffect(() => {
    if (user) {
      fetchProfile();
      fetchActivePrescription();
    }
    fetchConfig();
  }, [user, fetchProfile, fetchActivePrescription]);

  const fetchConfig = async () => {
    try {
      const res = await fetch(`${API_BASE}/config`);
      if (res.ok) {
        const data = await res.json();
        setAiModel(data.model);
      }
    } catch {
      // Ignore
    }
  };

  // ── Socket.io Connection & Events ──────────────────────────────────
  useEffect(() => {
    if (!user) {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
      setOnlineUsers([]);
      return;
    }

    // Get auth token from cookie for socket auth
    const token = document.cookie
      .split("; ")
      .find(c => c.startsWith("token="))
      ?.split("=")[1];

    const socket = socketIO(SOCKET_URL, {
      withCredentials: true,
      auth: { token },
    });
    socketRef.current = socket;

    socket.on("online_users", (users) => {
      // Filter out self
      setOnlineUsers(users.filter(u => u.id !== user.id));
    });

    socket.on("incoming_challenge", (data) => {
      setIncomingChallenge(data);
    });

    socket.on("challenge_accepted", async (data) => {
      setWaitingForAccept(false);
      const { roomCode, problemId, startTime, players } = data;
      setDuelRoomCode(roomCode);
      setIsMultiplayerDuel(true);

      // Find opponent from the players list
      const opponent = players.find(p => p.id !== user.id) || players[1];

      // Fetch problem details with test runners
      try {
        const res = await fetch(`${API_BASE}/leetcode/problems/${problemId}`, { credentials: "include" });
        if (res.ok) {
          const problemDetails = await res.json();
          // Load template into editor
          const snippets = problemDetails.code_snippets || {};
          let langKey = language;
          if (language === "python") langKey = "python3";
          let template = snippets[langKey] || snippets[Object.keys(snippets)[0]] || "// Write your solution here\n";

          let ext = "py";
          if (language === "javascript") ext = "js";
          else if (language === "java") ext = "java";
          else if (language === "cpp") ext = "cpp";

          setFiles([{ id: "duel_sol", name: `solution.${ext}`, content: template }]);
          setActiveFileId("duel_sol");
          setActiveProblem(problemDetails);

          setActiveDuel({
            opponent,
            problem: problemDetails,
            startTime,
            opponentProgress: 0,
            opponentStatus: "Setting up environment...",
            timeLeft: 300,
            status: "running",
            roomCode,
          });
          setRunResults({});
          setActiveRunFile(null);
          setActiveTab("run");
        }
      } catch (err) {
        console.error("Error loading duel problem:", err);
        alert("Failed to load the duel problem. Please try again.");
      }
    });

    socket.on("challenge_declined", (data) => {
      setWaitingForAccept(false);
      alert(`${data.declinedBy} declined your challenge.`);
    });

    socket.on("challenge_error", (data) => {
      setWaitingForAccept(false);
      alert(data.message || "Challenge error occurred.");
    });

    socket.on("peer_progress", (data) => {
      const { progressPercent, statusText } = data;
      setActiveDuel(prev => {
        if (!prev || prev.status !== "running") return prev;
        return { ...prev, opponentProgress: progressPercent, opponentStatus: statusText };
      });
    });

    socket.on("duel_finished", (data) => {
      // Opponent won — we lost
      handleDuelComplete("lose");
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [user]);

  // ── Socket Duel Actions ────────────────────────────────────────────
  const handleRequestDuel = useCallback((targetPlayer, problemDetails) => {
    if (!socketRef.current) return;
    setWaitingForAccept(true);
    socketRef.current.emit("challenge_player", {
      targetUserId: targetPlayer.id,
      problemId: problemDetails.frontend_id,
      problemTitle: problemDetails.title,
      problemDifficulty: problemDetails.difficulty,
    });
  }, []);

  const handleAcceptChallenge = useCallback(async () => {
    if (!socketRef.current || !incomingChallenge) return;
    socketRef.current.emit("accept_challenge", {
      challengerId: incomingChallenge.challengerId,
      problemId: incomingChallenge.problemId,
    });
    setIncomingChallenge(null);
  }, [incomingChallenge]);

  const handleDeclineChallenge = useCallback(() => {
    if (!socketRef.current || !incomingChallenge) return;
    socketRef.current.emit("decline_challenge", {
      challengerId: incomingChallenge.challengerId,
    });
    setIncomingChallenge(null);
  }, [incomingChallenge]);

  const [activeDuel, setActiveDuel] = useState(null);

  const handleStartDuel = useCallback((opponent, problem) => {
    setIsMultiplayerDuel(false);
    setDuelRoomCode(null);
    setActiveDuel({
      opponent,
      problem,
      startTime: Date.now(),
      opponentProgress: 0,
      opponentStatus: "Analyzing problem details...",
      timeLeft: 300,
      status: "running",
      isBotDuel: true,
    });
    setRunResults({});
    setActiveRunFile(null);
    setActiveTab("run");
  }, []);

  const handleDuelComplete = useCallback(async (result) => {
    let currentDuel = null;
    setActiveDuel(prev => {
      if (!prev || prev.status !== "running") return prev;
      currentDuel = prev;
      return {
        ...prev,
        status: result,
        opponentProgress: result === "lose" ? 100 : prev.opponentProgress,
        opponentStatus: result === "lose" ? "Submitted and Accepted!" : prev.opponentStatus
      };
    });

    if (!currentDuel) return;

    if (isMultiplayerDuel && result === "win" && duelRoomCode) {
      if (socketRef.current) {
        socketRef.current.emit("submit_victory", { roomCode: duelRoomCode });
      }
    }

    try {
      const res = await fetch(`${API_BASE}/social/duel/complete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          opponentId: currentDuel.opponent.id,
          result
        })
      });

      if (res.ok) {
        const data = await res.json();
        fetchProfile();
        setActiveDuel(prev => {
          if (!prev) return prev;
          return {
            ...prev,
            rewards: {
              xpEarned: data.xpEarned,
              coinsEarned: data.coinsEarned,
              newProfile: data.profile
            }
          };
        });
      }
    } catch (err) {
      console.error("Error completing duel on backend:", err);
    }
  }, [fetchProfile]);

  const handleForfeitDuel = useCallback(() => {
    if (window.confirm("Are you sure you want to forfeit this duel? You will lose 30 XP!")) {
      handleDuelComplete("forfeit");
    }
  }, [handleDuelComplete]);

  useEffect(() => {
    if (!activeDuel || activeDuel.status !== "running") return;

    const opponentLevel = activeDuel.opponent.level || 1;
    const totalOpponentTime = Math.max(120, 300 - (opponentLevel - 1) * 45);

    const timer = setInterval(() => {
      const elapsed = Math.floor((Date.now() - activeDuel.startTime) / 1000);
      const timeLeft = Math.max(0, 300 - elapsed);
      const progress = Math.min(100, Math.floor((elapsed / totalOpponentTime) * 100));
      
      const getOpponentStatus = (p) => {
        if (p < 20) return "Analyzing problem details...";
        if (p < 50) return "Drafting initial function structure...";
        if (p < 75) return "Debugging loop boundaries...";
        if (p < 100) return "Running sample test cases...";
        return "Submitted and Accepted!";
      };
      
      const statusText = getOpponentStatus(progress);

      if (progress >= 100 || timeLeft <= 0) {
        clearInterval(timer);
        handleDuelComplete("lose");
      } else {
        setActiveDuel(prev => {
          if (!prev || prev.status !== "running") return prev;
          return {
            ...prev,
            timeLeft,
            opponentProgress: progress,
            opponentStatus: statusText
          };
        });
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [activeDuel?.startTime, activeDuel?.status, handleDuelComplete]);

  const handleDebug = useCallback(async () => {
    const activeFile = files.find(f => f.id === activeFileId);
    if (!activeFile || !activeFile.content.trim()) return;
    setLoading(true);
    setLoadingAction("Analyzing your code...");
    setError(null);
    setFixResults(prev => ({ ...prev, [activeFileId]: null }));
    setActiveTab("debug");
    
    abortControllerRef.current = new AbortController();
    try {
      const res = await fetch(`${API_BASE}/debug`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        signal: abortControllerRef.current.signal,
        body: JSON.stringify({ files: [activeFile], mainFile: activeFile.name, language }),
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || "Server error");
      }
      const data = await res.json();
      setDebugResults(prev => ({ ...prev, [activeFileId]: data }));
      setPersonalization(data.personalization || null);
      if (data.profile) fetchProfile();
    } catch (err) {
      if (err.name === 'AbortError') return;
      setError(err.message || "Failed to analyze code.");
    } finally {
      setLoading(false);
      setLoadingAction("");
    }
  }, [files, activeFileId, language]);

  const handleFix = useCallback(async () => {
    const activeFile = files.find(f => f.id === activeFileId);
    if (!activeFile || !activeFile.content.trim()) return;
    setLoading(true);
    setLoadingAction("Fixing your code...");
    setError(null);
    setActiveTab("fix");
    
    const mainFileName = activeFile.name;
    const runError = runResults[mainFileName] && runResults[mainFileName].exitCode !== 0 ? runResults[mainFileName].stderr : null;
    const debugErrors = debugResults[activeFileId] && debugResults[activeFileId].errors && debugResults[activeFileId].errors.length > 0
      ? debugResults[activeFileId].errors.map(e => e.title + ": " + e.description).join("\n")
      : null;
    const errorContext = runError || debugErrors || null;
    
    abortControllerRef.current = new AbortController();
    try {
      const res = await fetch(`${API_BASE}/fix`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        signal: abortControllerRef.current.signal,
        body: JSON.stringify({ files: [activeFile], mainFile: activeFile.name, language, errorContext }),
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || "Server error");
      }
      const data = await res.json();
      setFixResults(prev => ({ ...prev, [activeFileId]: data }));
      if (data.profile) fetchProfile();
    } catch (err) {
      if (err.name === 'AbortError') return;
      setError(err.message || "Failed to fix code.");
    } finally {
      setLoading(false);
      setLoadingAction("");
    }
  }, [files, activeFileId, language]);

  const handleRun = useCallback(async () => {
    if (!files.some(f => f.content.trim())) return;
    setLoading(true);
    setLoadingAction("Running your code...");
    setError(null);
    setActiveTab("run");
    
    abortControllerRef.current = new AbortController();
    try {
      const res = await fetch(`${API_BASE}/run`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        signal: abortControllerRef.current.signal,
        body: JSON.stringify({
          files,
          mainFile: files.find(f => f.id === activeFileId)?.name || files[0]?.name,
          language,
          stdinInput: stdinInput || undefined,
        }),
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || "Server error");
      }
      const data = await res.json();
      const mainFile = files.find(f => f.id === activeFileId)?.name || files[0]?.name;
      setRunResults(prev => ({ ...prev, [mainFile]: data }));
      setActiveRunFile(mainFile);

      // Check for active duel win
      if (activeDuel && activeDuel.status === "running") {
        if (data.exitCode === 0 && !data.stderr) {
          handleDuelComplete("win");
        } else if (isMultiplayerDuel && duelRoomCode) {
          if (socketRef.current) {
            socketRef.current.emit("peer_progress", { roomCode: duelRoomCode, progress: 30, status: "Code execution failed..." });
          }
        }
      }

      // Log run for prescription diagnostics and completions
      const runSuccess = data.exitCode === 0 && !data.stderr;
      try {
        const logRes = await fetch(`${API_BASE}/prescriptions/log-run`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            success: runSuccess,
            stderr: data.stderr || "",
            problemId: activeProblem?.frontend_id || ""
          })
        });
        if (logRes.ok) {
          const logData = await logRes.json();
          if (logData.diagnosed) {
            setPrescription(logData.prescription);
            alert(`🏥 AI MEDIC DIAGNOSIS:\nYou have been diagnosed with "${logData.prescription.ailment}". An active practice prescription has been assigned to help you recover!`);
          } else if (logData.completed) {
            setPrescription(logData.prescription);
            alert(`🎉 AI MEDIC RECOVERY COMPLETE:\nPrescription cleared! You earned +${logData.rewards.xpEarned} XP and +${logData.rewards.coinsEarned} Vanilla Points.`);
            fetchProfile();
          } else if (logData.prescription) {
            setPrescription(logData.prescription);
          }
        }
      } catch (logErr) {
        console.error("Error logging run for prescription:", logErr);
      }
    } catch (err) {
      if (err.name === 'AbortError') return;
      setRunResults(prev => ({
        ...prev,
        [files.find(f => f.id === activeFileId)?.name || files[0]?.name]: {
          stdout: "", stderr: err.message || "Failed to run code.", exitCode: 1, timedOut: false
        }
      }));
    } finally {
      setLoading(false);
      setLoadingAction("");
    }
  }, [files, activeFileId, language, stdinInput, activeDuel, handleDuelComplete, activeProblem, fetchProfile]);

  const handleEnterTestMode = useCallback(() => {
    setIsTestMode(true);
    setIsTestStarted(false);
    setTestProblem(null);
    setTestFiles([{ id: "placeholder", name: "solution.py", content: "# Set your time limit on the top left and click \"Start Test\" to load the challenge.\n" }]);
    setTestActiveFileId("placeholder");
    setTestRunResults(null);
    setTestPassed(false);
  }, []);

  const handleStartTest = useCallback(async () => {
    setLoading(true);
    setLoadingAction("Generating Test Question based on your Level...");
    try {
      const res = await fetch(`${API_BASE}/leetcode/random-by-level`, { credentials: "include" });
      if (res.ok) {
        const problem = await res.json();
        setTestProblem(problem);
        
        let targetLang = language;
        // Determine snippet for the current language
        const snippets = problem.code_snippets || {};
        let langKey = targetLang;
        if (targetLang === "python") langKey = "python3";
        
        let snippetContent = "";
        if (snippets[langKey]) {
          snippetContent = snippets[langKey];
        } else {
          // Fallback to first snippet or placeholder
          const firstKey = Object.keys(snippets)[0];
          if (firstKey) {
            snippetContent = snippets[firstKey];
            // update language to match first snippet if possible
            if (firstKey === "python3") targetLang = "python";
            else if (firstKey === "javascript") targetLang = "javascript";
            else if (firstKey === "java") targetLang = "java";
            else if (firstKey === "cpp") targetLang = "cpp";
            
            setLanguage(targetLang);
          } else {
            snippetContent = targetLang === "python" 
              ? "# Write your solution code here\n" 
              : "// Write your solution code here\n";
          }
        }
        
        let ext = "py";
        if (targetLang === "javascript") ext = "js";
        else if (targetLang === "java") ext = "java";
        else if (targetLang === "cpp") ext = "cpp";
        
        setTestFiles([{ id: "test_sol", name: `solution.${ext}`, content: snippetContent }]);
        setTestActiveFileId("test_sol");
        setTestRunResults(null);
        setTestPassed(false);
        setIsTestStarted(true);
        setTestTimeLeft(testDuration * 60);
      } else {
        alert("Failed to generate test question. Please check server.");
      }
    } catch (err) {
      console.error("Error starting test:", err);
      alert("Error starting test. Please try again.");
    } finally {
      setLoading(false);
      setLoadingAction("");
    }
  }, [language, testDuration]);

  useEffect(() => {
    if (!isTestMode || !isTestStarted || testTimeLeft <= 0 || testPassed) return;

    const timer = setInterval(() => {
      setTestTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          alert("⏰ Time's up! The test has ended.");
          setIsTestMode(false);
          setTestProblem(null);
          setTestRunResults(null);
          setIsTestStarted(false);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isTestMode, isTestStarted, testTimeLeft, testPassed]);

  const handleTestRun = useCallback(async () => {
    if (!testFiles.some(f => f.content.trim())) return;
    setLoading(true);
    setLoadingAction("Running your test code...");
    setError(null);
    
    const activeFile = testFiles.find(f => f.id === testActiveFileId) || testFiles[0];
    let contentToRun = activeFile.content;
    
    const runner = testProblem?.test_runners?.[language];
    if (runner) {
      if (language === "java") {
        const lastBraceIndex = contentToRun.lastIndexOf("}");
        if (lastBraceIndex !== -1) {
          contentToRun = contentToRun.slice(0, lastBraceIndex) + "\n" + runner + "\n" + contentToRun.slice(lastBraceIndex);
        } else {
          contentToRun = contentToRun + "\n" + runner;
        }
      } else {
        contentToRun = contentToRun + "\n" + runner;
      }
    }

    const filesToSend = testFiles.map(f => f.id === activeFile.id ? { ...f, content: contentToRun } : f);
    
    abortControllerRef.current = new AbortController();
    try {
      const res = await fetch(`${API_BASE}/run`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        signal: abortControllerRef.current.signal,
        body: JSON.stringify({
          files: filesToSend,
          mainFile: activeFile.name,
          language,
          stdinInput: "",
        }),
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || "Server error");
      }
      const data = await res.json();
      setTestRunResults(data);

      if (data.exitCode === 0 && !data.stderr) {
        setTestPassed(true);
      }
    } catch (err) {
      if (err.name === 'AbortError') return;
      setTestRunResults({ stdout: "", stderr: err.message || "Failed to run code.", exitCode: 1 });
    } finally {
      setLoading(false);
      setLoadingAction("");
    }
  }, [testFiles, testActiveFileId, language, testProblem]);

  const handleTestLanguageChange = useCallback((newLang) => {
    setLanguage(newLang);
    if (!testProblem) return;
    
    const snippets = testProblem.code_snippets || {};
    let langKey = newLang;
    if (newLang === "python") langKey = "python3";
    
    let snippetContent = "";
    if (snippets[langKey]) {
      snippetContent = snippets[langKey];
    } else {
      snippetContent = newLang === "python" 
        ? "# Write your solution code here\n" 
        : "// Write your solution code here\n";
    }
    
    let ext = "py";
    if (newLang === "javascript") ext = "js";
    else if (newLang === "java") ext = "java";
    else if (newLang === "cpp") ext = "cpp";
    
    setTestFiles([{ id: "test_sol", name: `solution.${ext}`, content: snippetContent }]);
  }, [testProblem]);

  // Show loading spinner while checking auth
  if (authLoading) {
    return (
      <div style={{
        minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center",
        background: "var(--bg-primary)",
      }}>
        <div style={{
          width: 44, height: 44, borderRadius: "50%",
          border: "3px solid rgba(99,102,241,0.2)",
          borderTopColor: "var(--accent-primary)",
          animation: "spin 0.8s linear infinite",
        }} />
      </div>
    );
  }

  // Show unified Landing & Auth page if not logged in
  if (!user) {
    return <LandingPage />;
  }

  // Show settings page
  if (showSettings) {
    return <SettingsPage onBack={() => setShowSettings(false)} />;
  }

  if (isTestMode) {
    return (
      <div className="animated-bg app-enter" style={{
        height: "100vh", overflow: "hidden", display: "flex", flexDirection: "column",
        background: "var(--bg-primary)", backgroundImage: "var(--gradient-bg)",
        transition: "background 0.4s ease",
      }}>
        {/* Mini Test Header */}
        <header style={{
          padding: "16px 24px", display: "flex", alignItems: "center",
          justifyContent: "space-between", borderBottom: "1px solid var(--border-primary)",
          background: "rgba(10, 11, 18, 0.4)", backdropFilter: "blur(12px)",
          position: "relative", zIndex: 100,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <Logo size={28} bracketsColor="var(--accent-primary)" />
            <span style={{ fontSize: "1.15rem", fontWeight: 800, color: "var(--text-primary)" }}>
              VanillaCodicAI <span style={{ color: "#ef4444", fontWeight: 700, fontSize: "0.85rem", marginLeft: 8, padding: "2px 8px", background: "rgba(239, 68, 68, 0.1)", borderRadius: 6 }}>TESTING MODE</span>
            </span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <div style={{ fontSize: "0.85rem", color: "var(--text-secondary)", fontWeight: 600 }}>
              Difficulty Tailored to Level {profile?.level || 1}
              {testProblem && (
                <>: <span style={{
                  color: testProblem.difficulty === "Easy" ? "#10b981" : (testProblem.difficulty === "Medium" ? "#f59e0b" : "#ef4444"),
                  fontWeight: 700
                }}>{testProblem.difficulty}</span></>
              )}
            </div>
            <button
              onClick={() => {
                if (window.confirm("Are you sure you want to quit the test? Your progress will not be saved.")) {
                  setIsTestMode(false);
                  setTestProblem(null);
                  setTestRunResults(null);
                  setIsTestStarted(false);
                }
              }}
              style={{
                padding: "6px 14px", borderRadius: 8,
                background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)",
                color: "#ef4444", fontSize: "0.8rem", fontWeight: 700, cursor: "pointer",
                transition: "all 0.2s"
              }}
              onMouseEnter={e => e.currentTarget.style.background = "rgba(239, 68, 68, 0.1)"}
              onMouseLeave={e => e.currentTarget.style.background = "rgba(255,255,255,0.05)"}
            >
              Quit Test
            </button>
          </div>
        </header>

        {/* Main split test layout */}
        <main style={{
          flex: 1, display: "flex", padding: "24px", gap: "24px", minHeight: 0
        }}>
          {/* Left Column: 1st - Question details */}
          <div className="glass-card animate-pop-in" style={{
            flex: "1 1 50%", display: "flex", flexDirection: "column", padding: "20px 24px",
            overflowY: "auto", background: "rgba(30, 41, 59, 0.15)", border: "1px solid var(--border-primary)",
            borderRadius: 16, gap: 16
          }}>
            {/* Custom Time Limit Box / Running Timer */}
            {!isTestStarted ? (
              <div style={{
                padding: "16px", background: "rgba(99, 102, 241, 0.1)", border: "1px solid rgba(99, 102, 241, 0.2)",
                borderRadius: 12, display: "flex", alignItems: "center", gap: 16, justifyContent: "space-between"
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ fontSize: "1.2rem" }}>⏱️</span>
                  <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                    <span style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--text-secondary)" }}>Set Time Limit:</span>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <input
                        type="number"
                        min="1"
                        max="180"
                        value={testDuration}
                        onChange={(e) => setTestDuration(Math.max(1, parseInt(e.target.value) || 1))}
                        style={{
                          width: 60, padding: "4px 8px", borderRadius: 6,
                          background: "rgba(0, 0, 0, 0.3)", border: "1px solid var(--border-glass)",
                          color: "var(--text-primary)", fontSize: "0.8rem", fontWeight: 700,
                          textAlign: "center", outline: "none"
                        }}
                      />
                      <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", fontWeight: 600 }}>minutes</span>
                    </div>
                  </div>
                </div>
                <button
                  onClick={handleStartTest}
                  className="btn-glow"
                  style={{
                    padding: "8px 16px", borderRadius: 8,
                    background: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
                    color: "#fff", border: "none", fontWeight: 700, fontSize: "0.8rem",
                    cursor: "pointer", height: "fit-content"
                  }}
                >
                  Start Test 🚀
                </button>
              </div>
            ) : (
              <div style={{
                padding: "12px 16px", background: "rgba(239, 68, 68, 0.1)", border: "1px solid rgba(239, 68, 68, 0.25)",
                borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "space-between",
                color: "#f87171", fontWeight: 700
              }}>
                <span style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>⏳ Time Remaining:</span>
                <span style={{ fontSize: "1.1rem", fontFamily: "var(--font-mono)", letterSpacing: "0.05em" }}>
                  {Math.floor(testTimeLeft / 60)}:{(testTimeLeft % 60).toString().padStart(2, "0")}
                </span>
              </div>
            )}

            {!isTestStarted ? (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", flex: 1, gap: 12, opacity: 0.7 }}>
                <span style={{ fontSize: "2rem" }}>📝</span>
                <p style={{ fontSize: "0.85rem", color: "var(--text-muted)", textAlign: "center", maxWidth: 280, lineHeight: 1.5 }}>
                  Configure your time limit above and click <strong>Start Test</strong> to load the challenge.
                </p>
              </div>
            ) : (
              <>
                <div>
                  <span style={{
                    fontSize: 10, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.1em",
                    color: testProblem.difficulty === "Easy" ? "#10b981" : (testProblem.difficulty === "Medium" ? "#f59e0b" : "#ef4444"),
                    background: testProblem.difficulty === "Easy" ? "rgba(16, 185, 129, 0.1)" : (testProblem.difficulty === "Medium" ? "rgba(245, 158, 11, 0.1)" : "rgba(239, 68, 68, 0.1)"),
                    padding: "3px 8px", borderRadius: 4
                  }}>
                    {testProblem.difficulty}
                  </span>
                  <h2 style={{ fontSize: "1.3rem", fontWeight: 800, color: "var(--text-primary)", marginTop: 10 }}>
                    #{testProblem.frontend_id} {testProblem.title}
                  </h2>
                </div>

                <div 
                  style={{ fontSize: "0.92rem", color: "#cbd5e1", lineHeight: 1.6, whiteSpace: "pre-wrap" }}
                  dangerouslySetInnerHTML={{ __html: testProblem.description }}
                />

                {testProblem.examples && testProblem.examples.length > 0 && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 12 }}>
                    <span style={{ fontSize: "0.85rem", fontWeight: 700, color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                      Examples
                    </span>
                    {testProblem.examples.map((ex, idx) => (
                      <div key={idx}>
                        <div style={{ fontSize: "0.8rem", fontWeight: "700", color: "#94a3b8", marginBottom: 6 }}>
                          Example {ex.example_num || (idx + 1)}:
                        </div>
                        <pre style={{
                          margin: 0,
                          padding: "10px 12px",
                          background: "rgba(0, 0, 0, 0.2)",
                          border: "1px solid rgba(255, 255, 255, 0.04)",
                          borderRadius: 10,
                          fontSize: "0.8rem",
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

                {testProblem.constraints && testProblem.constraints.length > 0 && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 12 }}>
                    <span style={{ fontSize: "0.85rem", fontWeight: 700, color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                      Constraints
                    </span>
                    <ul style={{ paddingLeft: 20, margin: 0, fontSize: "0.82rem", color: "#94a3b8", lineHeight: 1.5 }}>
                      {testProblem.constraints.map((c, idx) => (
                        <li key={idx}>{c}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Right Column: 2nd (Compiler), 3rd (Terminal), and 4th (Run Button) */}
          <div style={{
            flex: "1 1 50%", display: "flex", flexDirection: "column", gap: 20, minHeight: 0
          }}>
            {/* Compiler Tab */}
            <div className="glass-card animate-pop-in" style={{
              flex: "3 3 0", display: "flex", flexDirection: "column", minHeight: 0,
              background: "rgba(30, 41, 59, 0.15)", border: "1px solid var(--border-primary)",
              borderRadius: 16, overflow: "hidden"
            }}>
              {/* Compiler Header Bar */}
              <div style={{
                padding: "10px 16px", background: "rgba(0,0,0,0.15)", borderBottom: "1px solid var(--border-primary)",
                display: "flex", justifyContent: "space-between", alignItems: "center"
              }}>
                <span style={{ fontSize: "0.8rem", color: "var(--text-secondary)", fontWeight: 700, textTransform: "uppercase" }}>
                  💻 Compiler Tab ({language})
                </span>
                
                {/* Language Selector Dropdown */}
                <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
                  <select
                    id="test-language-selector"
                    value={language}
                    onChange={(e) => handleTestLanguageChange(e.target.value)}
                    style={{
                      appearance: "none",
                      background: "var(--select-bg, rgba(255,255,255,0.05))",
                      border: "1px solid var(--border-glass)",
                      borderRadius: 10,
                      padding: "6px 32px 6px 12px",
                      color: "var(--text-primary)",
                      fontSize: "0.75rem",
                      fontWeight: 600,
                      fontFamily: "var(--font-sans)",
                      cursor: "pointer",
                      outline: "none",
                      transition: "border-color 0.2s",
                    }}
                    onFocus={(e) =>
                      (e.target.style.borderColor = "var(--accent-primary)")
                    }
                    onBlur={(e) =>
                      (e.target.style.borderColor = "var(--border-glass)")
                    }
                  >
                    <option value="python" style={{ background: "var(--bg-secondary)", color: "var(--text-primary)" }}>🐍 Python</option>
                    <option value="javascript" style={{ background: "var(--bg-secondary)", color: "var(--text-primary)" }}>⚡ JavaScript</option>
                    <option value="java" style={{ background: "var(--bg-secondary)", color: "var(--text-primary)" }}>☕ Java</option>
                    <option value="cpp" style={{ background: "var(--bg-secondary)", color: "var(--text-primary)" }}>⚙️ C++</option>
                  </select>
                  <FiChevronDown
                    size={12}
                    style={{
                      position: "absolute",
                      right: 10,
                      pointerEvents: "none",
                      color: "var(--text-muted)",
                    }}
                  />
                </div>
              </div>
              
              {/* Render CodeInputPanel simplified for test mode */}
              <div style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column", height: "100%" }}>
                <CodeInputPanel
                  files={testFiles} setFiles={setTestFiles}
                  activeFileId={testActiveFileId} setActiveFileId={setTestActiveFileId}
                  language={language} setLanguage={setLanguage}
                  onDebug={() => {}} onFix={() => {}} onRun={handleTestRun}
                  loading={loading} theme={theme}
                  stdinInput="" setStdinInput={() => {}}
                  isTestMode={true}
                />
              </div>
            </div>

            {/* Terminal Tab */}
            <div className="glass-card animate-pop-in" style={{
              flex: "2 2 0", display: "flex", flexDirection: "column", minHeight: 0,
              background: "rgba(30, 41, 59, 0.2)", border: "1px solid var(--border-primary)",
              borderRadius: 16, overflow: "hidden"
            }}>
              <div style={{
                padding: "10px 16px", background: "rgba(0,0,0,0.15)", borderBottom: "1px solid var(--border-primary)",
                display: "flex", justifyContent: "space-between", alignItems: "center"
              }}>
                <span style={{ fontSize: "0.8rem", color: "var(--text-secondary)", fontWeight: 700, textTransform: "uppercase" }}>
                  📟 Terminal Tab
                </span>
              </div>
              
              <div style={{ flex: 1, padding: 16, overflowY: "auto", background: "#060814" }}>
                <TerminalOutput runResult={testRunResults} loading={loading} />
              </div>
            </div>

            {/* Run Button bar */}
            <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
              <button
                className="btn-glow animate-pulse-glow"
                disabled={loading || testPassed || !isTestStarted}
                onClick={handleTestRun}
                style={{
                  flex: 1, padding: "14px", borderRadius: 12,
                  background: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
                  color: "#fff", border: "none", fontWeight: 800, fontSize: "1rem",
                  cursor: "pointer", transition: "all 0.2s",
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                  boxShadow: "0 4px 20px rgba(16, 185, 129, 0.25)"
                }}
                onMouseEnter={e => e.currentTarget.style.transform = "translateY(-2px)"}
                onMouseLeave={e => e.currentTarget.style.transform = "translateY(0)"}
              >
                🚀 {loading ? "Running Code..." : "Run Test Code"}
              </button>

              {testPassed && (
                <button
                  className="btn-glow animate-pulse-glow"
                  onClick={async () => {
                    try {
                      const res = await fetch(`${API_BASE}/leetcode/test/complete`, {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        credentials: "include",
                        body: JSON.stringify({ difficulty: testProblem?.difficulty || "Easy" })
                      });
                      if (res.ok) {
                        const data = await res.json();
                        alert(`🎉 TEST COMPLETED SUCCESSFULLY!\nYou earned +${data.xpEarned} XP and +${data.coinsEarned} Vanilla Points!`);
                        setIsTestMode(false);
                        setTestProblem(null);
                        setTestRunResults(null);
                        fetchProfile();
                      }
                    } catch (err) {
                      alert("Failed to claim rewards. Please try again.");
                    }
                  }}
                  style={{
                    flex: 1, padding: "14px", borderRadius: 12,
                    background: "linear-gradient(135deg, #fbbf24 0%, #d97706 100%)",
                    color: "#fff", border: "none", fontWeight: 800, fontSize: "1rem",
                    cursor: "pointer", transition: "all 0.2s",
                    display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                    boxShadow: "0 4px 20px rgba(217, 119, 6, 0.25)"
                  }}
                >
                  🍦 Claim Rewards & Exit
                </button>
              )}
            </div>
          </div>
        </main>

        {loading && <LoadingOverlay action={loadingAction} />}
      </div>
    );
  }

  return (
    <div className="animated-bg app-enter" style={{
      height: "100vh", overflow: "hidden", display: "flex", flexDirection: "column",
      background: "var(--bg-primary)", backgroundImage: "var(--gradient-bg)",
      transition: "background 0.4s ease",
    }}>
      <Header profile={profile} theme={theme} setTheme={setTheme} onOpenSettings={() => setShowSettings(true)} fetchProfile={fetchProfile} onStartTest={handleEnterTestMode} />
      <VerificationBanner user={user} onVerified={fetchProfile} />



      <main style={{
        flex: 1, display: "flex", padding: "0 24px 24px", gap: "32px",
        maxWidth: "1800px", width: "100%", margin: "0 auto",
        position: "relative", zIndex: 1, minHeight: 0
      }} className="split-layout">
        <div className="animate-stagger-1" style={{ flex: "1 1 0", minWidth: 0, minHeight: 0, display: "flex", flexDirection: "column" }}>
          <CodeInputPanel
            files={files} setFiles={setFiles}
            activeFileId={activeFileId} setActiveFileId={setActiveFileId}
            language={language} setLanguage={setLanguage}
            onDebug={handleDebug} onFix={handleFix} onRun={handleRun}
            loading={loading} theme={theme}
            stdinInput={stdinInput} setStdinInput={setStdinInput}
          />
        </div>

        <div className="animate-stagger-2" style={{ flex: "1 1 0", minWidth: 0, minHeight: 0, display: "flex", flexDirection: "column", position: "relative" }}>
          {activeDuel && (
            <DuelOverlay 
              activeDuel={activeDuel} 
              userProfile={profile} 
              onClose={() => setActiveDuel(null)} 
              onLeave={handleForfeitDuel}
            />
          )}
          {prescription && (
            <PrescriptionCard
              prescription={prescription}
              onLoadProblem={handleLoadPrescribedProblem}
              onClear={handleClearPrescription}
            />
          )}
          <OutputPanel
            debugResult={debugResults[activeFileId] || null}
            fixResult={fixResults[activeFileId] || null}
            runResults={runResults} activeRunFile={activeRunFile} setActiveRunFile={setActiveRunFile}
            activeTab={activeTab} setActiveTab={setActiveTab}
            error={error} loading={loading}
            personalization={personalization}
            language={language}
            onRunFixedCode={handleRun}
            theme={theme}
          />
          
          {/* Sidebar Toggle Button floating on the right edge of OutputPanel */}
          <button
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            title={isSidebarOpen ? "Collapse Sidebar" : "Expand Sidebar"}
            style={{
              position: "absolute",
              right: -10, top: "50%", transform: "translateY(-50%)", zIndex: 10,
              width: 24, height: 48, borderRadius: "8px 0 0 8px",
              background: "var(--accent-glow)", border: "1px solid var(--border-glow)",
              borderRight: "none", color: "var(--accent-primary)",
              display: "flex", alignItems: "center", justifyContent: "center",
              cursor: "pointer", transition: "all 0.2s ease"
            }}
            onMouseEnter={e => {
              e.currentTarget.style.background = "var(--accent-primary)";
              e.currentTarget.style.color = "#fff";
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = "var(--accent-glow)";
              e.currentTarget.style.color = "var(--accent-primary)";
            }}
          >
            {isSidebarOpen ? <FiChevronRight size={16} /> : <FiChevronLeft size={16} />}
          </button>
        </div>

        <div style={{ 
          width: isSidebarOpen ? 280 : 0, 
          flexShrink: 0, 
          overflow: "hidden", 
          transition: "width 0.4s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.3s ease",
          opacity: isSidebarOpen ? 1 : 0,
          display: "flex", flexDirection: "column"
        }} className="profile-sidebar animate-stagger-3">
          <div style={{ width: 280, flex: 1, display: "flex", flexDirection: "column" }}>
            <ProfilePanel profile={profile} />
          </div>
        </div>
      </main>

      {loading && <LoadingOverlay action={loadingAction} model={aiModel} onCancel={() => abortControllerRef.current?.abort()} />}
      <SocialDrawer currentUser={user} myProfile={profile} isSidebarOpen={isSidebarOpen} />
      <LeetCodeDrawer currentLanguage={language} onLoadTemplate={handleLoadLeetCodeTemplate} isSidebarOpen={isSidebarOpen} onStartDuel={handleStartDuel} onlineUsers={onlineUsers} onRequestDuel={handleRequestDuel} />
      
      {activeDuel && activeDuel.status !== "running" && (
        <DuelResultsModal 
          activeDuel={activeDuel} 
          onClose={() => setActiveDuel(null)} 
        />
      )}

      {incomingChallenge && (
        <ChallengeModal
          challenge={incomingChallenge}
          onAccept={handleAcceptChallenge}
          onDecline={handleDeclineChallenge}
        />
      )}
    </div>
  );
}
