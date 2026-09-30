import GroupsLayout from "../layouts/GroupsLayout";
import GroupCard from "../components/ui/GroupCard";
import CreateGroupModal from "../components/modals/CreateGroupModal";
import JoinGroupModal from "../components/modals/JoinGroupModal";
import EditWorkspaceModal from "../components/modals/EditGroupModal";
import FeedbackModal from "../components/modals/FeedbackModal";
import { useFeedbackModal } from "../hooks/useFeedbackModel";
import { Modal } from "bootstrap";
import { useState, useEffect } from "react";
import { updateGroupAPI, deleteGroupAPI } from "../api/group.api";
import "../styles/groups.css";
import {
  createGroup as createGroupAPI,
  joinGroupAPI,
  getGroupsByUserIdAPI,
} from "../api/group.api";
import { useAuth } from "../context/AuthContext";
import { IoIosAddCircle } from "react-icons/io";
import { FaLink } from "react-icons/fa";
import { Compass, Search, X } from "lucide-react";

const MIN_GROUPS_LOADING_MS = 450;
const LOADING_COMPLETION_HOLD_MS = 140;

const GUIDE_STEPS = [
  {
    target: "groups-header",
    title: "Your Research Workspaces",
    description: "Welcome to CATalyst! Here you can view your research spaces overview. The badge on the right tracks your total active workspaces.",
  },
  {
    target: "workspace-search",
    title: "Search & Quick Filters",
    description: "Use this search bar to quickly filter your workspaces by name or topic description. Clear your search anytime with the ✕ button.",
  },
  {
    target: "workspace-cards",
    title: "Workspace Cards & Modules",
    description: "Click any workspace card to access its research pipeline (Gap Extractor, Introduction Drafting, SMART Goals). Click the 3-dots menu (⋮) to edit details or delete the workspace.",
  },
  {
    target: "create-workspace-fab",
    title: "Create New Workspace",
    description: "Ready to start a new project? Click this floating action button anytime to create a brand new research workspace with custom name, description, and color.",
  },
];

