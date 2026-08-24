import React, { useState, useEffect, Component } from "react";
import { useNavigate, useParams } from "react-router-dom";
import GlobalNavigationBar from "./shared/components/GlobalNavigationBar";
import WorkspaceImportLayout from "./module1/catalyst-import/components/WorkspaceImportLayout";
import ValidationDashboardLayout from "./module2/literature-review/components/ValidationDashboardLayout";
import SynthesisDraftModule from "./module3/synthesis-draft/components/SynthesisDraftModule";

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("CiteWise ErrorBoundary caught an error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: "4rem 2rem", textAlign: "center", color: "#e4e4f0", maxWidth: 600, margin: "0 auto" }}>
          <h2 style={{ color: "#5b5bd6", fontFamily: "'Poppins', sans-serif", fontSize: "1.5rem", marginBottom: "1rem" }}>
            Something went wrong loading this section.
          </h2>
          <p style={{ color: "rgba(228,228,240,0.7)", fontFamily: "'Geist Mono', monospace", fontSize: "0.9rem", marginBottom: "1.5rem" }}>
            {this.state.error?.message || "An unexpected error occurred."}
          </p>
          <button
            onClick={() => this.setState({ hasError: false, error: null })}
            style={{
              background: "#5b5bd6",
              color: "#fff",
              border: "none",
              borderRadius: "8px",
              padding: "0.75rem 1.5rem",
              fontFamily: "'Poppins', sans-serif",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Reload Module
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

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
        <ErrorBoundary key={step}>
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
        </ErrorBoundary>
      </main>
    </div>
  );
}
