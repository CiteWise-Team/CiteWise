import React, { useState, useEffect, Component } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ChevronLeft, Compass, X } from "lucide-react";
import { apiRequest } from "../api/http";
import Navbar from "../components/Navbar";
import CiteWiseWorkflowTracker from "./shared/components/CiteWiseWorkflowTracker";
import useIsMobile, { MOBILE_TABBAR_HEIGHT } from "../hooks/useIsMobile";
import WorkspaceImportLayout from "./module1/catalyst-import/components/WorkspaceImportLayout";
import ValidationDashboardLayout from "./module2/literature-review/components/ValidationDashboardLayout";
import SynthesisDraftModule from "./module3/synthesis-draft/components/SynthesisDraftModule";
import "../styles/workspace.css";

const CITEWISE_STEP_META = [
  {
    title: "Data Import",
    description: "Connect your CATalyst workspace, upload RRL documents, then refine your research gap.",
  },
  {
    title: "AI Assessment",
    description: "Evaluate literature relevance, study methodologies, and empirical findings for your introduction.",
  },
  {
    title: "Generate Introduction",
    description: "Draft, calibrate scholarly tone, and export your scaffolded academic introduction.",
  },
];

const CITEWISE_GUIDE_STEPS = {
  0: [
    {
      target: "workspace-header",
      title: "Data Import Overview",
      description: "This header identifies your active CiteWise session and current workflow phase.",
    },
    {
      target: "workflow-stepper",
      title: "Workflow Progression",
      description: "Track your progress through Data Import, AI Assessment, and Introduction Generation.",
    },
    {
      target: "citewise-catalyst-workspace",
      title: "CATalyst Workspace",
      description: "Import research gaps, working titles, and paper summaries generated from your CATalyst workspace.",
    },
    {
      target: "citewise-gap-workshop",
      title: "Research Gap Workshop",
      description: "Review and manage your identified research gaps, select your primary research focus, or add notes. Use the top-right icons to edit or delete.",
    },
    {
      target: "citewise-add-gap",
      title: "Add Your Own Gap",
      description: "Define and inject custom research gaps directly into your project repository.",
    },
    {
      target: "citewise-title-gap",
      title: "Title from Gap(s)",
      description: "Derive and calibrate a compelling working title based on your selected research gaps.",
    },
    {
      target: "citewise-rrl-upload",
      title: "RRL Document Upload",
      description: "Upload PDF literature review papers and build your document queue for analysis.",
    },
    {
      target: "workflow-guide-button",
      title: "Guide Anytime",
      description: "Click this button whenever you need a quick walkthrough of this page's features.",
    },
  ],
  1: [
    {
      target: "workspace-header",
      title: "AI Assessment Overview",
      description: "Evaluate literature relevance, study methodologies, and empirical findings for your introduction.",
    },
    {
      target: "workflow-stepper",
      title: "Workflow Progression",
      description: "Navigate smoothly between Data Import, AI Assessment, and Generate Introduction.",
    },
    {
      target: "citewise-active-doc",
      title: "Active Document",
      description: "Inspect the currently selected document's status, evaluation progress, and metadata.",
    },
    {
      target: "citewise-quick-nav",
      title: "Quick Navigation List",
      description: "Browse all uploaded papers, toggle approval status, and switch between documents.",
    },
    {
      target: "citewise-assessment-panel",
      title: "AI Assessment & Scoring",
      description: "Review detailed AI assessment scores across relevance, methodology, and empirical evidence.",
    },
    {
      target: "workflow-guide-button",
      title: "Guide Anytime",
      description: "Access this interactive tour whenever you need guidance on this page.",
    },
  ],
  2: [
    {
      target: "workspace-header",
      title: "Generate Introduction Overview",
      description: "Draft, calibrate scholarly tone, and export your scaffolded academic introduction.",
    },
    {
      target: "workflow-stepper",
      title: "Workflow Progression",
      description: "Review completed milestones and navigate between stages of your research paper.",
    },
    {
      target: "citewise-synthesis-controls",
      title: "Synthesis Controls",
      description: "Trigger AI introduction drafting, monitor generation progress, and calibrate options.",
    },
    {
      target: "citewise-approved-sources",
      title: "Approved Sources & References",
      description: "Manage the verified literature sources cited within your generated academic introduction.",
    },
    {
      target: "citewise-draft-editor",
      title: "Introduction Draft Editor & Export",
      description: "Read, edit in real-time, inspect citations, and export your introduction as DOCX, PDF, or Markdown.",
    },
    {
      target: "workflow-guide-button",
      title: "Guide Anytime",
      description: "Access this tour anytime for helpful tips across CiteWise.",
    },
  ],
};

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("CiteWise ErrorBoundary caught an error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: "4rem 2rem", textAlign: "center", color: "#111827", maxWidth: 600, margin: "0 auto" }}>
          <h2 style={{ color: "#ea580c", fontFamily: "'Poppins', sans-serif", fontSize: "1.5rem", marginBottom: "1rem" }}>
            Something went wrong loading this section.
          </h2>
          <p style={{ color: "#6b7280", fontFamily: "'Poppins', sans-serif", fontSize: "0.9rem", marginBottom: "1.5rem" }}>
            {this.state.error?.message || "An unexpected error occurred."}
          </p>
          <button
            onClick={() => this.setState({ hasError: false, error: null })}
            style={{
              background: "#ea580c",
              color: "#ffffff",
              border: "1px solid #ea580c",
              borderRadius: "8px",
              padding: "0.75rem 1.5rem",
              fontFamily: "'Poppins', sans-serif",
              fontWeight: 700,
              cursor: "pointer",
              boxShadow: "0 2px 8px rgba(234, 88, 12, 0.22)",
              transition: "all 180ms ease",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "#c2410c";
              e.currentTarget.style.borderColor = "#c2410c";
              e.currentTarget.style.boxShadow = "0 4px 14px rgba(234, 88, 12, 0.35)";
              e.currentTarget.style.transform = "translateY(-1px)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "#ea580c";
              e.currentTarget.style.borderColor = "#ea580c";
              e.currentTarget.style.boxShadow = "0 2px 8px rgba(234, 88, 12, 0.22)";
              e.currentTarget.style.transform = "translateY(0)";
            }}
            onMouseDown={(e) => {
              e.currentTarget.style.transform = "translateY(0)";
              e.currentTarget.style.boxShadow = "0 2px 6px rgba(234, 88, 12, 0.2)";
            }}
          >
            Reload Module
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

// All localStorage keys are namespaced by groupId so each workspace keeps its own
// independent CiteWise session. Switching workspaces and returning always restores
// the correct state.
function scopedKey(groupId, name) {
  return `citewise.${groupId}.${name}`;
}

export default function CiteWiseApp() {
  const navigate = useNavigate();
  const { groupId } = useParams();
  const isMobile = useIsMobile();

  const [sessionId, setSessionId] = useState(
    () => localStorage.getItem(scopedKey(groupId, "sessionId")) || ""
  );

  const [step, setStep] = useState(() => {
    const saved = localStorage.getItem(scopedKey(groupId, "step"));
    const parsed = saved !== null ? parseInt(saved, 10) : 0;
    return parsed < 0 ? 0 : parsed;
  });

  const [maxUnlockedStep, setMaxUnlockedStep] = useState(() => {
    const saved = localStorage.getItem(scopedKey(groupId, "maxUnlockedStep"));
    const parsed = saved !== null ? parseInt(saved, 10) : NaN;
    const initialSession = localStorage.getItem(scopedKey(groupId, "sessionId"));
    const floor = initialSession ? Math.max(step, 1) : Math.max(step, 0);
    const resolved = !Number.isNaN(parsed) ? Math.max(parsed, floor) : floor;
    if (initialSession && localStorage.getItem(`citewise_draft_${initialSession}`)) {
      return Math.max(resolved, 3);
    }
    return resolved;
  });

  const [guideStep, setGuideStep] = useState(-1);
  const [spotlight, setSpotlight] = useState(null);
  const guideOpen = guideStep >= 0;
  const currentGuideSteps = CITEWISE_GUIDE_STEPS[step] || CITEWISE_GUIDE_STEPS[0];

  useEffect(() => {
    if (!guideOpen) {
      setSpotlight(null);
      return undefined;
    }

    const targetKey = currentGuideSteps[guideStep]?.target;
    const isMobileViewport = typeof window !== "undefined" && window.innerWidth <= 768;

    let target = document.querySelector(`[data-guide="${targetKey}"]`);
    if (isMobileViewport && targetKey === "workflow-stepper") {
      const mobileTarget = document.querySelector('[data-guide="workflow-stepper-mobile"]');
      if (mobileTarget) target = mobileTarget;
    }
    if (!target) return undefined;

    if (targetKey === "workflow-guide-button" || targetKey === "workspace-header" || (targetKey === "workflow-stepper" && !isMobileViewport)) {
      window.scrollTo({ top: 0, behavior: "smooth" });
    } else if (targetKey !== "workflow-stepper") {
      target.scrollIntoView({ behavior: "smooth", block: isMobileViewport ? "start" : "center" });
    }

    const updateSpotlight = () => {
      const rect = target.getBoundingClientRect();
      const padding = isMobileViewport ? 8 : 10;
      const computedStyle = window.getComputedStyle(target);
      const elemRadius = parseInt(computedStyle.borderRadius, 10) || 16;
      const vw = typeof window !== "undefined" ? window.innerWidth : 1200;

      const left = Math.max(4, rect.left - padding);
      const width = Math.min(vw - left - 4, rect.width + padding * 2);

      setSpotlight({
        top: Math.max(0, rect.top - padding),
        left,
        width,
        height: rect.height + padding * 2,
        borderRadius: Math.max(elemRadius + 4, 16),
      });
    };

    updateSpotlight();
    const timer1 = setTimeout(updateSpotlight, 100);
    const timer2 = setTimeout(updateSpotlight, 250);
    const timer3 = setTimeout(updateSpotlight, 450);
    const timer4 = setTimeout(updateSpotlight, 700);

    let frameId;
    const startTime = performance.now();
    const trackAnimation = (currentTime) => {
      updateSpotlight();
      if (currentTime - startTime < 650) {
        frameId = requestAnimationFrame(trackAnimation);
      }
    };
    frameId = requestAnimationFrame(trackAnimation);

    window.addEventListener("resize", updateSpotlight);
    window.addEventListener("scroll", updateSpotlight, true);
    return () => {
      cancelAnimationFrame(frameId);
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
      clearTimeout(timer4);
      window.removeEventListener("resize", updateSpotlight);
      window.removeEventListener("scroll", updateSpotlight, true);
    };
  }, [step, guideOpen, guideStep]);

  useEffect(() => {
    if (!guideOpen) return undefined;

    const handleKeyDown = (event) => {
      if (event.key === "Escape") setGuideStep(-1);
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [guideOpen]);

  function advanceGuide() {
    if (guideStep === currentGuideSteps.length - 1) {
      setGuideStep(-1);
      return;
    }
    setGuideStep((current) => current + 1);
  }

  const currentTarget = currentGuideSteps[guideStep]?.target;
  const isNearGuideBtn = currentTarget === "workflow-guide-button";
  const isDockedLeft = !isMobile && !isNearGuideBtn && (
    (spotlight && spotlight.left > (typeof window !== "undefined" ? window.innerWidth * 0.45 : 600))
  );

  useEffect(() => {
    if (groupId) localStorage.setItem(scopedKey(groupId, "step"), step.toString());
  }, [step, groupId]);

  useEffect(() => {
    if (groupId && sessionId) localStorage.setItem(scopedKey(groupId, "sessionId"), sessionId);
  }, [sessionId, groupId]);

  // Without this the session id existed only in this browser, so the same
  // account on another machine started from an empty Data Import screen while
  // its uploaded papers sat unreachable on the server. The server derives the
  // id from the account and the workspace, so it is the same everywhere. An id
  // already stored here is kept, so sessions created before this still resolve.
  useEffect(() => {
    if (!groupId || sessionId) return;

    let cancelled = false;
    (async () => {
      try {
        const response = await apiRequest(`/v1/documents/session-for-group/${groupId}`);
        const resolved = response?.data?.sessionId;
        if (!cancelled && resolved) setSessionId(resolved);
      } catch (err) {
        // Leave sessionId empty; the import step will mint one as before.
        console.warn("[CiteWise] could not resolve the workspace session:", err?.message);
      }
    })();

    return () => { cancelled = true; };
  }, [groupId, sessionId]);

  useEffect(() => {
    if (groupId) localStorage.setItem(scopedKey(groupId, "maxUnlockedStep"), maxUnlockedStep.toString());
  }, [maxUnlockedStep, groupId]);

  const handleModule1Proceed = () => {
    setMaxUnlockedStep((prev) => Math.max(prev, 1));
    setStep(1);
  };

  const handleModuleStepChange = (nextStep, nextSessionId) => {
    if (nextSessionId) setSessionId(nextSessionId);
    if (typeof nextStep !== "number") return;
    setMaxUnlockedStep((prev) => Math.max(prev, nextStep));
    if (nextStep < 3) setStep(nextStep);
  };

  const handleNavbarNavigate = (nextStep) => {
    if (nextStep <= maxUnlockedStep) setStep(nextStep);
  };

  function handleBackToGroups() {
    navigate("/groups");
  }

  const currentStepMeta = CITEWISE_STEP_META[step] || CITEWISE_STEP_META[0];

  return (
    <div
      className="citewise-app-shell"
      style={{
        display: "flex",
        flexDirection: "column",
        minHeight: "100vh",
        background: "var(--cw-bg-base, #f8f9fb)",
        textAlign: "left",
      }}
    >
      <Navbar appName="CiteWise" />

      <main
        className="workflow-shell"
        style={{
          minHeight: 0,
          paddingBottom: isMobile ? `calc(${MOBILE_TABBAR_HEIGHT}px + env(safe-area-inset-bottom) + 16px)` : undefined,
        }}
      >
        {/* Workspace Page Header with Back button beside page title & Guide button on right */}
        <header
          className="workflow-header"
          data-guide="workspace-header"
        >
          <div className="workflow-header-left">
            <Link
              to="/groups"
              className="workflow-back-btn"
              aria-label="Back to Workspaces"
              title="Back to Workspaces"
            >
              <ChevronLeft size={20} strokeWidth={2.5} />
            </Link>
            <div className="workflow-title-block">
              <h1>
                {currentStepMeta.title}
              </h1>
              <p className="workflow-description">
                {currentStepMeta.description}
              </p>
            </div>
          </div>
          <button
            type="button"
            className="groups-guide-trigger-btn workflow-guide-button"
            data-guide="workflow-guide-button"
            onClick={() => setGuideStep(0)}
            aria-label="Open page guide"
          >
            <Compass size={16} />
            <span>Guide</span>
          </button>
        </header>

        <div className="workflow-content">
          {/* Workflow Progression Stepper Bar */}
          <div
            className="workflow-stepper"
            data-guide="workflow-stepper"
            style={{
              margin: 0,
              boxSizing: "border-box",
              width: "100%",
            }}
          >
            <CiteWiseWorkflowTracker
              currentStep={step}
              maxUnlockedStep={maxUnlockedStep}
              onStepChange={handleNavbarNavigate}
            />
          </div>

          <div style={{ width: "100%" }}>
            <ErrorBoundary key={step}>
              {step === 0 && (
                <WorkspaceImportLayout
                  groupId={groupId}
                  onImportSuccess={(sid) => setSessionId(sid)}
                  onProceed={handleModule1Proceed}
                />
              )}

              {step === 1 && (
                <ValidationDashboardLayout
                  groupId={groupId}
                  sessionId={sessionId}
                  onStepChange={handleModuleStepChange}
                />
              )}

              {step === 2 && (
                <SynthesisDraftModule
                  sessionId={sessionId}
                  onStepChange={handleModuleStepChange}
                />
              )}
            </ErrorBoundary>
          </div>
        </div>
      </main>

      {/* Interactive Page Guide Tour */}
      {guideOpen && (
        <div className="workflow-guide-layer" role="presentation">
          <div className="workflow-guide-blocker" onClick={() => setGuideStep(-1)} aria-hidden="true" />
          {spotlight && (
            <div
              className="workflow-guide-spotlight"
              style={{
                top: spotlight.top,
                left: spotlight.left,
                width: spotlight.width,
                height: spotlight.height,
                borderRadius: spotlight.borderRadius || 18,
              }}
            />
          )}
          <section
            className={`workflow-guide-card${isDockedLeft ? " is-dock-left" : ""}${isNearGuideBtn ? " is-near-guide-button" : ""}`}
            style={
              isMobile
                ? currentTarget === "workflow-stepper"
                  ? { top: "16px", bottom: "auto", left: "16px", right: "16px", width: "auto" }
                  : { bottom: "80px", top: "auto", left: "16px", right: "16px", width: "auto" }
                : isNearGuideBtn && spotlight
                ? {
                    top: Math.max(150, Math.round(spotlight.top + spotlight.height + 16)),
                    bottom: "auto",
                    right: Math.max(16, Math.round((typeof window !== "undefined" ? window.innerWidth : 1200) - (spotlight.left + spotlight.width))),
                    left: "auto",
                  }
                : undefined
            }
            role="dialog"
            aria-modal="true"
            aria-labelledby="citewise-guide-title"
          >
            <div className="workflow-guide-header">
              <span className="workflow-guide-progress">
                Step {guideStep + 1} of {currentGuideSteps.length}
              </span>
              <button
                type="button"
                className="workflow-guide-close"
                onClick={() => setGuideStep(-1)}
                aria-label="Close guide"
              >
                <X size={16} />
              </button>
            </div>
            <h2 id="citewise-guide-title">{currentGuideSteps[guideStep]?.title}</h2>
            <p>{currentGuideSteps[guideStep]?.description}</p>
            <div className="workflow-guide-actions">
              <button
                type="button"
                className="workflow-guide-skip"
                onClick={() => setGuideStep(-1)}
              >
                Skip Tour
              </button>
              <div className="workflow-guide-nav-buttons">
                {guideStep > 0 && (
                  <button
                    type="button"
                    className="workflow-guide-back"
                    onClick={() => setGuideStep((current) => current - 1)}
                  >
                    Back
                  </button>
                )}
                <button type="button" className="workflow-guide-next" onClick={advanceGuide}>
                  {guideStep === currentGuideSteps.length - 1 ? "Finish" : "Next"}
                </button>
              </div>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}