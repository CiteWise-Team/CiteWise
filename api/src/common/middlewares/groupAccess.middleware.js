import supabase from '../config/supabaseClient.js';

// A workspace id is not a secret: it shows in the URL and is shared to invite
// people. Only the owner and accepted members may read or change a workspace.
export async function userCanAccessGroup(userId, groupId) {
  if (!userId || !groupId) return false;

  const { data: group, error } = await supabase
    .from('Group')
    .select('id, owner_id')
    .eq('id', groupId)
    .maybeSingle();
  if (error || !group) return false;
  if (group.owner_id === userId) return true;

  const { data: member } = await supabase
    .from('group_members')
    .select('user_id')
    .eq('group_id', groupId)
    .eq('user_id', userId)
    .limit(1)
    .maybeSingle();
  return Boolean(member);
}

/**
 * Rejects the request unless the signed-in user can access every workspace id
 * `pickGroupIds(req)` returns. Missing ids are left to the handler to validate.
 * Unknown and forbidden workspaces get the same 404 so ids cannot be probed.
 */
export function requireGroupAccess(pickGroupIds) {
  return async (req, res, next) => {
    try {
      const picked = pickGroupIds(req);
      const groupIds = [...new Set((Array.isArray(picked) ? picked : [picked])
        .map((id) => (id == null ? '' : String(id).trim()))
        .filter(Boolean))];

      for (const groupId of groupIds) {
        if (!(await userCanAccessGroup(req.user?.id, groupId))) {
          return res.status(404).json({
            success: false,
            message: 'Workspace not found, or you do not have access to it.',
            data: null,
          });
        }
      }
      next();
    } catch (err) {
      next(err);
    }
  };
}

export default requireGroupAccess;
