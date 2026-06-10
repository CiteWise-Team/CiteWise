// Port of SemanticChunkingService.java

const STOPWORDS = new Set([
  'a','an','and','are','as','at','be','but','by','for','from','has','have','he',
  'her','his','if','in','into','is','it','its','of','on','or','our','she','such',
  'that','the','their','them','there','these','they','this','to','was','were','with',
  'we','you','your','not','no','yes','can','could','should','would','may','might',
  'will','shall','than','then','also','more','most','some','any','all'
]);

const GAP_TERMS     = ['gap','gaps','limitation','limitations','future work','open problem','challenge','underexplored','lack','scarce','unknown'];
const METHOD_TERMS  = ['method','methods','methodology','evaluation','metric','metrics','framework','benchmark','dataset','experiment','experimental','analysis'];
const THEORY_TERMS  = ['theory','framework','governance','ethics','bias','integrity','fairness','accountability'];
const CITATION_TERMS= ['citation','citations','reference','references','doi','journal','conference','proceedings','bibliography','et al'];
const SECTION_TERMS = ['abstract','introduction','background','method','methods','methodology','results','discussion','conclusion','limitations','future work'];

const PARAGRAPH_SPLIT = /\r?\n\s*\r?\n+/;
const TOKEN_SPLIT     = /[^a-zA-Z0-9%]+/;

function tokenizeKeywords(text) {
  const tokens = new Set();
  if (!text) return tokens;
  for (const tok of text.toLowerCase().split(TOKEN_SPLIT)) {
    if (tok.length >= 3 && !STOPWORDS.has(tok)) tokens.add(tok);
  }
  return tokens;
}

function buildPhrases(text) {
  const phrases = [];
  if (!text) return phrases;
  for (const seg of text.toLowerCase().split(/[.;:\n]+/)) {
    const words = seg.trim().split(TOKEN_SPLIT).filter(w => w.length >= 3 && !STOPWORDS.has(w));
    if (words.length >= 2) phrases.push(words.slice(0, 5).join(' '));
  }
  return phrases;
}

function scoreChunk(text, signals) {
  const lower = text.toLowerCase();
  let score = 0;
  for (const kw of signals.keywords) if (lower.includes(kw)) score += 2;
  for (const ph of signals.phrases) if (ph.length > 6 && lower.includes(ph)) score += 6;
  for (const t of GAP_TERMS)     if (lower.includes(t)) score += 2;
  for (const t of METHOD_TERMS)  if (lower.includes(t)) score += 2;
  for (const t of THEORY_TERMS)  if (lower.includes(t)) score += 2;
  for (const t of CITATION_TERMS) if (lower.includes(t)) score += 1;
  for (const t of SECTION_TERMS)  if (lower.includes(t)) score += 1;
  return score;
}

function splitIntoParagraphs(text) {
  const chunks = [];
  let order = 0;
  for (const part of text.split(PARAGRAPH_SPLIT)) {
    const cleaned = part.replace(/\s+/g, ' ').trim();
    if (cleaned.length >= 120) chunks.push({ order: order++, text: cleaned, score: 0 });
  }
  return chunks;
}

function isWeakSplit(chunks) {
  if (chunks.length < 3) return true;
  let maxLen = 0, totalLen = 0;
  for (const c of chunks) { totalLen += c.text.length; maxLen = Math.max(maxLen, c.text.length); }
  const avg = totalLen / chunks.length;
  return maxLen > 4000 || avg > 2500;
}

function splitSlidingWindow(text, chunkSize, overlap) {
  const chunks = [];
  let order = 0, start = 0;
  while (start < text.length) {
    const end = Math.min(text.length, start + chunkSize);
    const slice = text.slice(start, end).replace(/\s+/g, ' ').trim();
    if (slice.length > 80) chunks.push({ order: order++, text: slice, score: 0 });
    if (end === text.length) break;
    start = Math.max(0, end - overlap);
  }
  return chunks;
}

export function selectRelevantChunks(fullText, baseline, opts = {}) {
  const maxChars  = opts.maxChars  ?? 9000;
  const maxChunks = opts.maxChunks ?? 6;
  const chunkSize = opts.chunkSize ?? 1000;
  const overlap   = opts.overlap   ?? 100;

  if (!fullText || !fullText.trim()) return '';

  const trimmed = fullText.trim();
  const titleText    = baseline?.project_title || baseline?.projectTitle || '';
  const rationaleText= baseline?.rationale || '';
  const gapsRaw      = baseline?.research_gaps;
  let gapsText = '';
  if (Array.isArray(gapsRaw)) gapsText = gapsRaw.join('; ');
  else if (typeof gapsRaw === 'string') gapsText = gapsRaw;

  const signals = {
    keywords: tokenizeKeywords([titleText, rationaleText, gapsText].join(' ')),
    phrases: [...buildPhrases(titleText), ...buildPhrases(gapsText)],
  };

  let chunks = splitIntoParagraphs(trimmed);
  if (isWeakSplit(chunks)) chunks = splitSlidingWindow(trimmed, chunkSize, overlap);
  if (!chunks.length) return trimmed.slice(0, maxChars).trim();

  for (const c of chunks) c.score = scoreChunk(c.text, signals);

  const sorted = [...chunks].sort((a, b) => b.score - a.score || a.order - b.order);
  const selected = sorted.slice(0, maxChunks).sort((a, b) => a.order - b.order);

  const buf = [];
  let total = 0;
  for (let i = 0; i < selected.length; i++) {
    const header = `[CHUNK ${i + 1} | original_order=${selected[i].order} | relevance_hint=${selected[i].score}]`;
    const payload = `${header}\n${selected[i].text}\n\n`;
    if (total + payload.length > maxChars) {
      if (total === 0) buf.push(payload.slice(0, maxChars));
      break;
    }
    buf.push(payload);
    total += payload.length;
  }

  const result = buf.join('').trim();
  return result || trimmed.slice(0, maxChars).trim();
}
