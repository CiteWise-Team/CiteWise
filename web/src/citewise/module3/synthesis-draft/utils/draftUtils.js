// Section title and draft manipulation helpers for CiteWise Module 3

/**
 * Splits draft text into ordered segments:
 * - { type: "header", text: "..." }
 * - { type: "body", text: "..." }
 * 
 * Preserves the exact part titles ("Background", "Rationale", "Research Gap")
 * so they are never treated as research body prose or stripped during paraphrasing.
 */
export const splitDraftSections = (fullText) => {
  if (!fullText || typeof fullText !== "string") return [];

  // Robustly detect header lines for Background, Rationale, and Research Gap
  const HEADER_REGEX = /^(?:#{1,6}\s+)?(?:\d+[\.\)]\s+)?(?:\*{1,3}|_{1,3})?(Background|Rationale|Research\s+Gap)(?:\*{1,3}|_{1,3})?:?\s*$/i;

  const lines = fullText.split(/\r?\n/);
  const segments = [];
  let currentHeader = null;
  let currentLines = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const match = line.trim().match(HEADER_REGEX);

    if (match) {
      if (currentLines.length > 0 || currentHeader !== null) {
        if (currentHeader !== null) {
          segments.push({ type: "header", text: currentHeader });
        }
        const bodyText = currentLines.join("\n").trim();
        if (bodyText) {
          segments.push({ type: "body", text: bodyText });
        }
        currentLines = [];
      }
      currentHeader = line.trim();
    } else {
      currentLines.push(line);
    }
  }

  if (currentHeader !== null) {
    segments.push({ type: "header", text: currentHeader });
  }
  const finalBody = currentLines.join("\n").trim();
  if (finalBody) {
    segments.push({ type: "body", text: finalBody });
  }

  // If no headers matched at all, treat the entire text as a single body
  if (segments.length === 0 && fullText.trim()) {
    segments.push({ type: "body", text: fullText.trim() });
  }

  return segments;
};

/**
 * Polls the asynchronous paraphrase status endpoint until completion, failure, or timeout.
 * 
 * @param {Function} apiFetch - http apiFetch function
 * @param {string} jobId - Unique job ID returned from POST /paraphrase
 * @param {string} sessionId - Active research session ID
 * @param {number} maxAttempts - Maximum polling attempts (default: 60)
 * @param {number} intervalMs - Delay in ms between polls (default: 2000)
 * @returns {Promise<Object>} Final completed payload with .text and .droppedCitations
 */
export async function pollParaphraseStatus(apiFetch, jobId, sessionId, maxAttempts = 60, intervalMs = 2000) {
  const queryParams = new URLSearchParams();
  if (jobId) queryParams.set("jobId", jobId);
  if (sessionId) queryParams.set("sessionId", sessionId);

  const statusUrl = `/api/v1/synthesis/paraphrase/status?${queryParams.toString()}`;
  let attempts = 0;

  while (attempts < maxAttempts) {
    await new Promise((r) => setTimeout(r, intervalMs));
    attempts++;

    const { res: statusRes, data: statusData } = await apiFetch(statusUrl);
    if (!statusRes.ok || !statusData) {
      continue;
    }

    if (statusData.status === "FAILED") {
      throw new Error(statusData.message || "Paraphrasing failed");
    }

    if (statusData.status === "COMPLETE" && statusData.text) {
      return statusData;
    }
  }

  throw new Error("Paraphrasing timed out. Please try again.");
}
