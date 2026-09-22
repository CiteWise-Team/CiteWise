import { CiSettings } from "react-icons/ci";
import { MdDelete } from "react-icons/md";
import { FaPen } from "react-icons/fa";
import { ArrowRight, FileSearch, PenLine, Target, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useGroup } from "../../context/GroupContext.jsx";
import { createElement, useState } from "react";
import { Modal } from "bootstrap";
import ConfirmModal from "../modals/ConfirmModal";
import TopicSelectModal from "../modals/TopicSelectModal";
import { apiFetch } from "../../api/http.js";

export default function GroupCard({
  name,
  group_id,
  color,
  description,
  onEdit,
  onDelete,
}) {
  const navigate = useNavigate();
  const { enterGroup } = useGroup();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [importing, setImporting] = useState(false);
  const [showLauncher, setShowLauncher] = useState(false);

  // Topic picker state
  const [showTopicPicker, setShowTopicPicker] = useState(false);
  const [pickerTopics, setPickerTopics] = useState([]);
  const [pickerGaps, setPickerGaps] = useState([]);

  function handleEnter() {
    localStorage.setItem(gk("gapVisited"), "true");
    enterGroup({ id: group_id, name, color });
    navigate(`/workspace/${group_id}`);
  }

  function handleCardKeyDown(event) {
    if (event.target !== event.currentTarget) return;
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      setShowLauncher(true);
    }
  }

  function getProgressState() {
    const hasCiteWiseSession = Boolean(localStorage.getItem(gk("sessionId")));
    const savedStep = Number.parseInt(localStorage.getItem(gk("maxUnlockedStep")), 10);
    const maxStep = Number.isNaN(savedStep) ? 0 : savedStep;

    if (maxStep >= 2) return "smart";
    if (hasCiteWiseSession || maxStep >= 1) return "introduction";
    return localStorage.getItem(gk("gapVisited")) === "true" ? "gap" : "new";
  }

  function openWorkspaceLauncher() {
    setDropdownOpen(false);
    setShowLauncher(true);
  }

  // Returns the scoped localStorage key for this group.
  const gk = (suffix) => `citewise.${group_id}.${suffix}`;

  // Fetch topics and open the topic selection modal so the user can choose which topic to use in CiteWise.
  async function handleOpenCiteWise() {
    setImporting(true);
    try {
      const { res, data: payload } = await apiFetch(`/api/catalyst/${encodeURIComponent(group_id)}/topics`);

      if (res.status === 401) {
        alert("Your session has expired. Please log in again.");
        navigate("/login");
        return;
      }

      if (!res.ok || !payload?.success) {
        alert(payload?.message || payload?.error || "Failed to load workspace data.");
        return;
      }

      const { topics, gaps } = payload.data;

      if (!topics?.length) {
        alert("This group has no suggested topics yet. Run the Topic Suggester first.");
        return;
      }

      setPickerTopics(topics);
      setPickerGaps(gaps);
      setShowTopicPicker(true);
    } catch (err) {
      alert("Could not connect to CiteWise: " + err.message);
    } finally {
      setImporting(false);
    }
  }

  // Step 2: create a new CiteWise session for this group.
  // Only clears THIS group's previous data — other groups are untouched.
  async function importAndNavigate(title, rationale) {
    // Clear only this group's previous CiteWise keys
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const key = localStorage.key(i);
      if (key?.startsWith(`citewise.${group_id}.`)) localStorage.removeItem(key);
    }

    const { res, data: payload } = await apiFetch("/api/catalyst/import", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ workspaceId: group_id, title, rationale }),
    });

    if (!res.ok || !payload?.success) {
      if (res.status === 401) {
        alert("Your session has expired. Please log in again.");
        navigate("/login");
        return;
      }
      alert(payload?.message || payload?.error || "Failed to import workspace into CiteWise.");
      return;
    }

    const { sessionId, title: savedTitle, rationale: savedRationale, gaps } = payload.data;
    localStorage.setItem(gk("sessionId"), sessionId);
    localStorage.setItem(gk("catalystData"), JSON.stringify({ title: savedTitle, rationale: savedRationale, gaps }));
    enterGroup({ id: group_id, name, color });
    setShowTopicPicker(false);
    navigate(`/citewise/${group_id}`);
  }

  function openDeleteModal() {
    const modal = new Modal(document.getElementById(`delete-${group_id}`));
    modal.show();
  }

  const handleDelete = () => {
    onDelete?.(group_id);
  };

  const headerColor = color || "#5b5bd6";
  const headerGradient = `linear-gradient(135deg, ${headerColor}e6, ${headerColor}99)`;
  const progressState = getProgressState();

  return (
    <>
      {showLauncher && (
        <div className="workspace-launcher" role="presentation" onClick={() => setShowLauncher(false)}>
          <section
            className="workspace-launcher-dialog"
            role="dialog"
            aria-modal="true"
            aria-label="Workspace tools"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              className="workspace-launcher-close"
              aria-label="Close workspace menu"
              onClick={() => setShowLauncher(false)}
            >
              <X size={18} />
            </button>

            <div className="workspace-launcher-options">
              <WorkspaceOption
                icon={FileSearch}
                title="Gap Extractor"
                description="Find research gaps and organize evidence with CATalyst."
                active={progressState === "gap"}
                onClick={handleEnter}
              />
              <WorkspaceOption
                icon={PenLine}
                title="Introduction Drafting"
                description="Turn your selected evidence into a focused introduction with CiteWise."
                active={progressState === "introduction"}
                disabled={progressState !== "introduction"}
                loading={importing}
                onClick={handleOpenCiteWise}
              />
              <WorkspaceOption
                icon={Target}
                title="SMART Goals Generation"
                description="Translate your research direction into clear, measurable goals."
                active={progressState === "smart"}
                disabled
                onClick={() => {}}
              />
            </div>
          </section>
        </div>
      )}
      {showTopicPicker && (
        <TopicSelectModal
          topics={pickerTopics}
          gaps={pickerGaps}
          groupName={name}
          onSelect={(topic) => importAndNavigate(topic.title, topic.rationale)}
          onClose={() => setShowTopicPicker(false)}
        />
      )}

      <div
        className="card border-0 rounded-4 shadow-sm overflow-hidden h-100 workspace-card"
        role="button"
        tabIndex={0}
        aria-label={`Open ${name} workspace tools`}
        onClick={openWorkspaceLauncher}
        onKeyDown={handleCardKeyDown}
        style={{ backgroundColor: "#1e1e2f" }}
      >
        {/* Header */}
        <div
          className="position-relative workspace-card-header"
          style={{ height: 120, background: headerGradient, borderBottom: "3px solid #5b5bd6" }}
        >
          {/* Settings Dropdown */}
          <div className="position-absolute top-0 end-0 m-3">
            <button
              className="btn btn-sm text-light"
              aria-label={`Settings for ${name}`}
              onClick={(event) => { event.stopPropagation(); setDropdownOpen(!dropdownOpen); }}
            >
              <CiSettings />
            </button>

            {dropdownOpen && (
              <div
                className="position-absolute end-0 mt-2 p-2 rounded-3"
                style={{
                  backgroundColor: "#2a2a3d",
                  border: "1px solid #3a3a55",
                  zIndex: 10,
                  minWidth: 120,
                }}
              >
                <div
                  className="d-flex align-items-center p-1 hover-bg"
                  style={{ cursor: "pointer", color: "#e4e4f0", fontFamily: "'Poppins', sans-serif" }}
                  onClick={(event) => { event.stopPropagation(); setDropdownOpen(false); onEdit?.(); }}
                >
                  <FaPen className="me-2" />
                  Edit
                </div>
                <div
                  className="d-flex align-items-center p-1 hover-bg mt-1"
                  style={{ cursor: "pointer", color: "#e5544b", fontFamily: "'Poppins', sans-serif" }}
                  onClick={(event) => { event.stopPropagation(); setDropdownOpen(false); openDeleteModal(); }}
                >
                  <MdDelete className="me-2" />
                  Delete
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Body */}
        <div className="card-body d-flex flex-column workspace-card-body" style={{ color: "#e4e4f0" }}>
          <h5 className="fw-bold">{name}</h5>

          <div
            className="mb-3"
            style={{ color: "#a1a1b5", maxHeight: 60, overflowY: "auto", whiteSpace: "pre-wrap", fontSize: "0.82rem", fontWeight: 400, lineHeight: 1.5 }}
          >
            {description || "No description"}
          </div>

          <div className="workspace-card-hint">
            Open workspace <ArrowRight size={15} />
          </div>
        </div>
      </div>
      {/* Confirm Delete Modal */}
      <ConfirmModal
        id={`delete-${group_id}`}
        title="Delete Group"
        message="Are you sure you want to delete this group? This action cannot be undone."
        type="danger"
        confirmText="Delete"
        onConfirm={handleDelete}
      />
    </>
  );
}

function WorkspaceOption({ icon: Icon, title, description, active, disabled = false, loading = false, onClick }) {
  return (
    <button
      type="button"
      className={`workspace-launcher-option${active ? " is-active" : ""}`}
      disabled={disabled || loading}
      onClick={(event) => { event.stopPropagation(); onClick(); }}
    >
      <span className="workspace-launcher-icon">{createElement(Icon, { size: 46, strokeWidth: 1.5 })}</span>
      <span className="workspace-launcher-copy">
        <strong>{loading ? "Loading..." : title}</strong>
        {active && <em className="workspace-launcher-current">Current step</em>}
        <small>{description}</small>
      </span>
    </button>
  );
}
