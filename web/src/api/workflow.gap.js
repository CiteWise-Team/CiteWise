import { apiRequest } from "./http";

export async function getGapsByGroupAPI(group_id) {

  return apiRequest(`/gap/${group_id}`, {
    method: "GET",
  });
}
