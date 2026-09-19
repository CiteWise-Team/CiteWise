import WorkflowLayout from "../layouts/WorkspaceLayout";
import InputPanel from "../components/workspace/InputPanel";
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import WorkflowTracker from "../components/workspace/WorkflowTracker";
import ResultPanel from "../components/workspace/ResultPanel";
import NotFound from "./NotFound";
import { useGroup } from "../context/GroupContext";
import { useAuth } from "../context/AuthContext";
import { getGroupsByUserIdAPI } from "../api/group.api";

export default function GroupWorkflow() {
  const [step, setStep] = useState("extractor"); // change to focus
  const [result, setResult] = useState(null);

  // The workspace used to come solely from localStorage, so the id in the URL
  // was decorative: two tabs shared one "current group", and opening a second
  // workspace silently repointed the first. The URL is the source of truth now.
  const { groupName: routeGroupId } = useParams();
  const { groupId, enterGroup } = useGroup();
  const { user } = useAuth();
  // Holds the id that failed to resolve, so navigating elsewhere clears it.
  const [missingFor, setMissingFor] = useState(null);

  const resolved = Boolean(routeGroupId) && groupId === routeGroupId;

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

  if (missingFor === routeGroupId) {
    return (
      <NotFound
        title="Workspace not found"
        message="This workspace doesn't exist, or it isn't one of yours."
      />
    );
  }

  if (!resolved) {
    return (
      <WorkflowLayout>
        <p style={{ padding: "40px", color: "#9ca3af" }}>Opening workspace…</p>
      </WorkflowLayout>
    );
  }

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
