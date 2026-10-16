// Page-level traceability for extracted PDF text.
//
// The stored document text is unchanged from what pdf-parse has always
// produced ("\n\n" + page1 + "\n\n" + page2 ...). Alongside it we keep
// `pageOffsets`: the character index where each page starts in that text.
// From the offsets any position in the text, and therefore any quote the AI
// copied out of it, can be mapped back to its PDF page.

// Same algorithm as pdf-parse's built-in render_page, so the extracted text is
// byte-for-byte what the scoring pipeline received before page tracking.
function renderPage(pageData) {
  return pageData
    .getTextContent({ normalizeWhitespace: false, disableCombineTextItems: false })
    .then((textContent) => {
      let lastY;
      let text = '';
      for (const item of textContent.items) {
        if (lastY == item.transform[5] || !lastY) text += item.str;
        else text += '\n' + item.str;
        lastY = item.transform[5];
      }
      return text;
    });
}

export async function extractPdfPages(pdfParse, buffer) {
  const pages = [];
  const data = await pdfParse(buffer, {
    pagerender: async (pageData) => {
      const text = await renderPage(pageData);
      pages[pageData.pageIndex] = text;
      return text;
    },
  });

  const text = data.text || '';
  const numPages = data.numrender || data.numpages || pages.length;
  const pageOffsets = [];
  let pos = 0;
  for (let i = 0; i < numPages; i++) {
    pos += 2; // pdf-parse prefixes every page with "\n\n"
    pageOffsets.push(pos);
    pos += (pages[i] ?? '').length;
  }

  // If the reconstruction disagrees with pdf-parse's own text, the offsets
  // would point at the wrong pages. Better no page data than wrong page data.
  const offsetsValid = pos === text.length;
  return {
    text,
    pageCount: data.numpages || numPages,
    pageOffsets: offsetsValid ? pageOffsets : null,
  };
}

// LlamaParse returns one markdown block per page; join them the same way so
// offsets work identically for scanned PDFs.
export function joinPages(pageTexts) {
  const pageOffsets = [];
  let text = '';
  for (const page of pageTexts) {
    text += '\n\n';
    pageOffsets.push(text.length);
    text += page ?? '';
  }
  return { text, pageOffsets, pageCount: pageTexts.length };
}

export function parseOffsets(raw) {
  if (!raw) return null;
  let value = raw;
  if (typeof raw === 'string') {
    try { value = JSON.parse(raw); } catch { return null; }
  }
  return Array.isArray(value) && value.length && value.every(Number.isFinite) ? value : null;
}

export function pageForOffset(pageOffsets, index) {
  if (!pageOffsets?.length || index == null || index < 0) return null;
  let lo = 0;
  let hi = pageOffsets.length - 1;
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1;
    if (pageOffsets[mid] <= index) lo = mid;
    else hi = mid - 1;
  }
  return lo + 1;
}

export function pageRange(text, pageOffsets, pageNumber) {
  if (!pageOffsets?.length || !pageNumber || pageNumber < 1 || pageNumber > pageOffsets.length) return null;
  const start = pageOffsets[pageNumber - 1];
  const end = pageNumber < pageOffsets.length ? pageOffsets[pageNumber] - 2 : text.length;
  return { start, end: Math.max(start, Math.min(end, text.length)) };
}

// Lowercase alphanumeric projection of `text` plus a map from each projected
// character back to its index in the original. Ligatures are unfolded (NFKC)
// and words broken by an end-of-line hyphen are rejoined, since quotes copied
// by the AI rarely preserve either.
export function buildSearchIndex(text) {
  const src = String(text ?? '');
  let norm = '';
  const map = [];
  let pendingSpace = false;
  for (let i = 0; i < src.length; i++) {
    const ch = src[i];
    if (ch === '-' && /[a-z]/i.test(src[i - 1] ?? '')) {
      let j = i + 1;
      while (j < src.length && /[ \t]/.test(src[j])) j++;
      if (src[j] === '\n' || src[j] === '\r') {
        while (j < src.length && /\s/.test(src[j])) j++;
        i = j - 1;
        continue;
      }
    }
    const folded = ch.charCodeAt(0) < 128 ? ch.toLowerCase() : ch.normalize('NFKC').toLowerCase();
    for (const f of folded) {
      const c = f.charCodeAt(0);
      if ((c >= 97 && c <= 122) || (c >= 48 && c <= 57)) {
        if (pendingSpace && norm.length) { norm += ' '; map.push(i); }
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

export function normalizeForSearch(text) {
  return buildSearchIndex(text).norm;
}

function locateNormalized(index, needle) {
  if (!needle) return null;
  const at = index.norm.indexOf(needle);
  if (at < 0) return null;
  return { start: index.map[at], end: index.map[at + needle.length - 1] + 1 };
}

// Find where `quote` sits inside `text`. Returns original-text indices, or null.
//   exact      – the whole quote appears (modulo punctuation/whitespace/case)
//   partial    – the opening or closing words appear verbatim
//   fuzzy      – most of its 5-word shingles appear close together
export function locateQuote(index, quote) {
  const q = normalizeForSearch(quote);
  if (q.length < 12) return null;

  const exact = locateNormalized(index, q);
  if (exact) return { ...exact, method: 'exact' };

  const words = q.split(' ');
  if (words.length >= 10) {
    const head = locateNormalized(index, words.slice(0, 8).join(' '));
    const tail = locateNormalized(index, words.slice(-8).join(' '));
    if (head && tail && tail.start >= head.start && tail.start - head.start < quote.length * 3) {
      return { start: head.start, end: tail.end, method: 'partial' };
    }
    if (head) return { start: head.start, end: head.end, method: 'partial' };
    if (tail) return { start: tail.start, end: tail.end, method: 'partial' };
  }

  if (words.length < 6) return null;
  const hits = [];
  for (let i = 0; i + 5 <= words.length; i++) {
    const found = locateNormalized(index, words.slice(i, i + 5).join(' '));
    if (found) hits.push(found.start);
  }
  const shingles = words.length - 4;
  if (hits.length / shingles < 0.5) return null;
  hits.sort((a, b) => a - b);
  const median = hits[hits.length >> 1];
  return { start: median, end: median + 1, method: 'fuzzy' };
}

// Resolve the page a quote came from. `aiPage` is the scorer's own claim and
// is kept only as an unverified fallback when the quote cannot be located.
export function resolveExcerptPage({ index, pageOffsets, quote, aiPage }) {
  if (index && pageOffsets?.length) {
    const hit = locateQuote(index, quote);
    if (hit) {
      return { pageNumber: pageForOffset(pageOffsets, hit.start), pageVerified: true };
    }
  }
  const n = Number(aiPage);
  const inRange = Number.isInteger(n) && n >= 1 && (!pageOffsets?.length || n <= pageOffsets.length);
  return { pageNumber: inRange ? n : null, pageVerified: false };
}
