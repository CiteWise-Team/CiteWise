// landing_page/HeroSection.jsx
import React, { useState, useEffect } from 'react'
import Dashboard from './Dashboard'

const HeroSection = ({ documents, onToggleApproval, onGenerateIntro, introText, onGetStarted, isLoading }) => {
  const [heroLoaded, setHeroLoaded] = useState(false)
  const [dashboardVisible, setDashboardVisible] = useState(false)
  const [howItWorksVisible, setHowItWorksVisible] = useState(false)
  const [sunOffset, setSunOffset] = useState(0)
  const [clickedButton, setClickedButton] = useState(null)

  // Smooth scroll to "How It Works" section
  const handleLearnMoreClick = (buttonName) => {
    setClickedButton(buttonName)
    
    const howItWorksSection = document.getElementById('how-it-works')
    if (howItWorksSection) {
      howItWorksSection.scrollIntoView({ 
        behavior: 'smooth', 
        block: 'start' 
      })
    }
    
    setTimeout(() => setClickedButton(null), 800)
  }

  const handleButtonClick = (buttonName) => {
    setClickedButton(buttonName)
    onGetStarted()
    setTimeout(() => setClickedButton(null), 800)
  }

  const getButtonStyle = (buttonName) => ({
    transition: "all 0.3s ease",
    ...(clickedButton === buttonName && {
      transform: "scale(0.98)",
      opacity: 0.7,
    })
  })

  useEffect(() => {
    setHeroLoaded(true)
    
    const handleScroll = () => {
      setSunOffset(window.scrollY * 0.3)
      
      const dashboardEl = document.getElementById('dashboard-card')
      if (dashboardEl) {
        const rect = dashboardEl.getBoundingClientRect()
        if (rect.top < window.innerHeight * 0.8) {
          setDashboardVisible(true)
        }
      }

      const howItWorksEl = document.getElementById('how-it-works')
      if (howItWorksEl) {
        const rect = howItWorksEl.getBoundingClientRect()
        if (rect.top < window.innerHeight * 0.8) {
          setHowItWorksVisible(true)
        }
      }
    }

    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  return (
    <>
      {/* ══════════════════════════════════════════
          HERO BLOCK (nav + sun bg + headline)
      ══════════════════════════════════════════ */}
      <div style={{
        position: "relative",
        width: "100%",
        minHeight: "100vh",
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
      }}>
        {/* ── Sun full-bleed background with parallax ── */}
        <img
          src="/src/assets/sun.png"
          alt=""
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: `translate(-50%, calc(-50% + ${sunOffset}px))`,
            width: "100vw",
            height: "120vh",
            objectFit: "cover",
            zIndex: 0,
            transition: "transform 0.1s linear",
          }}
        />

        {/* ── Dark overlay so text is readable ── */}
        <div style={{
          position: "absolute",
          inset: 0,
          background: "linear-gradient(to bottom, rgba(30,28,25,0.55) 0%, rgba(30,28,25,0.1) 35%, rgba(30,28,25,0.6) 75%, #1E1C19 100%)",
          zIndex: 1,
          animation: heroLoaded ? "fadeIn 1s ease-out forwards" : "none",
        }} />

        {/* ── Navigation with fade-in ── */}
        <nav style={{
          position: "relative",
          zIndex: 10,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "22px 56px",
          borderBottom: "1px solid rgba(255,255,255,0.08)",
          background: "rgba(30,28,25,0.85)",
          backdropFilter: "blur(8px)",
          animation: heroLoaded ? "fadeInDown 0.6s ease-out forwards" : "none",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: "32px",
                height: "32px",
                borderRadius: "8px",
                background: "#3A3630",
                border: "1px solid rgba(217, 138, 33, 0.2)",
                boxShadow: "0 4px 12px rgba(0, 0, 0, 0.3)",
                transition: "transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)",
                cursor: "pointer",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.transform = "scale(1.08) rotate(5deg)")}
              onMouseLeave={(e) => (e.currentTarget.style.transform = "scale(1) rotate(0deg)")}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <path
                  d="M12 2L2 7L12 12L22 7L12 2Z"
                  stroke="#D98A21"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M2 17L12 22L22 17"
                  stroke="#D85A30"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M2 12L12 17L22 12"
                  stroke="#D98A21"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  opacity="0.8"
                />
              </svg>
            </div>
            <span style={{
              fontFamily: "'Poppins', sans-serif",
              color: "white",
              fontWeight: "700",
              fontSize: "1.25rem",
              letterSpacing: "0.01em",
              animation: heroLoaded ? "fadeInUp 0.7s ease-out 0.1s forwards" : "none",
              opacity: heroLoaded ? 1 : 0,
            }}>CiteWise</span>
          </div>

          <div style={{ display: "flex", gap: "40px", alignItems: "center" }}>
            {["Data Import", "AI Assessment", "Generate Introduction"].map((link, i) => (
              <span key={link} style={{
                fontFamily: "'Poppins', sans-serif",
                color: i === 0 ? "white" : "rgba(255,255,255,0.65)",
                fontSize: "0.9rem",
                fontWeight: i === 0 ? "600" : "400",
                cursor: "default",
                transition: "all 0.3s ease",
                animation: heroLoaded ? "fadeInDown 0.6s ease-out forwards" : "none",
                opacity: heroLoaded ? 1 : 0,
                animationDelay: `${0.1 + i * 0.1}s`,
              }}
              >{link}</span>
            ))}
          </div>

          <button 
            onClick={() => handleButtonClick('nav-get-started')}
            style={{
              ...getButtonStyle('nav-get-started'),
              fontFamily: "'Poppins', sans-serif",
              background: "#D85A30",
              border: "none",
              color: "#f0ece6",
              padding: "10px 28px",
              borderRadius: "10px",
              fontWeight: "700",
              fontSize: "0.88rem",
              cursor: "pointer",
              transition: "all 0.3s ease",
              animation: heroLoaded ? "slideInRight 0.6s ease-out 0.3s forwards" : "none",
              opacity: heroLoaded ? 1 : 0,
              display: "flex",
              alignItems: "center",
              gap: "8px",
            }}
            onMouseEnter={(e) => {
              if (!clickedButton) {
                e.target.style.transform = "translateY(-2px)"
                e.target.style.background = "#e96439"
                e.target.style.boxShadow = "0 12px 24px rgba(216,90,48,0.3)"
              }
            }}
            onMouseLeave={(e) => {
              if (!clickedButton) {
                e.target.style.transform = "translateY(0)"
                e.target.style.background = "#D85A30"
                e.target.style.boxShadow = "none"
              }
            }}
            disabled={isLoading}
          >
            {clickedButton === 'nav-get-started' && (
              <div style={{
                width: "16px",
                height: "16px",
                border: "2px solid rgba(255,255,255,0.35)",
                borderTop: "2px solid #ffffff",
                borderRadius: "50%",
                animation: "spin 0.6s linear infinite",
              }} />
            )}
            Get Started
          </button>
        </nav>

        {/* ── Hero Text with staggered animations ── */}
        <div style={{
          position: "relative",
          zIndex: 5,
          flex: 1,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          textAlign: "center",
          padding: "80px 48px 100px",
        }}>
          <div style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "8px",
            border: "1px solid rgba(200,100,30,0.6)",
            borderRadius: "40px",
            padding: "6px 20px",
            fontSize: "0.8rem",
            color: "#e8723a",
            fontWeight: "200",
            fontFamily: "'Poppins', sans-serif",
            marginBottom: "28px",
            background: "rgba(180,60,0,0.15)",
            backdropFilter: "blur(4px)",
            animation: heroLoaded ? "fadeInUp 0.8s ease-out 0.2s forwards" : "none",
            opacity: heroLoaded ? 1 : 0,
            transition: "all 0.3s ease",
          }}
          onMouseEnter={(e) => e.target.style.transform = "scale(1.05)"}
          onMouseLeave={(e) => e.target.style.transform = "scale(1)"}
          >
            <span style={{ fontSize: "0.55rem", color: "#e8723a" }}>●</span>
            AI-Powered Research Intelligence
          </div>

          <div style={{
            fontFamily: "'Poppins', sans-serif",
            fontSize: "2rem",
            fontWeight: "150",
            color: "white",
            marginBottom: "6px",
            letterSpacing: "0.01em",
            animation: heroLoaded ? "fadeInUp 0.8s ease-out 0.3s forwards" : "none",
            opacity: heroLoaded ? 1 : 0,
          }}>
            Meet <span style={{ color: "#D98A21", fontWeight: "700", transition: "all 0.3s ease" }}>CiteWise</span>
          </div>

          <div style={{
            fontFamily: "'Poppins', sans-serif",
            fontSize: "5rem",
            fontWeight: "600",
            color: "white",
            lineHeight: "1.0",
            marginBottom: "12px",
            letterSpacing: "-0.02em",
            animation: heroLoaded ? "fadeInUp 0.8s ease-out 0.4s forwards" : "none",
            opacity: heroLoaded ? 1 : 0,
          }}>
            your AI-powered
          </div>

          <div style={{
            fontFamily: "'Poppins', sans-serif",
            fontSize: "2.2rem",
            fontWeight: "300",
            color: "rgba(255,255,255,0.9)",
            marginBottom: "40px",
            letterSpacing: "0.01em",
            animation: heroLoaded ? "fadeInUp 0.8s ease-out 0.5s forwards" : "none",
            opacity: heroLoaded ? 1 : 0,
          }}>
            research writing assistant
          </div>

          <button 
            onClick={() => handleLearnMoreClick('learn-more')}
            style={{
              ...getButtonStyle('learn-more'),
              fontFamily: "'Poppins', sans-serif",
              background: "rgba(255,255,255,0.85)",
              border: "none",
              color: "#0a0a0a",
              padding: "7px 35px",
              borderRadius: "40px",
              fontSize: "0.95rem",
              fontWeight: "500",
              cursor: "pointer",
              backdropFilter: "blur(6px)",
              letterSpacing: "0.01em",
              animation: heroLoaded ? "scaleIn 0.6s ease-out 0.6s forwards" : "none",
              opacity: heroLoaded ? 1 : 0,
              transition: "all 0.3s ease",
              display: "flex",
              alignItems: "center",
              gap: "8px",
            }}
            onMouseEnter={(e) => {
              if (!clickedButton) {
                e.target.style.transform = "translateY(-3px)"
                e.target.style.boxShadow = "0 16px 32px rgba(216,90,48,0.4)"
              }
            }}
            onMouseLeave={(e) => {
              if (!clickedButton) {
                e.target.style.transform = "translateY(0)"
                e.target.style.boxShadow = "none"
              }
            }}
            disabled={isLoading}
          >
            {clickedButton === 'learn-more' && (
              <div style={{
                width: "14px",
                height: "14px",
                border: "2px solid rgba(0,0,0,0.2)",
                borderTop: "2px solid #D85A30",
                borderRadius: "50%",
                animation: "spin 0.6s linear infinite",
              }} />
            )}
            Learn more
          </button>
        </div>

        <div style={{
          position: "relative",
          zIndex: 5,
          textAlign: "center",
          padding: "0 48px 60px",
          fontFamily: "'Poppins', sans-serif",
          color: "rgba(255,255,255,0.6)",
          fontSize: "1rem",
          fontWeight: "400",
          lineHeight: "1.8",
          maxWidth: "840px",
          margin: "0 auto",
          animation: heroLoaded ? "fadeInUp 0.8s ease-out 0.7s forwards" : "none",
          opacity: heroLoaded ? 1 : 0,
        }}>
          Upload your RRL documents. CiteWise assesses relevance extracts evidence, and
          drafts your introduction with APA citations built in.
        </div>
      </div>

      {/* Dashboard Component */}
      <Dashboard 
        documents={documents}
        onGenerateIntro={onGenerateIntro}
        dashboardVisible={dashboardVisible}
      />

      {/* CSS for animations */}
      <style>{`
        @keyframes blink {
          0%, 49% { opacity: 1; }
          50%, 100% { opacity: 0; }
        }
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes fadeInDown {
          from {
            opacity: 0;
            transform: translateY(-30px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(30px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        @keyframes slideInRight {
          from {
            opacity: 0;
            transform: translateX(30px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
        @keyframes slideInLeft {
          from {
            opacity: 0;
            transform: translateX(-30px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
        @keyframes scaleIn {
          from {
            opacity: 0;
            transform: scale(0.9);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }
      `}</style>

      {/* ══════════════════════════════════════════
          HOW IT WORKS
      ══════════════════════════════════════════ */}
      <div id="how-it-works" style={{ maxWidth: "900px", margin: "0 auto 80px", padding: "0 48px", fontFamily: "'Poppins', sans-serif" }}>
        <div style={{ fontSize: "0.68rem", color: "rgba(255,255,255,0.3)", fontWeight: "600", letterSpacing: "0.14em", marginBottom: "36px", animation: howItWorksVisible ? "fadeInUp 0.6s ease-out forwards" : "none", opacity: howItWorksVisible ? 1 : 0 }}>HOW IT WORKS</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "20px" }}>
          {[
            { num: "01", icon: "file", title: "Import & Upload", desc: "Connect via CATalyst token or drag and drop your PDF documents. Batch upload your entire RRL in seconds" },
            { num: "02", icon: "download", title: "AI Assessment", desc: "Each document is scored for semantic alignment, evidence quality, and methodological relevance to your research gap" },
            { num: "03", icon: "pen", title: "Generate Introduction", desc: "Synthesize approved sources into a cohesive, citation ready introduction draft with proper APA formatting" },
          ].map((step, idx) => (
            <div key={step.num} style={{
              background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)",
              borderRadius: "14px", padding: "24px",
              animation: howItWorksVisible ? "fadeInUp 0.6s ease-out forwards" : "none",
              opacity: howItWorksVisible ? 1 : 0,
              animationDelay: `${idx * 0.15}s`,
              transition: "all 0.3s ease",
              cursor: "pointer",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "rgba(255,255,255,0.06)"
              e.currentTarget.style.border = "1px solid rgba(255,100,0,0.4)"
              e.currentTarget.style.transform = "translateY(-6px)"
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "rgba(255,255,255,0.03)"
              e.currentTarget.style.border = "1px solid rgba(255,255,255,0.07)"
              e.currentTarget.style.transform = "translateY(0)"
            }}
            >
              <div style={{ fontSize: "0.68rem", color: "#ff7a30", fontWeight: "700", marginBottom: "14px" }}>{step.num}</div>
              <img src={`/src/assets/${step.icon}.png`} alt={step.icon} style={{ width: "28px", height: "28px", marginBottom: "12px", objectFit: "contain", transition: "transform 0.3s ease" }} />
              <div style={{ color: "white", fontWeight: "700", fontSize: "0.9rem", marginBottom: "10px" }}>{step.title}</div>
              <div style={{ color: "rgba(255,255,255,0.45)", fontSize: "0.8rem", lineHeight: "1.6", fontWeight: "300" }}>{step.desc}</div>
            </div>
          ))}
        </div>
      </div>
    </>
  )
}

export default HeroSection