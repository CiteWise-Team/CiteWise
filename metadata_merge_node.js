// ── Enhanced Metadata Extractor ─────────────────────────────────────────────
// Receives: { documentId, filename, text }
// Pipeline:
//   1. Extract DOI + title from text (Code node - fast, no AI needed)
//   2. CrossRef lookup by DOI (free API, no key needed)
//   3. Semantic Scholar lookup by title (free API, no key needed)
//   4. AI extraction as final fallback
//   5. Merge: best data wins per-field
//   6. Respond with merged metadata

// --- THIS FILE IS THE "Merge Best Metadata" code node ---

const body = $input.first().json;

// Collect results from all lookup stages (may be null/empty if stage didn't run)
let crossRefRaw = null;
let semSchRaw = null;
let aiRaw = null;

try { crossRefRaw = $('CrossRef Lookup').first()?.json; } catch(e) {}
try { semSchRaw = $('Semantic Scholar Lookup').first()?.json; } catch(e) {}
try { aiRaw = $('Parse AI Output').first()?.json; } catch(e) {}

// ── Parse CrossRef ──────────────────────────────────────────────────────────
function parseCrossRef(raw) {
  try {
    const msg = raw?.message;
    if (!msg) return null;
    const authorArr = (msg.author || []).map(a => {
      const given = a.given || '';
      const family = a.family || '';
      return family && given ? `${family}, ${given}` : (family || given);
    }).filter(Boolean);
    const yearParts = msg.published?.['date-parts']?.[0] || msg['published-print']?.['date-parts']?.[0] || [];
    const year = yearParts[0] ? String(yearParts[0]) : null;
    const title = Array.isArray(msg.title) ? msg.title[0] : msg.title || null;
    const journal = Array.isArray(msg['container-title']) ? msg['container-title'][0] : msg['container-title'] || null;
    const doi = msg.DOI || null;
    const volume = msg.volume || null;
    const issue = msg.issue || null;
    const pages = msg.page || null;
    const publisher = msg.publisher || null;
    if (!title && !authorArr.length) return null;
    return { title, authors: authorArr, authorDisplay: authorArr.join(', ') || null, year, journal, doi, volume, issue, pages, publisher, source: 'crossref' };
  } catch(e) { return null; }
}

// ── Parse Semantic Scholar ──────────────────────────────────────────────────
function parseSemanticScholar(raw) {
  try {
    const papers = raw?.data || [];
    if (!papers.length) return null;
    const paper = papers[0];
    const authorArr = (paper.authors || []).map(a => a.name).filter(Boolean);
    const year = paper.year ? String(paper.year) : null;
    const title = paper.title || null;
    const doi = paper.externalIds?.DOI || null;
    const journal = paper.journal?.name || paper.venue || null;
    if (!title && !authorArr.length) return null;
    return { title, authors: authorArr, authorDisplay: authorArr.join(', ') || null, year, journal, doi, volume: null, issue: null, pages: null, publisher: null, source: 'semantic-scholar' };
  } catch(e) { return null; }
}

// ── Parse AI output ─────────────────────────────────────────────────────────
function parseAI(raw) {
  if (!raw) return null;
  const authorDisplay = raw.authorDisplay || null;
  return {
    title: raw.title || null,
    authors: Array.isArray(raw.authors) ? raw.authors : (authorDisplay ? [authorDisplay] : []),
    authorDisplay,
    year: raw.year || null,
    journal: raw.journal || null,
    doi: raw.doi || null,
    volume: null, issue: null, pages: null, publisher: null,
    source: 'ai'
  };
}

// ── Pick best value per field (priority: crossref > semantic-scholar > ai) ──
function bestStr(...vals) {
  for (const v of vals) { if (v && String(v).trim()) return String(v).trim(); }
  return null;
}
function bestArr(...vals) {
  for (const v of vals) { if (Array.isArray(v) && v.length) return v; }
  return [];
}

const cr = parseCrossRef(crossRefRaw);
const ss = parseSemanticScholar(semSchRaw);
const ai = parseAI(aiRaw);

const title         = bestStr(cr?.title, ss?.title, ai?.title);
const authors       = bestArr(cr?.authors, ss?.authors, ai?.authors);
const authorDisplay = bestStr(cr?.authorDisplay, ss?.authorDisplay, ai?.authorDisplay) || (authors.length ? authors.join(', ') : null);
const year          = bestStr(cr?.year, ss?.year, ai?.year);
const journal       = bestStr(cr?.journal, ss?.journal, ai?.journal);
const doi           = bestStr(cr?.doi, ss?.doi, ai?.doi);
const volume        = bestStr(cr?.volume);
const issue         = bestStr(cr?.issue);
const pages         = bestStr(cr?.pages);
const publisher     = bestStr(cr?.publisher);
const source        = cr ? 'crossref' : (ss ? 'semantic-scholar' : (ai ? 'ai' : 'none'));
const metadataReliable = Boolean(title && year && authorDisplay);

return [{
  json: {
    documentId: body.documentId,
    title,
    authorDisplay,
    authors,
    year,
    journal,
    doi,
    volume,
    issue,
    pages,
    publisher,
    metadataReliable,
    source,
    _debug: { cr: !!cr, ss: !!ss, ai: !!ai }
  }
}];
