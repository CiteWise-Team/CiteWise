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
