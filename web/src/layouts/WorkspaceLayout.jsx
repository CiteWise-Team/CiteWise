import Navbar from "../components/Navbar.jsx";
import { useGroup } from "../context/GroupContext.jsx";
import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { Compass, ChevronLeft, X } from "lucide-react";
import "../styles/workspace.css";

const GUIDE_COPY = {
  extractor: {
    inputTitle: "Upload your papers",
    inputDescription: "Add research papers here so CATalyst can extract and organize their content.",
    resultsTitle: "Review extracted papers",
    resultsDescription: "Your uploaded documents and extracted information appear here for review.",
  },
  summarizer: {
    inputTitle: "Choose a document to summarize",
    inputDescription: "Select an extracted paper and provide the details needed to create a concise summary.",
    resultsTitle: "Read the summary",
    resultsDescription: "The generated summary appears here so you can review the paper's key ideas quickly.",
  },
  gap: {
    inputTitle: "Describe your research direction",
    inputDescription: "Use this area to provide the topic or context CATalyst should use for gap discovery.",
    resultsTitle: "Explore research gaps",
    resultsDescription: "Review the detected gaps and use them to understand where your research can contribute.",
  },
  topic: {
    inputTitle: "Generate topic suggestions",
    inputDescription: "Provide your research context and let CATalyst propose focused directions for your study.",
    resultsTitle: "Compare suggested topics",
    resultsDescription: "Review the suggested topics and their supporting rationale before choosing your direction.",
    draftTitle: "Draft in CiteWise",
    draftDescription: "Ready to write? Click this button to launch CiteWise and start drafting your introduction with your selected topic and research gaps.",
  },
};

function getGuideSteps(currentStep) {
  const copy = GUIDE_COPY[currentStep] || GUIDE_COPY.extractor;
  const steps = [
    {
      target: "workspace-header",
      title: "Your workspace",
      description: "This header identifies the workspace you are working in and explains the research flow.",
    },
    {
      target: "workflow-stepper",
      title: "Move through the workflow",
      description: "Use these steps to switch between extraction, summarization, gap analysis, and topic suggestions.",
    },
    { target: "workflow-input", title: copy.inputTitle, description: copy.inputDescription },
    { target: "workflow-results", title: copy.resultsTitle, description: copy.resultsDescription },
    {
      target: "workflow-guide-button",
      title: "Find the Guide anytime",
      description: "Use this button whenever you need a quick explanation of the current workflow section.",
    },
  ];

  if (currentStep === "topic") {
    return [
      { target: "workflow-input", title: copy.inputTitle, description: copy.inputDescription },
      { target: "workflow-results", title: copy.resultsTitle, description: copy.resultsDescription },
      { target: "workflow-draft-citewise", title: copy.draftTitle, description: copy.draftDescription },
    ];
  }

  if (["summarizer", "gap"].includes(currentStep)) return steps.slice(2, 4);
  return steps;
}

function renderGuideText(text) {
  if (typeof text !== "string") return text;
  if (!text.includes("CATalyst")) return text;
  const parts = text.split("CATalyst");
  return parts.flatMap((part, i) =>
    i === 0
      ? [part]
      : [
          <span key={i}>
            <span style={{ color: "#ea580c" }}>CAT</span>alyst
          </span>,
          part,
        ]
  );
}

