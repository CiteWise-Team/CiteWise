// Shared pure utilities for the CiteWise T5 Source-Selection Accuracy Benchmark.
// Used by api/scripts/run-t5-benchmark.js and verified by Vitest unit tests.

export const EXPECTED_LABELS = {
  RELEVANT: 'Relevant',
  NOT_RELEVANT: 'Not Relevant',
};

export const STRICT_POSITIVE_CLASSIFICATIONS = new Set(['Recommended']);
export const DEFAULT_THROTTLE_DELAY_MS = 16000;
export const MIN_SAFE_THROTTLE_DELAY_MS = 15000;
export const T5_ACCURACY_TARGET_PCT = 80;

/**
 * Parse a single RFC-4180 CSV line supporting quoted fields and escaped quotes ("").
 */
export function parseCsvLine(line) {
  const fields = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"') {
        if (i + 1 < line.length && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        current += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ',') {
      fields.push(current);
      current = '';
    } else {
      current += ch;
    }
  }
  fields.push(current);
  return fields.map((f) => f.trim());
}

/**
 * Normalize expected_label values to canonical 'Relevant' or 'Not Relevant'.
 */
export function normalizeExpectedLabel(rawLabel, rowNumber = null) {
  const normalized = String(rawLabel ?? '')
    .trim()
    .toLowerCase()
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ');

  if (normalized === 'relevant' || normalized === 'on topic' || normalized === '1' || normalized === 'true') {
    return EXPECTED_LABELS.RELEVANT;
  }
  if (
    normalized === 'not relevant' ||
    normalized === 'irrelevant' ||
    normalized === 'off topic' ||
    normalized === '0' ||
    normalized === 'false'
  ) {
    return EXPECTED_LABELS.NOT_RELEVANT;
  }

  const rowCtx = rowNumber != null ? ` at row ${rowNumber}` : '';
  throw new Error(`Invalid expected_label "${rawLabel}"${rowCtx}. Expected "Relevant" or "Not Relevant".`);
}

/**
 * Parse ground_truth.csv content into validated records.
 * Required columns: filename, expected_label
 */
export function parseGroundTruthCsv(csvContent) {
  const text = String(csvContent ?? '').replace(/^\uFEFF/, '');
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  if (lines.length < 2) {
    throw new Error('ground_truth.csv must contain a header row and at least one data row.');
  }

  const headers = parseCsvLine(lines[0]).map((h) => h.toLowerCase());
  const filenameIdx = headers.indexOf('filename');
  const labelIdx = headers.indexOf('expected_label');

  if (filenameIdx === -1 || labelIdx === -1) {
    throw new Error(
      `ground_truth.csv must include "filename" and "expected_label" columns. Found: [${headers.join(', ')}]`
    );
  }

  const seenFilenames = new Set();
  const rows = [];

  for (let i = 1; i < lines.length; i++) {
    const cols = parseCsvLine(lines[i]);
    const filename = cols[filenameIdx] ?? '';
    if (!filename) {
      throw new Error(`Empty filename in ground_truth.csv at row ${i + 1}.`);
    }
    if (seenFilenames.has(filename)) {
      throw new Error(`Duplicate filename "${filename}" in ground_truth.csv at row ${i + 1}.`);
    }
    seenFilenames.add(filename);

    const expectedLabel = normalizeExpectedLabel(cols[labelIdx], i + 1);
    const extras = {};
    headers.forEach((h, idx) => {
      if (idx !== filenameIdx && idx !== labelIdx && cols[idx] !== undefined) {
        extras[h] = cols[idx];
      }
    });

    rows.push({
      filename,
      expectedLabel,
      ...extras,
    });
  }

  return rows;
}

/**
 * Normalize a CATalyst baseline JSON payload ({ title, rationale, gaps } or DB shape).
 */
