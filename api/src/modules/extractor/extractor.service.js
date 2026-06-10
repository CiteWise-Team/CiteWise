import { triggerExtractorWorkflow, insertExtractorRepo, getExtractorDataByGroupIdRepo } from "./extractor.repository.js";

export async function runExtractorService(file, filename,group_id) {
  if (!file) {
    return { status: 400, message: "File is required" };
  }

  try {
    const result = await triggerExtractorWorkflow(file, filename);
    const insertedData = await insertExtractorRepo(group_id,result[0]);
    return { status: 200, message: "Workflow triggered successfully", data: insertedData || null };
  } catch (err) {
    console.error("Service error:", err);
    return { status: 500, message: "Failed to trigger workflow: " + err.message };
  }
}
export async function fetchExtractedDataUsingGroupIdService(groupId) {
  try {
    const data = await getExtractorDataByGroupIdRepo(groupId);
    if (!data || data.length === 0) {
      return { status: 404, message: "No data found for the given group ID" };
    }
    return { status: 200, message: "Data retrieved successfully", data: data };
  } catch (err) {
    console.error("Service error:", err);
    return { status: 500, message: "Failed to retrieve data: " + err.message };
  }   
}
