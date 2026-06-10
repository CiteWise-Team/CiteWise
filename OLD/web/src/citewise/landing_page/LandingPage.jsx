import React, { useState, useEffect } from 'react'
import HeroSection from './HeroSection'
import CTASection from './CTASection'

// Inject Poppins from Google Fonts once
const injectFont = () => {
  if (document.getElementById('poppins-font')) return
  const link = document.createElement('link')
  link.id = 'poppins-font'
  link.rel = 'stylesheet'
  link.href = 'https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700;800&display=swap'
  document.head.appendChild(link)
}

// Global animations stylesheet
const injectAnimations = () => {
  if (document.getElementById('landing-animations')) return
  const style = document.createElement('style')
  style.id = 'landing-animations'
  style.textContent = `
    @keyframes fadeInUp {
      from { opacity: 0; transform: translateY(30px); }
      to { opacity: 1; transform: translateY(0); }
    }
    @keyframes fadeInDown {
      from { opacity: 0; transform: translateY(-20px); }
      to { opacity: 1; transform: translateY(0); }
    }
    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }
    @keyframes slideInLeft {
      from { opacity: 0; transform: translateX(-40px); }
      to { opacity: 1; transform: translateX(0); }
    }
    @keyframes slideInRight {
      from { opacity: 0; transform: translateX(40px); }
      to { opacity: 1; transform: translateX(0); }
    }
    @keyframes scaleIn {
      from { opacity: 0; transform: scale(0.95); }
      to { opacity: 1; transform: scale(1); }
    }
    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
  `
  document.head.appendChild(style)
}

const LandingPage = ({ onGetStarted, isLoading }) => {
  useEffect(() => {
    injectFont()
    injectAnimations()
  }, [])

  const [documents, setDocuments] = useState([
    { id: 1, name: "Document_001.pdf", size: "2.4MB", pages: 5,  approved: true  },
    { id: 2, name: "Document_002.pdf", size: "3.1MB", pages: 8,  approved: false },
    { id: 3, name: "Document_003.pdf", size: "1.8MB", pages: 12, approved: false },
  ])

  const [introText, setIntroText] = useState(
    "Click 'Generate Introduction' after approving documents to build your introduction."
  )

  const toggleApproval = (id) =>
    setDocuments(docs => docs.map(doc => doc.id === id ? { ...doc, approved: !doc.approved } : doc))

  const generateIntroduction = () => {
    const approved = documents.filter(d => d.approved)
    if (!approved.length) {
      setIntroText('⚠️ No approved sources. Please approve at least one document.')
      return
    }
    const year = new Date().getFullYear()
    setIntroText(
      `The evolving landscape of research necessitates robust evidence synthesis. Recent literature highlights critical gaps in existing methodologies, particularly regarding automated citation integration (CiteWise, ${year}). Drawing from ${approved.length} approved source${approved.length > 1 ? 's' : ''}, the present study synthesizes findings that indicate significant improvements in research writing efficiency. This paper integrates theoretical contributions from the approved corpus to address the research gap in intelligent academic writing assistants.`
    )
  }

  // Loading overlay
  if (isLoading) {
    return (
      <div style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: "#1E1C19",
        zIndex: 9999,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexDirection: "column",
        gap: "20px",
      }}>
        <div style={{
          width: "60px",
          height: "60px",
          border: "3px solid rgba(216, 90, 48, 0.2)",
          borderTop: "3px solid #D85A30",
          borderRadius: "50%",
          animation: "spin 0.8s linear infinite",
        }} />
        <div style={{ color: "white", fontSize: "1rem", fontWeight: "500" }}>LOADING...</div>
        <div style={{ color: "rgba(255,255,255,0.5)", fontSize: "0.8rem" }}>Preparing your workspace</div>
      </div>
    )
  }

  return (
    <div style={{
      background: "#1E1C19",
      minHeight: "100vh",
      fontFamily: "'Poppins', sans-serif",
      color: "white",
    }}>
      <HeroSection
        documents={documents}
        onToggleApproval={toggleApproval}
        onGenerateIntro={generateIntroduction}
        introText={introText}
        onGetStarted={onGetStarted}
        isLoading={isLoading}
      />
      <CTASection onGetStarted={onGetStarted} isLoading={isLoading} />
    </div>
  )
}

export default LandingPage