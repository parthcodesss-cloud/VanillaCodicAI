import Editor from "@monaco-editor/react";
import { FiSearch, FiTool, FiPlay, FiChevronDown, FiTerminal, FiChevronUp } from "react-icons/fi";
import { useState } from "react";

const LANGUAGES = [
  { value: "python", label: "Python", icon: "🐍" },
  { value: "javascript", label: "JavaScript", icon: "⚡" },
  { value: "java", label: "Java", icon: "☕" },
  { value: "cpp", label: "C++", icon: "⚙️" },
];

const MONACO_LANG_MAP = {
  python: "python",
  javascript: "javascript",
  java: "java",
  cpp: "cpp",
};

const SAMPLE_FILES = {
  python: [{ id: "1", name: "main.py", content: `# Paste your Python code here\n\ndef greet(name):\n    print("Hello, " + name)\n\ngreet("World")\ngreet("VanillaCodic")\n` }],
  javascript: [{ id: "1", name: "main.js", content: `// Paste your JavaScript code here\n\nfunction greet(name) {\n  console.log("Hello, " + name);\n}\n\ngreet("World");\ngreet("VanillaCodic");\n` }],
  java: [{ id: "1", name: "Main.java", content: `// Paste your Java code here\n\npublic class Main {\n    public static void main(String[] args) {\n        System.out.println("Hello, World!");\n        System.out.println("Hello, VanillaCodic!");\n    }\n}\n` }],
  cpp: [{ id: "1", name: "main.cpp", content: `// Paste your C++ code here\n\n#include <iostream>\nusing namespace std;\n\nint main() {\n    cout << "Hello, World!" << endl;\n    cout << "Hello, VanillaCodic!" << endl;\n    return 0;\n}\n` }],
};

