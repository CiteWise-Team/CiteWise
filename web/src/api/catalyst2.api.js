import { apiFetch } from "./http";

export async function createIntegrationImportAPI(payload) {
  return apiFetch("/api/catalyst2/integration-imports", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function getIntegrationImportsByWorkspaceAPI(workspaceId) {
  return apiFetch(`/api/catalyst2/integration-imports/workspace/${workspaceId}`);
}
