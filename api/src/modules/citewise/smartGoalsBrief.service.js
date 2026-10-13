import { createHash } from 'node:crypto';

export const SMART_GOALS_BRIEF_VERSION = 2;

const MAX_EVIDENCE = 5;
const MAX_EXCERPT_LENGTH = 400;
const STOP_WORDS = new Set([
  'a', 'an', 'and', 'are', 'as', 'at', 'be', 'by', 'for', 'from', 'in', 'into',
  'is', 'it', 'of', 'on', 'or', 'that', 'the', 'their', 'this', 'to', 'was', 'were', 'with',
]);

function cleanText(value, maxLength) {
  return typeof value === 'string' ? value.trim().slice(0, maxLength) : '';
}

function terms(value) {
  return new Set(String(value ?? '').toLowerCase().match(/[\p{L}\p{N}]{3,}/gu)?.filter((word) => !STOP_WORDS.has(word)) ?? []);
}

function overlapScore(textTerms, referenceTerms) {
  if (!referenceTerms.size) return 0;
  let matches = 0;
  for (const term of referenceTerms) if (textTerms.has(term)) matches += 1;
  return matches / referenceTerms.size;
}

function relevanceBonus(value) {
  const level = String(value ?? '').toLowerCase();
  if (level === 'high' || level === 'recommended') return 3;
  if (level === 'medium' || level === 'needs review') return 1;
  if (level === 'low' || level === 'low relevance') return -2;
  return 0;
}

function scoreEvidence(evidence, insight, titleTerms, gapTerms) {
  const evidenceTerms = terms(`${evidence.excerpt} ${evidence.criterion ?? ''}`);
  const gapAlignment = Number(insight?.gap_alignment_score);
  const gapBonus = Number.isFinite(gapAlignment) ? Math.max(0, Math.min(gapAlignment, 100)) / 25 : 0;
  return overlapScore(evidenceTerms, gapTerms) * 10
    + overlapScore(evidenceTerms, titleTerms) * 3
    + gapBonus
    + relevanceBonus(evidence.relevanceLevel)
    + (overlapScore(terms(evidence.criterion), gapTerms) * 2);
}

function asArray(value) {
  return Array.isArray(value) ? value : value ? [value] : [];
}

export function selectRelevantEvidence(documents, researchTitle, selectedGap) {
  const titleTerms = terms(researchTitle);
  const gapTerms = terms(selectedGap);
  const candidates = [];

  for (const document of documents ?? []) {
    const insight = asArray(document.document_insights)[0];
    if (!insight) continue;

    for (const row of insight.evidence_excerpts ?? []) {
      const excerpt = cleanText(row.quote_text, MAX_EXCERPT_LENGTH);
      if (!excerpt) continue;
      candidates.push({
        sourceId: String(document.id),
        page: row.page_number ?? null,
        excerpt,
        criterion: row.criterion ?? '',
        relevanceLevel: row.relevance_level ?? insight.relevance_level ?? '',
        displayOrder: Number(row.display_order) || 0,
        score: 0,
      });
      candidates[candidates.length - 1].score = scoreEvidence(candidates[candidates.length - 1], insight, titleTerms, gapTerms);
    }
  }

  candidates.sort((left, right) => right.score - left.score
    || left.sourceId.localeCompare(right.sourceId)
    || left.displayOrder - right.displayOrder);

  const selected = [];
  const seenSources = new Set();
  const seenExcerpts = new Set();
  const addCandidate = (candidate) => {
    const excerptKey = candidate.excerpt.toLowerCase().replace(/\s+/g, ' ');
    if (selected.length >= MAX_EVIDENCE || seenExcerpts.has(excerptKey)) return;
    selected.push({ sourceId: candidate.sourceId, page: candidate.page, excerpt: candidate.excerpt });
    seenSources.add(candidate.sourceId);
    seenExcerpts.add(excerptKey);
  };

  for (const candidate of candidates) {
    if (!seenSources.has(candidate.sourceId)) addCandidate(candidate);
  }
  for (const candidate of candidates) addCandidate(candidate);

  return selected;
}

export function createSmartGoalsBrief(researchTitle, selectedGap, evidence) {
  const brief = {
    version: SMART_GOALS_BRIEF_VERSION,
    researchTitle: cleanText(researchTitle, 300),
    selectedGap: cleanText(selectedGap, 1500),
    evidence,
  };
  const fingerprint = createHash('sha256').update(JSON.stringify(brief)).digest('hex');
  return { brief, fingerprint };
}

function normalizedEvidenceSources(documents) {
  return (documents ?? []).map((document) => {
    const insight = asArray(document.document_insights)[0] ?? {};
    return {
      sourceId: String(document.id),
      gapAlignmentScore: insight.gap_alignment_score ?? null,
      relevanceLevel: insight.relevance_level ?? null,
      generatedAt: insight.generated_at ?? null,
      excerpts: (insight.evidence_excerpts ?? []).map((excerpt) => ({
        quote: excerpt.quote_text ?? '',
        page: excerpt.page_number ?? null,
        criterion: excerpt.criterion ?? '',
        relevanceLevel: excerpt.relevance_level ?? null,
        displayOrder: excerpt.display_order ?? null,
      })).sort((left, right) => left.displayOrder - right.displayOrder),
    };
  }).sort((left, right) => left.sourceId.localeCompare(right.sourceId));
}

export async function getOrStoreSmartGoalsBrief(supabase, sessionId, researchTitle, selectedGap, documents) {
  const title = cleanText(researchTitle, 300);
  const gap = cleanText(selectedGap, 1500);
  const inputFingerprint = createHash('sha256').update(JSON.stringify({
    version: SMART_GOALS_BRIEF_VERSION,
    researchTitle: title,
    selectedGap: gap,
    rrl: normalizedEvidenceSources(documents),
  })).digest('hex');
  const { data: cached, error: cacheError } = await supabase
    .from('smart_goal_briefs')
    .select('brief_version, input_fingerprint, brief_json')
    .eq('session_id', sessionId)
    .maybeSingle();

  if (cacheError) throw cacheError;
  if (cached?.brief_version === SMART_GOALS_BRIEF_VERSION && cached.input_fingerprint === inputFingerprint) {
    return { brief: cached.brief_json, reused: true };
  }

  const evidence = selectRelevantEvidence(documents, title, gap);
  if (!evidence.length) return { brief: null, reused: false };
  const { brief, fingerprint } = createSmartGoalsBrief(title, gap, evidence);

  const { error: saveError } = await supabase
    .from('smart_goal_briefs')
    .upsert({
      session_id: sessionId,
      brief_version: SMART_GOALS_BRIEF_VERSION,
      context_fingerprint: fingerprint,
      input_fingerprint: inputFingerprint,
      brief_json: brief,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'session_id' });

  if (saveError) throw saveError;
  return { brief, reused: false };
}