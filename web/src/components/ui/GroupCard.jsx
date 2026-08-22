import { CiSettings } from "react-icons/ci";
import { MdDelete } from "react-icons/md";
import { FaPen } from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import { useGroup } from "../../context/GroupContext.jsx";
import { useState } from "react";
import { Modal } from "bootstrap";
import ConfirmModal from "../modals/ConfirmModal";
import TopicSelectModal from "../modals/TopicSelectModal";

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

  // Topic picker state
  const [showTopicPicker, setShowTopicPicker] = useState(false);
  const [pickerTopics, setPickerTopics] = useState([]);
  const [pickerGaps, setPickerGaps] = useState([]);

  function handleEnter() {
    enterGroup({ id: group_id, name, color });
    navigate(`/workspace/${group_id}`);
  }

  // Returns the scoped localStorage key for this group.
  const gk = (suffix) => `citewise.${group_id}.${suffix}`;

  // Step 1: if a session already exists for this group, go straight in.
  // Otherwise fetch topics and run the import flow.
  async function handleOpenCiteWise() {
    const existingSession = localStorage.getItem(gk("sessionId"));
    if (existingSession) {
      enterGroup({ id: group_id, name, color });
      navigate(`/citewise/${group_id}`);
      return;
    }

    setImporting(true);
    try {
      const res = await fetch(`/api/catalyst/${encodeURIComponent(group_id)}/topics`);
      const payload = await res.json();

      if (!res.ok || !payload?.success) {
        alert(payload?.message || "Failed to load workspace data.");
        return;
      }

      const { topics, gaps } = payload.data;

      if (!topics?.length) {
        alert("This group has no suggested topics yet. Run the Topic Suggester first.");
        return;
      }

      if (topics.length === 1) {
        await importAndNavigate(topics[0].title, topics[0].rationale);
      } else {
        setPickerTopics(topics);
        setPickerGaps(gaps);
        setShowTopicPicker(true);
      }
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

    const res = await fetch("/api/catalyst/import", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ workspaceId: group_id, title, rationale }),
    });
    const payload = await res.json();

    if (!res.ok || !payload?.success) {
      alert(payload?.message || "Failed to import workspace into CiteWise.");
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

  return (
    <>
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
        className="card border-0 rounded-4 shadow-sm overflow-hidden h-100"
        style={{ backgroundColor: "#1e1e2f" }}
      >
        {/* Header */}
        <div
          className="position-relative"
          style={{ height: 120, background: headerGradient, borderBottom: "3px solid #5b5bd6" }}
        >
          {/* Settings Dropdown */}
          <div className="position-absolute top-0 end-0 m-3">
            <button
              className="btn btn-sm text-light"
              aria-label={`Settings for ${name}`}
              onClick={() => setDropdownOpen(!dropdownOpen)}
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
                  onClick={() => { setDropdownOpen(false); onEdit?.(); }}
                >
                  <FaPen className="me-2" />
                  Edit
                </div>
                <div
                  className="d-flex align-items-center p-1 hover-bg mt-1"
                  style={{ cursor: "pointer", color: "#e5544b", fontFamily: "'Poppins', sans-serif" }}
                  onClick={() => { setDropdownOpen(false); openDeleteModal(); }}
                >
                  <MdDelete className="me-2" />
                  Delete
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Body */}
        <div className="card-body d-flex flex-column" style={{ color: "#e4e4f0" }}>
          <h5 className="fw-bold">{name}</h5>

          <div
            className="mb-3"
            style={{ color: "#a1a1b5", maxHeight: 60, overflowY: "auto", whiteSpace: "pre-wrap" }}
          >
            {description || "No description"}
          </div>

          <button
            type="button"
            onClick={handleEnter}
            title="Enter this group to run research workflows"
            aria-label={`Enter ${name} and run research workflows`}
            className="btn w-100 fw-bold mt-auto"
            style={{
              backgroundColor: "transparent",
              border: "1px solid #3a3a55",
              color: "#a5b4fc",
              borderRadius: "10px",
              fontFamily: "'Poppins', sans-serif",
              fontSize: "0.82rem",
              transition: "background 0.2s ease, border-color 0.2s ease, color 0.2s ease, transform 0.2s ease",
            }}
            onMouseEnter={(event) => {
              event.currentTarget.style.background = "rgba(91, 91, 214, 0.14)";
              event.currentTarget.style.borderColor = "#5b5bd6";
              event.currentTarget.style.color = "#e4e4f0";
              event.currentTarget.style.transform = "translateY(-1px)";
            }}
            onMouseLeave={(event) => {
              event.currentTarget.style.background = "transparent";
              event.currentTarget.style.borderColor = "#3a3a55";
              event.currentTarget.style.color = "#a5b4fc";
              event.currentTarget.style.transform = "translateY(0)";
            }}
          >
            Enter Group
          </button>

          <button
            type="button"
            onClick={handleOpenCiteWise}
            disabled={importing}
            title="Open this workspace in CiteWise"
            aria-label={`Open ${name} in CiteWise`}
            className="btn w-100 fw-bold mt-2"
            style={{
              backgroundColor: importing ? "#25253a" : "#5b5bd6",
              border: "1px solid #5b5bd6",
              color: importing ? "#a1a1b5" : "#ffffff",
              borderRadius: "10px",
              fontFamily: "'Poppins', sans-serif",
              fontSize: "0.82rem",
              opacity: importing ? 0.7 : 1,
              transition: "background 0.2s ease, border-color 0.2s ease, color 0.2s ease, transform 0.2s ease",
            }}
            onMouseEnter={(event) => {
              if (importing) return;
              event.currentTarget.style.background = "#6f6fe0";
              event.currentTarget.style.borderColor = "#6f6fe0";
              event.currentTarget.style.transform = "translateY(-1px)";
            }}
            onMouseLeave={(event) => {
              if (importing) return;
              event.currentTarget.style.background = "#5b5bd6";
              event.currentTarget.style.borderColor = "#5b5bd6";
              event.currentTarget.style.transform = "translateY(0)";
            }}
          >
            {importing ? "Loading..." : "CiteWise →"}
          </button>
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
      </div>
    </>
  );
}
