import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { apiFetch } from "../api/http";
import NotFound from "../pages/NotFound";

// A workspace link can be pasted by anyone signed in. Render the workspace only
// after the server confirms this account owns it or is a member.
export default function GroupAccessGate({ param = "groupId", children }) {
  const groupId = useParams()[param];
  const [result, setResult] = useState({ groupId: null, allowed: false });

  useEffect(() => {
    let cancelled = false;
    apiFetch(`/api/groups/access/${encodeURIComponent(groupId || "")}`)
      .then(({ res }) => {
        if (!cancelled) setResult({ groupId, allowed: res.ok });
      })
      .catch(() => {
        if (!cancelled) setResult({ groupId, allowed: false });
      });
    return () => { cancelled = true; };
  }, [groupId]);

  if (result.groupId !== groupId) return null;
  if (!result.allowed) {
    return (
      <NotFound
        title="Workspace not available"
        message="This workspace doesn't exist, or your account isn't a member of it. Ask the owner to invite you."
      />
    );
  }
  return children;
}