export function parseBaselineJson(input) {
  const obj = typeof input === 'string' ? JSON.parse(input) : input;
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) {
    throw new Error('Baseline JSON must be an object with title, rationale, and gaps.');
  }

  const projectTitle = String(obj.project_title ?? obj.projectTitle ?? obj.title ?? '').trim();
  const rationale = String(obj.rationale ?? obj.researchRationale ?? obj.research_rationale ?? '').trim();
  const rawGaps = obj.research_gaps ?? obj.researchGaps ?? obj.gaps ?? obj.gap ?? [];

  let gaps = [];
  if (Array.isArray(rawGaps)) {
    gaps = rawGaps.map((g) => String(g ?? '').trim()).filter(Boolean);
  } else if (typeof rawGaps === 'string') {
    gaps = rawGaps
      .split(/;\s*|\r?\n+/)
      .map((g) => g.trim())
      .filter(Boolean);
  }

  if (!projectTitle) {
    throw new Error('Baseline JSON is missing a non-empty "title" (or "project_title").');
  }
  if (!rationale && gaps.length === 0) {
    throw new Error('Baseline JSON must provide a non-empty "rationale" or at least one entry in "gaps".');
  }

  return {
    project_title: projectTitle,
    rationale,
    research_gaps: gaps,
  };
}

/**
 * Primary T5 strict binary mapping:
 *   Recommended -> Relevant
 *   Needs Review | Low Relevance | FAILED | null -> Not Relevant
 */
export function classifyStrictBinary(recommendationStatus) {
  const normalized = String(recommendationStatus ?? '').trim();
  return STRICT_POSITIVE_CLASSIFICATIONS.has(normalized)
    ? EXPECTED_LABELS.RELEVANT
    : EXPECTED_LABELS.NOT_RELEVANT;
}

/**
 * Sensitivity binary mapping based on numeric overall score threshold.
 */
export function classifyScoreThreshold(overallScore, threshold) {
  if (overallScore === null || overallScore === undefined || overallScore === '') {
    return EXPECTED_LABELS.NOT_RELEVANT;
  }
  const n = Number(overallScore);
  if (!Number.isFinite(n)) return EXPECTED_LABELS.NOT_RELEVANT;
  return n >= threshold ? EXPECTED_LABELS.RELEVANT : EXPECTED_LABELS.NOT_RELEVANT;
}

/**
 * Enrich a raw benchmark document outcome with strict binary + threshold predictions.
 */
export function buildResultRow(raw) {
  const expectedLabel = normalizeExpectedLabel(raw.expectedLabel);
  const classification = raw.classification || 'FAILED';
  const finalRubricScore =
    raw.finalRubricScore !== null && raw.finalRubricScore !== undefined && Number.isFinite(Number(raw.finalRubricScore))
      ? Number(Number(raw.finalRubricScore).toFixed(2))
      : null;

  const predictedStrict = classifyStrictBinary(classification);
  const predictedScore60 = classifyScoreThreshold(finalRubricScore, 60);
  const predictedScore70 = classifyScoreThreshold(finalRubricScore, 70);

  return {
    filename: raw.filename,
    expectedLabel,
    extractedTextStatus: raw.extractedTextStatus || 'FAILED',
    scoringStatus: raw.scoringStatus || (classification === 'FAILED' || classification === 'TIMEOUT' ? classification : 'COMPLETE'),
    pageCount: raw.pageCount ?? null,
    characterCount: raw.characterCount ?? 0,
    extractionMs: raw.extractionMs ?? null,
    aiLatencySeconds: raw.aiLatencySeconds ?? null,
    assessmentDurationSeconds: raw.assessmentDurationSeconds ?? null,
    gapAlignmentScore: raw.gapAlignmentScore ?? null,
    methodologyScore: raw.methodologyScore ?? null,
    theoreticalScore: raw.theoreticalScore ?? null,
    citationScore: raw.citationScore ?? null,
    finalRubricScore,
    classification,
    confidenceLevel: raw.confidenceLevel ?? null,
    relevanceLevel: raw.relevanceLevel ?? null,
    predictedBinaryStrict: predictedStrict,
    correctStrict: predictedStrict === expectedLabel,
    predictedScore60,
    correctScore60: predictedScore60 === expectedLabel,
    predictedScore70,
    correctScore70: predictedScore70 === expectedLabel,
    mismatchFlags: Array.isArray(raw.mismatchFlags) ? raw.mismatchFlags : [],
    weaknessFlags: Array.isArray(raw.weaknessFlags) ? raw.weaknessFlags : [],
    validationFlags: Array.isArray(raw.validationFlags) ? raw.validationFlags : [],
    documentId: raw.documentId ?? null,
    errorMessage: raw.errorMessage ?? null,
  };
}

