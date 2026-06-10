// Port of RubricScoringEngine.java

const WEIGHT_GAP    = 0.35;
const WEIGHT_METHOD = 0.30;
const WEIGHT_THEORY = 0.20;
const WEIGHT_CITATION = 0.15;

function normalizeScore(v) {
  if (v > 0 && v <= 1.0) return v * 100;
  return v;
}

function clamp(v) {
  if (isNaN(v) || v < 0) return 0;
  if (v > 100) return 100;
  return v;
}

function parseScoreNode(node) {
  if (node === undefined || node === null) return null;
  const n = Number(node);
  return isNaN(n) ? null : n;
}

// Try field names at root, then inside common containers
function readOptionalScore(root, ...names) {
  for (const name of names) {
    const v = parseScoreNode(root[name]);
    if (v !== null) return v;
  }
  for (const container of ['scores','meta','analysis','result']) {
    const c = root[container];
    if (c && typeof c === 'object' && !Array.isArray(c)) {
      for (const name of names) {
        const v = parseScoreNode(c[name]);
        if (v !== null) return v;
      }
    }
  }
  return null;
}

function readScore(root, ...names) {
  return readOptionalScore(root, ...names) ?? 0;
}

function readText(node, ...names) {
  for (const name of names) {
    if (node[name] !== undefined && node[name] !== null) return String(node[name]);
  }
  for (const container of ['scores','meta','analysis','result']) {
    const c = node[container];
    if (c && typeof c === 'object') {
      for (const name of names) {
        if (c[name] !== undefined && c[name] !== null) return String(c[name]);
      }
    }
  }
  return null;
}

function parseStringArray(root, ...names) {
  for (const name of names) {
    if (Array.isArray(root[name])) return root[name].map(String);
  }
  for (const container of ['scores','meta','analysis','result']) {
    const c = root[container];
    if (c && typeof c === 'object') {
      for (const name of names) {
        if (Array.isArray(c[name])) return c[name].map(String);
      }
    }
  }
  return [];
}

function findEvidenceArray(root) {
  for (const name of ['evidenceExcerpts','evidence_excerpts','excerpts','quotes']) {
    if (Array.isArray(root[name])) return root[name];
  }
  return null;
}

function parseEvidenceExcerpts(root) {
  const arr = findEvidenceArray(root);
  if (!arr) return [];
  return arr.reduce((acc, node, order) => {
    const quote = readText(node, 'quoteText','quote_text','quote','text');
    if (!quote?.trim()) return acc;
    acc.push({
      quoteText:     quote,
      pageNumber:    node.pageNumber ?? node.page_number ?? node.page ?? null,
      relevanceLevel:readText(node, 'relevanceLevel','relevance_level','relevance'),
      criterion:     readText(node, 'criterion','criteria'),
      evidenceType:  readText(node, 'evidenceType','evidence_type','type'),
      displayOrder:  node.displayOrder ?? node.display_order ?? order,
    });
    return acc;
  }, []);
}

function unwrapPayload(root) {
  if (!root) return {};
  if (typeof root === 'string') {
    try { return unwrapPayload(JSON.parse(root)); } catch { return {}; }
  }
  if (Array.isArray(root)) return root.length > 0 ? unwrapPayload(root[0]) : {};
  for (const field of ['output','body','data','json','result']) {
    const nested = root[field];
    if (nested && (typeof nested === 'object' || typeof nested === 'string')) {
      return unwrapPayload(nested);
    }
  }
  return root;
}

export function computeOverallScore(gap, method, theory, citation) {
  return (gap * WEIGHT_GAP) + (method * WEIGHT_METHOD) + (theory * WEIGHT_THEORY) + (citation * WEIGHT_CITATION);
}

export function computeRecommendation(overall, gapAlignment, methodology, theoretical, citation, confidenceLevel, mismatchFlags, excerpts) {
  const criticalMismatch = (mismatchFlags ?? []).some(f => {
    const fl = f?.toLowerCase() ?? '';
    return fl.includes('critical') || fl.includes('topic mismatch') || fl.includes('topic_mismatch') || fl.includes('unrelated') || fl.includes('irrelevant');
  });
  const hasEvidence   = Array.isArray(excerpts) && excerpts.length > 0;
  const confidenceLow = !confidenceLevel || confidenceLevel.toLowerCase() === 'low';

  if (overall < 50 || gapAlignment < 40 || criticalMismatch || !hasEvidence) return 'Low Relevance';
  if (overall >= 80 && gapAlignment >= 75 && methodology >= 70 && citation >= 60 && !confidenceLow) return 'Recommended';
  return 'Needs Review';
}

export function computeRelevanceLevel(recommendationStatus, overall) {
  if (recommendationStatus === 'Recommended') return 'High';
  if (recommendationStatus === 'Low Relevance') return 'Low';
  return overall >= 60 ? 'Medium' : 'Low';
}

export function parseAIResponse(rawJson, documentId) {
  if (!rawJson?.trim()) return null;

  let parsed;
  try { parsed = JSON.parse(rawJson); } catch { return null; }

  const root = unwrapPayload(parsed);

  const gapAlignment = clamp(normalizeScore(readScore(root, 'gapAlignment','gapAlignmentScore','gap_alignment_score')));
  const methodology  = clamp(normalizeScore(readScore(root, 'methodology','methodologyScore','methodology_score')));
  const theoretical  = clamp(normalizeScore(readScore(root, 'theory','theoretical','theoreticalScore','theoretical_score','theoryScore')));
  const citation     = clamp(normalizeScore(readScore(root, 'citationQuality','citationScore','citation_quality','citation_score')));

  const excerpts = parseEvidenceExcerpts(root);

  const mismatchFlags  = parseStringArray(root, 'mismatchFlags','mismatch_flags');
  const weaknessFlags  = parseStringArray(root, 'weaknessFlags','weakness_flags');
  const validationFlags= parseStringArray(root, 'validationFlags','validation_flags');

  let overall = readOptionalScore(root, 'overall','overallScore','overall_score');
  if (overall !== null) {
    overall = clamp(normalizeScore(overall));
  } else {
    overall = computeOverallScore(gapAlignment, methodology, theoretical, citation);
  }

  let confidence = readText(root, 'confidenceLevel','confidence_level','confidence') ?? 'Low';
  const recommendationStatus = computeRecommendation(overall, gapAlignment, methodology, theoretical, citation, confidence, mismatchFlags, excerpts);
  const relevanceLevel = computeRelevanceLevel(recommendationStatus, overall);

  const hasUsable =
    excerpts.length > 0 ||
    gapAlignment || methodology || theoretical || citation ||
    recommendationStatus || relevanceLevel || confidence;

  if (!hasUsable) return null;

  return {
    documentId,
    gapAlignmentScore: gapAlignment,
    methodologyScore:  methodology,
    theoreticalScore:  theoretical,
    citationScore:     citation,
    overallScore:      overall,
    averageOverallScore: null,
    confidenceLevel:   confidence,
    recommendationStatus,
    relevanceLevel,
    mismatchFlagsJson:  JSON.stringify(mismatchFlags),
    weaknessFlagsJson:  JSON.stringify(weaknessFlags),
    validationFlagsJson: JSON.stringify(validationFlags),
    rawAiResponseJson:  rawJson,
    generatedAt:        new Date().toISOString(),
    evidenceExcerpts:   excerpts,
  };
}
