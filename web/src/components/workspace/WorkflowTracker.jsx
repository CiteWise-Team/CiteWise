import { IoDocumentText } from "react-icons/io5";
import { MdDoubleArrow } from "react-icons/md";
import { HiOutlineDocumentSearch } from "react-icons/hi";
import { IoExtensionPuzzle } from "react-icons/io5";
import { PiHeadCircuitBold } from "react-icons/pi";
const steps = [
  { key: "extractor", label: "Extractor", icon: IoDocumentText },
  { key: "summarizer", label: "Summarizer", icon: HiOutlineDocumentSearch },
  { key: "gap", label: "Gap Extractor", icon: IoExtensionPuzzle },
  { key: "topic", label: "Topic Suggester", icon: PiHeadCircuitBold },
  // { key: "search", label: "Searcher", icon: IoGlobeOutline },
];

export default function WorkflowTracker({ currentStep, onStepChange }) {
  return (
    <div className="card workflow-tracker-card">
      <div className="workflow-tracker-list">

        {steps.map((step, index) => {
          const Icon = step.icon;
          const isActive = currentStep === step.key;

          return (
            <div key={step.key} className="workflow-tracker-step-wrap">
              <div
                className={`workflow-tracker-step${isActive ? " is-active" : ""}`}
                role="button"
                tabIndex={0}
                aria-current={isActive ? "step" : undefined}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    onStepChange(step.key);
                  }
                }}
                onClick={() => onStepChange(step.key)}
              >
                <div
                  className="workflow-tracker-icon"
                >
                  <Icon size={22} />
                </div>

                <span className="workflow-tracker-label">{step.label}</span>
              </div>

              {index !== steps.length - 1 && (
                <MdDoubleArrow className="workflow-tracker-arrow" aria-hidden="true" />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}