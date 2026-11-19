/**
 * CiteWise General Objective 2 — T5 Batch Benchmark Runner
 *
 * Evaluates a directory of labeled PDFs against a CATalyst baseline JSON and
 * ground_truth.csv through the real backend PDF extractor (extractPdfPages)
 * and 4-criterion RRL Rubric Engine (scoringPipeline / n8n + parseAIResponse).
 *
 * Persists the benchmark session, documents, insights, timings, and summary
 * validation metrics in Supabase DB, enforces a 15–16s rate-limit throttle
 * between AI requests (<40 req / 10 min), and writes a summary CSV + JSON.
 *
 * Usage:
 *   node api/scripts/run-t5-benchmark.js --dry-run
 *   node api/scripts/run-t5-benchmark.js \
 *     --pdf-dir api/test-data/t5-benchmark/pdfs \
 *     --ground-truth api/test-data/t5-benchmark/ground_truth.csv \
 *     --baseline api/test-data/t5-benchmark/catalyst-baseline.json
 */

import '../src/env.js';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';
import {
  DEFAULT_THROTTLE_DELAY_MS,
  parseGroundTruthCsv,
  parseBaselineJson,
  buildResultRow,
  computeBenchmarkSummary,
  formatSummaryCsv,
  formatSummaryConsoleReport,
  resolveThrottleDelayMs,
} from './lib/t5BenchmarkUtils.js';

const require = createRequire(import.meta.url);
const pdfParse = require('pdf-parse');

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '../..');
const DEFAULT_PDF_DIR = path.join(REPO_ROOT, 'api/test-data/t5-benchmark/pdfs');
const DEFAULT_GROUND_TRUTH = path.join(REPO_ROOT, 'api/test-data/t5-benchmark/ground_truth.csv');
const DEFAULT_BASELINE = path.join(REPO_ROOT, 'api/test-data/t5-benchmark/catalyst-baseline.json');
const DEFAULT_RESULTS_DIR = path.join(REPO_ROOT, 'qa-evidence/t5-benchmark');

function printHelp() {
  console.log(`
CiteWise T5 Source-Selection Accuracy Batch Benchmark Runner
Usage: node api/scripts/run-t5-benchmark.js [options]

Options:
  --pdf-dir <dir>         Directory containing PDF files (default: api/test-data/t5-benchmark/pdfs)
  --pdfs <list>           Optional comma-separated list of PDF paths or filenames to evaluate
  --ground-truth <path>   CSV with filename,expected_label (default: api/test-data/t5-benchmark/ground_truth.csv)
  --baseline <path>       CATalyst JSON { title, rationale, gaps } (default: api/test-data/t5-benchmark/catalyst-baseline.json)
  --output-csv <path>     Output summary CSV path (default: qa-evidence/t5-benchmark/t5-benchmark-<timestamp>.csv)
  --delay-ms <ms>         Throttle delay between AI requests in ms (default: ${DEFAULT_THROTTLE_DELAY_MS}; min safe: 15000)
  --allow-fast            Allow --delay-ms < 15000 when running > 10 papers (not recommended on rate-limited endpoints)
  --retry-429 <n>         Max retries per document on HTTP 429 with 65s cooldown (default: 1)
  --with-metadata         Keep CITEWISE_N8N_METADATA_WEBHOOK_URL enabled during benchmark (disabled by default to avoid doubling AI calls)
  --limit <n>             Evaluate at most N papers from ground_truth.csv
  --offset <n>            Skip the first N papers in ground_truth.csv (default: 0)
  --session-id <uuid>     Override generated CiteWise benchmark session UUID
  --dry-run               Validate baseline, ground truth, and local PDF extraction without calling n8n or Supabase
  --help, -h              Show this help message
`);
}

