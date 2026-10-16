// Measures how assessment time grows with page count.
//
//   node scripts/benchmark-assessment.js                 local work on generated PDFs
//   node scripts/benchmark-assessment.js --verify        also check page offsets against real pdf-parse
//   node scripts/benchmark-assessment.js --pdf-dir DIR   use real PDFs instead of generated ones
//   node scripts/benchmark-assessment.js --score         also time the n8n scoring webhook
//                                                        (CITEWISE_N8N_SCORING_WEBHOOK_URL; uses AI quota)
//   node scripts/benchmark-assessment.js --pages 1,50    only these generated page counts
//
// Local work = text extraction + the per-assessment CPU work in the API
// (chunk selection, quote search index). The AI call is roughly constant per
// document because its input is capped at CITEWISE_SCORING_MAX_CHARS_TO_N8N.

import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { createRequire } from 'module';
import fetch from 'node-fetch';
import { makePdf, samplePages } from './lib/makePdf.js';
import { extractPdfPages, buildSearchIndex, pageForOffset } from '../src/modules/citewise/helpers/pageText.js';
import { selectRelevantChunks } from '../src/modules/citewise/helpers/chunking.js';

const require = createRequire(import.meta.url);
const pdfParse = require('pdf-parse');

const args = process.argv.slice(2);
const flag = (name) => args.includes(name);
const option = (name) => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : null; };

const TARGET_MS = 15000;
const PAGE_COUNTS = option('--pages')
  ? option('--pages').split(',').map(Number).filter((n) => n > 0)
  : [1, 5, 10, 20, 30, 50, 75, 100, 150, 200, 300];
const BASELINE = {
  project_title: 'Citation-aware retrieval augmented generation for academic literature synthesis',
  rationale: 'Students rely on AI tools that hallucinate references; traceable evidence is needed.',
  research_gaps: ['Lack of source traceability in AI-generated literature reviews'],
};

const median = (xs) => [...xs].sort((a, b) => a - b)[Math.floor(xs.length / 2)];

async function timeLocal(buffer) {
  const runs = [];
  let last;
  for (let i = 0; i < 3; i++) {
    const t0 = performance.now();
    const ex = await extractPdfPages(pdfParse, buffer);
    const t1 = performance.now();
    selectRelevantChunks(ex.text, BASELINE, { maxChars: 9000, maxChunks: 6, pageOffsets: ex.pageOffsets });
    buildSearchIndex(ex.text);
    const t2 = performance.now();
    runs.push({ extract: t1 - t0, assess: t2 - t1 });
    last = ex;
  }
  return {
    pages: last.pageCount,
    chars: last.text.length,
    extractMs: Math.round(median(runs.map((r) => r.extract))),
    assessCpuMs: Math.round(median(runs.map((r) => r.assess))),
    extraction: last,
  };
}

async function verify(pages, buffer) {
  const plain = await pdfParse(buffer);
  const paged = await extractPdfPages(pdfParse, buffer);
  if (paged.text !== plain.text) throw new Error(`${pages.length}-page PDF: text differs from pdf-parse`);
  if (!paged.pageOffsets) throw new Error(`${pages.length}-page PDF: no page offsets`);
  pages.forEach((lines, i) => {
    const at = paged.text.indexOf(lines[lines.length - 1]);
    const got = pageForOffset(paged.pageOffsets, at);
    if (got !== i + 1) throw new Error(`${pages.length}-page PDF: line of page ${i + 1} mapped to page ${got}`);
  });
}

async function timeScoring(text, pageOffsets) {
  const url = process.env.CITEWISE_N8N_SCORING_WEBHOOK_URL;
  if (!url) throw new Error('CITEWISE_N8N_SCORING_WEBHOOK_URL is not set');
  const selected = selectRelevantChunks(text, BASELINE, { maxChars: 9000, maxChunks: 6, pageOffsets });
  const t0 = performance.now();
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      extracted_text: selected, text: selected,
      baseline: { title: BASELINE.project_title, rationale: BASELINE.rationale, researchGaps: BASELINE.research_gaps.join('; ') },
    }),
  });
  await res.text();
  if (!res.ok) throw new Error(`scoring webhook returned ${res.status}`);
  return Math.round(performance.now() - t0);
}

async function main() {
  const inputs = [];
  const dir = option('--pdf-dir');
  if (dir) {
    for (const f of fs.readdirSync(dir).filter((n) => n.toLowerCase().endsWith('.pdf'))) {
      inputs.push({ label: f, buffer: fs.readFileSync(path.join(dir, f)) });
    }
  } else {
    for (const n of PAGE_COUNTS) {
      const pages = samplePages(n);
      const buffer = makePdf(pages);
      if (flag('--verify')) await verify(pages, buffer);
      inputs.push({ label: `generated ${n}p`, buffer });
    }
    if (flag('--verify')) console.log(`verify: page offsets match real pdf-parse output for ${PAGE_COUNTS.length} PDFs\n`);
  }

  const rows = [];
  for (const input of inputs) {
    const r = await timeLocal(input.buffer);
    if (flag('--score')) r.aiMs = await timeScoring(r.extraction.text, r.extraction.pageOffsets);
    rows.push({ label: input.label, ...r });
  }

  console.log('source'.padEnd(28), 'pages'.padStart(6), 'chars'.padStart(9), 'extract'.padStart(9), 'cpu'.padStart(6), flag('--score') ? 'ai'.padStart(7) : '', 'ms/page'.padStart(8));
  for (const r of rows) {
    console.log(
      r.label.slice(0, 28).padEnd(28), String(r.pages).padStart(6), String(r.chars).padStart(9),
      String(r.extractMs).padStart(9), String(r.assessCpuMs).padStart(6),
      flag('--score') ? String(r.aiMs).padStart(7) : '',
      ((r.extractMs + r.assessCpuMs) / Math.max(1, r.pages)).toFixed(1).padStart(8),
    );
  }

  const perPage = median(rows.filter((r) => r.pages >= 20).map((r) => (r.extractMs + r.assessCpuMs) / r.pages));
  const ai = flag('--score') ? median(rows.map((r) => r.aiMs)) : null;
  console.log(`\nlocal work: ~${perPage?.toFixed(1)} ms per page`);
  if (ai != null) {
    console.log(`AI scoring call: ~${ai} ms per document (independent of page count)`);
    console.log(`=> pages that fit ${TARGET_MS / 1000}s (local + AI only): ~${Math.floor((TARGET_MS - ai) / perPage)}`);
  } else {
    console.log('Run with --score to include the AI call and compute the page threshold.');
  }
}

main().catch((err) => { console.error(err.message); process.exit(1); });