/**
 * Compute confusion matrix + Accuracy / Precision / Recall / F1 for a binary prediction key.
 */
export function computeBinaryConfusionMetrics(rows, predictedKey) {
  let tp = 0;
  let tn = 0;
  let fp = 0;
  let fn = 0;

  for (const row of rows) {
    const actualRel = row.expectedLabel === EXPECTED_LABELS.RELEVANT;
    const predRel = row[predictedKey] === EXPECTED_LABELS.RELEVANT;

    if (actualRel && predRel) tp++;
    else if (!actualRel && !predRel) tn++;
    else if (!actualRel && predRel) fp++;
    else fn++;
  }

  const total = rows.length;
  const correct = tp + tn;
  const accuracyPct = total > 0 ? Number(((correct / total) * 100).toFixed(2)) : 0;
  const precisionPct = tp + fp > 0 ? Number(((tp / (tp + fp)) * 100).toFixed(2)) : 0;
  const recallPct = tp + fn > 0 ? Number(((tp / (tp + fn)) * 100).toFixed(2)) : 0;
  const f1Pct =
    precisionPct + recallPct > 0
      ? Number(((2 * precisionPct * recallPct) / (precisionPct + recallPct)).toFixed(2))
      : 0;

  return {
    total,
    correct,
    tp,
    tn,
    fp,
    fn,
    accuracyPct,
    precisionPct,
    recallPct,
    f1Pct,
    meetsTarget80: total > 0 && accuracyPct >= T5_ACCURACY_TARGET_PCT,
  };
}

function meanOf(nums) {
  const valid = nums.filter((n) => typeof n === 'number' && Number.isFinite(n));
  if (!valid.length) return null;
  return Number((valid.reduce((a, b) => a + b, 0) / valid.length).toFixed(2));
}

function percentileSorted(sorted, p) {
  if (!sorted.length) return null;
  const idx = Math.min(sorted.length - 1, Math.max(0, Math.ceil(p * sorted.length) - 1));
  return Number(sorted[idx].toFixed(2));
}

/**
 * Detailed breakdown of documents classified as "Needs Review".
 */
export function computeNeedsReviewBreakdown(rows) {
  const needsReview = rows.filter((r) => r.classification === 'Needs Review');
  const expectedRelevant = needsReview.filter((r) => r.expectedLabel === EXPECTED_LABELS.RELEVANT);
  const expectedNotRelevant = needsReview.filter((r) => r.expectedLabel === EXPECTED_LABELS.NOT_RELEVANT);

  const countFlags = (field) => {
    const counts = Object.create(null);
    for (const r of needsReview) {
      for (const flag of r[field] ?? []) {
        counts[flag] = (counts[flag] || 0) + 1;
      }
    }
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([flag, count]) => ({ flag, count }));
  };

  return {
    totalNeedsReview: needsReview.length,
    pctOfTotal: rows.length > 0 ? Number(((needsReview.length / rows.length) * 100).toFixed(2)) : 0,
    expectedRelevantCount: expectedRelevant.length,
    expectedNotRelevantCount: expectedNotRelevant.length,
    expectedRelevantFiles: expectedRelevant.map((r) => r.filename),
    expectedNotRelevantFiles: expectedNotRelevant.map((r) => r.filename),
    avgOverallScore: meanOf(needsReview.map((r) => r.finalRubricScore)),
    avgGapAlignmentScore: meanOf(needsReview.map((r) => r.gapAlignmentScore)),
    avgMethodologyScore: meanOf(needsReview.map((r) => r.methodologyScore)),
    avgTheoreticalScore: meanOf(needsReview.map((r) => r.theoreticalScore)),
    avgCitationScore: meanOf(needsReview.map((r) => r.citationScore)),
    topWeaknessFlags: countFlags('weaknessFlags'),
    topValidationFlags: countFlags('validationFlags'),
  };
}

