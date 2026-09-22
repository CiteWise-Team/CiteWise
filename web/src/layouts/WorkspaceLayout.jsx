import Navbar from "../components/Navbar.jsx";
import { useGroup } from "../context/GroupContext.jsx";
import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
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

  if (["summarizer", "gap", "topic"].includes(currentStep)) return steps.slice(2, 4);
  return steps;
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
    if (!guideOpen) return undefined;

    const currentGuideSteps = getGuideSteps(currentStep);
    const target = document.querySelector(`[data-guide="${currentGuideSteps[guideStep].target}"]`);
    if (!target) return undefined;

    target.scrollIntoView({ behavior: "smooth", block: "center" });

    const updateSpotlight = () => {
      const rect = target.getBoundingClientRect();
      setSpotlight({ top: rect.top - 8, left: rect.left - 8, width: rect.width + 16, height: rect.height + 16 });
    };

    updateSpotlight();
    window.addEventListener("resize", updateSpotlight);
    window.addEventListener("scroll", updateSpotlight, true);
    return () => {
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

  return (
    <div className="workflow-page">
      <Navbar />
      <main className="workflow-shell">
        <Link to="/groups" className="workflow-back-link">
          <span aria-hidden="true" className="workflow-back-arrow">←</span>
          <span>Back to Workspaces</span>
        </Link>

        <header className="workflow-header" data-guide="workspace-header">
          <div>
            <p className="workflow-eyebrow">Research workspace</p>
            <h1>{groupName || "Current workspace"}</h1>
            <p className="workflow-description">
              Process a document through extraction, summarization, gap analysis, and topic discovery.
            </p>
          </div>
          <button type="button" className="workflow-guide-button" data-guide="workflow-guide-button" onClick={() => setGuideStep(0)}>
            <span aria-hidden="true">?</span>
            Guide
          </button>
        </header>

        <div className="workflow-content">{children}</div>
      </main>

      {guideOpen && (
        <div className="workflow-guide-layer" role="presentation">
          {spotlight && (
            <>
              <div className="workflow-guide-dimmer" style={{ top: 0, left: 0, right: 0, height: spotlight.top }} />
              <div
                className="workflow-guide-dimmer"
                style={{ top: spotlight.top + spotlight.height, left: 0, right: 0, bottom: 0 }}
              />
              <div
                className="workflow-guide-dimmer"
                style={{ top: spotlight.top, left: 0, width: spotlight.left, height: spotlight.height }}
              />
              <div
                className="workflow-guide-dimmer"
                style={{ top: spotlight.top, left: spotlight.left + spotlight.width, right: 0, height: spotlight.height }}
              />
              <div
                className="workflow-guide-spotlight"
                style={{ top: spotlight.top, left: spotlight.left, width: spotlight.width, height: spotlight.height }}
              />
            </>
          )}
          <section className="workflow-guide-card" role="dialog" aria-modal="true" aria-labelledby="workflow-guide-title">
            <div className="workflow-guide-progress">{guideStep + 1} of {guideSteps.length}</div>
            <h2 id="workflow-guide-title">{guideSteps[guideStep].title}</h2>
            <p>{guideSteps[guideStep].description}</p>
            <div className="workflow-guide-actions">
              {guideStep > 0 && (
                <button type="button" className="workflow-guide-back" onClick={() => setGuideStep((current) => current - 1)}>
                  Back
                </button>
              )}
              <button type="button" className="workflow-guide-next" onClick={advanceGuide}>
                {guideStep === guideSteps.length - 1 ? "Finish" : "Next"}
              </button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
