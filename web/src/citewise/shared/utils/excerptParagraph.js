// Cuts the paragraph that contains an excerpt out of a page's extracted text
// and reflows it (PDF line breaks removed, hyphenated words rejoined), keeping
// the excerpt's position so it can be highlighted.

const MAX_LINES_EACH_WAY = 25;

function splitLines(text) {
  const lines = [];
  let start = 0;
  for (let i = 0; i <= text.length; i++) {
    if (i === text.length || text[i] === "\n") {
      lines.push({ start, end: i, text: text.slice(start, i) });
      start = i + 1;
    }
  }
  return lines;
}

// A paragraph's last line is noticeably shorter than a full column line, and
// a heading ("Abstract", "1 Introduction") is short without a full stop.
function endsParagraph(line, fullWidth) {
  const t = line.text.trim();
  if (!t) return true;
  return t.length < fullWidth * 0.7;
}

export function excerptParagraph(pageText, highlight) {
  if (!pageText || !highlight) return null;
  const lines = splitLines(pageText);
  const lengths = lines.map((l) => l.text.trim().length).filter((n) => n >= 20).sort((a, b) => a - b);
  const fullWidth = lengths.length ? lengths[Math.floor(lengths.length * 0.75)] : 60;

  const lineOf = (pos) => Math.max(0, lines.findIndex((l) => pos >= l.start && pos <= l.end));
  let first = lineOf(highlight.start);
  let last = lineOf(Math.max(highlight.start, highlight.end - 1));

  for (let n = 0; n < MAX_LINES_EACH_WAY && first > 0 && !endsParagraph(lines[first - 1], fullWidth); n++) first--;
  for (let n = 0; n < MAX_LINES_EACH_WAY && last < lines.length - 1 && !endsParagraph(lines[last], fullWidth); n++) last++;

  // Reflow, tracking where each original character lands.
  let out = "";
  let hlStart = null;
  let hlEnd = null;
  const mark = (i) => {
    if (hlStart === null && i >= highlight.start) hlStart = out.length;
    if (hlEnd === null && i >= highlight.end) hlEnd = out.length;
  };
  for (let li = first; li <= last; li++) {
    const line = lines[li];
    for (let i = line.start; i < line.end; i++) {
      mark(i);
      const isLineBreakHyphen = i === line.end - 1 && pageText[i] === "-" && li < last && /^[a-z]/.test(lines[li + 1].text.trimStart());
      if (isLineBreakHyphen) continue;
      const ch = pageText[i] === "\t" ? " " : pageText[i];
      if (ch === " " && out.endsWith(" ")) continue;
      out += ch;
    }
    mark(line.end);
    // A line ending in "-" continues the same word ("ef-ficient", "Lucene-BM25").
    if (li < last && !line.text.endsWith("-") && !out.endsWith(" ")) out += " ";
  }
  if (hlEnd === null) hlEnd = out.length;

  const lead = out.length - out.trimStart().length;
  const text = out.trim();
  const clamp = (n) => Math.min(Math.max(0, (n ?? 0) - lead), text.length);
  return { text, highlight: { start: clamp(hlStart), end: clamp(hlEnd) } };
}
