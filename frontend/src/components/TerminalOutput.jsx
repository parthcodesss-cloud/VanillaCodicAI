import { FiTerminal, FiClock, FiCheckCircle, FiXCircle, FiAlertTriangle } from "react-icons/fi";

export default function TerminalOutput({ runResult }) {
  if (!runResult) return null;

  const { stdout, stderr, exitCode, executionTime, timedOut, language } = runResult;
  const hasOutput = stdout || stderr;
  const isSuccess = exitCode === 0;

  return (
    <div className="animate-fade-in-up" style={{
      borderRadius: 14, overflow: "hidden",
      border: "1px solid var(--border-glass)",
      background: "var(--terminal-bg)",
    }}>
      {/* Terminal Header Bar */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "10px 16px",
        background: "var(--terminal-header)",
        borderBottom: "1px solid var(--border-glass)",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ display: "flex", gap: 6 }}>
            <span style={{ width: 12, height: 12, borderRadius: "50%", background: "#ff5f57" }} />
            <span style={{ width: 12, height: 12, borderRadius: "50%", background: "#febc2e" }} />
            <span style={{ width: 12, height: 12, borderRadius: "50%", background: "#28c840" }} />
          </div>
          <FiTerminal size={14} style={{ color: "var(--text-muted)", marginLeft: 6 }} />
          <span style={{
            fontSize: "0.75rem", fontWeight: 600,
            color: "var(--text-muted)", fontFamily: "var(--font-mono)",
          }}>
            {language || "terminal"} — output
          </span>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          {/* Execution Time */}
          {executionTime !== undefined && (
            <div style={{
              display: "flex", alignItems: "center", gap: 4,
              padding: "3px 8px", borderRadius: 6,
              background: "var(--bg-glass)",
              fontSize: "0.7rem", fontWeight: 600,
              color: "var(--text-muted)", fontFamily: "var(--font-mono)",
            }}>
              <FiClock size={11} />
              {executionTime}ms
            </div>
          )}

          {/* Exit Code Badge */}
          <div style={{
            display: "flex", alignItems: "center", gap: 4,
            padding: "3px 8px", borderRadius: 6,
            background: timedOut
              ? "rgba(251,191,36,0.12)"
              : isSuccess
              ? "rgba(52,211,153,0.12)"
              : "rgba(248,113,113,0.12)",
            fontSize: "0.7rem", fontWeight: 700, fontFamily: "var(--font-mono)",
            color: timedOut ? "var(--warning)" : isSuccess ? "var(--success)" : "var(--error)",
          }}>
            {timedOut ? (
              <><FiAlertTriangle size={11} /> Timed Out</>
            ) : isSuccess ? (
              <><FiCheckCircle size={11} /> Exit 0</>
            ) : (
              <><FiXCircle size={11} /> Exit {exitCode}</>
            )}
          </div>
        </div>
      </div>

      {/* Terminal Body */}
      <div style={{
        padding: "16px 20px", minHeight: 80, maxHeight: 400,
        overflowY: "auto", fontFamily: "var(--font-mono)", fontSize: "0.82rem",
        lineHeight: 1.7,
      }}>
        {!hasOutput && !timedOut && (
          <span style={{ color: "var(--text-muted)", fontStyle: "italic" }}>
            No output produced.
          </span>
        )}

        {timedOut && (
          <div style={{
            padding: "10px 14px", borderRadius: 8, marginBottom: 10,
            background: "rgba(251,191,36,0.08)", border: "1px solid rgba(251,191,36,0.15)",
            color: "var(--warning)", fontSize: "0.8rem",
          }}>
            ⏱️ Execution timed out after 30 seconds. Your code may have an infinite loop, or it may need user input — try adding input in the "Program Input (stdin)" section below the editor.
          </div>
        )}

        {/* stdout */}
        {stdout && (
          <pre style={{
            margin: 0, whiteSpace: "pre-wrap", wordBreak: "break-word",
            color: "var(--terminal-stdout)",
          }}>
            {stdout}
          </pre>
        )}

        {/* stderr */}
        {stderr && (() => {
          const isEOF = stderr.includes("EOFError: EOF when reading a line") || stderr.includes("java.util.NoSuchElementException: No line found");
          return (
            <div style={{ margin: stdout ? "12px 0 0" : 0 }}>
              <pre style={{
                margin: 0, whiteSpace: "pre-wrap", wordBreak: "break-word",
                color: "var(--terminal-stderr)",
                padding: "10px 14px", borderRadius: isEOF ? "8px 8px 0 0" : 8,
                background: "var(--bg-glass)",
                borderLeft: "3px solid var(--error)",
              }}>
                {stderr}
              </pre>
              {isEOF && (
                <div style={{
                  padding: "8px 14px", background: "rgba(139,92,246,0.1)", color: "var(--accent-primary)",
                  borderBottomLeftRadius: 8, borderBottomRightRadius: 8, fontSize: "0.8rem",
                  borderLeft: "3px solid var(--accent-primary)", marginTop: 2,
                }}>
                  💡 <strong>Hint:</strong> It looks like your code was waiting for input, but none was provided. Please type your inputs in the <strong>Program Input (stdin)</strong> panel and try running again!
                </div>
              )}
            </div>
          );
        })()}
      </div>
    </div>
  );
}
