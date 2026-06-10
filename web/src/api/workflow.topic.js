import { apiRequest } from "./http";

export async function getTopicsByGroupIdAPI(group_id) {

  return apiRequest(`/topic/${group_id}`, {
    method: "GET",
  });
}
