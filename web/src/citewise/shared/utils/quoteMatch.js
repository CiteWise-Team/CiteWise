// Locates an excerpt inside page text, tolerating the differences between an
// AI-copied quote and PDF text: case, punctuation, whitespace, ligatures and
// words split by a line-break hyphen. Mirrors api/.../helpers/pageText.js.

function isWordChar(c) {
  return (c >= 97 && c <= 122) || (c >= 48 && c <= 57);
}

export function buildSearchIndex(text) {
  const src = String(text ?? "");
  let norm = "";
  const map = [];
  let pendingSpace = false;
  for (let i = 0; i < src.length; i++) {
    const ch = src[i];
    if (ch === "-" && /[a-z]/i.test(src[i - 1] ?? "")) {
      let j = i + 1;
      while (j < src.length && /[ \t]/.test(src[j])) j++;
      if (src[j] === "\n" || src[j] === "\r") {
        while (j < src.length && /\s/.test(src[j])) j++;
        i = j - 1;
        continue;
      }
    }
    const folded = ch.charCodeAt(0) < 128 ? ch.toLowerCase() : ch.normalize("NFKC").toLowerCase();
    for (const f of folded) {
      if (isWordChar(f.charCodeAt(0))) {
        if (pendingSpace && norm.length) { norm += " "; map.push(i); }
        pendingSpace = false;
        norm += f;
        map.push(i);
      } else {
        pendingSpace = true;
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

function locateOnce(index, quote) {
  const q = buildSearchIndex(quote).norm;
  if (q.length < 12) return null;
  const exact = find(index, q);
  if (exact) return { ...exact, method: "exact" };
  const words = q.split(" ");
  if (words.length < 10) return null;
  const head = find(index, words.slice(0, 8).join(" "));
  const tail = find(index, words.slice(-8).join(" "));
  if (head && tail && tail.start >= head.start) return { start: head.start, end: tail.end, method: "partial" };
  if (head) return { ...head, method: "partial" };
  if (tail) return { ...tail, method: "partial" };
  return null;
}

// Returns { start, end, method } in `index`'s original text, or null.
export function locateQuote(index, quote) {
  const rejoined = String(quote ?? "").replace(/(\p{L})-\s+(\p{L})/gu, "$1$2");
  const asIs = locateOnce(index, quote);
  if (asIs?.method === "exact" || rejoined === quote) return asIs;
  const joined = locateOnce(index, rejoined);
  if (joined?.method === "exact" || !asIs) return joined;
  return asIs;
}
