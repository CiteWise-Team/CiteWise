import { triggerGapExtractorWorkflow, insertDataToGapRepository, getGapUsingGroupIdRepo } from "./gap.repository.js";
import {  fetchSummaryDataByIdService } from "../summarizer/summarizer.service.js";

export async function runGapExtractorService(data){
    if(!data){
        return { status: 400, message: "Data is required"};
    }
    const id = (typeof data.id === "object" && data.id !== null ? data.id.summary_id : null) || data.summary_id || data.id;
    const groupId = data.group_id || (typeof data.id === "object" && data.id !== null ? data.id.group_id : null);

    try{
        const summary = await fetchSummaryDataByIdService(id);
        if(!summary || summary.status >= 400 || !summary.data){
            return { status: summary?.status || 404, message: summary?.message || "No summary data from given Id" };
        }
        const overallSummary = 
            (summary.data.introduction ?? "") + (summary.data.literature_review ?? "") + (summary.data.methodology ?? "")
            + (summary.data.discussion ?? "") + (summary.data.results ?? "") + (summary.data.conclusion ?? "");

        
        const finalSummarizedData = {
            title : summary.data.title,
            summary : overallSummary,
        }
        const gapResult = await triggerGapExtractorWorkflow(finalSummarizedData);
        const gapPayload = Array.isArray(gapResult) ? gapResult[0] : gapResult;
        
        const insertedData = await insertDataToGapRepository(groupId, summary.data.title, gapPayload);
       
        
        return {
            status: 200,
            message: "Gap workflow completed",
            data: insertedData,
        };
    }catch(err){
        console.error("Service error: ",err);
        return {
        status: 500,
        message: "Failed to trigger workflow: " + err.message,
        };        
    }
}


function parseGapRow(rawGap) {
  if (Array.isArray(rawGap)) {
    return rawGap.map((g) => String(g ?? "").trim()).filter(Boolean);
  }
  if (typeof rawGap !== "string") return [];
  const trimmed = rawGap.trim();
  if (!trimmed) return [];
  try {
    const parsed = JSON.parse(trimmed);
    if (Array.isArray(parsed)) {
      return parsed.map((g) => String(g ?? "").trim()).filter(Boolean);
    }
    return [String(parsed ?? "").trim()].filter(Boolean);
  } catch {
    return trimmed.split(/;\s*/).map((g) => g.trim()).filter(Boolean);
  }
}

export async function fetchGapsDataUsingGroupIdService(group_id) {
  try {
    const data = await getGapUsingGroupIdRepo(group_id);

    if (!data || data.length === 0) {
      return { status: 200, message: "No data found for the given group ID", data: [] };
    }

    const flattenedGaps = [];

    let counter = 1;

    for (const row of data) {
      const gapsArray = parseGapRow(row.gap);

      for (const gapText of gapsArray) {
        flattenedGaps.push({
          id: String(counter++),
          title: row.title,
          gap: gapText,
        });
      }
    }

    return {
      status: 200,
      message: "Data transformed successfully",
      data: flattenedGaps,
    };
  } catch (err) {
    console.error("Service error:", err);
    return {
      status: 500,
      message: "Failed to retrieve data: " + err.message,
    };
  }
}
