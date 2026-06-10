import GroupsLayout from "../layouts/GroupsLayout";
import ActionCard from "../components/ui/ActionCard";
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

  const { config, showFeedback } = useFeedbackModal();

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
        members: newGroup.data.members ?? 1,
        color: newGroup.data.color,
        is_active : true
      };

      setGroups((prev) => [normalized, ...prev]);

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

  return (
    <GroupsLayout>
      <div className="py-4">

        {/* Groups List */}
        <h5 className="fw-bold mb-3" style={{ color: "#ffffff" }}>
          WORKSPACES
        </h5>

        <div className="row g-4">
          {loading ? (
            <p>Loading groups...</p>
          ) : groups.length === 0 ? (
            <p className="text-muted" style={{ color: "#ffffff" }}>
              You are not part of any groups yet.
            </p>
          ) : (
            groups.filter((group) => group.is_active == true).
            map((group) => (
              <div className="col-md-4" key={group.id}>
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
        <div className="fab" onClick={() => openModal("createGroupModal")}>
          <IoIosAddCircle size={28} />
          <span className="fab-tooltip">Start new workspace</span>
        </div>

        {/* Modals */}
        <CreateGroupModal onSubmit={handleCreateGroup} />
        <JoinGroupModal onSubmit={handleJoinGroup} />

        <EditWorkspaceModal
          data={selectedGroup}
          onSubmit={handleEditWorkspace}
        />

        <FeedbackModal {...config} />

      </div>
    </GroupsLayout>
  );
}