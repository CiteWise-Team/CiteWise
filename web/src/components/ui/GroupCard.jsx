import { MdDelete } from "react-icons/md";
import { FaPen } from "react-icons/fa";
import { ArrowRight, FileSearch, MoreVertical, PenLine, Target, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useGroup } from "../../context/GroupContext.jsx";
import { createElement, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Modal } from "bootstrap";
import ConfirmModal from "../modals/ConfirmModal";
import TopicSelectModal from "../modals/TopicSelectModal";
import { apiFetch } from "../../api/http.js";
import { useTheme } from "../../context/ThemeContext";

export default function GroupCard({
  name,
  group_id,
  color,
  description,
  onEdit,
  onDelete,
}) {
  const { isDark } = useTheme();
  const navigate = useNavigate();
  const { enterGroup } = useGroup();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [importing, setImporting] = useState(false);
  const [showLauncher, setShowLauncher] = useState(false);
  const menuRef = useRef(null);

  // Topic picker state
  const [showTopicPicker, setShowTopicPicker] = useState(false);
  const [pickerTopics, setPickerTopics] = useState([]);
  const [pickerGaps, setPickerGaps] = useState([]);

  // Close full-screen launcher on Escape key
  useEffect(() => {
    if (!showLauncher) return;
    function handleKeyDown(e) {
      if (e.key === "Escape") {
        setShowLauncher(false);
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [showLauncher]);

  // Close 3-dots dropdown menu when clicking outside
  useEffect(() => {
    if (!dropdownOpen) return;
    function handleOutsideClick(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, [dropdownOpen]);

  function handleEnter() {
    localStorage.setItem(gk("gapVisited"), "true");
    enterGroup({ id: group_id, name, color });
    navigate(`/workspace/${group_id}`);
  }

  function handleOpenSmartGoals() {
    enterGroup({ id: group_id, name, color });
    navigate(`/smart-goals/${group_id}`, { state: { groupName: name } });
  }

  function handleCardKeyDown(event) {
    if (event.target !== event.currentTarget) return;
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      setShowLauncher(true);
    }
  }

  // Returns the scoped localStorage key for this group.
  const gk = (suffix) => `citewise.${group_id}.${suffix}`;

  const checkStep1Completed = () => {
    if (localStorage.getItem(gk("step1Completed")) === "true") return true;
    if (localStorage.getItem(gk("sessionId"))) return true;
    if (localStorage.getItem(gk("catalystData"))) return true;
    try {
      const completed = JSON.parse(localStorage.getItem(`catalyst.${group_id}.completedSteps`) || "[]");
      if (completed.includes("topic") || completed.includes("gap") || completed.length >= 3) {
        return true;
      }
    } catch {
      // ignore parse error
    }
    return false;
  };

  const [step1Done, setStep1Done] = useState(checkStep1Completed);

  useEffect(() => {
    if (!step1Done && group_id) {
      apiFetch(`/api/catalyst/${encodeURIComponent(group_id)}/topics`)
        .then(({ res, data: payload }) => {
          if (res.ok && payload?.success && payload.data?.topics?.length > 0) {
            setStep1Done(true);
            localStorage.setItem(gk("step1Completed"), "true");
          }
        })
        .catch(() => {});
    }
  }, [group_id, step1Done]);

  function openWorkspaceLauncher() {
    setDropdownOpen(false);
    if (!step1Done) {
      if (checkStep1Completed()) {
        setStep1Done(true);
      } else if (group_id) {
        apiFetch(`/api/catalyst/${encodeURIComponent(group_id)}/topics`)
          .then(({ res, data: payload }) => {
            if (res.ok && payload?.success && payload.data?.topics?.length > 0) {
              setStep1Done(true);
              localStorage.setItem(gk("step1Completed"), "true");
            }
          })
          .catch(() => {});
      }
    }
    setShowLauncher(true);
  }

  // Fetch topics and open the topic selection modal so the user can choose which topic to use in CiteWise.
  async function handleOpenCiteWise() {
    // If a CiteWise session already exists for this workspace, resume it directly
    const existingSession = localStorage.getItem(gk("sessionId"));
    if (existingSession) {
      enterGroup({ id: group_id, name, color });
      navigate(`/citewise/${group_id}`);
      return;
    }

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

      if (topics.length === 1) {
        await importAndNavigate(topics[0].title, topics[0].rationale);
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
  async function importAndNavigate(title, rationale) {
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
    const modalEl = document.getElementById(`delete-${group_id}`);
    if (modalEl) {
      const modal = Modal.getInstance(modalEl) || new Modal(modalEl);
      modal.show();
    }
  }

  const handleDelete = () => {
    onDelete?.(group_id);
  };

  const headerColor = color || "#ea580c";
  const headerGradient = `linear-gradient(135deg, ${headerColor}f2, ${headerColor}cc)`;

  return (
    <>
      {/* Full-screen Workspace Launcher (No top header bar, only top-right close button) */}
      {showLauncher &&
        createPortal(
          <div
            className="workspace-launcher-fullscreen"
            role="dialog"
            aria-modal="true"
            aria-label={`${name} research workflow`}
          >
            {/* Floating Close Button */}
            <button
              type="button"
              className="workspace-launcher-close-floating"
              aria-label="Close workspace menu"
              onClick={() => setShowLauncher(false)}
            >
              <X size={22} />
            </button>

            {/* Stage */}
            <div className="workspace-launcher-stage">
              <div className="workspace-launcher-intro">
                <h3>Select a Research Module</h3>
                <p>
                  Explore identified gaps, synthesize key literature evidence into your draft,
                  and formulate measurable SMART goals.
                </p>
              </div>

              <div className="workspace-launcher-options-grid">
                <WorkspaceOption
                  step="Step 01"
                  icon={FileSearch}
                  title="Gap Extractor"
                  description="Find research gaps and organize evidence with CATalyst."
                  active={!step1Done}
                  statusText={step1Done ? "Review / Open →" : "Ready to start →"}
                  onClick={handleEnter}
                />
                <WorkspaceOption
                  step="Step 02"
                  icon={PenLine}
                  title="Introduction Drafting"
                  description="Turn your selected evidence into a focused introduction with CiteWise."
                  active={step1Done}
                  disabled={!step1Done}
                  statusText={!step1Done ? "Locked" : undefined}
                  loading={importing}
                  onClick={handleOpenCiteWise}
                />
                <WorkspaceOption
                  step="Step 03"
                  icon={Target}
                  title="SMART Goals Generation"
                  description="Translate your research direction into clear, measurable thesis goals."
                  active={false}
                  disabled={!step1Done}
                  statusText={step1Done ? "Ready to start →" : "Locked"}
                  onClick={handleOpenSmartGoals}
                />
              </div>
            </div>
          </div>,
          document.body
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

      {/* Card container: Rounded with overflow-hidden so colored header fills entire top part seamlessly */}
      <div
        className="card border-0 shadow-sm h-100 workspace-card"
        role="button"
        tabIndex={0}
        aria-label={`Open ${name} workspace tools`}
        onClick={openWorkspaceLauncher}
        onKeyDown={handleCardKeyDown}
        style={{ backgroundColor: isDark ? "#15141f" : "#ffffff", padding: 0 }}
      >
        {/* Header: Fills the entire top part with the workspace color and layered organic waves */}
        <div
          className="position-relative workspace-card-header"
          style={{ height: 130, background: headerGradient }}
        >
          {/* Organic Layered Waves at bottom transition of colored header (Image 1 reference) */}
          <div className="workspace-card-wave-wrap" aria-hidden="true">
            <svg viewBox="0 0 500 56" preserveAspectRatio="none" className="workspace-card-wave-svg">
              <path d="M 0,22 C 110,38 210,12 330,28 C 400,38 460,24 500,18 L 500,56 L 0,56 Z" fill="rgba(255, 255, 255, 0.2)" />
              <path d="M 0,28 C 120,14 230,42 340,20 C 410,8 470,26 500,32 L 500,56 L 0,56 Z" fill="rgba(251, 191, 36, 0.4)" />
              <path d="M 0,36 C 115,50 220,22 325,38 C 395,48 455,32 500,26 L 500,56 L 0,56 Z" fill="rgba(192, 132, 252, 0.35)" />
              <path d="M 0,30 C 130,44 240,16 350,32 C 420,42 480,28 500,24 L 500,56 L 0,56 Z" fill="rgba(251, 146, 60, 0.3)" />
              <path d="M 0,38 C 120,52 230,26 340,42 C 410,52 470,38 500,34 L 500,56 L 0,56 Z" fill={isDark ? "#15141f" : "#ffffff"} />
            </svg>
          </div>

          {/* Settings Menu with 3 Vertical Dots inside Rounded Square */}
          <div className="position-absolute top-0 end-0 m-3" style={{ zIndex: 10 }} ref={menuRef}>
            <button
              className="workspace-card-menu-btn"
              aria-label={`Settings for ${name}`}
              onClick={(event) => {
                event.stopPropagation();
                setDropdownOpen(!dropdownOpen);
              }}
            >
              <MoreVertical size={18} />
            </button>

            {dropdownOpen && (
              <div
                className="workspace-card-dropdown"
                onClick={(event) => event.stopPropagation()}
              >
                <button
                  type="button"
                  className="workspace-card-dropdown-item"
                  onClick={(event) => {
                    event.stopPropagation();
                    setDropdownOpen(false);
                    onEdit?.();
                  }}
                >
                  <FaPen size={13} />
                  Edit
                </button>
                <button
                  type="button"
                  className="workspace-card-dropdown-item is-danger"
                  onClick={(event) => {
                    event.stopPropagation();
                    setDropdownOpen(false);
                    openDeleteModal();
                  }}
                >
                  <MdDelete size={16} />
                  Delete
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Body */}
        <div className="card-body d-flex flex-column workspace-card-body">
          <h5 className="fw-bold">{name}</h5>

          <div className="workspace-card-description">
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
        title="Delete Workspace"
        message="Are you sure you want to delete this workspace? This action cannot be undone."
        type="danger"
        confirmText="Delete Workspace"
        onConfirm={handleDelete}
      />
    </>
  );
}

function WorkspaceOption({ step, icon: Icon, title, description, active, disabled = false, loading = false, onClick, statusText }) {
  return (
    <button
      type="button"
      className={`workspace-launcher-option${active ? " is-active" : ""}`}
      disabled={disabled || loading}
      onClick={(event) => { event.stopPropagation(); onClick(); }}
    >
      <span className="workspace-launcher-step-num">{step}</span>

      <span className="workspace-launcher-icon">
        {createElement(Icon, { size: 48, strokeWidth: 1.6 })}
      </span>

      <span className="workspace-launcher-copy">
        <strong>{loading ? "Loading..." : title}</strong>
        <small>{description}</small>
      </span>

      <div className="workspace-launcher-badge-container">
        {active ? (
          <span className="workspace-launcher-current-badge">
            Current Step • Launch →
          </span>
        ) : statusText !== undefined ? (
          statusText ? <span className="workspace-launcher-status-idle">{statusText}</span> : null
        ) : disabled ? (
          <span className="workspace-launcher-status-idle">Locked</span>
        ) : (
          <span className="workspace-launcher-status-idle">Ready to start →</span>
        )}
      </div>
    </button>
  );
}
