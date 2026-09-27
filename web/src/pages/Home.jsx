import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import PublicLayout from "../layouts/PublicLayout";
import "../styles/landing.css";
import { useAuth } from "../context/AuthContext";
import papersHero from "../assets/Photoroom.png";
import airplaneHero from "../assets/left.png";
import {
  FileText,
  Sparkles,
  ArrowRight,
  CheckCircle2,
  Layers,
  Search,
  BookOpen,
  PenTool,
  Quote,
  RefreshCw,
  Lightbulb,
  BarChart2,
  Compass,
  ShieldCheck,
  Zap,
  SplitSquareVertical,
  FileCheck
} from "lucide-react";

function useScrollReveal() {
  const rootRef = useRef(null);
  useEffect(() => {
    const nodes = rootRef.current?.querySelectorAll(".reveal") ?? [];
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12 }
    );
    nodes.forEach((n) => observer.observe(n));
    return () => observer.disconnect();
  }, []);
  return rootRef;
}

const STEPS = [
  { icon: "description", label: "Extractor", active: true },
  { icon: "summarize", label: "Summarizer" },
  { icon: "extension", label: "Gap Extractor" },
  { icon: "psychology", label: "Topic Suggester" },
];

const PAPERS = [
  { title: "SciRAG: Adaptive, Citation-Aware, and Outline-Guided Retrieval and Synthesis for Scientific Literature", selected: true },
  { title: "Evaluating Targeted Policing Strategies for Adolescent Violence Prevention" },
];

// Concise, high-impact feature items
const CATALYST_FEATURES = [
  {
    icon: <FileText size={18} />,
    title: "PDF Extraction",
    desc: "Parse multi-column papers into clean, structured sections.",
  },
  {
    icon: <BookOpen size={18} />,
    title: "Paper Summaries",
    desc: "Condense methodologies, findings, and study constraints.",
  },
  {
    icon: <Search size={18} />,
    title: "Gap Extractor",
    desc: "Pinpoint unaddressed research opportunities across literature.",
  },
  {
    icon: <Lightbulb size={18} />,
    title: "Topic Suggester",
    desc: "Formulate defensible thesis topics with empirical rationales.",
  },
];

const CITEWISE_FEATURES = [
  {
    icon: <Zap size={18} />,
    title: "1-Click Bridge",
    desc: "Import selected topics and citation metadata with one click.",
  },
  {
    icon: <PenTool size={18} />,
    title: "Introduction Studio",
    desc: "Draft scaffolded academic sections with guided writing flow.",
  },
  {
    icon: <Quote size={18} />,
    title: "Automated Citations",
    desc: "Format in-text citations and reference lists in APA 7th & IEEE.",
  },
  {
    icon: <CheckCircle2 size={18} />,
    title: "Scholarly Polish",
    desc: "Calibrate academic voice, argumentation, and journal standards.",
  },
];

const OVERVIEW_STEPS = [
  {
    num: "01",
    title: "Upload",
    desc: "Ingest research PDFs into your workspace.",
    icon: <FileText size={20} />,
  },
  {
    num: "02",
    title: "Analyze",
    desc: "Extract findings and mine literature gaps.",
    icon: <Search size={20} />,
  },
  {
    num: "03",
    title: "Bridge",
    desc: "Send chosen topic directly to CiteWise.",
    icon: <Zap size={20} />,
  },
  {
    num: "04",
    title: "Draft",
    desc: "Write chapters with auto-formatted citations.",
    icon: <PenTool size={20} />,
  },
];