/**
 * Compute T3 (PDF parsing rate) and T4 (AI latency in seconds) metrics.
 */
export function computeT3ExtractionMetrics(rows) {
  const total = rows.length;
  const extracted = rows.filter((r) => r.extractedTextStatus === 'EXTRACTED').length;
  const empty = rows.filter((r) => r.extractedTextStatus === 'EMPTY').length;
  const failed = rows.filter((r) => r.extractedTextStatus === 'FAILED').length;
  return {
    total,
    extracted,
    empty,
    failed,
    extractionRatePct: total > 0 ? Number(((extracted / total) * 100).toFixed(2)) : 0,
    avgExtractionMs: meanOf(rows.map((r) => r.extractionMs)),
  };
}

export function computeT4LatencyMetrics(rows) {
  const aiLatencies = rows
    .map((r) => r.aiLatencySeconds)
    .filter((v) => typeof v === 'number' && Number.isFinite(v))
    .sort((a, b) => a - b);

  const assessmentDurations = rows
    .map((r) => r.assessmentDurationSeconds)
    .filter((v) => typeof v === 'number' && Number.isFinite(v))
    .sort((a, b) => a - b);

  return {
    aiCount: aiLatencies.length,
    minAiSeconds: aiLatencies.length ? Number(aiLatencies[0].toFixed(2)) : null,
    meanAiSeconds: meanOf(aiLatencies),
    medianAiSeconds: percentileSorted(aiLatencies, 0.5),
    p95AiSeconds: percentileSorted(aiLatencies, 0.95),
    maxAiSeconds: aiLatencies.length ? Number(aiLatencies[aiLatencies.length - 1].toFixed(2)) : null,
    meanAssessmentSeconds: meanOf(assessmentDurations),
    medianAssessmentSeconds: percentileSorted(assessmentDurations, 0.5),
  };
}

/**
 * Aggregate full benchmark summary metrics.
 */
export function computeBenchmarkSummary(rows) {
  const classificationCounts = {
    Recommended: 0,
    'Needs Review': 0,
    'Low Relevance': 0,
    FAILED: 0,
  };
  let scoredCompleteCount = 0;
  let scoringFailedCount = 0;
  for (const r of rows) {
    if (Object.prototype.hasOwnProperty.call(classificationCounts, r.classification)) {
      classificationCounts[r.classification]++;
    } else {
      classificationCounts.FAILED++;
    }
    if (r.classification === 'FAILED' || r.classification === 'TIMEOUT' || r.scoringStatus === 'FAILED' || r.scoringStatus === 'TIMEOUT') {
      scoringFailedCount++;
    } else {
      scoredCompleteCount++;
    }
  }

  return {
    totalPapers: rows.length,
    expectedRelevantCount: rows.filter((r) => r.expectedLabel === EXPECTED_LABELS.RELEVANT).length,
    expectedNotRelevantCount: rows.filter((r) => r.expectedLabel === EXPECTED_LABELS.NOT_RELEVANT).length,
    scoredCompleteCount,
    scoringFailedCount,
    classificationCounts,
    t3Extraction: computeT3ExtractionMetrics(rows),
    t4Latency: computeT4LatencyMetrics(rows),
    t5StrictBinary: computeBinaryConfusionMetrics(rows, 'predictedBinaryStrict'),
    t5Score60: computeBinaryConfusionMetrics(rows, 'predictedScore60'),
    t5Score70: computeBinaryConfusionMetrics(rows, 'predictedScore70'),
    needsReviewBreakdown: computeNeedsReviewBreakdown(rows),
  };
}

/**
 * Escape a single CSV cell per RFC-4180.
 */
