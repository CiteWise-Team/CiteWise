import { createGroupService,getGroupsByIdService,joinGroupService, setRequestStatusService, updateGroupService,deleteGroupService, findGroupService} from './group.service.js';

// Authentication alone still let any signed-in user read or delete another
// user's workspace, so every route that names a workspace resolves it first and
// checks who owns it. Returns null and has already answered when it fails.
async function requireOwnedGroup(req, res) {
  const { id } = req.params;
  const group = await findGroupService(id);
  if (!group) {
    res.status(404).json({ success: false, message: "Group not found" });
    return null;
  }
  if (group.owner_id !== req.user?.id) {
    res.status(403).json({ success: false, message: "You do not have access to this group" });
    return null;
  }
  return group;
}
// used
export async function groupCreation(req, res, next) {
  try {
    const { name, description, color } = req.body;
    // Taken from the session, never the body, so nobody can create a workspace
    // in another user's account.
    const ownerId = req.user?.id;

    if (!name || !ownerId) {
      return res.status(400).json({
        success: false,
        message: "Name and Owner ID are required",
      });
    }

    const result = await createGroupService({ name, description, ownerId, color });

    return res.status(result.status).json({
      success: true,
      message: result.message,
      data: result.data || null,
    });

  } catch (err) {
    console.error("Group Creation Error:", err);
    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
}



export async function getGroupDetails(req, res) {
    try {
        const { groupId } = req.params;
        if (!groupId) {
            return res.status(400).json({ error: "Group ID is required" });
        }
        // const group = await getGroupById(groupId);
        // res.json({ group });

        return res.status(201).json({ success: true, message: "Group details fetched successfully", data: group, });
    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
}
//  used
export async function joinGroup(req, res) {
    try {
        const { userId, joinCode } = req.body;  
        if (!userId || !joinCode) {
            return res.status(400).json({ error: "User ID and Join Code are required" });
        }
        const joinResult = await joinGroupService(userId, joinCode);
        return res.status(joinResult.status).json({
            message: joinResult.message,
            data: joinResult.data || null
        });
    } catch (err) {
        return res.status(500).json({ error: err.message });
        
    }
}

export async function getJoinCode(req, res) {
    try {
        const { joinCode } = req.params;
        if (!joinCode) {
            return res.status(400).json({ error: "Join Code is required" });
        }
        const group = await getGroupByJoinCode(joinCode);
        res.json({ group });
    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
}
export async function getGroupsById(req, res) {
    try {
        const { id } = req.params;
        if (!id) {
            return res.status(400).json({ error: "ID is required" });
        }
        // `id` is the owner's user id, so this only ever returns your own list.
        if (id !== req.user?.id) {
            return res.status(403).json({ error: "You may only list your own workspaces" });
        }
        const groups = await getGroupsByIdService(id);
        res.json({ groups });
    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
}

// set request status

export async function setRequestStatus(req, res) {
  try {
    const { requestId } = req.params;
    const { status } = req.body;

    if (!status) {
      return res.status(400).json({ error: "Status is required" });
    }

    const result = await setRequestStatusService(requestId, status);

    return res.status(result.status).json({
      success: true,
      message: result.message,
      data: result.data || null
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}






export async function updateGroup(req, res) {
  try {
    const { id } = req.params;
    const { name, description, color } = req.body;

    if (!(await requireOwnedGroup(req, res))) return;

    const result = await updateGroupService(id, { name, description, color });

    return res.status(result.status).json({
      success: true,
      message: result.message,
      data: result.data
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}

export async function deleteGroup(req, res) {
  try {
    const { id } = req.params;

    if (!(await requireOwnedGroup(req, res))) return;

    const result = await deleteGroupService(id);

    return res.status(result.status).json({
      success: true,
      message: result.message,
      data: result.data
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}

