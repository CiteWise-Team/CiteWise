import { apiRequest } from "./http";

export async function getSmartObjectivesByWorkspaceAPI(workspaceId) {
  if (!workspaceId) return [];

  try {
    const data = await apiRequest(`/api/catalyst2/smart-objectives/workspace/${workspaceId}`, {
      method: "GET",
    });
    return Array.isArray(data) ? data : data?.data || [];
  } catch (error) {
    console.warn("Smart goals workspace fetch failed:", error.message);
    return [];
  }
}

export async function createSmartObjectiveAPI(payload) {
  const response = await apiRequest("/api/catalyst2/smart-objectives", {
    method: "POST",
    body: JSON.stringify(payload),
    headers: { "Content-Type": "application/json" },
  });

  return response?.data || response;
}

export async function updateSmartObjectiveAPI(objectiveId, payload) {
  const response = await apiRequest(`/api/catalyst2/smart-objectives/${objectiveId}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
    headers: { "Content-Type": "application/json" },
  });

  return response?.data || response;
}
