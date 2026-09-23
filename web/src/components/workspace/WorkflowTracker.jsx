import { Check } from "lucide-react";

const steps = [
  { key: "extractor", label: "Extractor", stepNum: "Step 1" },
  { key: "summarizer", label: "Summarizer", stepNum: "Step 2" },
  { key: "gap", label: "Gap Extractor", stepNum: "Step 3" },
  { key: "topic", label: "Topic Suggester", stepNum: "Step 4" },
];

export default function WorkflowTracker({ currentStep, completedSteps = [], onStepChange }) {
  // Find highest step finished so navigating backward never resets or shrinks the progression line
  const completedIndices = completedSteps
    .map((k) => steps.findIndex((s) => s.key === k))
    .filter((i) => i !== -1);
  const maxCompletedIndex = completedIndices.length > 0 ? Math.max(...completedIndices) : -1;

  return (
    <div className="workflow-progression-card" data-guide="workflow-stepper">
      <div className="workflow-progression-container">
        {steps.map((step, idx) => {
          const isCurrent = currentStep === step.key;
          const isFinished = completedSteps.includes(step.key);

          // A line segment leaving a finished step stays active (green)
          // even if the user navigates back to inspect earlier steps
          const isLeftLineActive = idx > 0 && maxCompletedIndex >= idx - 1;
          const isRightLineActive = idx < steps.length - 1 && maxCompletedIndex >= idx;

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
                onClick={() => onStepChange(step.key)}
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
                onClick={() => onStepChange(step.key)}
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
  );
}