export function parseCliArgs(argv) {
  const flag = (name) => argv.includes(name);
  const option = (name) => {
    const eqPrefix = `${name}=`;
    const eqArg = argv.find((a) => a.startsWith(eqPrefix));
    if (eqArg !== undefined) {
      const val = eqArg.slice(eqPrefix.length);
      if (!val) throw new Error(`Missing value for option "${name}".`);
      return val;
    }
    const idx = argv.indexOf(name);
    if (idx === -1) return null;
    if (idx + 1 >= argv.length || argv[idx + 1].startsWith('--')) {
      throw new Error(`Missing value for option "${name}".`);
    }
    return argv[idx + 1];
  };

  const parseIntOpt = (name, min, defaultVal = null) => {
    const raw = option(name);
    if (raw === null) return defaultVal;
    const n = Number(raw);
    if (!Number.isInteger(n) || n < min) {
      throw new Error(`Invalid ${name} value "${raw}". Expected an integer >= ${min}.`);
    }
    return n;
  };

  const pdfsRaw = option('--pdfs');
  const pdfList = pdfsRaw
    ? pdfsRaw
        .split(',')
        .map((p) => p.trim())
        .filter(Boolean)
    : null;

  return {
    help: flag('--help') || flag('-h'),
    dryRun: flag('--dry-run'),
    allowFast: flag('--allow-fast'),
    withMetadata: flag('--with-metadata'),
    pdfDir: path.resolve(option('--pdf-dir') || DEFAULT_PDF_DIR),
    pdfList,
    groundTruthPath: path.resolve(option('--ground-truth') || DEFAULT_GROUND_TRUTH),
    baselinePath: path.resolve(option('--baseline') || DEFAULT_BASELINE),
    outputCsvPath: option('--output-csv')
      ? path.resolve(option('--output-csv'))
      : path.join(DEFAULT_RESULTS_DIR, `t5-benchmark-${new Date().toISOString().replace(/[:.]/g, '-')}.csv`),
    rawDelayMs: option('--delay-ms'),
    retry429: parseIntOpt('--retry-429', 0, 1),
    limit: parseIntOpt('--limit', 1, null),
    offset: parseIntOpt('--offset', 0, 0),
    sessionId: option('--session-id') || null,
  };
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function looksLikePdfBuffer(buffer) {
  return Buffer.isBuffer(buffer) && buffer.length >= 5 && buffer.subarray(0, 5).toString('latin1') === '%PDF-';
}

function parseJsonSafe(raw, fallback = []) {
  if (!raw) return fallback;
  if (typeof raw !== 'string') return raw;
  try {
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

async function persistValidationLogs(supabase, testRunId, sessionId, baseline, summary, outputCsvPath) {
  const { t3Extraction, t4Latency, t5StrictBinary, t5Score60, t5Score70, needsReviewBreakdown } = summary;
  const rows = [
    {
      test_run_id: testRunId,
      metric_name: 'T5 Source-Selection Accuracy (Strict Binary)',
      expected_target: '>= 80%',
      actual_result: `${t5StrictBinary.accuracyPct}% (${t5StrictBinary.correct}/${t5StrictBinary.total})`,
      raw_data_json: {
        sessionId,
        baselineTitle: baseline.project_title,
        mapping: 'Recommended=Relevant; Needs Review & Low Relevance=Not Relevant',
        ...t5StrictBinary,
        outputCsvPath,
      },
    },
    {
      test_run_id: testRunId,
      metric_name: 'T5 Source-Selection Accuracy (Score >= 60)',
      expected_target: '>= 80% (sensitivity)',
      actual_result: `${t5Score60.accuracyPct}% (${t5Score60.correct}/${t5Score60.total})`,
      raw_data_json: { sessionId, threshold: 60, ...t5Score60 },
    },
    {
      test_run_id: testRunId,
      metric_name: 'T5 Source-Selection Accuracy (Score >= 70)',
      expected_target: '>= 80% (sensitivity)',
      actual_result: `${t5Score70.accuracyPct}% (${t5Score70.correct}/${t5Score70.total})`,
      raw_data_json: { sessionId, threshold: 70, ...t5Score70 },
    },
    {
      test_run_id: testRunId,
      metric_name: 'T5 Needs Review Breakdown',
      expected_target: 'Diagnostic',
      actual_result: `${needsReviewBreakdown.totalNeedsReview}/${summary.totalPapers} (${needsReviewBreakdown.pctOfTotal}%)`,
      raw_data_json: { sessionId, ...needsReviewBreakdown },
    },
    {
      test_run_id: testRunId,
      metric_name: 'T3 PDF Text Extraction Rate',
      expected_target: '100%',
      actual_result: `${t3Extraction.extractionRatePct}% (${t3Extraction.extracted}/${t3Extraction.total})`,
      raw_data_json: { sessionId, ...t3Extraction },
    },
    {
      test_run_id: testRunId,
      metric_name: 'T4 AI Assessment Latency (Mean / p95 / <=15s)',
      expected_target: '<= 15s (SRS) / < 30s (operational)',
      actual_result:
        t4Latency.meanAssessmentSeconds != null
          ? `mean=${t4Latency.meanAssessmentSeconds}s, p95=${t4Latency.p95AssessmentSeconds ?? 'N/A'}s, within15s=${t4Latency.within15sPct ?? 0}% (aiMean=${t4Latency.meanAiSeconds ?? 'N/A'}s)`
          : (t4Latency.meanAiSeconds != null ? `${t4Latency.meanAiSeconds}s` : 'N/A'),
      raw_data_json: { sessionId, claimColumn: 'assessment_ms', ...t4Latency },
    },
  ];

  const { error } = await supabase.from('mvp_validation_logs').insert(rows);
  if (error) {
    console.warn(
      `[DB Warning] Could not insert into mvp_validation_logs: ${error.message}` +
        (/schema cache|does not exist|relation/i.test(error.message)
          ? ' (Apply supabase/migrations/mvp_validation_logs.sql in Supabase to enable validation log persistence.)'
          : '')
    );
    return false;
  }
  console.log(`Persisted ${rows.length} validation log rows to Supabase mvp_validation_logs (test_run_id=${testRunId}).`);
  return true;
}

async function persistBaseline(supabase, sessionId, baseline) {
  const row = {
    session_id: sessionId,
    catalyst_workspace_id: `t5-bench-${Date.now()}`,
    project_title: baseline.project_title,
    rationale: baseline.rationale,
    research_gaps: baseline.research_gaps,
    source_system: 'CATalyst',
  };

  if (typeof supabase.from('research_baselines').upsert === 'function') {
    const { error: upsertErr } = await supabase
      .from('research_baselines')
      .upsert(row, { onConflict: 'session_id' });
    if (!upsertErr) return;

    const { data: existing } = await supabase
      .from('research_baselines')
      .select('session_id')
      .eq('session_id', sessionId)
      .maybeSingle();

    if (existing) {
      const { error: updateErr } = await supabase
        .from('research_baselines')
        .update(row)
        .eq('session_id', sessionId);
      if (updateErr) throw new Error(`Failed to update research_baselines row: ${updateErr.message}`);
      return;
    }
  }

  const { error: insertErr } = await supabase.from('research_baselines').insert(row);
  if (insertErr) {
    throw new Error(`Failed to persist research_baselines row: ${insertErr.message}`);
  }
}

export async function runT5Benchmark(cliOpts, deps = {}) {
  const { extractPdfPages } = await import('../src/modules/citewise/helpers/pageText.js');

  if (!fs.existsSync(cliOpts.baselinePath)) {
    throw new Error(`Baseline JSON file not found: ${cliOpts.baselinePath}`);
  }
  if (!fs.existsSync(cliOpts.groundTruthPath)) {
    throw new Error(`Ground truth CSV file not found: ${cliOpts.groundTruthPath}`);
  }
  if (!cliOpts.pdfList?.length && !fs.existsSync(cliOpts.pdfDir)) {
    throw new Error(`PDF directory not found: ${cliOpts.pdfDir}`);
  }

  const baseline = parseBaselineJson(fs.readFileSync(cliOpts.baselinePath, 'utf8'));
  const allEntries = parseGroundTruthCsv(fs.readFileSync(cliOpts.groundTruthPath, 'utf8'));

  let selectedEntries = allEntries;
  const pdfPathByFilename = new Map();
  if (cliOpts.pdfList?.length) {
    const requestedByBase = new Map();
    for (const rawItem of cliOpts.pdfList) {
      const resolved = path.isAbsolute(rawItem)
        ? rawItem
        : fs.existsSync(path.resolve(rawItem))
          ? path.resolve(rawItem)
          : path.join(cliOpts.pdfDir, rawItem);
      requestedByBase.set(path.basename(resolved), resolved);
    }
    selectedEntries = allEntries.filter((e) => requestedByBase.has(path.basename(e.filename)));
    for (const e of selectedEntries) {
      pdfPathByFilename.set(e.filename, requestedByBase.get(path.basename(e.filename)));
    }
    if (selectedEntries.length === 0) {
      throw new Error('None of the PDFs specified via --pdfs matched entries in ground_truth.csv.');
    }
  }

  const offset = cliOpts.offset ?? 0;
  const slicedEntries = cliOpts.limit
    ? selectedEntries.slice(offset, offset + cliOpts.limit)
    : selectedEntries.slice(offset);

  if (slicedEntries.length === 0) {
    throw new Error('No benchmark entries remain after applying --offset / --limit.');
  }

  const resolvePdfPath = (filename) => pdfPathByFilename.get(filename) ?? path.join(cliOpts.pdfDir, filename);
  const delayMs = resolveThrottleDelayMs(cliOpts.rawDelayMs, slicedEntries.length, cliOpts.allowFast);

  // Verify every PDF referenced in ground_truth.csv exists before burning AI quota
  const missingFiles = slicedEntries
    .map((e) => e.filename)
    .filter((f) => !fs.existsSync(resolvePdfPath(f)));
  if (missingFiles.length > 0) {
    throw new Error(
      `Missing ${missingFiles.length} PDF file(s) in ${cliOpts.pdfDir}: ${missingFiles.slice(0, 5).join(', ')}` +
        (missingFiles.length > 5 ? ` ... (+${missingFiles.length - 5} more)` : '')
    );
  }

  const sessionId = cliOpts.sessionId || crypto.randomUUID();
  const testRunId = crypto.randomUUID();
  const estMinutes = (((slicedEntries.length - 1) * (delayMs / 1000) + slicedEntries.length * 5) / 60).toFixed(1);

  console.log('\n=== CiteWise General Objective 2 — T5 Batch Benchmark Runner ===');
  console.log(`Mode             : ${cliOpts.dryRun ? 'DRY RUN (offline PDF & config validation only)' : 'LIVE (PDF + n8n + Supabase DB)'}`);
  console.log(`Baseline Title   : ${baseline.project_title}`);
  console.log(`Baseline Gaps    : ${baseline.research_gaps.length}`);
  console.log(`PDF Source       : ${cliOpts.pdfList?.length ? `--pdfs (${slicedEntries.length} explicit files)` : cliOpts.pdfDir}`);
  console.log(`Ground Truth CSV : ${cliOpts.groundTruthPath} (${slicedEntries.length} papers)`);
  console.log(`Throttle Delay   : ${delayMs} ms (${(delayMs / 1000).toFixed(1)}s between AI requests)`);
  if (!cliOpts.dryRun) {
    console.log(`Session ID       : ${sessionId}`);
    console.log(`Test Run ID      : ${testRunId}`);
    console.log(`Est. Duration    : ~${estMinutes} min`);
  }
  console.log(`Output CSV       : ${cliOpts.outputCsvPath}\n`);

  if (cliOpts.dryRun) {
    const dryRows = [];
    for (let i = 0; i < slicedEntries.length; i++) {
      const entry = slicedEntries[i];
      const filePath = resolvePdfPath(entry.filename);
      const buffer = fs.readFileSync(filePath);
      const t0 = Date.now();
      let extraction = { text: '', pageCount: null };
      let extractedTextStatus = 'FAILED';
      let errMsg = null;

      if (looksLikePdfBuffer(buffer)) {
        try {
          extraction = await extractPdfPages(pdfParse, buffer);
          extractedTextStatus = extraction.text?.trim() ? 'EXTRACTED' : 'EMPTY';
        } catch (err) {
          errMsg = err.message;
        }
      } else {
        errMsg = 'Invalid PDF signature';
      }

      const extractionMs = Date.now() - t0;
      dryRows.push(
        buildResultRow({
          filename: entry.filename,
          expectedLabel: entry.expectedLabel,
          extractedTextStatus,
          pageCount: extraction.pageCount,
          characterCount: extraction.text?.trim().length ?? 0,
          extractionMs,
          classification: 'DRY_RUN',
          errorMessage: errMsg,
        })
      );
      console.log(
        `[DryRun ${i + 1}/${slicedEntries.length}] ${entry.filename} | label=${entry.expectedLabel} | T3=${extractedTextStatus} (${extraction.pageCount ?? '?'}p, ${extraction.text?.trim().length ?? 0} chars, ${extractionMs}ms)`
      );
    }
    const extractedOk = dryRows.filter((r) => r.extractedTextStatus === 'EXTRACTED').length;
    console.log(`\nDry run complete: ${extractedOk}/${dryRows.length} PDFs extracted cleanly. Ready for live execution.`);
    return { dryRun: true, rows: dryRows };
  }

  // Prevent scoringPipeline from firing an unthrottled second AI metadata webhook per document
  // unless --with-metadata is explicitly enabled.
  const prevMetadataWebhook = process.env.CITEWISE_N8N_METADATA_WEBHOOK_URL;
  if (!cliOpts.withMetadata && prevMetadataWebhook) {
    delete process.env.CITEWISE_N8N_METADATA_WEBHOOK_URL;
    console.log('[Rate-Limit Guard] Disabled CITEWISE_N8N_METADATA_WEBHOOK_URL during benchmark to prevent double AI requests per PDF.');
  }

  // Live dependencies (imported after dry-run check so offline/help never requires Supabase env vars)
  const supabase = deps.supabase ?? (await import('../src/common/config/supabaseClient.js')).default;
  const { scoringPipeline } = deps.scoringPipeline
    ? { scoringPipeline: deps.scoringPipeline }
    : await import('../src/modules/citewise/rrl.routes.js');
  const { updateDocumentFields } = deps.updateDocumentFields
    ? { updateDocumentFields: deps.updateDocumentFields }
    : await import('../src/modules/citewise/helpers/documentPages.js');
  const { uploadTextToR2, isR2Configured } = deps.r2
    ? deps.r2
    : await import('../src/common/config/r2Client.js');

  const max429Retries = cliOpts.retry429 ?? 1;
  const retry429CooldownMs = deps.retry429CooldownMs ?? 65000;

  // Ensure output directory exists and create/upsert baseline in Supabase
  fs.mkdirSync(path.dirname(cliOpts.outputCsvPath), { recursive: true });
  await persistBaseline(supabase, sessionId, baseline);
  console.log(`Persisted CATalyst baseline to Supabase research_baselines (session_id=${sessionId}).\n`);

  const results = [];
  let interrupted = false;

  const flushOutputs = (finalRun = false) => {
    if (!results.length) return null;
    const summary = computeBenchmarkSummary(results);
    const csvText = formatSummaryCsv(results, summary);
    fs.writeFileSync(cliOpts.outputCsvPath, csvText, 'utf8');
    if (finalRun) {
      const jsonPath = cliOpts.outputCsvPath.replace(/\.csv$/i, '.json');
      fs.writeFileSync(jsonPath, JSON.stringify({ testRunId, sessionId, baseline, summary, results }, null, 2) + '\n', 'utf8');
    }
    return summary;
  };

  const onSigint = () => {
    interrupted = true;
    console.warn('\n[SIGINT] Interrupted! Flushing partial benchmark results to CSV...');
    flushOutputs(true);
    process.exit(130);
  };
  process.once('SIGINT', onSigint);

  try {
    for (let i = 0; i < slicedEntries.length; i++) {
      if (interrupted) break;
      const entry = slicedEntries[i];
      const filePath = resolvePdfPath(entry.filename);
      const buffer = fs.readFileSync(filePath);
      const hash = crypto.createHash('sha256').update(buffer).digest('hex');

      console.log(`------------------------------------------------------------------------`);
      console.log(`[${i + 1}/${slicedEntries.length}] ${entry.filename} | Expected: ${entry.expectedLabel}`);

      // 1. T3: PDF text extraction via backend extractPdfPages
      const extractStart = Date.now();
      let extraction = { text: '', pageOffsets: null, pageCount: null };
      let extractedTextStatus = 'FAILED';
      let extractionError = null;

      if (!looksLikePdfBuffer(buffer)) {
        extractionError = 'Invalid PDF header (missing %PDF-)';
      } else {
        try {
          extraction = await extractPdfPages(pdfParse, buffer);
          extractedTextStatus = extraction.text?.trim() ? 'EXTRACTED' : 'EMPTY';
        } catch (err) {
          extractionError = err.message;
        }
      }
      const extractionMs = Date.now() - extractStart;
      const charCount = extraction.text?.trim().length ?? 0;
      console.log(`  T3 Extract : ${extractedTextStatus} (${extraction.pageCount ?? '?'} pages, ${charCount} chars, ${extractionMs} ms)`);

      // 2. Upload full extracted text to R2 if configured, else keep full text inline in parsed_text
      let r2TextKey = null;
      if (extractedTextStatus === 'EXTRACTED' && isR2Configured) {
        const candidateKey = `text/${sessionId}/${hash}.md`;
        try {
          const r2Res = await uploadTextToR2(extraction.text, candidateKey);
          if (r2Res?.success) r2TextKey = candidateKey;
        } catch (r2Err) {
          console.warn(`  [R2 Warning] Falling back to inline parsed_text: ${r2Err.message}`);
        }
      }

      // 3. Insert uploaded_documents row
      const { data: docRow, error: insertDocErr } = await supabase
        .from('uploaded_documents')
        .insert({
          session_id: sessionId,
          file_name: entry.filename,
          file_hash: `${hash}-${testRunId.slice(0, 8)}-${i}`,
          size_bytes: buffer.length,
          character_count: charCount,
          uploaded_at: new Date().toISOString(),
          parsed_text: r2TextKey ? extraction.text.slice(0, 4000) : extraction.text,
          r2_text_key: r2TextKey,
          approved: false,
          scoring_status: 'PENDING',
        })
        .select()
        .single();

      if (insertDocErr || !docRow) {
        throw new Error(`Failed to insert uploaded_documents for ${entry.filename}: ${insertDocErr?.message}`);
      }

      await updateDocumentFields(
        docRow.id,
        {
          page_count: extraction.pageCount,
          page_offsets_json: extraction.pageOffsets,
          extraction_method: 'local',
          extraction_ms: extractionMs,
        },
        't5-benchmark'
      );

      // 4. Execute real RRL Rubric Engine (scoringPipeline -> n8n -> parseAIResponse -> DB) with bounded 429 retry
      let scoreWallSec = null;
      let savedDoc = null;
      let insightRows = null;
      let timingRows = null;

      for (let attempt = 0; attempt <= max429Retries; attempt++) {
        const scoreWallStart = Date.now();
        await scoringPipeline(docRow.id, sessionId);
        scoreWallSec = Number(((Date.now() - scoreWallStart) / 1000).toFixed(2));

        // 5. Read back persisted DB state as authoritative proof
        const [docRes, insRes, timRes] = await Promise.all([
          supabase.from('uploaded_documents').select('*').eq('id', docRow.id).single(),
          supabase.from('document_insights').select('*').eq('document_id', docRow.id).order('id', { ascending: false }).limit(1),
          supabase.from('assessment_timings').select('*').eq('document_id', docRow.id).order('id', { ascending: false }).limit(1),
        ]);
        savedDoc = docRes.data;
        insightRows = insRes.data;
        timingRows = timRes.data;

        const hit429 =
          savedDoc?.scoring_status === 'FAILED' &&
          /(?:429|too many requests|rate limit)/i.test(String(savedDoc?.scoring_error_message ?? ''));
        if (hit429 && attempt < max429Retries) {
          console.warn(
            `  [429 Retry] Rate limit detected for ${entry.filename}. Cooling down ${(retry429CooldownMs / 1000).toFixed(1)}s before retry ${attempt + 1}/${max429Retries}...`
          );
          if (retry429CooldownMs > 0) await sleep(retry429CooldownMs);
          await supabase
            .from('uploaded_documents')
            .update({ scoring_status: 'PENDING', scoring_error_message: null })
            .eq('id', docRow.id);
          continue;
        }
        break;
      }

      const insight = insightRows?.[0] ?? null;
      const timing = timingRows?.[0] ?? null;
      const scoringComplete = savedDoc?.scoring_status === 'COMPLETE' || Boolean(insight);

      const aiLatencySeconds =
        timing?.ai_ms != null
          ? Number((timing.ai_ms / 1000).toFixed(2))
          : extractedTextStatus === 'EXTRACTED' && scoringComplete
            ? scoreWallSec
            : null;

      const assessmentDurationSeconds =
        savedDoc?.assessment_duration_seconds != null
          ? Number(savedDoc.assessment_duration_seconds)
          : timing?.assessment_duration_seconds != null
            ? Number(timing.assessment_duration_seconds)
            : scoringComplete
              ? scoreWallSec
              : null;

      const row = buildResultRow({
        filename: entry.filename,
        expectedLabel: entry.expectedLabel,
        extractedTextStatus,
        scoringStatus: savedDoc?.scoring_status ?? (insight ? 'COMPLETE' : 'FAILED'),
        pageCount: savedDoc?.page_count ?? extraction.pageCount,
        characterCount: charCount,
        extractionMs,
        aiLatencySeconds,
        assessmentDurationSeconds,
        gapAlignmentScore: insight?.gap_alignment_score ?? null,
        methodologyScore: insight?.methodology_score ?? null,
        theoreticalScore: insight?.theoretical_score ?? null,
        citationScore: insight?.citation_score ?? null,
        finalRubricScore: insight?.overall_score ?? null,
        classification: insight?.recommendation_status ?? savedDoc?.scoring_status ?? 'FAILED',
        confidenceLevel: insight?.confidence_level ?? null,
        relevanceLevel: insight?.relevance_level ?? null,
        mismatchFlags: parseJsonSafe(insight?.mismatch_flags_json, []),
        weaknessFlags: parseJsonSafe(insight?.weakness_flags_json, []),
        validationFlags: parseJsonSafe(insight?.validation_flags_json, []),
        documentId: docRow.id,
        errorMessage: extractionError || savedDoc?.scoring_error_message || null,
      });

      results.push(row);
      flushOutputs(false);

      console.log(
        `  T4 Latency : AI=${row.aiLatencySeconds ?? 'N/A'}s (total=${row.assessmentDurationSeconds ?? 'N/A'}s)`
      );
      console.log(
        `  T5 Rubric  : Overall=${row.finalRubricScore ?? 'N/A'} (G=${row.gapAlignmentScore ?? '-'}, M=${row.methodologyScore ?? '-'}, T=${row.theoreticalScore ?? '-'}, C=${row.citationScore ?? '-'})`
      );
      console.log(
        `  Verdict    : ${row.classification} -> StrictBinary=${row.predictedBinaryStrict} (${row.correctStrict ? 'MATCH' : 'MISS'})`
      );

      // 6. Rate-limit throttling delay (15–16s default) before next AI request
      if (i < slicedEntries.length - 1 && delayMs > 0 && extractedTextStatus === 'EXTRACTED') {
        console.log(`  [Throttle] Waiting ${(delayMs / 1000).toFixed(1)}s before next AI request (<= 40 req / 10 min limit)...`);
        await sleep(delayMs);
      }
    }
  } finally {
    process.removeListener('SIGINT', onSigint);
    if (!cliOpts.withMetadata && prevMetadataWebhook !== undefined) {
      process.env.CITEWISE_N8N_METADATA_WEBHOOK_URL = prevMetadataWebhook;
    }
  }

  const summary = flushOutputs(true);
  console.log(formatSummaryConsoleReport(summary));
  console.log(`Summary CSV saved  : ${cliOpts.outputCsvPath}`);
  console.log(`Summary JSON saved : ${cliOpts.outputCsvPath.replace(/\.csv$/i, '.json')}`);

  await persistValidationLogs(supabase, testRunId, sessionId, baseline, summary, cliOpts.outputCsvPath);

  return { dryRun: false, testRunId, sessionId, summary, results };
}

const invokedDirectly = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (invokedDirectly) {
  let cliOpts;
  try {
    cliOpts = parseCliArgs(process.argv.slice(2));
  } catch (err) {
    console.error(`\n[FATAL] Invalid CLI arguments: ${err.message}`);
    process.exit(1);
  }
  if (cliOpts.help) {
    printHelp();
    process.exit(0);
  }
  runT5Benchmark(cliOpts)
    .then(() => process.exit(0))
    .catch((err) => {
      console.error(`\n[FATAL] T5 Benchmark failed: ${err.message}`);
      process.exit(1);
    });
}