export default function Home() {
  const containerRef = useScrollReveal();
  const { user, isAuthenticated } = useAuth();

  return (
    <PublicLayout>
      <div className="cat-landing" ref={containerRef}>

        {/* ==========================================================================
            1. HOME SECTION (Hero + Workflow Card Preview)
            ========================================================================== */}
        <section id="home" className="hero-section-v2">
          <div className="hero-orbit-mask d-none d-lg-block">
            <span className="ring-1" />
            <span className="ring-2" />
          </div>

          {/* ✈️ Paper airplane flying in from the left */}
          <div className="hero-airplane-visual" aria-hidden="true">
            <img src={airplaneHero} alt="" />
          </div>

          {/* ✨ Floating paper pages behind the headline */}
          <div className="hero-papers-visual" aria-hidden="true">
            <img src={papersHero} alt="" />
          </div>

          <div className="float-badge badge-1">
            <span className="avatar">C</span>
            CATalyst
          </div>
          <div className="float-badge badge-2">
            <span className="avatar">AI</span>
            AI-Powered Research
          </div>
          <div className="float-badge badge-3">
            <span className="avatar">
              <span className="material-symbols-outlined" style={{ fontSize: "0.9rem" }}>bolt</span>
            </span>
            Instant Gap Detection
          </div>
          <div className="float-badge badge-4">
            <span className="avatar">
              <span className="material-symbols-outlined" style={{ fontSize: "0.9rem" }}>auto_stories</span>
            </span>
            Literature Review
          </div>

          <div className="container landing-full-width-content">
            <div className="hero-copy-wrap text-center reveal">
              <span className="eyebrow-label mb-2 d-inline-block">The Academic Research & Drafting Suite</span>
              <h1 className="hero-title-v2">
                Discover research gaps
                <br />
                <span className="hero-highlight">and draft with confidence.</span>
              </h1>

              <p className="lead mt-3 mx-auto" style={{ maxWidth: "640px", color: "var(--text-body)", fontSize: "1.1rem" }}>
                <strong>CATalyst</strong> extracts, summarizes, and discovers genuine literature gaps to formulate thesis topics.
                <strong> CiteWise</strong> seamlessly imports your findings to draft scaffolded, publication-ready introductions with automated citations.
              </p>

              <div className="mt-4 d-flex gap-3 justify-content-center flex-wrap">
                <Link to={isAuthenticated ? "/groups" : "/register"} className="btn btn-glow">
                  {isAuthenticated ? "Open Workspaces" : "Get Started Free"}
                </Link>
                <a
                  href="#features"
                  className="btn btn-ghost"
                  onClick={(e) => {
                    e.preventDefault();
                    document.getElementById("features")?.scrollIntoView({ behavior: "smooth" });
                  }}
                >
                  Explore Features
                </a>
              </div>

              <div className="mt-4 d-flex align-items-center justify-content-center gap-4 flex-wrap" style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>
                <span className="d-flex align-items-center gap-1">
                  <CheckCircle2 size={16} color="#ea580c" /> 100% Literature-Grounded Topics
                </span>
                <span className="d-flex align-items-center gap-1">
                  <CheckCircle2 size={16} color="#ea580c" /> 1-Click CiteWise Integration
                </span>
                <span className="d-flex align-items-center gap-1">
                  <CheckCircle2 size={16} color="#ea580c" /> APA 7th & IEEE Citation Support
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* WORKFLOW CARD (Interactive simulation inside Home section) */}
        <section className="container pb-5">
          <div className="glass-card workflow-card reveal">

            <div className="workflow-topbar">
              <div className="workflow-brand">
                <span className="mark">
                  <span className="material-symbols-outlined" style={{ fontSize: "1rem" }}>layers</span>
                </span>
                CATalyst Workbench
              </div>
              <div className="workflow-user">
                {user?.email || "researcher@university.edu"}
                <span className="material-symbols-outlined" style={{ fontSize: "1rem" }}>expand_more</span>
              </div>
            </div>

            <div className="workflow-body">
              <div className="workflow-breadcrumb" style={{ textAlign: "left" }}>
                Workspaces / <span className="current">Adolescent Gun Violence Thesis</span>
              </div>

              <div className="workflow-header-row" style={{ textAlign: "left" }}>
                <div style={{ textAlign: "left" }}>
                  <span className="eyebrow-label" style={{ textAlign: "left" }}>Research Workspace</span>
                  <h3 className="workflow-title" style={{ textAlign: "left" }}>Workflow Sequence</h3>
                  <p className="workflow-sub" style={{ textAlign: "left" }}>
                    Process a document through extraction, summarization, gap analysis, and topic discovery.
                  </p>
                </div>
                <span className="status-badge" style={{ alignSelf: "flex-start" }}>
                  <span className="dot" /> Ready to work
                </span>
              </div>

              <div className="stepper" style={{ justifyContent: "flex-start" }}>
                {STEPS.map((s) => (
                  <div className={`step ${s.active ? "active" : ""}`} key={s.label} style={{ alignItems: "center" }}>
                    <div className="step-icon">
                      <span className="material-symbols-outlined">{s.icon}</span>
                    </div>
                    {s.label}
                  </div>
                ))}
              </div>

              <div className="workflow-panels">
                <div className="panel" style={{ textAlign: "left" }}>
                  <div className="panel-title">
                    <h5>Input</h5>
                  </div>
                  <div className="panel-sub">Upload academic PDF or choose from group library.</div>

                  <div className="dropzone">
                    <span className="material-symbols-outlined">cloud_upload</span>
                    <h6>Ready to extract?</h6>
                    <p>Drop PDF files or click to browse</p>
                    <button className="btn btn-sm fw-bold btn-glow">Upload File</button>
                  </div>

                  <button className="btn fw-bold btn-glow run-btn">
                    <span className="material-symbols-outlined" style={{ fontSize: "1.1rem" }}>play_arrow</span>
                    Run Workflow
                  </button>
                </div>

                <div className="panel" style={{ textAlign: "left" }}>
                  <div className="tab-row" style={{ justifyContent: "flex-start" }}>
                    <span className="tab-item active">Papers</span>
                    <span className="tab-item">Result</span>
                  </div>

                  {PAPERS.map((p) => (
                    <div className={`paper-item ${p.selected ? "selected" : ""}`} key={p.title} style={{ textAlign: "left" }}>
                      {p.title}
                    </div>
                  ))}
                </div>
              </div>
            </div>

          </div>
        </section>

        {/* ==========================================================================
            2. FEATURES SECTION (Highlighting CATalyst and CiteWise)
            ========================================================================== */}
        <section id="features" className="features-master-section py-5">
          <div className="container py-4">

            {/* Section Header */}
            <div className="text-center max-w-2xl mx-auto mb-5 reveal">
              <span className="eyebrow-label mb-2 d-inline-block">Platform Capabilities</span>
              <h2 className="section-title" style={{ fontSize: "clamp(2rem, 3.2vw, 2.6rem)" }}>
                Two Engines. <span className="hero-highlight">One Unified Flow.</span>
              </h2>
              <p className="lead mt-2 mx-auto" style={{ maxWidth: "560px", color: "var(--text-body)", fontSize: "1.05rem" }}>
                Discover literature gaps in <strong>CATalyst</strong> and draft publication-ready introductions in <strong>CiteWise</strong>.
              </p>
            </div>

            {/* Dual Flagship Engine Cards */}
            <div className="row g-4">
              {/* CATalyst Pillar */}
              <div className="col-lg-6 reveal">
                <div className="engine-pillar-card">
                  <div className="engine-pillar-header">
                    <div>
                      <span className="engine-pill-badge">CATalyst · Discovery</span>
                      <h3 className="engine-pillar-title">Literature Intelligence</h3>
                    </div>
                    <span className="engine-pillar-icon-box">
                      <Search size={20} />
                    </span>
                  </div>

                  <div className="engine-feature-list">
                    {CATALYST_FEATURES.map((item) => (
                      <div className="engine-feature-item" key={item.title}>
                        <div className="engine-feature-icon-wrap">
                          {item.icon}
                        </div>
                        <div className="engine-feature-text">
                          <h5 className="engine-feature-title">{item.title}</h5>
                          <p className="engine-feature-desc">{item.desc}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* CiteWise Pillar */}
              <div className="col-lg-6 reveal" style={{ transitionDelay: "0.08s" }}>
                <div className="engine-pillar-card">
                  <div className="engine-pillar-header">
                    <div>
                      <span className="engine-pill-badge">CiteWise · Studio</span>
                      <h3 className="engine-pillar-title">Manuscript Drafting</h3>
                    </div>
                    <span className="engine-pillar-icon-box">
                      <PenTool size={20} />
                    </span>
                  </div>

                  <div className="engine-feature-list">
                    {CITEWISE_FEATURES.map((item) => (
                      <div className="engine-feature-item" key={item.title}>
                        <div className="engine-feature-icon-wrap">
                          {item.icon}
                        </div>
                        <div className="engine-feature-text">
                          <h5 className="engine-feature-title">{item.title}</h5>
                          <p className="engine-feature-desc">{item.desc}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* The Bridge Highlight Banner */}
            <div className="engine-bridge-banner mt-4 reveal">
              <div className="d-flex flex-column flex-md-row align-items-center justify-content-between gap-3">
                <div className="d-flex align-items-center gap-3">
                  <div className="bridge-icon-circle">
                    <RefreshCw size={20} />
                  </div>
                  <div>
                    <h4 className="bridge-title mb-1">Seamless 1-Click "Draft in CiteWise"</h4>
                    <p className="bridge-desc mb-0">
                      Send your selected thesis topic, gap rationales, and cited paper references straight into the writing studio.
                    </p>
                  </div>
                </div>
                <Link to={isAuthenticated ? "/groups" : "/register"} className="btn btn-glow flex-shrink-0">
                  <span>Explore Workspaces</span>
                  <ArrowRight size={16} className="ms-2" />
                </Link>
              </div>
            </div>

          </div>
        </section>

        {/* ==========================================================================
            3. OVERVIEW SECTION (How It Works: 4 Clean Steps)
            ========================================================================== */}
        <section id="overview" className="overview-master-section py-5">
          <div className="container py-4">

            {/* Section Header */}
            <div className="text-center max-w-2xl mx-auto mb-5 reveal">
              <span className="eyebrow-label mb-2 d-inline-block">System Workflow</span>
              <h2 className="section-title" style={{ fontSize: "clamp(2rem, 3.2vw, 2.6rem)" }}>
                How It Works
              </h2>
              <p className="lead mt-2 mx-auto" style={{ maxWidth: "560px", color: "var(--text-body)", fontSize: "1.05rem" }}>
                A connected four-step journey from raw PDFs to a defense-ready chapter.
              </p>
            </div>

            {/* 4 Clean Step Cards */}
            <div className="row g-3 reveal">
              {OVERVIEW_STEPS.map((step) => (
                <div className="col-lg-3 col-md-6" key={step.num}>
                  <div className="overview-step-card">
                    <div className="d-flex align-items-center justify-content-between mb-3">
                      <span className="overview-step-num">{step.num}</span>
                      <div className="overview-step-icon">
                        {step.icon}
                      </div>
                    </div>
                    <h4 className="overview-step-title">{step.title}</h4>
                    <p className="overview-step-desc">{step.desc}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Trust Highlights Strip */}
            <div className="overview-trust-strip mt-4 reveal">
              <div className="d-flex align-items-center justify-content-center gap-4 flex-wrap">
                <span className="overview-trust-item">
                  <CheckCircle2 size={16} style={{ color: "#ea580c" }} />
                  100% Literature-Grounded Topics
                </span>
                <span className="overview-trust-item">
                  <CheckCircle2 size={16} style={{ color: "#ea580c" }} />
                  Zero-Loss Bridge to CiteWise
                </span>
                <span className="overview-trust-item">
                  <CheckCircle2 size={16} style={{ color: "#ea580c" }} />
                  APA 7th & IEEE Automated Citations
                </span>
              </div>
            </div>

          </div>
        </section>

        {/* ==========================================================================
            4. CALL TO ACTION SECTION
            ========================================================================== */}
        <section className="container my-5">
          <div
            className="text-center p-5 glass-card reveal"
            style={{
              borderRadius: "1.5rem",
              background: "linear-gradient(180deg, #ffffff 0%, #fff7ed 100%)",
              borderColor: "rgba(234, 88, 12, 0.25)",
              boxShadow: "0 20px 50px -15px rgba(234, 88, 12, 0.15)",
            }}
          >
            <span className="eyebrow-label mb-2 d-inline-block">Start Your Research Journey</span>
            <h2 className="section-title fw-bold mb-3" style={{ fontSize: "clamp(1.8rem, 3vw, 2.4rem)" }}>
              Ready to Discover Your Research Gaps & Draft with CiteWise?
            </h2>
            <p className="mb-4 mx-auto" style={{ color: "var(--text-body)", maxWidth: "600px" }}>
              Join researchers, thesis candidates, and scholars using the combined power of CATalyst and CiteWise to transform literature into defense-ready papers.
            </p>
            <div className="d-flex justify-content-center gap-3 flex-wrap">
              <Link to={isAuthenticated ? "/groups" : "/register"} className="btn btn-glow">
                {isAuthenticated ? "Launch Workspace" : "Create Free Account"}
              </Link>
              <Link to="/login" className="btn btn-ghost">
                Sign In
              </Link>
            </div>
          </div>
        </section>

        {/* ==========================================================================
            5. FOOTER
            ========================================================================== */}
        <footer style={{ borderTop: "1px solid var(--border)", background: "#ffffff" }} className="mt-5 py-5">
          <div className="container">
            <div className="row g-4">
              <div className="col-md-4">
                <div className="footer-brand-name">CATalyst + CiteWise</div>
                <p className="footer-description">
                  The unified academic research ecosystem: discovering genuine research gaps and drafting citations with scholarly precision.
                </p>
              </div>

              <div className="col-md-3">
                <h6 className="footer-heading">Navigation</h6>
                <a
                  href="#home"
                  className="footer-link"
                  onClick={(e) => {
                    e.preventDefault();
                    window.scrollTo({ top: 0, behavior: "smooth" });
                  }}
                >
                  Home
                </a>
                <a
                  href="#features"
                  className="footer-link"
                  onClick={(e) => {
                    e.preventDefault();
                    document.getElementById("features")?.scrollIntoView({ behavior: "smooth" });
                  }}
                >
                  Features
                </a>
                <a
                  href="#overview"
                  className="footer-link"
                  onClick={(e) => {
                    e.preventDefault();
                    document.getElementById("overview")?.scrollIntoView({ behavior: "smooth" });
                  }}
                >
                  Overview
                </a>
              </div>

              <div className="col-md-2">
                <h6 className="footer-heading">Account</h6>
                <Link to="/login" className="footer-link">Login</Link>
                <Link to="/register" className="footer-link">Sign up</Link>
                {isAuthenticated && <Link to="/groups" className="footer-link">Workspaces</Link>}
              </div>

              <div className="col-md-3">
                <h6 className="footer-heading">Legal & Privacy</h6>
                <Link to="/privacy" className="footer-link">Privacy Policy</Link>
                <Link to="/terms" className="footer-link">Terms of Service</Link>
              </div>
            </div>

            <hr className="my-4" style={{ borderColor: "var(--border)" }} />

            <div className="d-flex flex-column flex-md-row justify-content-between align-items-center gap-2 small" style={{ color: "var(--text-muted)" }}>
              <div>© 2026 CATalyst & CiteWise. All rights reserved.</div>
              <div>Designed for modern scientific and academic research workflows.</div>
            </div>
          </div>
        </footer>

      </div>
    </PublicLayout>
  );
}