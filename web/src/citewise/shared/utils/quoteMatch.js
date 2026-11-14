// Locates an excerpt inside page text. Only letters and digits are compared,
// so it ignores case, punctuation, hyphens and — importantly — how words are
// spaced: the AI's quote comes from pdf-parse text, which can glue italic words
// together ("usingdenserepresentations") or keep line-break hyphens
// ("in- dicate"), while pdf.js reports the same words separately.
// Mirrors api/src/modules/citewise/helpers/pageText.js.

export function buildSearchIndex(text) {
  const src = String(text ?? "");
  let norm = "";
  const map = [];
  for (let i = 0; i < src.length; i++) {
    const ch = src[i];
    const folded = ch.charCodeAt(0) < 128 ? ch.toLowerCase() : ch.normalize("NFKC").toLowerCase();
    for (const f of folded) {
      const c = f.charCodeAt(0);
      if ((c >= 97 && c <= 122) || (c >= 48 && c <= 57)) {
        norm += f;
        map.push(i);
      }
    }
  }
  return { norm, map };
}

function find(index, needle) {
  if (!needle) return null;
  const at = index.norm.indexOf(needle);
  if (at < 0) return null;
  return { start: index.map[at], end: index.map[at + needle.length - 1] + 1 };
}

const EDGE_CHARS = 40;

// Returns { start, end, method } in `index`'s original text, or null.
export function locateQuote(index, quote) {
  const q = buildSearchIndex(quote).norm;
  if (q.length < 12) return null;
  const exact = find(index, q);
  if (exact) return { ...exact, method: "exact" };
  if (q.length < EDGE_CHARS * 1.5) return null;
  const head = find(index, q.slice(0, EDGE_CHARS));
  const tail = find(index, q.slice(-EDGE_CHARS));
  if (head && tail && tail.start >= head.start) return { start: head.start, end: tail.end, method: "partial" };
  if (head) return { ...head, method: "partial" };
  if (tail) return { ...tail, method: "partial" };
  return null;
}
