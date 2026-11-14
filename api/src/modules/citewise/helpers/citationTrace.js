// Traces every in-text citation in a generated introduction back to the
// passage, and PDF page, of the cited document that best supports the claim.
//
// The synthesis workflow only reports which documents it cited, not where in
// them the supporting material is, so the link is rebuilt here: for each
// citation the surrounding sentence is compared against the cited document's
// evidence excerpts and its page-tagged full text.

import { pageForOffset, buildSearchIndex, locateQuote } from './pageText.js';

const STOPWORDS = new Set([
  'about', 'above', 'after', 'again', 'against', 'also', 'among', 'and', 'are', 'based', 'because',
  'been', 'before', 'being', 'between', 'both', 'but', 'can', 'could', 'does', 'during', 'each',
  'for', 'from', 'further', 'had', 'has', 'have', 'having', 'how', 'however', 'into', 'its', 'may',
  'more', 'most', 'much', 'must', 'not', 'one', 'only', 'other', 'over', 'such', 'than', 'that',
  'the', 'their', 'them', 'then', 'there', 'these', 'they', 'this', 'those', 'through', 'thus',
  'under', 'upon', 'very', 'was', 'were', 'what', 'when', 'where', 'whether', 'which', 'while',
  'who', 'whose', 'will', 'with', 'within', 'without', 'would', 'study', 'studies', 'research',
  'paper', 'author', 'authors',
]);

const ABBREVIATIONS = new Set(['al', 'e.g', 'i.e', 'etc', 'vs', 'cf', 'fig', 'no', 'eq']);
const CITATION_GROUP = /\(([^()]*?(?:(?:19|20)\d{2}[a-z]?|n\.d\.)[^()]*?)\)/g;
const PASSAGE_CHARS = 360;
const MIN_CONFIDENT_SCORE = 0.2;

function stem(word) {
  if (word.length > 6 && word.endsWith('ing')) return word.slice(0, -3);
  if (word.length > 5 && word.endsWith('ed')) return word.slice(0, -2);
  if (word.length > 4 && word.endsWith('s') && !word.endsWith('ss')) return word.slice(0, -1);
  return word;
}

function contentTokens(text) {
  return String(text ?? '')
    .toLowerCase()
    .normalize('NFKC')
    .split(/[^a-z0-9]+/)
    .filter((w) => w.length >= 3 && !STOPWORDS.has(w) && !/^\d+$/.test(w))
    .map(stem);
}

