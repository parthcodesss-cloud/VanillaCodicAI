import { useRef, useEffect } from "react";
import { FiCode, FiZap, FiTarget, FiTerminal, FiCpu, FiArrowRight } from "react-icons/fi";
import AuthPage from "./AuthPage.jsx";
import Logo from "../components/Logo.jsx";

export default function LandingPage() {
  const authRef = useRef(null);

  const scrollToAuth = () => {
    if (authRef.current) {
      authRef.current.scrollIntoView({ behavior: "smooth" });
    }
  };

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("visible");
          }
        });
      },
      { threshold: 0.1, rootMargin: "0px 0px -50px 0px" }
    );

    const elements = document.querySelectorAll(".scroll-reveal, .stagger-reveal");
    elements.forEach((el) => observer.observe(el));

    return () => elements.forEach((el) => observer.unobserve(el));
  }, []);

  return (
    <div
      style={{
        height: "100vh",
        overflowY: "auto",
        overflowX: "hidden",
        background: "var(--bg-primary)",
        color: "var(--text-primary)",
        fontFamily: "var(--font-sans)",
        scrollBehavior: "smooth",
        position: "relative",
      }}
    >
      {/* Abstract Background Elements */}
      <div
        style={{
          position: "fixed", top: "-20%", left: "-10%",
          width: "70vw", height: "70vw",
          background: "radial-gradient(circle, rgba(245, 158, 11, 0.05) 0%, transparent 60%)",
          filter: "blur(120px)",
          animation: "float 10s ease-in-out infinite",
          zIndex: 0, pointerEvents: "none",
        }}
      />
      <div
        style={{
          position: "fixed", bottom: "-20%", right: "-10%",
          width: "80vw", height: "80vw",
          background: "radial-gradient(circle, rgba(139, 92, 246, 0.04) 0%, transparent 60%)",
          filter: "blur(140px)",
          animation: "float 12s ease-in-out infinite reverse",
          zIndex: 0, pointerEvents: "none",
        }}
      />
      
      {/* Subtle Grid Overlay */}
      <div style={{
        position: "fixed", inset: 0, zIndex: 0, pointerEvents: "none",
        backgroundImage: "linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px)",
        backgroundSize: "60px 60px",
        maskImage: "radial-gradient(ellipse at center, rgba(0,0,0,1) 0%, transparent 80%)",
        WebkitMaskImage: "radial-gradient(ellipse at center, rgba(0,0,0,1) 0%, transparent 80%)",
      }} />

      {/* Navigation */}
      <nav
        style={{
          width: "100%", maxWidth: "1400px", margin: "0 auto", padding: "32px 40px",
          display: "flex", justifyContent: "space-between", alignItems: "center",
          position: "relative", zIndex: 20,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div
            style={{
              width: 48, height: 48, borderRadius: 14,
              background: "linear-gradient(135deg, rgba(245, 158, 11, 0.2), rgba(245, 158, 11, 0.05))",
              border: "1px solid rgba(245, 158, 11, 0.3)",
              display: "flex", alignItems: "center", justifyContent: "center",
              boxShadow: "0 8px 32px rgba(245, 158, 11, 0.15)",
            }}
          >
            <Logo size={28} bracketsColor="var(--accent-primary)" />
          </div>
          <span style={{ fontSize: "1.5rem", fontWeight: 800, letterSpacing: "-0.5px" }}>VanillaCodicAI</span>
          <span style={{ fontSize: "0.75rem", fontWeight: 600, color: "#f59e0b", background: "rgba(245, 158, 11, 0.1)", padding: "2px 8px", borderRadius: 6, marginLeft: 8 }}>v1.1 (Social & LeetCode)</span>
        </div>
        <button
          onClick={scrollToAuth}
          style={{
            padding: "12px 28px", borderRadius: 12,
            background: "rgba(255, 255, 255, 0.03)",
            border: "1px solid rgba(255, 255, 255, 0.08)",
            color: "var(--text-primary)", fontWeight: 600, fontSize: "0.95rem",
            cursor: "pointer", transition: "all 0.3s cubic-bezier(0.2, 0.8, 0.2, 1)",
            backdropFilter: "blur(12px)",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "rgba(255, 255, 255, 0.08)";
            e.currentTarget.style.transform = "translateY(-2px)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "rgba(255, 255, 255, 0.03)";
            e.currentTarget.style.transform = "translateY(0)";
          }}
        >
          Sign In
        </button>
      </nav>

      {/* Hero Section */}
      <main
        style={{
          display: "flex", flexDirection: "column", alignItems: "center",
          textAlign: "center", padding: "120px 20px 80px", position: "relative",
          zIndex: 10, maxWidth: "1100px", margin: "0 auto", minHeight: "85vh",
          justifyContent: "center",
        }}
      >
        <div
          className="scroll-reveal"
          style={{
            background: "rgba(245, 158, 11, 0.05)", border: "1px solid rgba(245, 158, 11, 0.2)",
            padding: "8px 20px", borderRadius: 40, marginBottom: 40,
            fontSize: "0.9rem", fontWeight: 700, color: "var(--accent-primary)",
            letterSpacing: "1px", textTransform: "uppercase", backdropFilter: "blur(12px)",
          }}
        >
          Next-Generation Developer Tools
        </div>

        <h1
          className="scroll-reveal"
          style={{
            fontSize: "clamp(3.5rem, 8vw, 7rem)", fontWeight: 800, lineHeight: 1.05,
            marginBottom: 32, letterSpacing: "-0.03em",
          }}
        >
          Code Faster with <br />
          <span
            style={{
              background: "var(--gradient-primary)",
              WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
            }}
          >
            Adaptive AI Mentorship
          </span>
        </h1>

        <p
          className="scroll-reveal"
          style={{
            fontSize: "clamp(1.1rem, 2.5vw, 1.35rem)", color: "var(--text-secondary)",
            maxWidth: "760px", marginBottom: 56, lineHeight: 1.7, fontWeight: 400,
          }}
        >
          Instantly debug, format, and execute your code. Track your skills with the radar, maintain coding streaks, and learn from an AI that adapts to your unique mistakes.
        </p>

        <button
          className="scroll-reveal"
          onClick={scrollToAuth}
          style={{
            padding: "20px 48px", borderRadius: 16,
            background: "var(--gradient-primary)", border: "none",
            color: "#fff", fontSize: "1.15rem", fontWeight: 700,
            cursor: "pointer", display: "flex", alignItems: "center", gap: 14,
            boxShadow: "0 20px 40px rgba(245, 158, 11, 0.25)",
            transition: "all 0.4s cubic-bezier(0.2, 0.8, 0.2, 1)",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = "translateY(-4px) scale(1.02)";
            e.currentTarget.style.boxShadow = "0 30px 60px rgba(245, 158, 11, 0.35)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = "translateY(0) scale(1)";
            e.currentTarget.style.boxShadow = "0 20px 40px rgba(245, 158, 11, 0.25)";
          }}
        >
          Get Started <FiArrowRight size={24} />
        </button>
      </main>

      {/* Modern Premium Bento Grid */}
      <section
        style={{
          maxWidth: "1400px", margin: "0 auto", padding: "120px 40px",
          position: "relative", zIndex: 10,
        }}
      >
        <div style={{ textAlign: "center", marginBottom: 80 }} className="scroll-reveal">
          <h2 style={{ fontSize: "clamp(2.5rem, 5vw, 4rem)", fontWeight: 800, marginBottom: 24, letterSpacing: "-0.02em" }}>
            Everything you need. <br />
            <span style={{ color: "var(--text-muted)" }}>Nothing you don't.</span>
          </h2>
        </div>

        <div
          style={{
            display: "grid", gridTemplateColumns: "repeat(12, 1fr)",
            gap: "32px", width: "100%",
          }}
        >
          {/* Main Hero Card - Zero Scroll Debugging */}
          <BentoCard
            icon={<FiZap size={32} color="var(--accent-primary)" />}
            title="Zero-Scroll Debugging"
            desc="Our unique Swipe Card carousel lets you effortlessly page through code smells and errors. Never struggle with massive scrollbars or messy terminal output again. Analyze your code one beautifully formatted card at a time."
            span="col-span-12"
            minHeight="400px"
            large
          />

          {/* Secondary Cards */}
          <BentoCard
            icon={<FiTarget size={28} color="var(--info)" />}
            title="Skill Radar Profiling"
            desc="We dynamically map your coding strengths and weaknesses visually so you know exactly where to improve your skills."
            span="col-span-12 md:col-span-7"
            minHeight="320px"
          />

          <BentoCard
            icon={<FiTerminal size={28} color="var(--success)" />}
            title="Instant Cloud Execution"
            desc="Run Python and JavaScript instantly in the cloud with our lightning-fast integrated terminal and execution environment."
            span="col-span-12 md:col-span-5"
            minHeight="320px"
          />

          {/* Bottom Card */}
          <BentoCard
            icon={<FiCpu size={32} color="var(--accent-secondary)" />}
            title="Complexity Analysis"
            desc="Get immediate Big-O Time and Space complexity analysis for every piece of code you write."
            span="col-span-12"
            minHeight="280px"
          />
        </div>
      </section>

      {/* Embedded Auth Section */}
      <section
        ref={authRef}
        className="scroll-reveal"
        style={{
          padding: "160px 20px 160px", position: "relative", zIndex: 10,
          display: "flex", flexDirection: "column", alignItems: "center",
          borderTop: "1px solid rgba(255,255,255,0.03)",
          background: "radial-gradient(circle at top, rgba(255,255,255,0.02) 0%, transparent 100%)",
        }}
      >
        <div style={{ textAlign: "center", marginBottom: 60 }}>
          <h2 style={{ fontSize: "clamp(2.5rem, 5vw, 3.5rem)", fontWeight: 800, marginBottom: 16, letterSpacing: "-0.02em" }}>
            Ready to level up?
          </h2>
          <p style={{ color: "var(--text-secondary)", fontSize: "1.25rem", fontWeight: 400 }}>
            Join thousands of developers coding faster.
          </p>
        </div>

        <div style={{ width: "100%", display: "flex", justifyContent: "center" }}>
          <AuthPage embedded={true} />
        </div>
      </section>
      
      {/* Footer */}
      <footer style={{ padding: "40px", textAlign: "center", color: "var(--text-muted)", fontSize: "0.9rem", borderTop: "1px solid rgba(255,255,255,0.03)" }}>
        &copy; {new Date().getFullYear()} VanillaCodicAI. All rights reserved.
      </footer>
    </div>
  );
}

function BentoCard({ icon, title, desc, span, minHeight, large = false }) {
  // Determine grid column span based on the tailwind-like class passed
  // (Since we are using inline styles for a quick implementation, we translate it)
  let gridColumn = "span 12";
  if (span.includes("md:col-span-7")) {
    gridColumn = window.innerWidth >= 768 ? "span 7" : "span 12";
  } else if (span.includes("md:col-span-5")) {
    gridColumn = window.innerWidth >= 768 ? "span 5" : "span 12";
  }

  return (
    <div
      className="scroll-reveal"
      style={{
        gridColumn, minHeight,
        background: "rgba(17, 24, 39, 0.4)",
        border: "1px solid rgba(255, 255, 255, 0.06)",
        padding: large ? "64px 56px" : "48px 40px",
        borderRadius: 32,
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
        boxShadow: "inset 0 1px 1px rgba(255, 255, 255, 0.05), 0 20px 40px rgba(0,0,0,0.2)",
        transition: "transform 0.4s cubic-bezier(0.2, 0.8, 0.2, 1), border-color 0.4s ease",
        display: "flex", flexDirection: "column", justifyContent: "center",
        position: "relative", overflow: "hidden",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = "translateY(-8px)";
        e.currentTarget.style.borderColor = "rgba(245, 158, 11, 0.3)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = "translateY(0)";
        e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.06)";
      }}
    >
      <div
        style={{
          width: large ? 72 : 64, height: large ? 72 : 64, borderRadius: 20,
          background: "linear-gradient(135deg, rgba(255,255,255,0.05), rgba(255,255,255,0.01))",
          border: "1px solid rgba(255,255,255,0.08)",
          display: "flex", alignItems: "center", justifyContent: "center",
          marginBottom: 32,
          boxShadow: "0 8px 24px rgba(0,0,0,0.2)",
        }}
      >
        {icon}
      </div>
      <h3
        style={{
          fontSize: large ? "2.2rem" : "1.6rem", fontWeight: 800,
          marginBottom: 16, color: "var(--text-primary)", letterSpacing: "-0.02em"
        }}
      >
        {title}
      </h3>
      <p
        style={{
          fontSize: large ? "1.2rem" : "1.05rem", color: "var(--text-secondary)",
          lineHeight: 1.7, maxWidth: large ? "80%" : "100%", fontWeight: 400,
        }}
      >
        {desc}
      </p>
      
      {/* Subtle background glow on hover logic can be implemented via CSS, but inner gradient gives depth */}
      <div style={{
        position: "absolute", top: 0, left: 0, right: 0, height: "100%",
        background: "linear-gradient(180deg, rgba(255,255,255,0.02) 0%, transparent 100%)",
        pointerEvents: "none",
      }} />
    </div>
  );
}
