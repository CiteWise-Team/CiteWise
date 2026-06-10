import { apiRequest } from "./http";

export async function extractorAPI(file,group_id) {
  const formData = new FormData();
  formData.append("file", file); // must match multer.single("file")
  formData.append("group_id",group_id);

  return apiRequest("/extractor/file", {
    method: "POST",
    body: formData,
  });
}
export async function summarizerAPI(id,group_id){
  return apiRequest(`/summarizer/${id}`, {
    method: "POST",
    body: JSON.stringify({ id,group_id }),
    headers: {
      "Content-Type": "application/json",
    },
  });
}
export async function GapAPI(id){
    return apiRequest(`/gap/${id}`, {
    method: "POST",
    body: JSON.stringify({ id }),
    headers: {
      "Content-Type": "application/json",
    },
  });
}
export async function TopicSuggesterAPI({group_id, gaps}){
      return apiRequest(`/topic/run`, {
    method: "POST",
    body: JSON.stringify({ 
      group_id,
      gaps
     }),
    headers: {
      "Content-Type": "application/json",
    },
  });

}