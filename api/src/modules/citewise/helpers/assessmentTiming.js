// Summarises logged assessment timings into per-page-count figures and the
// page threshold that still fits the target time.

export const TARGET_MS = 15000;

const BUCKETS = [
  [1, 5], [6, 10], [11, 20], [21, 30], [31, 50], [51, 100], [101, 200], [201, Infinity],
];

function percentile(sorted, p) {
  if (!sorted.length) return null;
  const idx = Math.min(sorted.length - 1, Math.ceil(p * sorted.length) - 1);
  return sorted[Math.max(0, idx)];
}

function mean(values) {
  const nums = values.filter(Number.isFinite);
  return nums.length ? Math.round(nums.reduce((a, b) => a + b, 0) / nums.length) : null;
}

// Least squares fit of time = intercept + slope * pages.
function linearFit(points) {
  if (points.length < 5) return null;
  const n = points.length;
  const sx = points.reduce((a, p) => a + p.x, 0);
  const sy = points.reduce((a, p) => a + p.y, 0);
  const sxx = points.reduce((a, p) => a + p.x * p.x, 0);
  const sxy = points.reduce((a, p) => a + p.x * p.y, 0);
  const denom = n * sxx - sx * sx;
  if (denom === 0) return null;
  const slope = (n * sxy - sx * sy) / denom;
  const intercept = (sy - slope * sx) / n;
  return { slope, intercept };
}

function summarizeGroup(rows, targetMs) {
  const timed = rows
    .map((r) => ({ pages: r.page_count, ms: r.total_ms ?? r.assessment_ms, row: r }))
    .filter((r) => Number.isFinite(r.pages) && r.pages > 0 && Number.isFinite(r.ms));

  const buckets = BUCKETS.map(([lo, hi]) => {
    const inBucket = timed.filter((r) => r.pages >= lo && r.pages <= hi);
    const sorted = inBucket.map((r) => r.ms).sort((a, b) => a - b);
    return {
      pages: hi === Infinity ? `${lo}+` : `${lo}-${hi}`,
      maxPages: hi === Infinity ? null : hi,
      runs: inBucket.length,
      avgTotalMs: mean(sorted),
      p90TotalMs: percentile(sorted, 0.9),
      avgExtractionMs: mean(inBucket.map((r) => r.row.extraction_ms)),
      avgAiMs: mean(inBucket.map((r) => r.row.ai_ms)),
      avgAssessmentMs: mean(inBucket.map((r) => r.row.assessment_ms)),
      withinTarget: sorted.length ? percentile(sorted, 0.9) <= targetMs : null,
    };
  }).filter((b) => b.runs > 0);

  // Observed threshold: the largest bucket whose runs, and those of every
  // smaller bucket, finish within the target 90% of the time.
  let observedMaxPages = null;
  for (const b of buckets) {
    if (!b.withinTarget) break;
    observedMaxPages = b.maxPages ?? observedMaxPages;
  }

  const fit = linearFit(timed.map((r) => ({ x: r.pages, y: r.ms })));
  let estimatedMaxPages = null;
  if (fit && fit.slope > 0) {
    estimatedMaxPages = Math.max(0, Math.floor((targetMs - fit.intercept) / fit.slope));
  }

  return {
    runs: timed.length,
    buckets,
    observedMaxPages,
    estimatedMaxPages,
    fit: fit ? { fixedMs: Math.round(fit.intercept), msPerPage: Math.round(fit.slope * 10) / 10 } : null,
  };
}

export function summarizeTimings(rows, targetMs = TARGET_MS) {
  const usable = (rows ?? []).filter((r) => r.status === 'COMPLETE' && !r.reused_ai_response);
  const byMethod = {};
  for (const r of usable) {
    const key = r.extraction_method || 'unknown';
    (byMethod[key] ||= []).push(r);
  }
  const methods = {};
  for (const [key, group] of Object.entries(byMethod)) methods[key] = summarizeGroup(group, targetMs);
  return { targetMs, runs: usable.length, overall: summarizeGroup(usable, targetMs), methods };
}
