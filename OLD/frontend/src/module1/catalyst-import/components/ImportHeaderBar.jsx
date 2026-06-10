import WorkspaceIDInput from "./WorkspaceIDInput";
import ConnectImportButton from "./ConnectImportButton";

export default function ImportHeaderBar({ workspaceId, onWorkspaceIdChange, onImport, isLoading }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", flex: 1, justifyContent: "flex-end" }}>
      <WorkspaceIDInput value={workspaceId} onChange={onWorkspaceIdChange} />
      <ConnectImportButton onClick={onImport} isLoading={isLoading} />
    </div>
  );
}