export default function Groups() {
  const id = useAuth().user.id;

  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingProgress, setLoadingProgress] = useState(8);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [workspaceQuery, setWorkspaceQuery] = useState("");
  const [guideStep, setGuideStep] = useState(-1);
  const [spotlight, setSpotlight] = useState(null);

  const guideOpen = guideStep >= 0;

  useEffect(() => {
    const handleOpenGuide = () => {
      setGuideStep(0);
    };
    window.addEventListener("open-page-guide", handleOpenGuide);
    return () => window.removeEventListener("open-page-guide", handleOpenGuide);
  }, []);

  const handleCloseGuide = () => {
    if (id) {
      localStorage.setItem(`citewise.guideCompleted.${id}`, "true");
    }
    setGuideStep(-1);
  };

  // Automatically trigger Guide Flow ONLY for newly registered and first-time users
  useEffect(() => {
    if (loading || !id) return;
    const pendingKey = `citewise.guidePending.${id}`;
    const completedKey = `citewise.guideCompleted.${id}`;

    const isPending = localStorage.getItem(pendingKey) === "true";
    const isCompleted = localStorage.getItem(completedKey) === "true";

    if (isPending && !isCompleted) {
      // Mark as completed immediately to guarantee it only ever auto-runs ONCE
      localStorage.removeItem(pendingKey);
      localStorage.setItem(completedKey, "true");

      const timer = window.setTimeout(() => {
        setGuideStep(0);
      }, 400);

      return () => window.clearTimeout(timer);
    }
  }, [loading, id]);

  useEffect(() => {
    if (!guideOpen) {
      setSpotlight(null);
      return;
    }

    const currentStepConfig = GUIDE_STEPS[guideStep];
    if (!currentStepConfig) return;

    const target = document.querySelector(`[data-guide="${currentStepConfig.target}"]`);
    if (!target) return;

    if (currentStepConfig.target === "groups-header") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    } else {
      target.scrollIntoView({ behavior: "smooth", block: "center" });
    }

    const updateSpotlight = () => {
      const rect = target.getBoundingClientRect();
      const padding = 10;
      const isFab = currentStepConfig.target === "create-workspace-fab";
      const computedStyle = window.getComputedStyle(target);
      const elemRadius = parseInt(computedStyle.borderRadius, 10) || 16;
      const width = rect.width + padding * 2;
      const height = rect.height + padding * 2;
      setSpotlight({
        top: Math.max(0, rect.top - padding),
        left: Math.max(0, rect.left - padding),
        width,
        height,
        borderRadius: isFab ? Math.round(width / 2) : Math.max(elemRadius + 4, 16),
      });
    };

    updateSpotlight();
    const timer1 = setTimeout(updateSpotlight, 100);
    const timer2 = setTimeout(updateSpotlight, 250);
    const timer3 = setTimeout(updateSpotlight, 450);
    const timer4 = setTimeout(updateSpotlight, 700);

    let frameId;
    const startTime = performance.now();
    const trackAnimation = (currentTime) => {
      updateSpotlight();
      if (currentTime - startTime < 650) {
        frameId = requestAnimationFrame(trackAnimation);
      }
    };
    frameId = requestAnimationFrame(trackAnimation);

    window.addEventListener("resize", updateSpotlight);
    window.addEventListener("scroll", updateSpotlight, true);
    return () => {
      cancelAnimationFrame(frameId);
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
      clearTimeout(timer4);
      window.removeEventListener("resize", updateSpotlight);
      window.removeEventListener("scroll", updateSpotlight, true);
    };
  }, [guideOpen, guideStep]);

  useEffect(() => {
    if (!guideOpen) return;
    function handleKeyDown(e) {
      if (e.key === "Escape") handleCloseGuide();
      if (e.key === "ArrowRight") {
        setGuideStep((prev) => {
          if (prev >= GUIDE_STEPS.length - 1) {
            handleCloseGuide();
            return -1;
          }
          return prev + 1;
        });
      }
      if (e.key === "ArrowLeft") {
        setGuideStep((prev) => Math.max(0, prev - 1));
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [guideOpen, id]);

  const { config, showFeedback, hideFeedback } = useFeedbackModal();

  const openModal = (modalId) => {
    const modalEl = document.getElementById(modalId);
    const modal = Modal.getInstance(modalEl) || new Modal(modalEl);
    modal.show();
  };

  async function handleCreateGroup(data) {
    const groupData = {
      ...data,
      ownerId: id,
    };

    try {
      const newGroup = await createGroupAPI(groupData);

      const normalized = {
        id: newGroup.data.id,
        name: newGroup.data.name,
        description: newGroup.data.description || data.description,
        members: newGroup.data.members ?? 1,
        color: newGroup.data.color,
        is_active : true
      };

      setGroups((prev) => [...prev, normalized]);
      if (groups.filter((group) => group.is_active === true || group.is_active === 1).length === 0) {
        localStorage.setItem("catalyst.firstWorkspaceGuidePending", String(normalized.id));
      }

      const modalEl = document.getElementById("createGroupModal");
      const modal = Modal.getInstance(modalEl) || new Modal(modalEl);
      modal.hide();

      showFeedback({
        type: "success",
        title: "Group Created",
        message: "Your research workspace is ready.",
      });
    } catch (err) {
      showFeedback({
        type: "error",
        title: "Group Creation Failed",
        message: err.message || "Something went wrong.",
      });
    }
  }

  async function handleJoinGroup(data) {
    const joinData = {
      ...data,
      userId: id,
    };

    try {
      const joinedGroup = await joinGroupAPI(joinData);
      setGroups((prev) => [joinedGroup, ...prev]);

      const modalEl = document.getElementById("joinGroupModal");
      const modal = Modal.getInstance(modalEl) || new Modal(modalEl);
      modal.hide();

      showFeedback({
        type: "success",
        title: "Request Sent",
        message: "You have now sent a request to join the group.",
      });
    } catch (err) {
      showFeedback({
        type: "error",
        title: "Join Failed",
        message: err.message || "Invalid code or request failed.",
      });
    }
  }
  async function handleDeleteGroup(id) {
    try {
      await deleteGroupAPI(id);

      setGroups((prev) =>
        prev.filter((g) => g.id !== id)
      );

      showFeedback({
        type: "success",
        title: "Deleted",
        message: "Workspace removed.",
      });
    } catch (err) {
      showFeedback({
        type: "error",
        title: "Delete Failed",
        message: err.message,
      });
    }
  }
  async function handleEditWorkspace(data) {
    try {
      const payload = {
        ...data,
        id: selectedGroup.id,
      };

      const res = await updateGroupAPI(payload.id, payload);
      const updatedGroup = {
        ...selectedGroup,
        ...res.data,
      };

      setGroups((prev) =>
        prev.map((g) =>
          g.id === payload.id ? updatedGroup : g
        )
      );

      // ✅ CLOSE MODAL
      const modalEl = document.getElementById("editWorkspaceModal");
      const modal = Modal.getInstance(modalEl);
      modal?.hide();

      showFeedback({
        type: "success",
        title: "Updated",
        message: "Workspace updated successfully.",
      });

    } catch (err) {
      showFeedback({
        type: "error",
        title: "Update Failed",
        message: err.message,
      });
    }
  }

  const openEditModal = (group) => {
    setSelectedGroup(group);
    openModal("editWorkspaceModal");
  };

  useEffect(() => {
    let cancelled = false;

    async function fetchGroups() {
      const startedAt = performance.now();
      const progressTimer = window.setInterval(() => {
        if (!cancelled) {
          setLoadingProgress((current) => Math.min(current + 10, 92));
        }
      }, 80);

      try {
        const groups = await getGroupsByUserIdAPI(id);
        if (!cancelled) {
          setGroups(groups.groups.data);
          setLoadingProgress(100);
        }
      } catch (err) {
        console.error("Failed to fetch groups:", err);
      } finally {
        window.clearInterval(progressTimer);
        const remainingTime = Math.max(0, MIN_GROUPS_LOADING_MS - (performance.now() - startedAt));
        window.setTimeout(() => {
          if (!cancelled) {
            setLoadingProgress(100);
            window.setTimeout(() => {
              if (!cancelled) setLoading(false);
            }, LOADING_COMPLETION_HOLD_MS);
          }
        }, remainingTime);
      }
    }

    fetchGroups();
    return () => { cancelled = true; };
  }, [id]);

  const activeGroups = groups.filter((g) => g.is_active === true || g.is_active === 1);
  const filteredGroups = activeGroups.filter((group) => {
    const query = workspaceQuery.trim().toLowerCase();
    if (!query) return true;
    return `${group.name || ""} ${group.description || ""}`.toLowerCase().includes(query);
  });

  return (
    <GroupsLayout>
      <div className="groups-page">
        <header className="groups-header" data-guide="groups-header">
          <div>
            <p className="groups-eyebrow"><span style={{ color: "#ea580c" }}>CAT</span>alyst workspace</p>
            <h1>Your research spaces</h1>
            <p className="groups-description">
              Organize your research and move from ideas to evidence in one focused workspace.
            </p>
          </div>
          <div className="groups-summary" aria-label={`${activeGroups.length} workspaces`}>
            <strong>{activeGroups.length}</strong>
            <span>{activeGroups.length === 1 ? "workspace" : "workspaces"}</span>
          </div>
        </header>

        {/* Groups List */}
        <div className="groups-section-heading">
          <div className="workspace-search-wrap" data-guide="workspace-search">
            <Search size={18} aria-hidden="true" />
            <input
              type="search"
              value={workspaceQuery}
              onChange={(event) => setWorkspaceQuery(event.target.value)}
              placeholder="Search workspaces by name or topic..."
              aria-label="Search workspaces by name or topic"
            />
            {workspaceQuery && (
              <button
                type="button"
                className="workspace-search-clear"
                onClick={() => setWorkspaceQuery("")}
                aria-label="Clear workspace search"
                title="Clear search"
              >
                <X size={16} />
              </button>
            )}
          </div>
        </div>

        <div className="row g-4 groups-grid" data-guide="workspace-cards">
          {loading ? (
            <div className="cw-loading-container" style={{ padding: "3rem 1rem", width: "100%", gridColumn: "1 / -1" }}>
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
                  <svg width="80" height="80" viewBox="0 0 50 50" style={{ position: "absolute", inset: 0 }}>
                    <circle
                      cx="25"
                      cy="25"
                      r="20"
                      fill="none"
                      stroke="rgba(234, 88, 12, 0.12)"
                      strokeWidth="3.5"
                    />
                    <circle
                      cx="25"
                      cy="25"
                      r="20"
                      fill="none"
                      stroke="#ea580c"
                      strokeWidth="3.5"
                      strokeLinecap="round"
                      strokeDasharray="55 70"
                    >
                      <animateTransform
                        attributeName="transform"
                        type="rotate"
                        from="0 25 25"
                        to="360 25 25"
                        dur="0.95s"
                        repeatCount="indefinite"
                      />
                    </circle>
                  </svg>
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
                    <svg
                      width="22"
                      height="22"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="#ea580c"
                      strokeWidth="2.3"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
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
                  Loading Workspaces
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
                  Gathering your research spaces and projects...
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
          ) : activeGroups.length === 0 ? (
            <div className="groups-empty-state">
              <div className="groups-empty-icon"><IoIosAddCircle size={26} /></div>
              <h3>Start your first workspace</h3>
              <p>Create a focused space for your literature, gaps, and research direction.</p>
              <button className="groups-primary-action" onClick={() => openModal("createGroupModal")}>
                <IoIosAddCircle size={18} /> Create workspace
              </button>
            </div>
          ) : filteredGroups.length === 0 ? (
            <div className="groups-empty-state groups-search-empty-state">
              <div className="groups-empty-icon"><Search size={24} /></div>
              <h3>No matching workspaces</h3>
              <p>Try another workspace name or research topic.</p>
              <button className="groups-primary-action" onClick={() => setWorkspaceQuery("")}>
                Clear search
              </button>
            </div>
          ) : (
            filteredGroups.map((group) => (
              <div className="col-xl-3 col-md-6" key={group.id}>
                <GroupCard
                  name={group.name}
                  members={group.members}
                  color={group.color}
                  group_id={group.id}
                  description={group.description}
                  onEdit={() => openEditModal(group)}
                  onDelete={handleDeleteGroup}
                />
              </div>
            ))
          )}
        </div>

        {/* Floating Action Button */}
        <button className="fab" data-guide="create-workspace-fab" type="button" onClick={() => openModal("createGroupModal")} aria-label="Start new workspace">
          <IoIosAddCircle size={28} />
          <span className="fab-tooltip">Start new workspace</span>
        </button>

        {/* Modals */}
        <CreateGroupModal onSubmit={handleCreateGroup} />
        <JoinGroupModal onSubmit={handleJoinGroup} />

        <EditWorkspaceModal
          data={selectedGroup}
          onSubmit={handleEditWorkspace}
        />

        <FeedbackModal {...config} onClose={hideFeedback} />

        {/* Interactive Page Guide Flow */}
        {guideOpen && (
          <div className="groups-guide-layer" role="presentation">
            <div className="groups-guide-blocker" aria-hidden="true" />
            {spotlight && (
              <div
                className="groups-guide-spotlight"
                style={{
                  top: spotlight.top,
                  left: spotlight.left,
                  width: spotlight.width,
                  height: spotlight.height,
                  borderRadius: spotlight.borderRadius || 20,
                }}
              />
            )}

            <section
              className={`groups-guide-card${guideStep === 3 ? " is-step-fab" : ""}`}
              role="dialog"
              aria-modal="true"
              aria-labelledby="groups-guide-title"
            >
              <div className="groups-guide-header">
                <span className="groups-guide-progress">
                  Step {guideStep + 1} of {GUIDE_STEPS.length}
                </span>
                <button
                  type="button"
                  className="groups-guide-close"
                  onClick={handleCloseGuide}
                  aria-label="Close guide"
                >
                  <X size={16} />
                </button>
              </div>

              <h2 id="groups-guide-title">{GUIDE_STEPS[guideStep].title}</h2>
              <p>{GUIDE_STEPS[guideStep].description}</p>

              <div className="groups-guide-actions">
                {guideStep < GUIDE_STEPS.length - 1 && (
                  <button
                    type="button"
                    className="groups-guide-skip"
                    onClick={handleCloseGuide}
                  >
                    Skip Tour
                  </button>
                )}

                <div className="groups-guide-nav-buttons">
                  {guideStep > 0 && (
                    <button
                      type="button"
                      className="groups-guide-back-btn"
                      onClick={() => setGuideStep((prev) => prev - 1)}
                    >
                      Back
                    </button>
                  )}

                  <button
                    type="button"
                    className="groups-guide-next-btn"
                    onClick={() => {
                      if (guideStep >= GUIDE_STEPS.length - 1) {
                        handleCloseGuide();
                      } else {
                        setGuideStep((prev) => prev + 1);
                      }
                    }}
                  >
                    {guideStep >= GUIDE_STEPS.length - 1 ? "Finish ✓" : "Next →"}
                  </button>
                </div>
              </div>
            </section>
          </div>
        )}

      </div>
    </GroupsLayout>
  );
}