export function escapeCsvCell(value) {
  if (value === null || value === undefined) return '';
  const str = String(value);
  if (/[",\r\n]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/**
 * Render per-paper rows + summary metrics footer into CSV text.
 */
export function formatSummaryCsv(rows, summary = computeBenchmarkSummary(rows)) {
  const headers = [
    'filename',
    'expected_label',
    'extracted_text_status',
    'page_count',
    'character_count',
    'extraction_ms',
    'ai_latency_seconds',
    'assessment_duration_seconds',
    'gap_alignment_score',
    'methodology_score',
    'theoretical_score',
    'citation_score',
    'final_rubric_score',
    'classification',
    'confidence_level',
    'relevance_level',
    'predicted_binary_strict',
    'correct_strict',
    'predicted_score_60',
    'correct_score_60',
    'predicted_score_70',
    'correct_score_70',
    'mismatch_flags',
    'weakness_flags',
    'validation_flags',
    'document_id',
    'error_message',
  ];

  const lines = [headers.join(',')];

  for (const r of rows) {
    const vals = [
      r.filename,
      r.expectedLabel,
      r.extractedTextStatus,
      r.pageCount ?? '',
      r.characterCount ?? 0,
      r.extractionMs ?? '',
      r.aiLatencySeconds ?? '',
      r.assessmentDurationSeconds ?? '',
      r.gapAlignmentScore ?? '',
      r.methodologyScore ?? '',
      r.theoreticalScore ?? '',
      r.citationScore ?? '',
      r.finalRubricScore ?? '',
      r.classification,
      r.confidenceLevel ?? '',
      r.relevanceLevel ?? '',
      r.predictedBinaryStrict,
      r.correctStrict,
      r.predictedScore60,
      r.correctScore60,
      r.predictedScore70,
      r.correctScore70,
      (r.mismatchFlags ?? []).join('; '),
      (r.weaknessFlags ?? []).join('; '),
      (r.validationFlags ?? []).join('; '),
      r.documentId ?? '',
      r.errorMessage ?? '',
    ];
    lines.push(vals.map(escapeCsvCell).join(','));
  }

  // Append summary metrics block so the CSV file itself documents T3, T4, T5, and Needs Review breakdown
  const nr = summary.needsReviewBreakdown;
  const strict = summary.t5StrictBinary;
  const s60 = summary.t5Score60;
  const s70 = summary.t5Score70;

  lines.push('');
  lines.push(['SUMMARY_METRIC', 'VALUE', 'DETAILS'].map(escapeCsvCell).join(','));
  lines.push(
    [
      'T5_STRICT_BINARY_ACCURACY_PCT',
      `${strict.accuracyPct}%`,
      `Recommended=Relevant; Needs Review & Low Relevance=Not Relevant | ${strict.correct}/${strict.total} | TP=${strict.tp} TN=${strict.tn} FP=${strict.fp} FN=${strict.fn} | Target>=80%: ${strict.meetsTarget80 ? 'PASS' : 'FAIL'}`,
    ]
      .map(escapeCsvCell)
      .join(',')
  );
  lines.push(
    [
      'T5_SCORE_GE_60_ACCURACY_PCT',
      `${s60.accuracyPct}%`,
      `${s60.correct}/${s60.total} | TP=${s60.tp} TN=${s60.tn} FP=${s60.fp} FN=${s60.fn} | Precision=${s60.precisionPct}% Recall=${s60.recallPct}% F1=${s60.f1Pct}%`,
    ]
      .map(escapeCsvCell)
      .join(',')
  );
  lines.push(
    [
      'T5_SCORE_GE_70_ACCURACY_PCT',
      `${s70.accuracyPct}%`,
      `${s70.correct}/${s70.total} | TP=${s70.tp} TN=${s70.tn} FP=${s70.fp} FN=${s70.fn} | Precision=${s70.precisionPct}% Recall=${s70.recallPct}% F1=${s70.f1Pct}%`,
    ]
      .map(escapeCsvCell)
      .join(',')
  );
  lines.push(
    [
      'NEEDS_REVIEW_BREAKDOWN',
      `${nr.totalNeedsReview}/${summary.totalPapers} (${nr.pctOfTotal}%)`,
      `Expected_Relevant=${nr.expectedRelevantCount}; Expected_Not_Relevant=${nr.expectedNotRelevantCount}; Avg_Overall=${nr.avgOverallScore ?? 'N/A'}`,
    ]
      .map(escapeCsvCell)
      .join(',')
  );
  lines.push(
    [
      'T3_PDF_EXTRACTION_RATE_PCT',
      `${summary.t3Extraction.extractionRatePct}%`,
      `${summary.t3Extraction.extracted}/${summary.t3Extraction.total} extracted | avgExtractionMs=${summary.t3Extraction.avgExtractionMs ?? 'N/A'}`,
    ]
      .map(escapeCsvCell)
      .join(',')
  );
  lines.push(
    [
      'T4_AI_LATENCY_MEAN_SECONDS',
      summary.t4Latency.meanAiSeconds != null ? `${summary.t4Latency.meanAiSeconds}s` : 'N/A',
      `n=${summary.t4Latency.aiCount} median=${summary.t4Latency.medianAiSeconds ?? 'N/A'}s p95=${summary.t4Latency.p95AiSeconds ?? 'N/A'}s max=${summary.t4Latency.maxAiSeconds ?? 'N/A'}s`,
    ]
      .map(escapeCsvCell)
      .join(',')
  );
  lines.push(
    [
      'SCORING_COMPLETION_RATE',
      `${summary.scoredCompleteCount}/${summary.totalPapers}`,
      `Failed/Timeout=${summary.scoringFailedCount}`,
    ]
      .map(escapeCsvCell)
      .join(',')
  );

  return lines.join('\n') + '\n';
}

/**
 * Format a human-readable console report covering T3, T4, T5 Strict Binary, Needs Review, and >=60 / >=70 thresholds.
 */
export function formatSummaryConsoleReport(summary) {
  const { t3Extraction, t4Latency, t5StrictBinary, t5Score60, t5Score70, needsReviewBreakdown, classificationCounts } =
    summary;

  const lines = [
    '',
    '========================================================================',
    '  CiteWise General Objective 2 — T5 Source-Selection Accuracy Report',
    '========================================================================',
    `Total Papers Evaluated : ${summary.totalPapers} (Relevant=${summary.expectedRelevantCount}, Not Relevant=${summary.expectedNotRelevantCount})`,
    `Classifications        : Recommended=${classificationCounts.Recommended}, Needs Review=${classificationCounts['Needs Review']}, Low Relevance=${classificationCounts['Low Relevance']}, FAILED=${classificationCounts.FAILED} (Completed=${summary.scoredCompleteCount}/${summary.totalPapers})`,
    '',
    '--- T3: PDF Text Extraction Rate ---',
    `  Extracted            : ${t3Extraction.extracted}/${t3Extraction.total} (${t3Extraction.extractionRatePct}%) | Empty=${t3Extraction.empty}, Failed=${t3Extraction.failed}`,
    `  Avg Extraction Time  : ${t3Extraction.avgExtractionMs != null ? `${t3Extraction.avgExtractionMs} ms` : 'N/A'}`,
    '',
    '--- T4: AI Assessment Latency ---',
    `  AI Call (seconds)    : n=${t4Latency.aiCount} | min=${t4Latency.minAiSeconds ?? 'N/A'}s | mean=${t4Latency.meanAiSeconds ?? 'N/A'}s | median=${t4Latency.medianAiSeconds ?? 'N/A'}s | p95=${t4Latency.p95AiSeconds ?? 'N/A'}s | max=${t4Latency.maxAiSeconds ?? 'N/A'}s`,
    `  Total Assess (sec)   : mean=${t4Latency.meanAssessmentSeconds ?? 'N/A'}s | median=${t4Latency.medianAssessmentSeconds ?? 'N/A'}s`,
    '',
    '--- T5 Primary Metric: Strict Binary Mapping ---',
    '  Mapping              : Recommended -> Relevant | Needs Review & Low Relevance -> Not Relevant',
    `  Accuracy             : ${t5StrictBinary.accuracyPct}% (${t5StrictBinary.correct}/${t5StrictBinary.total})  [Target >= ${T5_ACCURACY_TARGET_PCT}%: ${t5StrictBinary.meetsTarget80 ? 'PASS' : 'FAIL'}]`,
    `  Confusion Matrix     : TP=${t5StrictBinary.tp} | TN=${t5StrictBinary.tn} | FP=${t5StrictBinary.fp} | FN=${t5StrictBinary.fn}`,
    `  Precision / Recall   : Precision=${t5StrictBinary.precisionPct}% | Recall=${t5StrictBinary.recallPct}% | F1=${t5StrictBinary.f1Pct}%`,
    '',
    '--- Needs Review Breakdown ---',
    `  Total Needs Review   : ${needsReviewBreakdown.totalNeedsReview}/${summary.totalPapers} (${needsReviewBreakdown.pctOfTotal}%)`,
    `  Actual Labels        : Expected Relevant=${needsReviewBreakdown.expectedRelevantCount} | Expected Not Relevant=${needsReviewBreakdown.expectedNotRelevantCount}`,
    `  Avg Rubric Scores    : Overall=${needsReviewBreakdown.avgOverallScore ?? 'N/A'} | Gap=${needsReviewBreakdown.avgGapAlignmentScore ?? 'N/A'} | Method=${needsReviewBreakdown.avgMethodologyScore ?? 'N/A'} | Theory=${needsReviewBreakdown.avgTheoreticalScore ?? 'N/A'} | Citation=${needsReviewBreakdown.avgCitationScore ?? 'N/A'}`,
    `  Top Weakness Flags   : ${needsReviewBreakdown.topWeaknessFlags.map((f) => `${f.flag}(${f.count})`).join(', ') || 'None'}`,
    `  Top Validation Flags : ${needsReviewBreakdown.topValidationFlags.map((f) => `${f.flag}(${f.count})`).join('; ') || 'None'}`,
    `  Expected-Rel FN Files: ${needsReviewBreakdown.expectedRelevantFiles.slice(0, 10).join(', ') || 'None'}${needsReviewBreakdown.expectedRelevantFiles.length > 10 ? ` (+${needsReviewBreakdown.expectedRelevantFiles.length - 10} more)` : ''}`,
    '',
    '--- Threshold Sensitivity Metrics (Overall Score) ---',
    `  Score >= 60          : Accuracy=${t5Score60.accuracyPct}% (${t5Score60.correct}/${t5Score60.total}) | TP=${t5Score60.tp} TN=${t5Score60.tn} FP=${t5Score60.fp} FN=${t5Score60.fn} | P=${t5Score60.precisionPct}% R=${t5Score60.recallPct}% F1=${t5Score60.f1Pct}%`,
    `  Score >= 70          : Accuracy=${t5Score70.accuracyPct}% (${t5Score70.correct}/${t5Score70.total}) | TP=${t5Score70.tp} TN=${t5Score70.tn} FP=${t5Score70.fp} FN=${t5Score70.fn} | P=${t5Score70.precisionPct}% R=${t5Score70.recallPct}% F1=${t5Score70.f1Pct}%`,
    '========================================================================',
    '',
  ];

  return lines.join('\n');
}

/**
 * Validate and resolve the throttling delay between AI requests.
 * Enforces >= 15s (default 16s) when running large batches to avoid 429 (40 req / 10 min).
 */
export function resolveThrottleDelayMs(rawValue, totalDocs, allowFast = false) {
  if (rawValue === null || rawValue === undefined || rawValue === '') {
    return DEFAULT_THROTTLE_DELAY_MS;
  }
  const parsed = Number(rawValue);
  if (!Number.isFinite(parsed) || parsed < 0) {
    throw new Error(`Invalid --delay-ms value "${rawValue}". Expected a non-negative integer in milliseconds.`);
  }
  if (!allowFast && totalDocs > 10 && parsed < MIN_SAFE_THROTTLE_DELAY_MS) {
    throw new Error(
      `Throttle delay ${parsed}ms is below the safe minimum (${MIN_SAFE_THROTTLE_DELAY_MS}ms) for ${totalDocs} documents ` +
        `and risks triggering the 40 AI requests / 10 min rate limit (HTTP 429). Use >= ${MIN_SAFE_THROTTLE_DELAY_MS} or pass --allow-fast.`
    );
  }
  return Math.round(parsed);
}
