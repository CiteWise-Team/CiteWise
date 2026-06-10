import WorkflowLayout from "../layouts/WorkspaceLayout";
import InputPanel from "../components/workspace/InputPanel";
import { useState } from "react";
import WorkflowTracker from "../components/workspace/WorkflowTracker";
import ResultPanel from "../components/workspace/ResultPanel";
import { useGroup } from "../context/GroupContext";

export default function GroupWorkflow() {
  const [step, setStep] = useState("extractor"); // change to focus
  const [result, setResult] = useState(null);
  const group_id = useGroup().groupId;

  return (
    <WorkflowLayout>
      <WorkflowTracker currentStep={step} onStepChange={setStep} />

      <div
        className="d-flex flex-row gap-4"
        style={{ height: "calc(100vh - 80px)" }} 
      >
        {/* Input Panel */}
        <div
          style={{
            flex: 1, 
            minHeight: 0,
          }}
        >
          <InputPanel step={step} setResult={setResult} />
        </div>

        {/* Result Panel */}
        <div
          style={{
            flex: 1,
            minHeight: 0, 
            display: "flex",
            flexDirection: "column",
          }}
        >
          <ResultPanel step={step} result={result} />
        </div>
      </div>
    </WorkflowLayout>
  );
}