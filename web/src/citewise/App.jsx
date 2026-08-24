import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import GlobalNavigationBar from "./shared/components/GlobalNavigationBar";
import WorkspaceImportLayout from "./module1/catalyst-import/components/WorkspaceImportLayout";
import ValidationDashboardLayout from "./module2/literature-review/components/ValidationDashboardLayout";
import SynthesisDraftModule from "./module3/synthesis-draft/components/SynthesisDraftModule";

// All localStorage keys are namespaced by groupId so each workspace keeps its own
// independent CiteWise session. Switching workspaces and returning always restores
// the correct state.
function scopedKey(groupId, name) {
  return `citewise.${groupId}.${name}`;
}

export default function CiteWiseApp() {
  const navigate = useNavigate();
  const { groupId } = useParams();

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
    return !Number.isNaN(parsed) ? Math.max(parsed, floor) : floor;
  });

  useEffect(() => {
    if (groupId) localStorage.setItem(scopedKey(groupId, "step"), step.toString());
  }, [step, groupId]);

  useEffect(() => {
    if (groupId && sessionId) localStorage.setItem(scopedKey(groupId, "sessionId"), sessionId);
  }, [sessionId, groupId]);

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
    setStep(nextStep);
  };

  const handleNavbarNavigate = (nextStep) => {
    if (nextStep <= maxUnlockedStep) setStep(nextStep);
  };

  function handleBackToGroups() {
    navigate("/groups");
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", minHeight: "100vh", background: "#16162a", textAlign: "left" }}>

      <GlobalNavigationBar
        currentStep={step}
        maxUnlockedStep={maxUnlockedStep}
        onNavigate={handleNavbarNavigate}
        onLogoClick={handleBackToGroups}
        onBack={handleBackToGroups}
      />

      <main style={{ flex: 1, width: "100%", display: "flex", flexDirection: "column", minHeight: 0 }}>

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

      </main>
    </div>
  );
}
