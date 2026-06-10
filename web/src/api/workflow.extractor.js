import { apiRequest } from "./http";

export async function getExtractedFilesByGroupAPI(group_id) {

  return apiRequest(`/extractor/${group_id}`, {
    method: "GET",
  });
}
