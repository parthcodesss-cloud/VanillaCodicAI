import { useState, useMemo, useEffect } from "react";
import { FiCopy, FiCheck, FiCheckCircle, FiPlay, FiTerminal, FiChevronDown, FiChevronUp } from "react-icons/fi";
import Editor from "@monaco-editor/react";
import TerminalOutput from "./TerminalOutput.jsx";

const MONACO_LANG_MAP = {
  python: "python",
  javascript: "javascript",
  java: "java",
  cpp: "cpp",
};

export default function CorrectedCodeView({ fixResult, language, onRunFixedCode, theme }) {
  const editorTheme = theme === "light" ? "vs" : "vs-dark";
  const [copied, setCopied] = useState(false);
  const [runResult, setRunResult] = useState(null);
  const [running, setRunning] = useState(false);
  const [fixedStdinInput, setFixedStdinInput] = useState("");
  const [fixedStdinOpen, setFixedStdinOpen] = useState(false);
  const [suggestingFixedInput, setSuggestingFixedInput] = useState(false);
  const [editedFiles, setEditedFiles] = useState({});

  // Parse potential multi-file output separated by "--- filename ---"
  const parsedFiles = useMemo(() => {
    if (!fixResult || !fixResult.correctedCode) return [];
    const ext = language === "python" ? ".py" : language === "javascript" ? ".js" : language === "java" ? ".java" : ".cpp";
    const files = [];
    const lines = fixResult.correctedCode.split("\n");
    let currentName = `main${ext}`;
    let currentContent = [];
    
    for (const line of lines) {
      const match = line.match(/^---\s+(.+?)\s+---$/);
      if (match) {
        if (currentContent.length > 0 || files.length === 0) {
           files.push({ name: currentName, content: currentContent.join("\n").trim() });
        }
        currentName = match[1].trim();
        currentContent = [];
      } else {
        currentContent.push(line);
      }
    }
    if (currentContent.length > 0 || files.length === 0) {
      files.push({ name: currentName, content: currentContent.join("\n").trim() });
    }
    return files.filter(f => f.content.length > 0);
  }, [fixResult.correctedCode, language]);

  const [activeFixedFileId, setActiveFixedFileId] = useState("");

  useEffect(() => {
    if (parsedFiles.length > 0 && !activeFixedFileId) {
      setActiveFixedFileId(parsedFiles[0].name);
    }
  }, [parsedFiles, activeFixedFileId]);

  const activeContent = editedFiles[activeFixedFileId] !== undefined 
    ? editedFiles[activeFixedFileId] 
    : (parsedFiles.find(f => f.name === activeFixedFileId)?.content || fixResult.correctedCode);

  // Build the files array using edited content where available
  const currentFiles = parsedFiles.map(f => ({
    ...f,
    content: editedFiles[f.name] !== undefined ? editedFiles[f.name] : f.content,
  }));

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(activeContent);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* ignore */ }
  };

  const handleRunFixed = async () => {
    if (!fixResult.correctedCode || running) return;
    setRunning(true);
    setRunResult(null);
    try {
      const mainFile = activeFixedFileId || parsedFiles[0]?.name;

      const API_BASE = import.meta.env.VITE_API_URL ? `${import.meta.env.VITE_API_URL}/api` : "/api";
      const res = await fetch(`${API_BASE}/run`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ files: currentFiles, mainFile, language, stdinInput: fixedStdinInput || undefined }),
      });
      const data = await res.json();
      if (!res.ok) {
        setRunResult({ stdout: "", stderr: data.error || "Failed to run", exitCode: 1, timedOut: false, executionTime: 0, language });
      } else {
        setRunResult(data);
      }
    } catch (err) {
      setRunResult({ stdout: "", stderr: "Failed to connect to backend.", exitCode: 1, timedOut: false, executionTime: 0, language });
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="stagger-children" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* Corrected code block */}
      <div style={{ borderRadius: 14, background: "var(--code-block-bg)", border: "1px solid var(--border-glass)", overflow: "hidden" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 18px", borderBottom: "1px solid var(--border-glass)" }}>
          <span style={{ fontSize: "0.8rem", fontWeight: 600, color: "var(--success)", display: "flex", alignItems: "center", gap: 6 }}>
            <FiCheckCircle size={14} /> Corrected Code
          </span>
          <div style={{ display: "flex", gap: 8 }}>
            {/* Run Fixed Code Button */}
            <button
              id="run-fixed-code-btn"
              onClick={handleRunFixed}
              disabled={running}
              style={{
                display: "flex", alignItems: "center", gap: 6,
                padding: "6px 14px", borderRadius: 8,
                background: running ? "rgba(16,185,129,0.08)" : "rgba(16,185,129,0.12)",
                border: "1px solid rgba(16,185,129,0.3)",
                color: "var(--success)", fontSize: "0.78rem", fontWeight: 600,
                cursor: running ? "wait" : "pointer",
                transition: "all 0.2s",
              }}
              onMouseEnter={(e) => { if (!running) e.currentTarget.style.background = "rgba(16,185,129,0.2)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = running ? "rgba(16,185,129,0.08)" : "rgba(16,185,129,0.12)"; }}
            >
              <FiPlay size={13} style={running ? { animation: "spin 1s linear infinite" } : {}} />
              {running ? "Running..." : "Run Fixed Code"}
            </button>

            {/* Copy Button */}
            <button id="copy-code-btn" onClick={handleCopy} style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 14px", borderRadius: 8, background: copied ? "rgba(52,211,153,0.15)" : "rgba(255,255,255,0.05)", border: `1px solid ${copied ? "rgba(52,211,153,0.3)" : "var(--border-glass)"}`, color: copied ? "var(--success)" : "var(--text-secondary)", fontSize: "0.78rem", fontWeight: 500, cursor: "pointer", transition: "all 0.2s" }}>
              {copied ? <><FiCheck size={13} /> Copied!</> : <><FiCopy size={13} /> Copy</>}
            </button>
          </div>
        </div>

        {/* ── File Tabs for Corrected Code ───────────────────────────────────── */}
        {parsedFiles.length > 1 && (
          <div style={{ display: "flex", overflowX: "auto", background: "rgba(0,0,0,0.15)", borderBottom: "1px solid var(--border-glass)" }}>
            {parsedFiles.map(f => (
              <div 
                key={f.name} 
                onClick={() => setActiveFixedFileId(f.name)}
                style={{
                  padding: "8px 16px",
                  cursor: "pointer",
                  background: f.name === activeFixedFileId ? "rgba(255,255,255,0.05)" : "transparent",
                  borderRight: "1px solid var(--border-glass)",
                  borderTop: f.name === activeFixedFileId ? "2px solid var(--success)" : "2px solid transparent",
                  color: f.name === activeFixedFileId ? "var(--text-primary)" : "var(--text-muted)",
                  fontSize: "0.8rem",
                  fontWeight: f.name === activeFixedFileId ? 600 : 500,
                  fontFamily: "var(--font-mono)",
                  display: "flex", alignItems: "center", gap: 8,
                  minWidth: "max-content",
                  transition: "all 0.2s",
                }}
              >
                {f.name}
              </div>
            ))}
          </div>
        )}

        <div style={{ height: 350 }}>
          <Editor
            height="100%"
            language={MONACO_LANG_MAP[language] || "plaintext"}
            value={activeContent}
            onChange={(val) => {
              setEditedFiles(prev => ({ ...prev, [activeFixedFileId]: val || "" }));
            }}
            theme={editorTheme}
            options={{
              fontSize: 14,
              fontFamily: "var(--font-mono)",
              minimap: { enabled: false },
              scrollBeyondLastLine: false,
              padding: { top: 16, bottom: 16 },
              lineNumbers: "on",
              roundedSelection: true,
              automaticLayout: true,
              wordWrap: "on",
              tabSize: 4,
              renderLineHighlight: "gutter",
              cursorBlinking: "smooth",
              smoothScrolling: true,
            }}
          />
        </div>
      </div>

      {/* Stdin input for fixed code */}
      <div style={{ borderRadius: 14, background: "var(--bg-glass)", border: "1px solid var(--border-glass)", overflow: "hidden" }}>
        <button
          type="button"
          onClick={() => setFixedStdinOpen(!fixedStdinOpen)}
          style={{
            width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between",
            padding: "10px 18px", background: "transparent", border: "none",
            color: fixedStdinOpen ? "var(--accent-primary)" : "var(--text-muted)",
            cursor: "pointer", fontSize: "0.78rem", fontWeight: 600,
            fontFamily: "var(--font-mono)", transition: "color 0.2s",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <FiTerminal size={13} />
            <span>Program Input (stdin)</span>
            {fixedStdinInput && (
              <span style={{
                padding: "2px 8px", borderRadius: 6, fontSize: "0.68rem",
                background: "rgba(99,102,241,0.15)", color: "var(--accent-primary)",
                fontWeight: 700,
              }}>has input</span>
            )}
          </div>
          {fixedStdinOpen ? <FiChevronUp size={13} /> : <FiChevronDown size={13} />}
        </button>
        {fixedStdinOpen && (
          <div style={{ padding: "0 18px 14px" }}>
            <textarea
              value={fixedStdinInput}
              onChange={(e) => setFixedStdinInput(e.target.value)}
              placeholder={`Enter input your program expects...\ne.g. for input("Enter name: ") or cin >> name`}
              rows={3}
              spellCheck={false}
              style={{
                width: "100%", resize: "vertical",
                background: "var(--terminal-bg)",
                border: "1px solid var(--border-glass)", borderRadius: 8,
                color: "var(--terminal-stdout)",
                fontFamily: "var(--font-mono)", fontSize: "0.82rem",
                padding: "10px 14px", outline: "none", lineHeight: 1.6,
                boxSizing: "border-box",
              }}
              onFocus={(e) => e.target.style.borderColor = "var(--accent-primary)"}
              onBlur={(e) => e.target.style.borderColor = "var(--border-glass)"}
            />
            
            <div style={{ display: "flex", gap: "8px", marginTop: "8px", alignItems: "center" }}>
              <button
                type="button"
                className="btn-outline"
                style={{ padding: "4px 10px", fontSize: "0.75rem", background: "rgba(139,92,246,0.15)", borderColor: "rgba(139,92,246,0.4)", color: "var(--accent-primary)", borderRadius: 6, cursor: "pointer" }}
                onClick={async () => {
                  if (!activeContent.trim()) return;
                  setSuggestingFixedInput(true);
                  try {
                    const API_BASE = import.meta.env.VITE_API_URL ? `${import.meta.env.VITE_API_URL}/api` : "/api";
                    const res = await fetch(`${API_BASE}/suggest-input`, {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      credentials: "include",
                      body: JSON.stringify({ code: activeContent, language }),
                    });
                    if (res.ok) {
                      const data = await res.json();
                      if (data.input) setFixedStdinInput(data.input);
                    }
                  } catch (e) {
                    console.error("Failed to suggest input", e);
                  } finally {
                    setSuggestingFixedInput(false);
                  }
                }}
                disabled={suggestingFixedInput || !activeContent.trim()}
              >
                {suggestingFixedInput ? "Generating..." : "Suggest Input ✨"}
              </button>

              {fixedStdinInput && (
                <button
                  type="button"
                  style={{
                    background: "transparent", border: "1px solid var(--border-glass)",
                    color: "var(--text-muted)", padding: "4px 10px", borderRadius: 6,
                    fontSize: "0.75rem", cursor: "pointer"
                  }}
                  onClick={() => setFixedStdinInput("")}
                >
                  Clear
                </button>
              )}
              <span style={{ fontSize: "0.7rem", color: "var(--text-muted)", fontStyle: "italic", marginLeft: "auto" }}>
                💡 Provide input your fixed code expects (e.g. from input() or cin)
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Run Result (inline terminal) */}
      {runResult && (
        <TerminalOutput runResult={runResult} />
      )}

      {/* Changes made */}
      {fixResult.changesMade && fixResult.changesMade.length > 0 && (
        <div style={{ padding: "18px 20px", borderRadius: 14, background: "var(--bg-glass)", border: "1px solid var(--border-glass)" }}>
          <p style={{ fontSize: "0.78rem", color: "var(--text-muted)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 12 }}>Changes Made</p>
          <ul style={{ listStyle: "none", display: "flex", flexDirection: "column", gap: 8 }}>
            {fixResult.changesMade.map((change, i) => (
              <li key={i} style={{ display: "flex", alignItems: "flex-start", gap: 10, fontSize: "0.84rem", color: "var(--text-secondary)", lineHeight: 1.6 }}>
                <span style={{ color: "var(--success)", fontWeight: 700, flexShrink: 0 }}>✓</span>
                {change}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Tips */}
      {fixResult.tips && fixResult.tips.length > 0 && (
        <div style={{ padding: "18px 20px", borderRadius: 14, background: "rgba(99,102,241,0.04)", border: "1px solid rgba(99,102,241,0.12)" }}>
          <p style={{ fontSize: "0.78rem", color: "var(--text-muted)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 12 }}>💡 Pro Tips</p>
          <ul style={{ listStyle: "none", display: "flex", flexDirection: "column", gap: 8 }}>
            {fixResult.tips.map((tip, i) => (
              <li key={i} style={{ display: "flex", alignItems: "flex-start", gap: 10, fontSize: "0.84rem", color: "var(--text-secondary)", lineHeight: 1.6 }}>
                <span style={{ color: "var(--accent-primary)", flexShrink: 0 }}>→</span>
                {tip}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
