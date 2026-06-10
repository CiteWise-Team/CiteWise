import { apiRequest } from "./http";

export async function getSummaryByGroupAPI(group_id) {

  return apiRequest(`/summarizer/${group_id}`, {
    method: "GET",
  });
}
