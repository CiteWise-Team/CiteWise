import { createContext, useContext, useState } from "react";

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

  const enterGroup = ({ id, name = "", color = "" }) => {
    setGroupId(id);
    setGroupName(name);
    setGroupColor(color);

    // 👇 persist
    localStorage.setItem("groupId", id);
    localStorage.setItem("groupName", name);
    localStorage.setItem("groupColor", color);
  };

  const leaveGroup = () => {
    setGroupId(null);
    setGroupName("");
    setGroupColor("");

    localStorage.removeItem("groupId");
    localStorage.removeItem("groupName");
    localStorage.removeItem("groupColor");
  };

  return (
    <GroupContext.Provider
      value={{ groupId, groupName, groupColor, enterGroup, leaveGroup }}
    >
      {children}
    </GroupContext.Provider>
  );
}

export function useGroup() {
  return useContext(GroupContext);
}
