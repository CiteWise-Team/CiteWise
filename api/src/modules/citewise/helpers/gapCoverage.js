// Deterministic keyphrase-overlap checker for T6 (CATalyst Gap Coverage).
// Scores each research gap passed into synthesis against the generated draft's
// gap section and full prose, using a fixed keyword-overlap threshold so
// paraphrased gaps are measured consistently and reproducibly.

const STOP_WORDS = new Set([
  'a', 'an', 'and', 'are', 'as', 'at', 'be', 'been', 'being', 'between', 'both',
  'but', 'by', 'can', 'could', 'do', 'does', 'during', 'each', 'for', 'from',
  'further', 'had', 'has', 'have', 'having', 'how', 'in', 'into', 'is', 'it',
  'its', 'lack', 'lacks', 'limited', 'may', 'might', 'more', 'most', 'must',
  'not', 'of', 'often', 'on', 'or', 'other', 'our', 'over', 'remain', 'remains',
  'research', 'should', 'some', 'studies', 'study', 'such', 'than', 'that',
  'the', 'their', 'them', 'there', 'these', 'they', 'this', 'those', 'through',
  'to', 'under', 'use', 'used', 'using', 'very', 'was', 'we', 'were', 'what',
  'when', 'where', 'which', 'while', 'who', 'will', 'with', 'within', 'without',
  'would', 'yet',
]);

export const DEFAULT_GAP_COVERAGE_THRESHOLD = 0.35;

/**
 * Normalize a token for lightweight stem-tolerant matching (e.g. citations -> citation).
 */
function normalizeToken(token) {
  let t = token.toLowerCase().replace(/^[^a-z0-9]+|[^a-z0-9]+$/g, '');
  if (t.length <= 2) return '';
  if (t.endsWith('ies') && t.length > 4) t = t.slice(0, -3) + 'y';
  else if (t.endsWith('ing') && t.length > 5) t = t.slice(0, -3);
  else if (t.endsWith('ed') && t.length > 4) t = t.slice(0, -2);
  else if (t.endsWith('s') && !t.endsWith('ss') && t.length > 3) t = t.slice(0, -1);
  return t;
}

/**
 * Extract unique meaningful keywords from a sentence or paragraph.
 */
export function extractKeywords(text) {
  if (!text || typeof text !== 'string') return [];
  const rawTokens = text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, ' ')
    .split(/[\s-]+/)
    .filter(Boolean);

  const seen = new Set();
  const keywords = [];
  for (const raw of rawTokens) {
    if (STOP_WORDS.has(raw)) continue;
    const norm = normalizeToken(raw);
    if (!norm || STOP_WORDS.has(norm) || seen.has(norm)) continue;
    seen.add(norm);
    keywords.push(norm);
  }
  return keywords;
}

/**
 * Build normalized token set for fast substring/token overlap scoring.
 */
function buildTokenSet(text) {
  return new Set(extractKeywords(text));
}

function scoreOverlap(gapKeywords, targetTokenSet, rawTargetLower) {
  if (!gapKeywords.length) return { overlap: 0, matchedKeywords: [] };
  const matchedKeywords = [];
  for (const kw of gapKeywords) {
    if (targetTokenSet.has(kw) || (kw.length >= 4 && rawTargetLower.includes(kw))) {
      matchedKeywords.push(kw);
    }
  }
  return {
    overlap: Number((matchedKeywords.length / gapKeywords.length).toFixed(4)),
    matchedKeywords,
  };
}

/**
 * Evaluate how well each input research gap is covered in the generated draft.
 *
 * @param {string[]} gapsUsed - Gaps actually supplied to synthesis (userGaps || baselineGaps)
 * @param {object} draftTexts - { contentText, gapText, primaryFocusGap }
 * @param {object} [options]  - { threshold: number }
 */
export function evaluateGapCoverage(
  gapsUsed,
  { contentText = '', gapText = '', primaryFocusGap = null } = {},
  { threshold = DEFAULT_GAP_COVERAGE_THRESHOLD } = {}
) {
  const cleanGaps = (Array.isArray(gapsUsed) ? gapsUsed : [])
    .map((g) => String(g ?? '').trim())
    .filter(Boolean);

  const fullText = String(contentText ?? '');
  const gapSection = String(gapText ?? '');
  const fullTokens = buildTokenSet(fullText);
  const gapSectionTokens = buildTokenSet(gapSection);
  const fullLower = fullText.toLowerCase();
  const gapSectionLower = gapSection.toLowerCase();
  const focusClean = primaryFocusGap ? String(primaryFocusGap).trim() : null;

  const perGap = cleanGaps.map((gap, index) => {
    const keywords = extractKeywords(gap);
    const fullScore = scoreOverlap(keywords, fullTokens, fullLower);
    const gapSectionScore = gapSection
      ? scoreOverlap(keywords, gapSectionTokens, gapSectionLower)
      : { overlap: 0, matchedKeywords: [] };

    const bestOverlap = Math.max(fullScore.overlap, gapSectionScore.overlap);
    const matchedKeywords =
      gapSectionScore.overlap >= fullScore.overlap
        ? gapSectionScore.matchedKeywords
        : fullScore.matchedKeywords;
    const covered = keywords.length > 0 && bestOverlap >= threshold;

    return {
      index,
      gap,
      isPrimaryFocus: Boolean(focusClean && focusClean.toLowerCase() === gap.toLowerCase()),
      keywordCount: keywords.length,
      matchedCount: matchedKeywords.length,
      matchedKeywords,
      fullDraftOverlap: fullScore.overlap,
      gapSectionOverlap: gapSectionScore.overlap,
      bestOverlap,
      covered,
    };
  });

  const totalGaps = perGap.length;
  const coveredCount = perGap.filter((g) => g.covered).length;
  const coveragePct = totalGaps > 0 ? Number(((coveredCount / totalGaps) * 100).toFixed(2)) : null;

  // Also check primaryFocusGap explicitly if it was custom and not already in cleanGaps
  let primaryFocusCovered = null;
  if (focusClean) {
    const inList = perGap.find((g) => g.isPrimaryFocus);
    if (inList) {
      primaryFocusCovered = inList.covered;
    } else {
      const kws = extractKeywords(focusClean);
      const best = Math.max(
        scoreOverlap(kws, fullTokens, fullLower).overlap,
        gapSection ? scoreOverlap(kws, gapSectionTokens, gapSectionLower).overlap : 0
      );
      primaryFocusCovered = kws.length > 0 && best >= threshold;
    }
  }

  return {
    threshold,
    totalGaps,
    coveredCount,
    uncoveredCount: totalGaps - coveredCount,
    coveragePct,
    meetsTarget100Pct: totalGaps > 0 ? coveredCount === totalGaps : null,
    primaryFocusGap: focusClean,
    primaryFocusCovered,
    perGap,
  };
}
