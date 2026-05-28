import { FiAlertCircle, FiCode, FiTerminal, FiZap, FiClock, FiCpu, FiAlertTriangle, FiChevronLeft, FiChevronRight } from "react-icons/fi";
import { useRef, useEffect, useState } from "react";
import ErrorCard from "./ErrorCard.jsx";
import CodeSmellCard from "./CodeSmellCard.jsx";
import CorrectedCodeView from "./CorrectedCodeView.jsx";
import MistakeHistory from "./MistakeHistory.jsx";
import TerminalOutput from "./TerminalOutput.jsx";

export default function OutputPanel({
  debugResult, fixResult, runResults = {}, activeRunFile, setActiveRunFile, activeTab, setActiveTab,
  error, loading, personalization, language, theme
}) {
  const hasDebug = debugResult !== null;
  const hasFix = fixResult !== null;
  const hasRun = Object.keys(runResults).length > 0;
  const hasContent = hasDebug || hasFix || hasRun || error;

  const panelRef = useRef(null);

  useEffect(() => {
    if (!loading && hasContent && panelRef.current) {
      if (window.innerWidth <= 1000) {
        panelRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    }
  }, [loading, hasContent]);

  return (
    <section ref={panelRef} className="glass-card animate-slide-right" style={{
      flex: 1, display: "flex", flexDirection: "column", minWidth: 0, overflow: "hidden",
    }}>
      {/* Tabs */}
      <div style={{ display: "flex", borderBottom: "1px solid var(--border-glass)" }}>
        <TabButton active={activeTab === "debug"} onClick={() => setActiveTab("debug")}
          icon={<FiAlertCircle size={15} />} label="Analysis" color="var(--accent-primary)" id="tab-debug" />
        <TabButton active={activeTab === "fix"} onClick={() => setActiveTab("fix")}
          icon={<FiCode size={15} />} label="Fixed Code" color="var(--success)" id="tab-fix" />
        <TabButton active={activeTab === "run"} onClick={() => setActiveTab("run")}
          icon={<FiTerminal size={15} />} label="Terminal" color="var(--warning)" id="tab-run" />
      </div>

      {/* Body */}
      <div style={{ flex: 1, overflowY: "auto", padding: "20px" }}>
        {/* Error */}
        {error && (
          <div className="animate-fade-in-up" style={{
            padding: "16px 20px", borderRadius: 12,
            background: "rgba(248,113,113,0.08)", border: "1px solid rgba(248,113,113,0.2)",
            color: "var(--error)", fontSize: "0.9rem",
            display: "flex", alignItems: "center", gap: 10,
          }}>
            <FiAlertTriangle size={18} /> {error}
          </div>
        )}

        {/* Empty */}
        {!hasContent && !loading && (
          <div style={{
            display: "flex", flexDirection: "column", alignItems: "center",
            justifyContent: "center", height: "100%", minHeight: 300, gap: 16, textAlign: "center",
          }} className="animate-fade-in">
            <div style={{
              width: 80, height: 80, borderRadius: 20,
              background: "rgba(99,102,241,0.08)",
              display: "flex", alignItems: "center", justifyContent: "center",
              animation: "float 3s ease-in-out infinite",
            }}>
              <FiZap size={36} color="var(--accent-primary)" />
            </div>
            <h3 style={{ fontSize: "1.1rem", fontWeight: 700, color: "var(--text-primary)" }}>
              Ready to analyze
            </h3>
            <p style={{ fontSize: "0.85rem", color: "var(--text-muted)", maxWidth: 300, lineHeight: 1.6 }}>
              Paste your code and click <strong style={{ color: "var(--accent-primary)" }}>Debug</strong> to find bugs, <strong style={{ color: "var(--success)" }}>Fix Code</strong> for corrections, or <strong style={{ color: "var(--warning)" }}>Run</strong> to execute it.
            </p>
          </div>
        )}

        {/* Loading Skeleton */}
        {loading && (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div className="shimmer" style={{ height: 24, width: "60%" }} />
            <div className="shimmer" style={{ height: 100 }} />
            <div className="shimmer" style={{ height: 100 }} />
            <div className="shimmer" style={{ height: 60, width: "40%" }} />
          </div>
        )}

        {/* Debug Results - Carousel UI */}
        {!loading && activeTab === "debug" && hasDebug && (
          <DebugCarousel debugResult={debugResult} personalization={personalization} />
        )}

        {/* Fix Results */}
        {!loading && activeTab === "fix" && hasFix && (
          <CorrectedCodeView fixResult={fixResult} language={language} theme={theme} />
        )}

        {/* Run Results */}
        {!loading && activeTab === "run" && hasRun && (
          <div style={{ display: "flex", flexDirection: "column", height: "100%", gap: 16 }}>
            {Object.keys(runResults).length > 1 && (
              <div style={{ display: "flex", overflowX: "auto", background: "rgba(0,0,0,0.15)", borderRadius: 12, border: "1px solid var(--border-glass)" }}>
                {Object.keys(runResults).map(filename => (
                  <div 
                    key={filename} 
                    onClick={() => setActiveRunFile(filename)}
                    style={{
                      padding: "10px 18px", cursor: "pointer",
                      background: filename === activeRunFile ? "rgba(255,255,255,0.05)" : "transparent",
                      borderRight: "1px solid var(--border-glass)",
                      borderTop: filename === activeRunFile ? "2px solid var(--warning)" : "2px solid transparent",
                      color: filename === activeRunFile ? "var(--text-primary)" : "var(--text-muted)",
                      fontSize: "0.8rem", fontWeight: filename === activeRunFile ? 600 : 500,
                      fontFamily: "var(--font-mono)", transition: "all 0.2s",
                      minWidth: "max-content",
                    }}
                  >
                    {filename}
                  </div>
                ))}
              </div>
            )}
            {activeRunFile && runResults[activeRunFile] && (
              <TerminalOutput runResult={runResults[activeRunFile]} />
            )}
          </div>
        )}

        {/* Run tab empty state */}
        {!loading && activeTab === "run" && !hasRun && !error && (
          <div style={{
            display: "flex", flexDirection: "column", alignItems: "center",
            justifyContent: "center", height: "100%", minHeight: 300, gap: 16, textAlign: "center",
          }} className="animate-fade-in">
            <div style={{
              width: 80, height: 80, borderRadius: 20,
              background: "rgba(251,191,36,0.08)",
              display: "flex", alignItems: "center", justifyContent: "center",
              animation: "float 3s ease-in-out infinite",
            }}>
              <FiTerminal size={36} color="var(--warning)" />
            </div>
            <h3 style={{ fontSize: "1.1rem", fontWeight: 700, color: "var(--text-primary)" }}>
              Ready to run
            </h3>
            <p style={{ fontSize: "0.85rem", color: "var(--text-muted)", maxWidth: 300, lineHeight: 1.6 }}>
              Click the <strong style={{ color: "var(--warning)" }}>Run</strong> button to execute your code and see the output here. Supports <strong>Python</strong> and <strong>JavaScript</strong>.
            </p>
          </div>
        )}
      </div>
    </section>
  );
}

function TabButton({ active, onClick, icon, label, color, id }) {
  return (
    <button id={id} onClick={onClick} style={{
      flex: 1, padding: "14px 20px",
      background: active ? `${color}14` : "transparent",
      border: "none",
      borderBottom: active ? `2px solid ${color}` : "2px solid transparent",
      color: active ? color : "var(--text-muted)",
      fontSize: "0.85rem", fontWeight: 600, cursor: "pointer",
      transition: "all 0.2s",
      display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
      fontFamily: "var(--font-sans)",
    }}>
      {icon} {label}
    </button>
  );
}

function ComplexityBox({ icon, label, value }) {
  return (
    <div style={{
      flex: 1, minWidth: 140, padding: "14px 18px", borderRadius: 12,
      background: "var(--bg-glass)", border: "1px solid var(--border-glass)",
      display: "flex", alignItems: "center", gap: 10,
    }}>
      <span style={{ color: "var(--accent-primary)" }}>{icon}</span>
      <div>
        <p style={{ fontSize: "0.7rem", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em", fontWeight: 600 }}>
          {label}
        </p>
        <p style={{ fontSize: "0.95rem", fontWeight: 700, color: "var(--text-primary)", fontFamily: "var(--font-mono)" }}>
          {value}
        </p>
      </div>
    </div>
  );
}

function DebugCarousel({ debugResult, personalization }) {
  const [slide, setSlide] = useState(0);

  const overviewSlide = (
    <div className="animate-pop-in" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <MistakeHistory personalization={personalization} />
      <div style={{
        padding: "14px 18px", borderRadius: 12,
        background: "var(--accent-glow)", border: "1px solid var(--border-glow)",
      }}>
        <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", lineHeight: 1.6 }}>
          <strong style={{ color: "var(--accent-primary)" }}>Summary: </strong>
          {debugResult.summary}
        </p>
      </div>
      
      {(!debugResult.errors || debugResult.errors.length === 0) && (
        <div style={{
          padding: "20px", borderRadius: 12,
          background: "rgba(16, 185, 129, 0.08)", border: "1px solid rgba(16, 185, 129, 0.2)",
          textAlign: "center",
        }}>
          <p style={{ fontSize: "0.9rem", color: "var(--success)", fontWeight: 600 }}>
            🎉 No errors found! Your code looks great.
          </p>
        </div>
      )}

      <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
        {debugResult.timeComplexity && (
          <ComplexityBox icon={<FiClock size={16} />} label="Time Complexity" value={debugResult.timeComplexity} />
        )}
        {debugResult.spaceComplexity && (
          <ComplexityBox icon={<FiCpu size={16} />} label="Space Complexity" value={debugResult.spaceComplexity} />
        )}
      </div>

      {debugResult.overallAssessment && (
        <div style={{
          padding: "16px 20px", borderRadius: 12,
          background: "var(--bg-glass)", border: "1px solid var(--border-glass)",
        }}>
          <p style={{ fontSize: "0.7rem", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em", fontWeight: 600, marginBottom: 8 }}>
            Overall Assessment
          </p>
          <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", lineHeight: 1.7 }}>
            {debugResult.overallAssessment}
          </p>
        </div>
      )}
    </div>
  );

  const slides = [overviewSlide];

  if (debugResult.errors) {
    debugResult.errors.forEach((err, i) => {
      slides.push(
        <div key={`err-${i}`} className="animate-pop-in" style={{ display: "flex", flexDirection: "column" }}>
           <p style={{ fontSize: "0.72rem", color: "var(--error)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 8 }}>
             Issue Detected
           </p>
           <ErrorCard error={err} />
        </div>
      );
    });
  }

  if (debugResult.codeSmells) {
    debugResult.codeSmells.forEach((smell, i) => {
      slides.push(
        <div key={`smell-${i}`} className="animate-pop-in" style={{ display: "flex", flexDirection: "column" }}>
           <p style={{ fontSize: "0.72rem", color: "var(--warning)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 8 }}>
             Code Quality Suggestion
           </p>
           <CodeSmellCard smell={smell} />
        </div>
      );
    });
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      {/* Slide Content */}
      <div style={{ flex: 1, paddingBottom: 16 }}>
        {slides[slide]}
      </div>

      {/* Navigation Controls */}
      {slides.length > 1 && (
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          paddingTop: 16, borderTop: "1px solid var(--border-glass)", marginTop: "auto", position: "sticky", bottom: 0, background: "var(--bg-card)", paddingBottom: 8
        }}>
          <button
            disabled={slide === 0}
            onClick={() => setSlide(s => s - 1)}
            style={{
              display: "flex", alignItems: "center", gap: 6,
              background: slide === 0 ? "transparent" : "var(--bg-glass)",
              border: "1px solid var(--border-glass)",
              padding: "8px 16px", borderRadius: 8,
              color: slide === 0 ? "var(--text-muted)" : "var(--text-primary)",
              cursor: slide === 0 ? "not-allowed" : "pointer",
              transition: "all 0.2s"
            }}
          >
            <FiChevronLeft size={16} /> Prev
          </button>

          <div style={{ display: "flex", gap: 6 }}>
            {slides.map((_, i) => (
              <div 
                key={i} 
                onClick={() => setSlide(i)}
                style={{
                  width: i === slide ? 20 : 8, height: 8, borderRadius: 4,
                  background: i === slide ? "var(--accent-primary)" : "var(--border-glass)",
                  transition: "all 0.3s ease", cursor: "pointer"
                }} 
              />
            ))}
          </div>

          <button
            disabled={slide === slides.length - 1}
            onClick={() => setSlide(s => s + 1)}
            style={{
              display: "flex", alignItems: "center", gap: 6,
              background: slide === slides.length - 1 ? "transparent" : "var(--accent-glow)",
              border: slide === slides.length - 1 ? "1px solid var(--border-glass)" : "1px solid var(--border-glow)",
              padding: "8px 16px", borderRadius: 8,
              color: slide === slides.length - 1 ? "var(--text-muted)" : "var(--accent-primary)",
              cursor: slide === slides.length - 1 ? "not-allowed" : "pointer",
              transition: "all 0.2s", fontWeight: 600
            }}
          >
            Next <FiChevronRight size={16} />
          </button>
        </div>
      )}
    </div>
  );
}
