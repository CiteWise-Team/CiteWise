import WorkflowLayout from "../layouts/WorkspaceLayout";
import InputPanel from "../components/workspace/InputPanel";
import { useCallback, useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import WorkflowTracker from "../components/workspace/WorkflowTracker";
import ResultPanel from "../components/workspace/ResultPanel";
import NotFound from "./NotFound";
import { useGroup } from "../context/GroupContext";
import { useAuth } from "../context/AuthContext";
import { getGroupsByUserIdAPI } from "../api/group.api";
import { getExtractedFilesByGroupAPI } from "../api/workflow.extractor";
import { getSummaryByGroupAPI } from "../api/workflow.summarizer";
import { getGapsByGroupAPI } from "../api/workflow.gap";
import { getTopicsByGroupIdAPI } from "../api/workflow.topic";

export default function GroupWorkflow() {
  const [step, setStep] = useState("extractor"); // change to focus
  const [result, setResult] = useState(null);

  // The workspace used to come solely from localStorage, so the id in the URL
  // was decorative: two tabs shared one "current group", and opening a second
  // workspace silently repointed the first. The URL is the source of truth now.
  const { groupName: routeGroupId } = useParams();
  const [completedSteps, setCompletedSteps] = useState(() => {
    try {
      const saved = localStorage.getItem(`catalyst.${routeGroupId}.completedSteps`);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const { groupId, enterGroup } = useGroup();
  const { user } = useAuth();
  // Holds the id that failed to resolve, so navigating elsewhere clears it.
  const [missingFor, setMissingFor] = useState(null);
  const [isInputCollapsed, setIsInputCollapsed] = useState(false);
  const [isResultCollapsed, setIsResultCollapsed] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStatus, setProcessingStatus] = useState("");

  const resolved = Boolean(routeGroupId) && groupId === routeGroupId;

  useEffect(() => {
    setResult(null);
    setIsProcessing(false);
    setProcessingStatus("");
  }, [step]);

  useEffect(() => {
    if (!routeGroupId || resolved) return;

    let cancelled = false;

    (async () => {
      try {
        const response = await getGroupsByUserIdAPI(user?.id);
        if (cancelled) return;

        const match = (response?.groups?.data ?? []).find((g) => g.id === routeGroupId);
        if (!match) {
          setMissingFor(routeGroupId);
          return;
        }

        enterGroup({ id: match.id, name: match.name, color: match.color });
      } catch {
        if (!cancelled) setMissingFor(routeGroupId);
      }
    })();

    return () => { cancelled = true; };
  }, [routeGroupId, resolved, user?.id, enterGroup]);

  // Hydrate completed steps from server data so navigation buttons know if steps are done
  useEffect(() => {
    if (!routeGroupId) return;
    let cancelled = false;

    async function checkServerCompleted() {
      try {
        const [extractorRes, summarizerRes, gapRes, topicRes] = await Promise.allSettled([
          getExtractedFilesByGroupAPI(routeGroupId),
          getSummaryByGroupAPI(routeGroupId),
          getGapsByGroupAPI(routeGroupId),
          getTopicsByGroupIdAPI(routeGroupId),
        ]);

        if (cancelled) return;

        const serverCompleted = [];
        if (extractorRes.status === "fulfilled" && (extractorRes.value?.data || []).length > 0) {
          serverCompleted.push("extractor");
        }
        if (summarizerRes.status === "fulfilled" && (summarizerRes.value?.data || []).length > 0) {
          serverCompleted.push("summarizer");
        }
        if (gapRes.status === "fulfilled" && (gapRes.value?.data || []).length > 0) {
          serverCompleted.push("gap");
        }
        if (topicRes.status === "fulfilled" && (topicRes.value?.data || []).length > 0) {
          serverCompleted.push("topic");
        }

        if (serverCompleted.length > 0) {
          setCompletedSteps((prev) => {
            const merged = Array.from(new Set([...prev, ...serverCompleted]));
            try {
              localStorage.setItem(`catalyst.${routeGroupId}.completedSteps`, JSON.stringify(merged));
            } catch {}
            return merged;
          });
        }
      } catch (err) {
        console.warn("Could not hydrate completed steps from server:", err);
      }
    }

    checkServerCompleted();
    return () => { cancelled = true; };
  }, [routeGroupId]);

  const handleStepResult = useCallback((stepKey, nextResult) => {
    setResult(nextResult);
    setCompletedSteps((completed) => {
      if (completed.includes(stepKey)) return completed;
      const nextCompleted = [...completed, stepKey];
      localStorage.setItem(`catalyst.${routeGroupId}.completedSteps`, JSON.stringify(nextCompleted));
      if (stepKey === "topic" || nextCompleted.includes("topic")) {
        try {
          localStorage.setItem(`citewise.${routeGroupId}.step1Completed`, "true");
        } catch {}
      }
      return nextCompleted;
    });
  }, [routeGroupId]);

  const handleResultComplete = useCallback(() => {
    handleStepResult(step, true);
  }, [handleStepResult, step]);

  if (missingFor === routeGroupId) {
    return (
      <NotFound
        title="Workspace not found"
        message="This workspace doesn't exist, or it isn't one of yours."
      />
    );
  }

  const [loadingProgress, setLoadingProgress] = useState(25);

  useEffect(() => {
    if (resolved) return;
    const t1 = setTimeout(() => setLoadingProgress(55), 250);
    const t2 = setTimeout(() => setLoadingProgress(85), 600);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [resolved]);

  if (!resolved) {
    return (
      <WorkflowLayout>
        <div className="cw-loading-container" style={{ padding: "4rem 1rem", minHeight: "500px", width: "100%" }}>
          <div className="cw-loading-card" style={{ padding: "2.75rem 2.5rem" }}>
            {/* Guaranteed Animated SVG Spinner with glowing center */}
            <div
              style={{
                position: "relative",
                width: "80px",
                height: "80px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                marginBottom: "1.25rem",
              }}
            >
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  width: "80px",
                  height: "80px",
                  borderRadius: "50%",
                  border: "3.5px solid rgba(234, 88, 12, 0.14)",
                  borderTopColor: "#ea580c",
                  borderRightColor: "#ea580c",
                  animation: "cwSpinOrbit 0.95s linear infinite",
                  boxSizing: "border-box",
                  pointerEvents: "none",
                }}
              />
              <div
                style={{
                  width: "44px",
                  height: "44px",
                  borderRadius: "50%",
                  background: "rgba(234, 88, 12, 0.09)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  boxShadow: "0 0 16px rgba(234, 88, 12, 0.25)",
                }}
              >
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#ea580c" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
                </svg>
              </div>
            </div>

            <h3
              style={{
                fontFamily: "'Poppins', sans-serif",
                fontSize: "1.25rem",
                fontWeight: 700,
                color: "var(--cw-text-primary, #0f0e17)",
                margin: "0 0 0.4rem 0",
                letterSpacing: "-0.01em",
              }}
            >
              Loading CATalyst Workspace
            </h3>
            <p
              style={{
                fontFamily: "'Poppins', sans-serif",
                fontSize: "0.85rem",
                color: "var(--cw-text-muted, #6b7280)",
                lineHeight: 1.55,
                margin: "0 0 1.5rem 0",
                maxWidth: "420px",
                minHeight: "1.55em",
              }}
            >
              Opening research workflow and synchronizing state...
            </p>

            {/* Moving Progress Bar & Percentage Count */}
            <div
              style={{
                width: "280px",
                maxWidth: "85%",
                height: "8px",
                background: "var(--cw-border, #e5e7eb)",
                borderRadius: "999px",
                overflow: "hidden",
                position: "relative",
                boxShadow: "inset 0 1px 3px rgba(0, 0, 0, 0.08)",
                margin: "0 auto 0.6rem auto",
              }}
            >
              <div
                style={{
                  height: "100%",
                  width: `${loadingProgress}%`,
                  background: "linear-gradient(90deg, #ea580c 0%, #f97316 50%, #fb923c 100%)",
                  borderRadius: "999px",
                  transition: "width 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                  boxShadow: "0 0 10px rgba(234, 88, 12, 0.45)",
                }}
              />
            </div>

            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                width: "280px",
                maxWidth: "85%",
                margin: "0 auto",
                fontSize: "0.75rem",
                fontFamily: "'Poppins', sans-serif",
              }}
            >
              <span style={{ color: "var(--cw-text-muted, #6b7280)" }}>Loading progress</span>
              <span style={{ color: "#ea580c", fontWeight: 700 }}>{loadingProgress}%</span>
            </div>
          </div>

          {/* Shimmering skeleton cards beneath previewing layout */}
          <div className="cw-loading-skeleton-preview" style={{ marginTop: "1.5rem", width: "100%", maxWidth: "520px", display: "flex", gap: "12px" }}>
            <div className="cw-loading-skeleton-card-left" />
            <div className="cw-loading-skeleton-card-right" />
          </div>
        </div>
      </WorkflowLayout>
    );
  }

  return (
    <WorkflowLayout currentStep={step}>
      <div className="workflow-stepper">
        <WorkflowTracker
          currentStep={step}
          completedSteps={completedSteps}
          onStepChange={setStep}
        />
      </div>

      <div className="workflow-workbench">
        <section className={`workflow-panel ${isInputCollapsed ? "is-collapsed" : ""}`} data-guide="workflow-input" aria-label="Workflow input">
          <InputPanel
            step={step}
            setResult={(nextResult) => handleStepResult(step, nextResult)}
            isCollapsed={isInputCollapsed}
            onToggleCollapse={() => setIsInputCollapsed(!isInputCollapsed)}
            isProcessing={isProcessing}
            setIsProcessing={setIsProcessing}
            processingStatus={processingStatus}
            setProcessingStatus={setProcessingStatus}
          />
        </section>

        <section className={`workflow-panel ${isResultCollapsed ? "is-collapsed" : ""}`} data-guide="workflow-results" aria-label="Workflow results">
          <ResultPanel
            step={step}
            result={result}
            onComplete={handleResultComplete}
            isCollapsed={isResultCollapsed}
            onToggleCollapse={() => setIsResultCollapsed(!isResultCollapsed)}
            isProcessing={isProcessing}
            processingStatus={processingStatus}
          />
        </section>
      </div>
    </WorkflowLayout>
  );
}
