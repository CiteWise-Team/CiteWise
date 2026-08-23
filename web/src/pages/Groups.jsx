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

export default function Groups() {
  const id = useAuth().user.id;

  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedGroup, setSelectedGroup] = useState(null);

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
    async function fetchGroups() {
      try {
        const groups = await getGroupsByUserIdAPI(id);
        setGroups(groups.groups.data);
      } catch (err) {
        console.error("Failed to fetch groups:", err);
      } finally {
        setLoading(false);
      }
    }

    fetchGroups();
  }, [id]);

  const activeGroups = groups.filter((g) => g.is_active === true || g.is_active === 1);

  return (
    <GroupsLayout>
      <div className="groups-page">
        <header className="groups-header">
          <div>
            <p className="groups-eyebrow">CiteWise workspace</p>
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
          <h2>Workspaces</h2>
          <span>Choose a space to continue your research</span>
        </div>

        <div className="row g-4 groups-grid">
          {loading ? (
            <div className="groups-empty-state">
              <div className="groups-loading-bar" />
              <p>Loading workspaces...</p>
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
          ) : (
            activeGroups.map((group) => (
              <div className="col-xl-4 col-md-6" key={group.id}>
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
        <button className="fab" type="button" onClick={() => openModal("createGroupModal")} aria-label="Start new workspace">
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

      </div>
    </GroupsLayout>
  );
}