function normKey(text) {
  return String(text ?? '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

function authorKey(text) {
  return normKey(String(text ?? '').replace(/\bet al\.?/gi, ' ').replace(/&|\band\b/gi, ' '));
}

// Sentence spans with their offsets. Splits on . ! ? followed by a capital,
// bracket or the end, except after abbreviations such as "et al."
export function splitSentences(text) {
  const spans = [];
  const boundary = /[.!?](?=\s+[A-Z("“[]|\s*$)|\n+/g;
  let start = 0;
  let m;
  while ((m = boundary.exec(text)) !== null) {
    if (m[0] !== '\n' && !m[0].startsWith('\n')) {
      const before = text.slice(Math.max(start, m.index - 6), m.index).toLowerCase();
      const word = before.split(/\s+/).pop() ?? '';
      if (ABBREVIATIONS.has(word.replace(/^\(/, ''))) continue;
    }
    const end = m.index + m[0].length;
    if (text.slice(start, end).trim()) spans.push({ start, end, text: text.slice(start, end).trim() });
    start = end;
  }
  if (text.slice(start).trim()) spans.push({ start, end: text.length, text: text.slice(start).trim() });
  return spans;
}

function buildPassages(fullText, pageOffsets) {
  if (!fullText) return [];
  const passages = [];
  let current = null;
  for (const s of splitSentences(fullText)) {
    const clean = s.text.replace(/\s+/g, ' ');
    const page = pageForOffset(pageOffsets, s.start);
    // Never let a passage straddle two pages, or its page number would be wrong.
    if (current && current.page !== page) {
      passages.push(current);
      current = null;
    }
    if (!current) current = { start: s.start, page, text: clean };
    else current.text += ' ' + clean;
    if (current.text.length >= PASSAGE_CHARS) {
      passages.push(current);
      current = null;
    }
  }
  if (current) passages.push(current);
  return passages
    .filter((p) => p.text.length >= 40)
    .map((p) => ({
      text: p.text,
      pageNumber: p.page,
      pageVerified: Boolean(pageOffsets?.length),
      via: 'source-text',
      tokens: new Set(contentTokens(p.text)),
    }));
}

function overlapScore(claimTokens, candidateTokens) {
  if (!claimTokens.length || !candidateTokens.size) return 0;
  const unique = [...new Set(claimTokens)];
  const shared = unique.filter((t) => candidateTokens.has(t)).length;
  return shared / unique.length;
}

function trimPassage(text) {
  const t = String(text ?? '').replace(/\s+/g, ' ').trim();
  return t.length > 420 ? `${t.slice(0, 417)}...` : t;
}

function prepareSource(source) {
  // Custom highlights (and excerpts scored before page tracking) carry no
  // page; find them in the text instead.
  let index = null;
  const locatePage = (quote) => {
    if (!source.pageOffsets?.length || !source.fullText) return null;
    index ||= buildSearchIndex(source.fullText);
    const hit = locateQuote(index, quote);
    return hit ? pageForOffset(source.pageOffsets, hit.start) : null;
  };
  const excerpts = (source.excerpts ?? [])
    .filter((e) => String(e.quoteText ?? '').trim())
    .map((e) => {
      const located = e.pageNumber == null || !e.pageVerified ? locatePage(e.quoteText) : null;
      return {
        text: String(e.quoteText),
        pageNumber: located ?? e.pageNumber ?? null,
        pageVerified: located != null || Boolean(e.pageVerified),
        via: e.isCustom ? 'custom-highlight' : 'excerpt',
        tokens: new Set(contentTokens(e.quoteText)),
      };
    });
  const citation = source.citation ?? {};
  const authorsKey = authorKey(citation.inTextAuthors);
  return {
    ...source,
    authorsKey,
    yearKey: normKey(citation.year ?? ''),
    excerptCandidates: excerpts,
    passageCandidates: null,
  };
}

function sourceMatchesPart(source, part, precedingText) {
  if (!source.authorsKey) return false;
  const partKey = normKey(part);
  const yearOk = !source.yearKey || partKey.includes(source.yearKey);
  if (!yearOk) return false;
  if (authorKey(part).includes(source.authorsKey)) return true;
  // Narrative form, "Smith et al. (2020)": the authors sit just before the bracket.
  const yearOnly = /^\s*((?:19|20)\d{2}[a-z]?|n\.d\.)\s*$/i.test(part);
  return yearOnly && authorKey(precedingText.slice(-80)).endsWith(source.authorsKey);
}

function bestEvidence(source, claimTokens) {
  let best = null;
  const consider = (candidate, bonus) => {
    const score = overlapScore(claimTokens, candidate.tokens) + bonus;
    if (!best || score > best.score) best = { candidate, score };
  };
  // Assessment excerpts are already-vetted evidence, so they win ties.
  for (const e of source.excerptCandidates) consider(e, 0.05);
  if (source.passageCandidates === null) source.passageCandidates = buildPassages(source.fullText, source.pageOffsets);
  for (const p of source.passageCandidates) consider(p, 0);
  return best;
}

export function buildCitationTrace(contentText, sources) {
  const text = String(contentText ?? '');
  if (!text.trim() || !sources?.length) return [];
  const prepared = sources.map(prepareSource);
  const sentences = splitSentences(text);
  const trace = [];

  const groups = new RegExp(CITATION_GROUP.source, 'g');
  let m;
  while ((m = groups.exec(text)) !== null) {
    const groupStart = m.index;
    const sentence = sentences.find((s) => groupStart >= s.start && groupStart < s.end);
    const claim = (sentence?.text ?? '').replace(CITATION_GROUP, ' ');
    const claimTokens = contentTokens(claim);
    const precedingText = text.slice(Math.max(0, groupStart - 120), groupStart);

    const matched = [];
    for (const part of m[1].split(';')) {
      const source = prepared.find((s) => sourceMatchesPart(s, part, precedingText));
      if (!source || matched.some((x) => x.documentId === source.documentId)) continue;
      const best = bestEvidence(source, claimTokens);
      matched.push({
        documentId:   source.documentId,
        fileName:     source.fileName ?? null,
        citation:     part.trim(),
        pageNumber:   best?.candidate.pageNumber ?? null,
        pageVerified: best ? best.candidate.pageVerified : false,
        passage:      best ? trimPassage(best.candidate.text) : null,
        via:          best?.candidate.via ?? null,
        score:        best ? Math.round(best.score * 100) / 100 : 0,
        confidence:   best && best.score >= MIN_CONFIDENT_SCORE ? 'normal' : 'low',
      });
    }
    if (matched.length) {
      trace.push({ citation: m[0], start: groupStart, sentence: sentence?.text ?? null, sources: matched });
    }
  }
  return trace;
}
