import { triggerGapExtractorWorkflow, insertDataToGapRepository, getGapUsingGroupIdRepo } from "./gap.repository.js";
import {  fetchSummaryDataByIdService } from "../summarizer/summarizer.service.js";

export async function runGapExtractorService(data){
    const id = data.id.summary_id;
    if(!data){
        return { status: 400, message: "Data is required"};
    }

    try{
        const summary = await fetchSummaryDataByIdService(id);
        if(!summary){
            return { status:404, message: "No summary data from given Id"}
        }
        const overallSummary = 
            summary.data?.introduction + summary.data?.literature_review + summary.data?.methodology 
            + summary.data?.discussion + summary.data?.results + summary.data?.conclusion 

        
        const finalSummarizedData = {
            title : summary.data.title,
            summary : overallSummary,
        }
        const gapResult = await triggerGapExtractorWorkflow(finalSummarizedData);
        
        const insertedData = await insertDataToGapRepository(data.id.group_id,summary.data?.title,gapResult[0]);
       
        
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


export async function fetchGapsDataUsingGroupIdService(group_id) {
  try {
    const data = await getGapUsingGroupIdRepo(group_id);

    if (!data || data.length === 0) {
      return { status: 404, message: "No data found for the given group ID" };
    }

    const flattenedGaps = [];

    let counter = 1;

    for (const row of data) {
      const gapsArray = JSON.parse(row.gap); // convert string → array

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
