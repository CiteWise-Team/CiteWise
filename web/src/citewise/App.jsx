import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import GlobalNavigationBar from "./shared/components/GlobalNavigationBar";
import WorkspaceImportLayout from "./module1/catalyst-import/components/WorkspaceImportLayout";
import ValidationDashboardLayout from "./module2/literature-review/components/ValidationDashboardLayout";
import SynthesisDraftModule from "./module3/synthesis-draft/components/SynthesisDraftModule";

/**
 * CiteWise App
 *
 * Step 0 → Data Import        (WorkspaceImportLayout)
 * Step 1 → AI Assessment      (ValidationDashboardLayout)
 * Step 2 → Generate Introduction (SynthesisDraftModule)
 *
 * Entered via GroupCard "CiteWise →" which pre-loads sessionId +
 * catalystData into localStorage before navigating here.
 */
export default function CiteWiseApp() {
  const navigate = useNavigate();

  const [step, setStep] = useState(() => {
    const saved = localStorage.getItem("citewise.step");
    const parsed = saved !== null ? parseInt(saved, 10) : 0;
    // clamp: never start at the old "landing" step -1
    return parsed < 0 ? 0 : parsed;
  });

  const [maxUnlockedStep, setMaxUnlockedStep] = useState(() => {
    const saved = localStorage.getItem("citewise.maxUnlockedStep");
    const parsed = saved !== null ? parseInt(saved, 10) : NaN;
    const floor = step >= 0 ? step : 0;
    return !Number.isNaN(parsed) ? Math.max(parsed, floor) : floor;
  });

  const [sessionId, setSessionId] = useState(
    () => localStorage.getItem("citewise.sessionId") || ""
  );

  useEffect(() => {
    localStorage.setItem("citewise.step", step.toString());
  }, [step]);

  useEffect(() => {
    if (sessionId) localStorage.setItem("citewise.sessionId", sessionId);
  }, [sessionId]);

  useEffect(() => {
    localStorage.setItem("citewise.maxUnlockedStep", maxUnlockedStep.toString());
  }, [maxUnlockedStep]);

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
            onImportSuccess={(sid) => setSessionId(sid)}
            onProceed={handleModule1Proceed}
          />
        )}

        {step === 1 && (
          <ValidationDashboardLayout
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