export default function CodeInputPanel({
  files,
  setFiles,
  activeFileId,
  setActiveFileId,
  language,
  setLanguage,
  onDebug,
  onFix,
  onRun,
  loading,
  theme,
  stdinInput,
  setStdinInput,
  isTestMode = false,
}) {
  const [stdinOpen, setStdinOpen] = useState(false);
  const [suggestingInput, setSuggestingInput] = useState(false);

  const handleLanguageChange = (e) => {
    const newLang = e.target.value;
    setLanguage(newLang);
    const newFiles = SAMPLE_FILES[newLang] || SAMPLE_FILES["python"];
    setFiles(newFiles);
    setActiveFileId(newFiles[0].id);
  };

  const editorTheme = theme === "light" ? "vs" : "vs-dark";

  return (
    <section
      className={isTestMode ? "animate-slide-left" : "glass-card animate-slide-left"}
      style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        minWidth: 0,
        overflow: "hidden",
        background: isTestMode ? "transparent" : undefined,
        border: isTestMode ? "none" : undefined,
        boxShadow: isTestMode ? "none" : undefined,
        height: "100%",
      }}
    >
      {/* ── Toolbar ──────────────────────────────────────── */}
      {!isTestMode && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "16px 20px",
            borderBottom: "1px solid var(--border-glass)",
            flexWrap: "wrap",
            gap: "12px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <div
              style={{
                width: 10,
                height: 10,
                borderRadius: "50%",
                background: "#f87171",
              }}
            />
            <div
              style={{
                width: 10,
                height: 10,
                borderRadius: "50%",
                background: "#fbbf24",
              }}
            />
            <div
              style={{
                width: 10,
                height: 10,
                borderRadius: "50%",
                background: "#34d399",
              }}
            />
            <span
              style={{
                marginLeft: 8,
                fontSize: "0.8rem",
                fontWeight: 600,
                color: "var(--text-secondary)",
                fontFamily: "var(--font-mono)",
              }}
            >
              code_input
            </span>
          </div>

          {/* Language Selector */}
          <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
            <select
              id="language-selector"
              value={language}
              onChange={handleLanguageChange}
              style={{
                appearance: "none",
                background: "var(--select-bg, rgba(255,255,255,0.05))",
                border: "1px solid var(--border-glass)",
                borderRadius: 10,
                padding: "8px 36px 8px 14px",
                color: "var(--text-primary)",
                fontSize: "0.85rem",
                fontWeight: 500,
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
              {LANGUAGES.map((lang) => (
                <option
                  key={lang.value}
                  value={lang.value}
                  style={{ background: "var(--bg-secondary)", color: "var(--text-primary)" }}
                >
                  {lang.icon} {lang.label}
                </option>
              ))}
            </select>
            <FiChevronDown
              size={14}
              style={{
                position: "absolute",
                right: 12,
                pointerEvents: "none",
                color: "var(--text-muted)",
              }}
            />
          </div>
        </div>
      )}

      {/* ── File Tabs ───────────────────────────────────── */}
      {!isTestMode && (
        <div style={{ display: "flex", overflowX: "auto", background: "var(--bg-secondary)", borderBottom: "1px solid var(--border-glass)" }}>
          {files.map(f => (
            <div 
              key={f.id} 
              onClick={() => setActiveFileId(f.id)}
              style={{
                padding: "8px 16px",
                cursor: "pointer",
                background: f.id === activeFileId ? "var(--bg-primary)" : "transparent",
                borderRight: "1px solid var(--border-glass)",
                borderTop: f.id === activeFileId ? "2px solid var(--accent-primary)" : "2px solid transparent",
                color: f.id === activeFileId ? "var(--text-primary)" : "var(--text-muted)",
                fontSize: "0.8rem",
                fontWeight: f.id === activeFileId ? 600 : 500,
                fontFamily: "var(--font-mono)",
                display: "flex", alignItems: "center", gap: 8,
                minWidth: "max-content",
              }}
            >
              <input 
                value={f.name}
                onChange={(e) => {
                  setFiles(files.map(file => file.id === f.id ? { ...file, name: e.target.value } : file));
                }}
                onClick={(e) => { if (f.id === activeFileId) e.stopPropagation(); }}
                style={{
                  background: "transparent", border: "none", color: "inherit",
                  fontFamily: "inherit", fontSize: "inherit", fontWeight: "inherit",
                  width: `${Math.max(f.name.length, 3)}ch`,
                  outline: "none"
                }}
              />
              {files.length > 1 && (
                <span 
                  onClick={(e) => {
                    e.stopPropagation();
                    const newFiles = files.filter(file => file.id !== f.id);
                    setFiles(newFiles);
                    if (activeFileId === f.id) setActiveFileId(newFiles[0].id);
                  }}
                  style={{ cursor: "pointer", opacity: 0.6 }}
                >
                  ×
                </span>
              )}
            </div>
          ))}
          <button
            onClick={() => {
              const ext = language === "python" ? ".py" : language === "javascript" ? ".js" : language === "java" ? ".java" : ".cpp";
              const newId = Date.now().toString();
              setFiles([...files, { id: newId, name: `new_file${ext}`, content: "" }]);
              setActiveFileId(newId);
            }}
            style={{
              background: "transparent", border: "none", color: "var(--text-muted)",
              padding: "0 16px", cursor: "pointer", fontSize: "1.2rem",
              display: "flex", alignItems: "center"
            }}
            title="Add File"
          >
            +
          </button>
        </div>
      )}

      {/* ── Monaco Editor ────────────────────────────────── */}
      <div style={{ flex: 1, minHeight: 200, height: isTestMode ? "100%" : "auto", maxHeight: isTestMode ? "none" : "calc(100vh - 340px)" }} className="monaco-wrapper">
        <Editor
          height="100%"
          language={MONACO_LANG_MAP[language]}
          value={files.find(f => f.id === activeFileId)?.content || ""}
          onChange={(val) => {
            const code = val || "";
            const currentFile = files.find(f => f.id === activeFileId);
            const currentContent = currentFile?.content || "";
            let newLang = language;
            let newFileName = currentFile?.name || "main.py";
            
            // Detect paste or large chunk insertions
            if (Math.abs(code.length - currentContent.length) > 20) {
              const heuristics = [
                { lang: "python", score: (code.match(/def \w+\(/g)?.length || 0) + (code.match(/import \w+/g)?.length || 0) + (code.match(/print\(/g)?.length || 0) * 0.5 },
                { lang: "java", score: (code.match(/public class \w+/g)?.length || 0) * 2 + (code.match(/System\.out\.println/g)?.length || 0) + (code.match(/public static void main/g)?.length || 0) },
                { lang: "cpp", score: (code.match(/#include\s*<.*>/g)?.length || 0) * 2 + (code.match(/using namespace std;/g)?.length || 0) + (code.match(/cout\s*<</g)?.length || 0) },
                { lang: "javascript", score: (code.match(/console\.log\(/g)?.length || 0) + (code.match(/const \w+\s*=/g)?.length || 0) + (code.match(/let \w+\s*=/g)?.length || 0) + (code.match(/function \w+\(/g)?.length || 0) },
              ];
              const bestMatch = heuristics.reduce((a, b) => a.score > b.score ? a : b);
              if (bestMatch.score > 0 && bestMatch.lang !== language) {
                newLang = bestMatch.lang;
                setLanguage(newLang);
                
                const extMap = { python: ".py", java: ".java", cpp: ".cpp", javascript: ".js" };
                const oldExt = extMap[language];
                const newExt = extMap[newLang];
                if (newFileName.endsWith(oldExt)) {
                  newFileName = newFileName.slice(0, -oldExt.length) + newExt;
                }
              }
            }
            setFiles(files.map(f => f.id === activeFileId ? { ...f, content: code, name: f.id === activeFileId && newLang !== language ? newFileName : f.name } : f));
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

      {/* ── Stdin Input (Collapsible) ─────────────────────────── */}
      {!isTestMode && (
        <div className="stdin-section">
          <button
            type="button"
            className="stdin-toggle"
            onClick={() => setStdinOpen(!stdinOpen)}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <FiTerminal size={14} />
              <span>Program Input (stdin)</span>
              {stdinInput && (
                <span className="stdin-badge">has input</span>
              )}
            </div>
            {stdinOpen ? <FiChevronUp size={14} /> : <FiChevronDown size={14} />}
          </button>
          {stdinOpen && (
            <div className="stdin-body">
              <textarea
                id="stdin-input"
                className="stdin-textarea"
                value={stdinInput}
                onChange={(e) => setStdinInput(e.target.value)}
                placeholder={`Enter input your program expects...\ne.g. for input("Enter name: ") or cin >> name`}
                rows={4}
                spellCheck={false}
              />
              <div style={{ display: "flex", gap: "8px", marginTop: "8px" }}>
                <button
                  type="button"
                  className="btn-outline"
                  style={{ padding: "4px 10px", fontSize: "0.75rem", background: "rgba(139,92,246,0.15)", borderColor: "rgba(139,92,246,0.4)", color: "var(--accent-primary)" }}
                  onClick={async () => {
                    const activeFile = files.find(f => f.id === activeFileId);
                    if (!activeFile || !activeFile.content.trim()) return;
                    setSuggestingInput(true);
                    try {
                      const API_BASE = import.meta.env.VITE_API_URL ? `${import.meta.env.VITE_API_URL}/api` : "/api";
                      const res = await fetch(`${API_BASE}/suggest-input`, {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        credentials: "include",
                        body: JSON.stringify({ code: activeFile.content, language }),
                      });
                      if (res.ok) {
                        const data = await res.json();
                        if (data.input) setStdinInput(data.input);
                      }
                    } catch (e) {
                      console.error("Failed to suggest input", e);
                    } finally {
                      setSuggestingInput(false);
                    }
                  }}
                  disabled={suggestingInput || !files.some(f => f.content.trim())}
                >
                  {suggestingInput ? "Generating..." : "Suggest Input ✨"}
                </button>

                {stdinInput && (
                  <button
                    type="button"
                    className="stdin-clear"
                    onClick={() => setStdinInput("")}
                  >
                    Clear
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Action Buttons ───────────────────────────────── */}
      {!isTestMode && (
        <div
          style={{
            display: "flex",
            gap: "10px",
            padding: "16px 20px",
            borderTop: "1px solid var(--border-glass)",
            flexWrap: "wrap",
          }}
        >
          <button
            id="run-code-btn"
            className="btn-run"
            onClick={onRun}
            disabled={loading || !files.some(f => f.content.trim())}
            title="Run your code"
            style={{ flex: 1, minWidth: 120 }}
          >
            <FiPlay size={16} />
            Run
          </button>
          <button
            id="debug-code-btn"
            className="btn-glow"
            onClick={onDebug}
            disabled={loading || !files.some(f => f.content.trim())}
            style={{ flex: 1, minWidth: 120 }}
          >
            <FiSearch size={16} />
            Debug
          </button>
          <button
            id="fix-code-btn"
            className="btn-outline"
            onClick={onFix}
            disabled={loading || !files.some(f => f.content.trim())}
            style={{ flex: 1, minWidth: 120 }}
          >
            <FiTool size={16} />
            Fix Code
          </button>
        </div>
      )}
    </section>
  );
}
