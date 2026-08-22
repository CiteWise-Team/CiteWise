import { useEffect, useRef } from "react";
import PublicLayout from "../layouts/PublicLayout";
import "../styles/landing.css";

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
      { threshold: 0.15 }
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
  { title: "IT386 Information Assurance and Security 2: Basic Linux Commands Exercise" },
];

const FEATURES = [
  {
    icon: "search",
    title: "Summarize Papers",
    text: "Lessen cognitive load by summarizing key sections of research papers for quick understanding and efficiency",
  },
  {
    icon: "insights",
    title: "Problem Discovery",
    text: "Analyze research papers to visualize underexplored opportunities to guide you for potential thesis development.",
  },
  {
    icon: "lightbulb",
    title: "Thesis Support",
    text: "Refine research topics and problem statements using AI-guided suggestions from literature evidence.",
  },
];

export default function Home() {
  const containerRef = useScrollReveal();

  return (
    <PublicLayout>
      <div className="cat-landing" ref={containerRef}>

        {/* HERO */}
        <section className="hero-section-v2">
          <div className="hero-orbit-mask d-none d-lg-block">
            <span className="ring-1" />
            <span className="ring-2" />
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

          <div className="container" style={{ maxWidth: "1200px", margin: "0 auto", padding: "0 2rem" }}>
            <div className="hero-copy-wrap text-center reveal">
              <h1 className="hero-title-v2">
                Discover research gaps
                <br />
                <span className="hero-highlight">effortlessly.</span>
              </h1>

              <p className="lead mt-3 mx-auto" style={{ maxWidth: "560px", color: "var(--text-body)", fontSize: "1.1rem" }}>
                CATalyst helps researchers analyze research papers, identify gaps,
                and guide in topic formulation using AI-driven workflows.
              </p>

              <div className="mt-4 d-flex gap-3 justify-content-center flex-wrap">
                <a href="/login" className="btn btn-glow">
                  Get Started
                </a>
                <button className="btn btn-ghost">Watch Demo</button>
              </div>

              <p className="mt-4 mb-0" style={{ color: "var(--text-muted)", fontSize: "0.9rem" }}>
                Join researchers already discovering better research directions.
              </p>
            </div>
          </div>
        </section>

        {/* WORKFLOW CARD */}
        <section className="container pb-5">
          <div className="glass-card workflow-card reveal">

            <div className="workflow-topbar">
              <div className="workflow-brand">
                <span className="mark">
                  <span className="material-symbols-outlined" style={{ fontSize: "1rem" }}>layers</span>
                </span>
                CATalyst
              </div>
              <div className="workflow-user">
                user.info@gmail.com
                <span className="material-symbols-outlined" style={{ fontSize: "1rem" }}>expand_more</span>
              </div>
            </div>

            <div className="workflow-body">
              <div className="workflow-breadcrumb" style={{ textAlign: "left" }}>
                Workspaces / <span className="current">Work File</span>
              </div>

              <div className="workflow-header-row" style={{ textAlign: "left" }}>
                <div style={{ textAlign: "left" }}>
                  <span className="eyebrow-label" style={{ textAlign: "left" }}>Research Workspace</span>
                  <h3 className="workflow-title" style={{ textAlign: "left" }}>Workflow sequence</h3>
                  <p className="workflow-sub" style={{ textAlign: "left" }}>
                    Process a document through extraction, summarization, gap analysis, and topic discovery.
                  </p>
                </div>
                <span className="status-badge" style={{ alignSelf: "flex-start" }}>
                  <span className="dot" /> Ready to work
                </span>
              </div>

              <div className="stepper" style={{ justifyContent: "flex-start" }}>
                {STEPS.map((s, i) => (
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
                  <div className="panel-sub">Upload document or paste text.</div>

                  <div className="dropzone">
                    <span className="material-symbols-outlined">cloud_upload</span>
                    <h6>Ready to extract?</h6>
                    <p>Drop files or click to browse</p>
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

        {/* TWO-COLUMN INTRO */}
        <section className="container pb-4">
          <div className="intro-split reveal">
            <div className="intro-heading">
              <h2 className="section-title" style={{ fontSize: "clamp(1.6rem, 2.6vw, 2.2rem)" }}>
                Designed for modern <span style={{ color: "#8b85f0" }}>research</span> workflows
              </h2>
            </div>
            <div className="intro-copy">
              <p>
                Core features that help students move from literature review to thesis topic faster.
              </p>
            </div>
          </div>
        </section>

        {/* FEATURES */}
        <section className="pb-5">
          <div className="container">
            <div className="row g-4">
              {FEATURES.map((f, i) => (
                <div className="col-md-4 reveal" key={f.title} style={{ transitionDelay: `${i * 0.1}s` }}>
                  <div className="feature-card glass-card">
                    <div className="feature-icon">
                      <span className="material-symbols-outlined">{f.icon}</span>
                    </div>
                    <h5 className="fw-bold" style={{ color: "var(--text-heading)" }}>{f.title}</h5>
                    <p className="mb-0" style={{ color: "var(--text-body)" }}>{f.text}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="container my-5">
          <div className="text-center p-5 glass-card reveal" style={{ borderRadius: "1.5rem" }}>
            <h2 className="section-title fw-bold mb-3">Ready to find your thesis topic?</h2>
            <p className="mb-4" style={{ color: "var(--text-body)" }}>
              Use CATalyst to analyze literature and discover research gaps faster.
            </p>
            <a href="/login" className="btn btn-glow">Start Exploring</a>
          </div>
        </section>

        {/* FOOTER */}
        <footer style={{ borderTop: "1px solid var(--border)" }} className="mt-5 py-5">
          <div className="container">
            <div className="row g-4">
              <div className="col-md-3" style={{ flex: "0 0 20.833%", maxWidth: "20.833%" }}>
                <div className="footer-brand-name">CATalyst</div>
                <p className="footer-description">
                  AI-powered research gap discovery for thesis and research writing.
                </p>
              </div>

              <div className="col-md-3">
                <h6 className="footer-heading">Product</h6>
                <a href="#" className="footer-link">Overview</a>
                <a href="#" className="footer-link">Features</a>
                <a href="#" className="footer-link">Security</a>
              </div>

              <div className="col-md-3">
                <h6 className="footer-heading">Company</h6>
                <a href="#" className="footer-link">About</a>
                <a href="#" className="footer-link">Privacy</a>
                <a href="#" className="footer-link">Terms</a>
              </div>

              <div className="col-md-3">
                <h6 className="footer-heading">Connect</h6>
                <a href="#" className="footer-link">Email</a>
                <a href="#" className="footer-link">GitHub</a>
                <a href="#" className="footer-link">Dev</a>
              </div>
            </div>

            <hr className="my-4" style={{ borderColor: "var(--border)" }} />

            <div className="text-center small" style={{ color: "var(--text-muted)" }}>
              © 2026 CATalyst. All rights reserved.
            </div>
          </div>
        </footer>

      </div>
    </PublicLayout>
  );
}