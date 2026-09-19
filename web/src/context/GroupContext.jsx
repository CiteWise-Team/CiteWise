import { createContext, useCallback, useContext, useMemo, useState } from "react";

const GroupContext = createContext();

export function GroupProvider({ children }) {
  // 👇 load from localStorage on first render
  const [groupId, setGroupId] = useState(
    localStorage.getItem("groupId")
  );
  const [groupName, setGroupName] = useState(
    localStorage.getItem("groupName") || ""
  );
  const [groupColor, setGroupColor] = useState(
    localStorage.getItem("groupColor") || ""
  );

  // Stable identities: the workspace page calls enterGroup from an effect that
  // depends on it, so a new function every render would loop.
  const enterGroup = useCallback(({ id, name = "", color = "" }) => {
    setGroupId(id);
    setGroupName(name);
    setGroupColor(color);

    // 👇 persist
    localStorage.setItem("groupId", id);
    localStorage.setItem("groupName", name);
    localStorage.setItem("groupColor", color);
  }, []);

  const leaveGroup = useCallback(() => {
    setGroupId(null);
    setGroupName("");
    setGroupColor("");

    localStorage.removeItem("groupId");
    localStorage.removeItem("groupName");
    localStorage.removeItem("groupColor");
  }, []);

  const value = useMemo(
    () => ({ groupId, groupName, groupColor, enterGroup, leaveGroup }),
    [groupId, groupName, groupColor, enterGroup, leaveGroup]
  );

  return (
    <GroupContext.Provider value={value}>
      {children}
    </GroupContext.Provider>
  );
}

export function useGroup() {
  return useContext(GroupContext);
}
