import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';
import supabase from '../src/common/config/supabaseClient.js';
import { extractPdfPages } from '../src/modules/citewise/helpers/pageText.js';
import { updateDocumentFields } from '../src/modules/citewise/helpers/documentPages.js';
import { scoringPipeline } from '../src/modules/citewise/rrl.routes.js';

const require = createRequire(import.meta.url);
const pdfParse = require('pdf-parse');

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PAPERS_DIR = path.resolve(__dirname, '../../test-papers');

const PAPERS = [
  { fileName: '01_citewise_3pages_literature_chat.pdf', expectedPages: 3 },
  { fileName: '02_citewise_5pages_chatgpt_assistant.pdf', expectedPages: 5 },
  { fileName: '03_citewise_8pages_self_rag.pdf', expectedPages: 8 },
  { fileName: '04_citewise_13pages_flare_active_rag.pdf', expectedPages: 13 },
  { fileName: '05_citewise_21pages_rag_comprehensive_survey.pdf', expectedPages: 21 },
];

async function runBenchmark() {
  const sessionId = crypto.randomUUID();
  console.log(`\n=== Starting CiteWise Assessment Baseline Benchmark ===`);
  console.log(`Session ID: ${sessionId}`);

  // 1. Setup CATalyst Research Baseline in DB
  const baseline = {
    session_id: sessionId,
    catalyst_workspace_id: `ws-${Date.now()}`,
    project_title: 'Retrieval-Augmented Generation for Knowledge-Intensive NLP Tasks',
    rationale: 'Pre-trained language models lack provenance and hallucinate, requiring hybrid parametric and non-parametric retrieval to expand and verify factual memory.',
    research_gaps: [
      'Pre-trained language models have a limited ability to access and manipulate the factual knowledge stored in their parameters.',
      'The static nature of pre-trained language models prevents them from easily expanding or revising their internal memory to incorporate new information.',
      'Outputs from large language models often lack provenance and are prone to hallucination, making it difficult to verify their factual accuracy.',
    ],
    source_system: 'CATalyst',
  };

  const { error: bErr } = await supabase.from('research_baselines').insert(baseline);
  if (bErr) throw new Error(`Failed to create baseline: ${bErr.message}`);
  console.log('✓ CATalyst Research Baseline established in DB.\n');

  const benchmarkResults = [];

  // 2. Assess each of the 5 papers sequentially to get clean, isolated timings
  for (let i = 0; i < PAPERS.length; i++) {
    const { fileName } = PAPERS[i];
    const filePath = path.join(PAPERS_DIR, fileName);
    if (!fs.existsSync(filePath)) {
      console.error(`Missing file: ${filePath}`);
      continue;
    }

    const buffer = fs.readFileSync(filePath);
    console.log(`------------------------------------------------------------`);
    console.log(`[${i + 1}/${PAPERS.length}] Processing ${fileName} (${Math.round(buffer.length / 1024)} KB)...`);

    // A. Local extraction
    const extractStart = Date.now();
    const extraction = await extractPdfPages(pdfParse, buffer);
    const extractionMs = Date.now() - extractStart;
    console.log(`  → Extracted ${extraction.pageCount} pages, ${extraction.text.length} chars in ${extractionMs} ms`);

    // B. Insert into uploaded_documents
    const { data: doc, error: docErr } = await supabase
      .from('uploaded_documents')
      .insert({
        session_id: sessionId,
        file_name: fileName,
        file_hash: `bench-${Date.now()}-${i}`,
        size_bytes: buffer.length,
        character_count: extraction.text.length,
        uploaded_at: new Date().toISOString(),
        parsed_text: extraction.text.slice(0, 4000),
        scoring_status: 'PENDING',
      })
      .select()
      .single();

    if (docErr) throw new Error(`Insert failed: ${docErr.message}`);

    // C. Save page_count and offsets
    await updateDocumentFields(doc.id, {
      page_count: extraction.pageCount,
      page_offsets_json: extraction.pageOffsets,
      extraction_method: 'local',
      extraction_ms: extractionMs,
    }, 'upload');

    // D. Run scoring pipeline (AI assessment from receiving to finishing)
    console.log(`  → Running scoringPipeline for doc ID ${doc.id}...`);
    const assessmentStart = Date.now();
    await scoringPipeline(doc.id, sessionId);
    const measuredAssessmentMs = Date.now() - assessmentStart;
    const measuredAssessmentSec = Number((measuredAssessmentMs / 1000).toFixed(2));

    // E. Verify saved state from DB
    const { data: savedDoc, error: fetchErr } = await supabase
      .from('uploaded_documents')
      .select('*')
      .eq('id', doc.id)
      .single();

    if (fetchErr) throw new Error(`Fetch failed: ${fetchErr.message}`);

    const savedSeconds = savedDoc.assessment_duration_seconds != null
      ? Number(savedDoc.assessment_duration_seconds)
      : (savedDoc.scoring_duration_ms != null ? Number((savedDoc.scoring_duration_ms / 1000).toFixed(2)) : measuredAssessmentSec);

    const fitsTarget = savedSeconds <= 30.0;

    console.log(`  ✓ Assessment Finished: Status=${savedDoc.scoring_status}`);
    console.log(`  ✓ Recorded in DB: page_count=${savedDoc.page_count}, duration=${savedSeconds}s (${savedDoc.scoring_duration_ms}ms)`);
    console.log(`  ✓ Fits 30s Target: ${fitsTarget ? 'YES ✅' : 'NO (exceeded) ⏱️'}`);

    benchmarkResults.push({
      file: fileName,
      pages: savedDoc.page_count,
      extractionMs: savedDoc.extraction_ms ?? extractionMs,
      assessmentSec: savedSeconds,
      status: savedDoc.scoring_status,
      fits30s: fitsTarget ? 'YES' : 'NO',
    });
  }

  console.log(`\n============================================================`);
  console.log(`=== Assessment Benchmark Results vs 30-Second Target ===`);
  console.log(`============================================================`);
  console.table(benchmarkResults);

  return benchmarkResults;
}

runBenchmark()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Benchmark failed:', err);
    process.exit(1);
  });
