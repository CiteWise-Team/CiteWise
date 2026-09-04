import { useEffect, useState } from "react";
import { Target, Plus, LoaderCircle, Sparkles } from "lucide-react";
import { useGroup } from "../../../context/GroupContext.jsx";
import { getGapsByGroupAPI } from "../../../api/workflow.gap.js";
import { getTopicsByGroupIdAPI } from "../../../api/workflow.topic.js";
import { createSmartObjectiveAPI, getSmartObjectivesByWorkspaceAPI } from "../../../api/smartGoals.api.js";
import { useFeedbackModal } from "../../../hooks/useFeedbackModel";
import FeedbackModal from "../../modals/FeedbackModal";

const typeOptions = ["research", "gap", "concept", "summary"];
const priorityOptions = ["low", "medium", "high"];
const statusOptions = ["draft", "active", "archived"];

export default function SmartGoalsInput({ setResult }) {
  const { groupId } = useGroup();
  const [gaps, setGaps] = useState([]);
  const [topics, setTopics] = useState([]);
  const [objectives, setObjectives] = useState([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const { config, showFeedback } = useFeedbackModal();

  const [form, setForm] = useState({
    objective_text: "",
    objective_type: "research",
    priority: "medium",
    status: "draft",
    gap_id: "",
    topic_id: "",
    version_number: 1,
    is_current: true,
    gap_text: "",
    topic_text: "",
  });

  useEffect(() => {
    let active = true;

    async function loadData() {
      if (!groupId) {
        setGaps([]);
        setTopics([]);
        setObjectives([]);
        return;
      }

      setLoading(true);
      try {
        const [gapRes, topicRes, objectiveRes] = await Promise.all([
          getGapsByGroupAPI(groupId).catch(() => ({ data: [] })),
          getTopicsByGroupIdAPI(groupId).catch(() => ({ data: [] })),
          getSmartObjectivesByWorkspaceAPI(groupId),
        ]);

        if (!active) return;

        setGaps(Array.isArray(gapRes?.data) ? gapRes.data : []);
        setTopics(Array.isArray(topicRes?.data) ? topicRes.data : []);
        setObjectives(Array.isArray(objectiveRes) ? objectiveRes : []);
      } catch (error) {
        console.warn("Smart goals load failed:", error);
      } finally {
        if (active) setLoading(false);
      }
    }

    loadData();
    return () => {
      active = false;
    };
  }, [groupId]);

  function updateField(key, value) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function handleSave() {
    if (!groupId) {
      showFeedback({ type: "error", title: "No workspace selected", message: "Select a workspace before creating a SMART goal." });
      return;
    }

    if (!form.objective_text.trim()) {
      showFeedback({ type: "error", title: "Objective required", message: "Write the objective text before saving." });
      return;
    }

    setSubmitting(true);

    try {
      const payload = {
        workspace_id: groupId,
        objective_text: form.objective_text.trim(),
        objective_type: form.objective_type,
        priority: form.priority,
        status: form.status,
        version_number: Number(form.version_number) || 1,
        is_current: Boolean(form.is_current),
        gap_id: form.gap_id || null,
        topic_id: form.topic_id || null,
        gap_text: form.gap_text || null,
        topic_text: form.topic_text || null,
      };

      const created = await createSmartObjectiveAPI(payload);
      const refreshed = await getSmartObjectivesByWorkspaceAPI(groupId);
      setObjectives(Array.isArray(refreshed) ? refreshed : []);
      setResult?.(created);
      setForm({
        objective_text: "",
        objective_type: "research",
        priority: "medium",
        status: "draft",
        gap_id: "",
        topic_id: "",
        version_number: 1,
        is_current: true,
        gap_text: "",
        topic_text: "",
      });

      showFeedback({ type: "success", title: "SMART goal saved", message: "The objective was stored for this workspace." });
    } catch (error) {
      console.error("Save SMART goal failed:", error);
      showFeedback({ type: "error", title: "Could not save SMART goal", message: error.message || "Validation failed." });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <div className="h-100 rounded-4 p-3 d-flex flex-column" style={{ backgroundColor: "#1e1e2f", border: "1px solid #3a3a55", color: "#e4e4f0" }}>
        <div className="d-flex justify-content-between align-items-center mb-3">
          <div>
            <h5 className="fw-bold mb-0 text-white">SMART Goals</h5>
            <small style={{ color: "#a1a1b5" }}>Capture scope, priority, and versioned objectives.</small>
          </div>
          <Target size={20} color="#a5b4fc" aria-hidden="true" />
        </div>

        <div className="flex-grow-1" style={{ overflowY: "auto", minHeight: 0 }}>
          <div className="mb-3">
            <label className="small" style={{ color: "#a1a1b5" }}>Objective</label>
            <textarea
              value={form.objective_text}
              onChange={(e) => updateField("objective_text", e.target.value)}
              rows={4}
              className="form-control mt-2"
              placeholder="Write the SMART objective here..."
              style={{ backgroundColor: "#151521", border: "1px solid #3a3a55", color: "#fff" }}
            />
          </div>

          <div className="row g-2 mb-3">
            <div className="col-md-6">
              <label className="small" style={{ color: "#a1a1b5" }}>Type</label>
              <select value={form.objective_type} onChange={(e) => updateField("objective_type", e.target.value)} className="form-select mt-2" style={{ backgroundColor: "#151521", color: "#fff", border: "1px solid #3a3a55" }}>
                {typeOptions.map((option) => <option key={option} value={option}>{option}</option>)}
              </select>
            </div>
            <div className="col-md-6">
              <label className="small" style={{ color: "#a1a1b5" }}>Priority</label>
              <select value={form.priority} onChange={(e) => updateField("priority", e.target.value)} className="form-select mt-2" style={{ backgroundColor: "#151521", color: "#fff", border: "1px solid #3a3a55" }}>
                {priorityOptions.map((option) => <option key={option} value={option}>{option}</option>)}
              </select>
            </div>
          </div>

          <div className="row g-2 mb-3">
            <div className="col-md-6">
              <label className="small" style={{ color: "#a1a1b5" }}>Status</label>
              <select value={form.status} onChange={(e) => updateField("status", e.target.value)} className="form-select mt-2" style={{ backgroundColor: "#151521", color: "#fff", border: "1px solid #3a3a55" }}>
                {statusOptions.map((option) => <option key={option} value={option}>{option}</option>)}
              </select>
            </div>
            <div className="col-md-6">
              <label className="small" style={{ color: "#a1a1b5" }}>Version</label>
              <input type="number" min="1" value={form.version_number} onChange={(e) => updateField("version_number", Number(e.target.value) || 1)} className="form-control mt-2" style={{ backgroundColor: "#151521", border: "1px solid #3a3a55", color: "#fff" }} />
            </div>
          </div>

          <div className="row g-2 mb-3">
            <div className="col-md-6">
              <label className="small" style={{ color: "#a1a1b5" }}>Linked gap</label>
              <select value={form.gap_id} onChange={(e) => updateField("gap_id", e.target.value)} className="form-select mt-2" style={{ backgroundColor: "#151521", color: "#fff", border: "1px solid #3a3a55" }}>
                <option value="">No gap selected</option>
                {gaps.map((gap) => <option key={gap.id} value={gap.id}>{gap.title || "Untitled gap"}</option>)}
              </select>
            </div>
            <div className="col-md-6">
              <label className="small" style={{ color: "#a1a1b5" }}>Linked topic</label>
              <select value={form.topic_id} onChange={(e) => updateField("topic_id", e.target.value)} className="form-select mt-2" style={{ backgroundColor: "#151521", color: "#fff", border: "1px solid #3a3a55" }}>
                <option value="">No topic selected</option>
                {topics.map((topic) => <option key={topic.id} value={topic.id}>{topic.title || "Untitled topic"}</option>)}
              </select>
            </div>
          </div>

          <div className="mb-3 d-flex align-items-center gap-2">
            <input id="smart-current" type="checkbox" checked={form.is_current} onChange={(e) => updateField("is_current", e.target.checked)} />
            <label htmlFor="smart-current" className="small" style={{ color: "#a1a1b5" }}>Current version</label>
          </div>

          <div className="card p-2 mb-3" style={{ backgroundColor: "#25253a", border: "1px solid #3a3a55" }}>
            <div className="small mb-1" style={{ color: "#a1a1b5" }}><Sparkles size={14} className="me-1" />Context</div>
            <div className="small" style={{ color: "#e4e4f0" }}>{gaps.find((gap) => gap.id === form.gap_id)?.title || "No gap selected"}</div>
            <div className="small mt-1" style={{ color: "#e4e4f0" }}>{topics.find((topic) => topic.id === form.topic_id)?.title || "No topic selected"}</div>
          </div>

          <div>
            <small style={{ color: "#a1a1b5" }}>Saved workspace goals</small>
            <div className="d-flex flex-column gap-2 mt-2" style={{ maxHeight: "160px", overflowY: "auto" }}>
              {loading && <div style={{ color: "#a1a1b5" }}>Loading...</div>}
              {!loading && objectives.length === 0 && <div style={{ color: "#a1a1b5" }}>No SMART goals saved yet.</div>}
              {!loading && objectives.map((item) => (
                <div key={item.id} className="p-2 rounded-3" style={{ backgroundColor: "#25253a", border: "1px solid #3a3a55" }}>
                  <div className="small text-white fw-semibold">{item.objective_text || "Untitled objective"}</div>
                  <div className="small mt-1" style={{ color: "#a1a1b5" }}>{item.objective_type} · {item.priority} · {item.status}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <button type="button" onClick={handleSave} disabled={submitting} className="btn mt-3 align-self-end d-inline-flex align-items-center gap-2" style={{ backgroundColor: "#5b5bd6", color: "#fff", border: "none" }}>
          {submitting ? <LoaderCircle size={16} className="spin" /> : <Plus size={16} />}
          {submitting ? "Saving..." : "Save SMART Goal"}
        </button>
      </div>

      <FeedbackModal {...config} />
    </>
  );
}
