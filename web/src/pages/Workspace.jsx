import WorkflowLayout from "../layouts/WorkspaceLayout";
import InputPanel from "../components/workspace/InputPanel";
import { useState } from "react";
import WorkflowTracker from "../components/workspace/WorkflowTracker";
import ResultPanel from "../components/workspace/ResultPanel";

export default function GroupWorkflow() {
  const [step, setStep] = useState("extractor"); // change to focus
  const [result, setResult] = useState(null);

  return (
    <WorkflowLayout>
      <div className="workflow-stepper">
        <WorkflowTracker currentStep={step} onStepChange={setStep} />
      </div>

      <div className="workflow-workbench">
        <section className="workflow-panel" aria-label="Workflow input">
          <InputPanel step={step} setResult={setResult} />
        </section>

        <section className="workflow-panel" aria-label="Workflow results">
          <ResultPanel step={step} result={result} />
        </section>
      </div>
    </WorkflowLayout>
  );
}