import { apiRequest } from "../api/http";

export async function createGroup(data) {
  return apiRequest("/groups/create", {
    method: "POST",
    body: JSON.stringify(data),
  });
}
export async function joinGroupAPI(data) {
  return apiRequest("/groups/join", {
    method: "POST",
    body: JSON.stringify(data),
  });
}
export async function getGroupsByUserIdAPI(userId) {
  return apiRequest(`/groups/${userId}`, {
    method: "GET",
  });
}

export async function updateGroupAPI(id, data) {
  return apiRequest(`/groups/update/${id}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

export async function deleteGroupAPI(id) {
  return apiRequest(`/groups/delete/${id}`, {
    method: "DELETE",
  });
}