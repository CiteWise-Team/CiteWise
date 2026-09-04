import { useEffect, useState } from "react";
import { Layers, LoaderCircle, Plus, Check } from "lucide-react";
import { useGroup } from "../../../context/GroupContext.jsx";
import { getGapsByGroupAPI } from "../../../api/workflow.gap.js";
import { createIntegrationImportAPI } from "../../../api/catalyst2.api.js";
import { useFeedbackModal } from "../../../hooks/useFeedbackModel";
import FeedbackModal from "../../modals/FeedbackModal";

export default function IntegrationInput({ setResult }) {
  const { groupId } = useGroup();
  const [gaps, setGaps] = useState([]);
  const [selectedGaps, setSelectedGaps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const { config, showFeedback } = useFeedbackModal();

  useEffect(() => {
    let active = true;
    async function loadGaps() {
      if (!groupId) return;
      setLoading(true);
      try {
        const response = await getGapsByGroupAPI(groupId);
        if (active) setGaps((response.data || []).filter((gap) => !gap.title?.includes("Integrated")));
      } catch (error) {
        showFeedback({ type: "error", title: "Could not load gaps", message: error.message });
      } finally {
        if (active) setLoading(false);
      }
    }
    loadGaps();
    return () => { active = false; };
  }, [groupId, showFeedback]);

  function toggleGap(gapId) {
    setSelectedGaps((current) => current.includes(gapId)
      ? current.filter((id) => id !== gapId)
      : current.length < 3 ? [...current, gapId] : current);
  }

  async function handleCreateImport() {
    if (selectedGaps.length < 2) {
      showFeedback({ type: "warning", title: "Select more gaps", message: "Choose at least two gaps to prepare an integration import." });
      return;
    }

    setSubmitting(true);
    try {
      const response = await createIntegrationImportAPI({
        workspace_id: groupId,
        source_system: "citewise",
        import_type: "gap_import",
        status: "pending",
        payload_json: {
          gap_ids: selectedGaps,
          selected_count: selectedGaps.length,
        },
      });
      setResult(response.data);
      setSelectedGaps([]);
      showFeedback({ type: "success", title: "Integration queued", message: "The integration import is ready for processing." });
    } catch (error) {
      showFeedback({ type: "error", title: "Integration failed", message: error.message });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <div className="h-100 rounded-4 p-3 d-flex flex-column" style={{ backgroundColor: "#1e1e2f", border: "1px solid #3a3a55", color: "#e4e4f0" }}>
        <div className="d-flex justify-content-between mb-3">
          <div>
            <h5 className="fw-bold mb-0 text-white">Integration</h5>
            <small style={{ color: "#a1a1b5" }}>Prepare a workspace import from selected gaps.</small>
          </div>
          <Layers size={22} color="#a5b4fc" aria-hidden="true" />
        </div>

        <div className="flex-grow-1" style={{ overflowY: "auto", minHeight: 0 }}>
          <small style={{ color: "#a1a1b5" }}>Available gaps ({selectedGaps.length}/3 selected)</small>
          <div className="d-flex flex-column gap-2 mt-2">
            {loading && <div style={{ color: "#a1a1b5" }}>Loading gaps...</div>}
            {!loading && gaps.length === 0 && <div style={{ color: "#a1a1b5" }}>No gaps available yet. Complete Gap Extractor first.</div>}
            {gaps.map((gap) => {
              const selected = selectedGaps.includes(gap.id);
              return (
                <button key={gap.id} type="button" onClick={() => toggleGap(gap.id)} className="text-start p-2 rounded-3 d-flex align-items-start gap-2" style={{ backgroundColor: selected ? "#303064" : "#25253a", border: `1px solid ${selected ? "#5b5bd6" : "#3a3a55"}`, color: "#e4e4f0" }}>
                  <span className="d-flex align-items-center justify-content-center" style={{ width: 18, height: 18, border: "1px solid #777792", borderRadius: 4, flexShrink: 0 }}>
                    {selected && <Check size={13} color="#a5b4fc" />}
                  </span>
                  <span>
                    <span className="d-block small fw-semibold">{gap.title || "Untitled gap"}</span>
                    <span className="d-block" style={{ color: "#a1a1b5", fontSize: 12 }}>{gap.gap?.slice(0, 120) || "Gap analysis result"}</span>
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <button type="button" onClick={handleCreateImport} disabled={submitting || selectedGaps.length < 2} className="btn mt-3 align-self-end d-inline-flex align-items-center gap-2" style={{ backgroundColor: "#5b5bd6", color: "#fff", border: "none" }}>
          {submitting ? <LoaderCircle size={16} className="spin" /> : <Plus size={16} />}
          {submitting ? "Preparing..." : "Prepare Integration"}
        </button>
      </div>
      <FeedbackModal {...config} />
    </>
  );
}
