import { IoDocumentText } from "react-icons/io5";
import { MdDoubleArrow } from "react-icons/md";
import { HiOutlineDocumentSearch } from "react-icons/hi";
import { IoExtensionPuzzle } from "react-icons/io5";
import { PiHeadCircuitBold } from "react-icons/pi";
import { IoGlobeOutline } from "react-icons/io5";
const steps = [
  { key: "extractor", label: "Extractor", icon: IoDocumentText },
  { key: "summarizer", label: "Summarizer", icon: HiOutlineDocumentSearch },
  { key: "gap", label: "Gap Extractor", icon: IoExtensionPuzzle },
  { key: "topic", label: "Topic Suggester", icon: PiHeadCircuitBold },
  // { key: "search", label: "Searcher", icon: IoGlobeOutline },
];

export default function WorkflowTracker({ currentStep, onStepChange }) {
  return (
    <div className="card p-4 mb-4" style={{ backgroundColor: "#1e1e2f", border: "1px solid #3a3a55" }}>
      <div className="d-flex justify-content-between align-items-center flex-wrap">

        {steps.map((step, index) => {
          const Icon = step.icon;
          const isActive = currentStep === step.key;

          return (
            <div key={step.key} className="d-flex align-items-center">
              <div
                className="text-center"
                style={{ cursor: "pointer" }}
                onClick={() => onStepChange(step.key)}
              >
                <div
                  className={`rounded-circle d-flex align-items-center justify-content-center mb-2`}
                  style={{
                    width: 48,
                    height: 48,
                    backgroundColor: isActive ? "#5b5bd6" : "#25253a",
                    color: isActive ? "#fff" : "#a1a1b5",
                    border: isActive ? "none" : "1px solid #3a3a55",
                  }}
                >
                  <Icon size={22} />
                </div>

                <div
                  className={`fw-bold small`}
                  style={{ color: isActive ? "#5b5bd6" : "#a1a1b5" }}
                >
                  {step.label}
                </div>
              </div>

              {index !== steps.length - 1 && (
                <MdDoubleArrow size={22} className="mx-3" style={{ color: "#a1a1b5" }} />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}