export default function WorkflowLayout({ children, currentStep = "extractor" }) {
  const { groupId, groupName } = useGroup();
  const [guideStep, setGuideStep] = useState(() => (
    currentStep === "extractor"
      && groupId
      && localStorage.getItem("catalyst.firstWorkspaceGuidePending") === String(groupId)
      ? 0
      : -1
  ));
  const [spotlight, setSpotlight] = useState(null);
  const guideOpen = guideStep >= 0;
  const guideSteps = getGuideSteps(currentStep);

  useEffect(() => {
    if (currentStep !== "extractor" || !groupId) return;
    if (localStorage.getItem("catalyst.firstWorkspaceGuidePending") !== String(groupId)) return;

    localStorage.removeItem("catalyst.firstWorkspaceGuidePending");
  }, [currentStep, groupId]);

  useEffect(() => {
    if (!guideOpen) {
      setSpotlight(null);
      return undefined;
    }

    const currentGuideSteps = getGuideSteps(currentStep);
    const targetKey = currentGuideSteps[guideStep]?.target;
    const isMobileViewport = typeof window !== "undefined" && window.innerWidth <= 768;

    let target = document.querySelector(`[data-guide="${targetKey}"]`);
    if (isMobileViewport && targetKey === "workflow-stepper") {
      const mobileTarget = document.querySelector('[data-guide="workflow-stepper-mobile"]');
      if (mobileTarget) target = mobileTarget;
    }
    if (!target) return undefined;

    // For input and results panels, refine target to the actual card element for crisp rounded highlights
    if (targetKey === "workflow-input") {
      const card = target.querySelector(".workflow-input-card");
      if (card) target = card;
    } else if (targetKey === "workflow-results") {
      const card = target.querySelector(".workflow-result-card");
      if (card) target = card;
    }

    if (targetKey === "workflow-guide-button" || targetKey === "workspace-header" || (targetKey === "workflow-stepper" && !isMobileViewport)) {
      window.scrollTo({ top: 0, behavior: "smooth" });
    } else if (targetKey === "workflow-draft-citewise") {
      target.scrollIntoView({ behavior: "smooth", block: "center" });
    } else if (targetKey !== "workflow-stepper") {
      // workflow-input or workflow-results: on mobile scroll to start so the card header is at top
      target.scrollIntoView({ behavior: "smooth", block: isMobileViewport ? "start" : "nearest" });
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
  }, [currentStep, guideOpen, guideStep]);

  useEffect(() => {
    if (!guideOpen) return undefined;

    const handleKeyDown = (event) => {
      if (event.key === "Escape") setGuideStep(-1);
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [guideOpen]);

  function advanceGuide() {
    if (guideStep === guideSteps.length - 1) {
      setGuideStep(-1);
      return;
    }
    setGuideStep((current) => current + 1);
  }

  const currentGuideSteps = getGuideSteps(currentStep);
  const currentTarget = currentGuideSteps[guideStep]?.target;
  const isMobile = typeof window !== "undefined" && window.innerWidth <= 768;
  const isNearGuideBtn = currentTarget === "workflow-guide-button";
  const isNearDraftBtn = currentTarget === "workflow-draft-citewise";
  const isDockedLeft = !isMobile && !isNearGuideBtn && !isNearDraftBtn && (
    currentTarget === "workflow-results"
    || (spotlight && spotlight.left > (typeof window !== "undefined" ? window.innerWidth * 0.45 : 600))
  );

  return (
    <div className="workflow-page">
      <Navbar />
      <main className="workflow-shell">
        <header className="workflow-header" data-guide="workspace-header">
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
              <h1>{groupName || "Current workspace"}</h1>
              <p className="workflow-description">
                Process a document through extraction, summarization, gap analysis, and topic discovery.
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

        <div className="workflow-content">{children}</div>
      </main>

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
            className={`workflow-guide-card${isDockedLeft ? " is-dock-left" : ""}${isNearGuideBtn ? " is-near-guide-button" : ""}${isNearDraftBtn ? " is-near-draft-btn" : ""}`}
            style={
              isMobile
                ? (isNearDraftBtn || currentTarget === "workflow-stepper")
                  ? { top: "16px", bottom: "auto", left: "16px", right: "16px", width: "auto" }
                  : { bottom: "80px", top: "auto", left: "16px", right: "16px", width: "auto" }
                : isNearGuideBtn && spotlight
                ? {
                    top: Math.max(150, Math.round(spotlight.top + spotlight.height + 16)),
                    bottom: "auto",
                    right: Math.max(16, Math.round((typeof window !== "undefined" ? window.innerWidth : 1200) - (spotlight.left + spotlight.width))),
                    left: "auto",
                  }
                : isNearDraftBtn && spotlight
                ? {
                    bottom: Math.max(140, Math.round((typeof window !== "undefined" ? window.innerHeight : 800) - spotlight.top + 28)),
                    top: "auto",
                    right: Math.max(16, Math.round((typeof window !== "undefined" ? window.innerWidth : 1200) - (spotlight.left + spotlight.width))),
                    left: "auto",
                  }
                : undefined
            }
            role="dialog"
            aria-modal="true"
            aria-labelledby="workflow-guide-title"
          >
            <div className="workflow-guide-header">
              <span className="workflow-guide-progress">
                Step {guideStep + 1} of {guideSteps.length}
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
            <h2 id="workflow-guide-title">{renderGuideText(guideSteps[guideStep]?.title)}</h2>
            <p>{renderGuideText(guideSteps[guideStep]?.description)}</p>
            <div className="workflow-guide-actions">
              {guideStep < guideSteps.length - 1 && (
                <button
                  type="button"
                  className="workflow-guide-skip"
                  onClick={() => setGuideStep(-1)}
                >
                  Skip Tour
                </button>
              )}
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
                  {guideStep >= guideSteps.length - 1 ? "Finish" : "Next"}
                </button>
              </div>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
