import { createPortal } from "react-dom";
import { Check, FileText, Sparkles, Search, Lightbulb } from "lucide-react";
import { useTheme } from "../../context/ThemeContext";

const steps = [
  { key: "extractor", label: "Extractor", stepNum: "Step 1", mobileLabel: "Extractor", icon: FileText },
  { key: "summarizer", label: "Summarizer", stepNum: "Step 2", mobileLabel: "Summarizer", icon: Sparkles },
  { key: "gap", label: "Gap Extractor", stepNum: "Step 3", mobileLabel: "Gaps", icon: Search },
  { key: "topic", label: "Topic Suggester", stepNum: "Step 4", mobileLabel: "Topics", icon: Lightbulb },
];

export default function WorkflowTracker({ currentStep, completedSteps = [], onStepChange }) {
  const { isDark } = useTheme();
  // Find highest step finished so navigating backward never resets or shrinks the progression line
  const completedIndices = completedSteps
    .map((k) => steps.findIndex((s) => s.key === k))
    .filter((i) => i !== -1);
  const maxCompletedIndex = completedIndices.length > 0 ? Math.max(...completedIndices) : -1;

  return (
    <>
      {/* Desktop Workflow Progression Header Card */}
      <div className="workflow-progression-card" data-guide="workflow-stepper">
        <div className="workflow-progression-nav-wrap">
          <div className="workflow-progression-container">
            {steps.map((step, idx) => {
              const isCurrent = currentStep === step.key;
              const isFinished = completedSteps.includes(step.key);

              // A line segment leaving a finished step stays active
              // even if the user navigates back to inspect earlier steps
              const isLeftLineActive = idx > 0 && maxCompletedIndex >= idx - 1;
              const isRightLineActive = idx < steps.length - 1 && maxCompletedIndex >= idx;

              // Allow clicking on any step that is completed, or current, or the next step if current is completed
              const isClickable =
                isFinished ||
                isCurrent ||
                idx <= maxCompletedIndex + 1;

              return (
                <div
                  key={step.key}
                  className={`workflow-progression-step${isCurrent ? " is-current" : ""}${isFinished ? " is-finished" : ""}`}
                >
                  {/* Connecting line segments */}
                  {idx > 0 && (
                    <div
                      className={`workflow-progression-line line-left${isLeftLineActive ? " is-active" : ""}`}
                      aria-hidden="true"
                    />
                  )}
                  {idx < steps.length - 1 && (
                    <div
                      className={`workflow-progression-line line-right${isRightLineActive ? " is-active" : ""}`}
                      aria-hidden="true"
                    />
                  )}

                  {/* Progression Squircle Node Button */}
                  <button
                    type="button"
                    className={`workflow-progression-node${isCurrent ? " is-current" : ""}${isFinished ? " is-finished" : ""}`}
                    aria-label={`${step.stepNum}: ${step.label}${isFinished ? " (Finished)" : ""}${isCurrent ? " (Current Step)" : ""}`}
                    aria-current={isCurrent ? "step" : undefined}
                    onClick={() => {
                      if (isClickable) onStepChange(step.key);
                    }}
                    disabled={!isClickable}
                    style={{ cursor: isClickable ? "pointer" : "not-allowed" }}
                  >
                    {isFinished ? (
                      <Check size={15} strokeWidth={2.8} className="workflow-progression-check" />
                    ) : isCurrent ? (
                      <span className="workflow-progression-active-dot" />
                    ) : (
                      <span className="workflow-progression-pending-dot" />
                    )}
                  </button>

                  {/* Text label underneath node */}
                  <button
                    type="button"
                    className="workflow-progression-text-btn"
                    onClick={() => {
                      if (isClickable) onStepChange(step.key);
                    }}
                    disabled={!isClickable}
                    style={{ cursor: isClickable ? "pointer" : "not-allowed" }}
                    tabIndex={-1}
                    aria-hidden="true"
                  >
                    <span className="workflow-progression-step-num">{step.stepNum}</span>
                    <span className="workflow-progression-step-label">{step.label}</span>
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Mobile Bottom Navigation Bar (Dynamic Floating Capsule Dock) */}
      {typeof document !== "undefined" &&
        createPortal(
          <nav
            className="workflow-mobile-bottom-nav"
            data-guide="workflow-stepper-mobile"
            aria-label="CATalyst workflow navigation"
            style={{
              background: isDark ? "rgba(15, 14, 23, 0.94)" : "rgba(255, 255, 255, 0.95)",
              backdropFilter: "blur(20px)",
              WebkitBackdropFilter: "blur(20px)",
              border: isDark ? "1px solid rgba(255, 255, 255, 0.12)" : "1px solid rgba(229, 231, 235, 0.9)",
              borderRadius: "9999px",
              boxShadow: isDark
                ? "0 12px 36px rgba(0, 0, 0, 0.35), 0 4px 12px rgba(0, 0, 0, 0.18)"
                : "0 10px 30px rgba(0, 0, 0, 0.12), 0 4px 12px rgba(0, 0, 0, 0.05)",
              padding: "6px",
            }}
          >
            <div className="workflow-mobile-bottom-nav-inner">
              {steps.map((step, idx) => {
                const isCurrent = currentStep === step.key;
                const isFinished = completedSteps.includes(step.key);
                const isClickable =
                  isFinished ||
                  isCurrent ||
                  idx <= maxCompletedIndex + 1;
                const IconComponent = step.icon;

                return (
                  <button
                    key={step.key}
                    type="button"
                    onClick={() => isClickable && onStepChange(step.key)}
                    disabled={!isClickable}
                    aria-current={isCurrent ? "step" : undefined}
                    aria-label={`${step.label}${isFinished ? " (Finished)" : ""}${isCurrent ? " (Active)" : ""}`}
                    className={`workflow-mobile-tab-btn${isCurrent ? " is-active" : ""}${isFinished ? " is-finished" : ""}${!isClickable ? " is-locked" : ""}`}
                    style={{
                      color: isCurrent
                        ? "#ffffff"
                        : isDark
                          ? "rgba(255, 255, 255, 0.65)"
                          : "#4b5563",
                    }}
                  >
                    <span style={{ position: "relative", display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
                      <IconComponent
                        size={18}
                        strokeWidth={isCurrent ? 2.4 : 2}
                        className="workflow-mobile-tab-icon"
                      />
                      {isFinished && (
                        <span
                          className="workflow-mobile-tab-check-badge"
                          title="Completed"
                          style={{
                            border: isCurrent
                              ? "1.5px solid #ea580c"
                              : isDark
                                ? "1.5px solid #0f0e17"
                                : "1.5px solid #ffffff",
                          }}
                        >
                          <Check size={8} strokeWidth={3.5} />
                        </span>
                      )}
                    </span>
                    <span className="workflow-mobile-tab-label">{step.mobileLabel}</span>
                  </button>
                );
              })}
            </div>
          </nav>,
          document.body
        )}
    </>
  );
}