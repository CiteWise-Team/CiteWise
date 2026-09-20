import { triggerSummarizerWorkflow, insertSummarizerRepo, getSummaryByGroupIdRepo, getSummaryByIdRepo } from "./summarizer.repository.js";
// import { fetchExtractedDataUsingGroupIdService } from "../extractor/extractor.service.js";  
import { getExtractedDataByIdRepo } from "../extractor/extractor.repository.js";

export async function runSummarizerService(data) {
  if (!data) {
    return { status: 400, message: "Data is required" };
  }

  try {
    const extractedData = await getExtractedDataByIdRepo(data.id);

    if (!extractedData) {
      return { status: 404, message: "No extracted data found for the given ID" };
    }

    const finalExtractedData = {
      title: extractedData.title,
      abstract: extractedData.abstract,
      introduction: extractedData.introduction,
      literature_review: extractedData.literature_review,
      methodology: extractedData.methodology,
      discussion: extractedData.discussion,
      results: extractedData.results,
      conclusion: extractedData.conclusion,
    };

    const n8nResult = await triggerSummarizerWorkflow(finalExtractedData);

    const mappedResult = mapSummarizerResult(n8nResult, extractedData.title);
    const insertedData = await insertSummarizerRepo(
      data.group_id,
      mappedResult
    );

    return {
      status: 200,
      message: "Summarizer workflow completed",
      data: insertedData,
    };
  } catch (err) {
    console.error("Service error:", err);
    return {
      status: 500,
      message: "Failed to trigger workflow: " + err.message,
    };
  }
}

export async function fetchSummarizedDataUsingGroupIdService(group_id) {
    try {
        const data = await getSummaryByGroupIdRepo(group_id);
        if (!data || data.length === 0) {
            return { status: 200, message: "No data found for the given group ID", data: [] };
        }
        return { status: 200, message: "Data retrieved successfully", data: data };
    } catch (err) {
        console.error("Service error:", err);
        return { status: 500, message: "Failed to retrieve data: " + err.message };
    }
}

// Map the array n8n returns to the fields we store in the summary row.
//
// n8n sends sections in a fixed order as [{ value: "..." }, ...]. Any section
// the AI could not find comes back as the literal string "not found" (that is
// what the extractor prompt tells the model to output). We convert both
// missing entries AND the "not found" placeholder into null so:
//   * the database reflects reality instead of a fake value
//   * the frontend renders an empty field instead of "not found"
//   * downstream synthesis can reliably check for missing data
function normalizeSection(raw) {
  if (raw == null) return null;
  const s = String(raw).trim();
  if (!s) return null;
  if (s.toLowerCase() === 'not found') return null;
  if (s.toLowerCase() === 'n/a') return null;
  return s;
}

function mapSummarizerResult(n8nArray, title) {
  // Support both direct array response and [{ json: {...} }] wrapper that
  // some n8n workflows return.
  const arr = Array.isArray(n8nArray)
    ? n8nArray
    : (Array.isArray(n8nArray?.data) ? n8nArray.data : []);

  return {
    title:             title || null,
    introduction:      normalizeSection(arr[0]?.value ?? arr[0]),
    literature_review: normalizeSection(arr[1]?.value ?? arr[1]),
    methodology:       normalizeSection(arr[2]?.value ?? arr[2]),
    discussion:        normalizeSection(arr[3]?.value ?? arr[3]),
    results:           normalizeSection(arr[4]?.value ?? arr[4]),
    conclusion:        normalizeSection(arr[5]?.value ?? arr[5]),
  };
}

export async function fetchSummaryDataByGroupIdService(group_id){
  try {
    const data = await getExtractorDataByGroupIdRepo(gro);
    if (!data || data.length === 0) {
      return { status: 404, message: "No data found for the given group ID" };
    }
    return { status: 200, message: "Data retrieved successfully", data: data };
  } catch (err) {
    console.error("Service error:", err);
    return { status: 500, message: "Failed to retrieve data: " + err.message };
  }  
}

export async function fetchSummaryDataByIdService(id){
  try{
    const data = await getSummaryByIdRepo(id);
    if(!data || data.length === 0){
      return { status:404, message: "No data found for ID: "+id}
    }
    return { status: 200, message: "Data retrieved successfully", data: data };
  } catch (err){
    console.error("Service error:", err);
    return { status: 500, message: "Failed to retrieve data: " + err.message };
  }
}
