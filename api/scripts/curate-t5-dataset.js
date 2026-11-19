/**
 * CiteWise General Objective 2 — T5 Benchmark Dataset Curation Script
 *
 * Assembles 30–40 labeled arXiv PDFs (~20 on-topic Retrieval-Augmented Generation,
 * citation provenance, and LLM literature synthesis papers vs. ~20 off-topic
 * astrophysics, quantitative biology, mathematics, and condensed-matter physics
 * papers), validates PDF integrity + text extractability via pdf-parse, and writes:
 *   - <outDir>/pdfs/*.pdf
 *   - <outDir>/ground_truth.csv       (filename, expected_label, arxiv_id, category, title)
 *   - <outDir>/catalyst-baseline.json (CATalyst sample input: title, rationale, gaps)
 *   - <outDir>/dataset-manifest.json  (audit metadata for every curated PDF)
 *
 * Usage:
 *   node api/scripts/curate-t5-dataset.js
 *   node api/scripts/curate-t5-dataset.js --on-topic 20 --off-topic 20 --skip-existing
 *   node api/scripts/curate-t5-dataset.js --dry-run
 */

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const pdfParse = require('pdf-parse');

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DEFAULT_OUT_DIR = path.resolve(__dirname, '../test-data/t5-benchmark');

function parseCliArgs(argv) {
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

  const parseCount = (name, defaultVal) => {
    const raw = option(name);
    if (raw === null) return defaultVal;
    const n = Number(raw);
    if (!Number.isInteger(n) || n < 0) {
      throw new Error(`Invalid ${name} value "${raw}". Expected a non-negative integer.`);
    }
    return n;
  };

  const onTopicTarget = parseCount('--on-topic', 20);
  const offTopicTarget = parseCount('--off-topic', 20);
  if (onTopicTarget + offTopicTarget === 0) {
    throw new Error('At least one of --on-topic or --off-topic must be > 0.');
  }

  const outDir = path.resolve(option('--out-dir') || DEFAULT_OUT_DIR);
  return {
    help: flag('--help') || flag('-h'),
    dryRun: flag('--dry-run'),
    skipExisting: flag('--skip-existing'),
    overwriteBaseline: flag('--overwrite-baseline'),
    outDir,
    pdfDir: path.join(outDir, 'pdfs'),
    groundTruthPath: path.join(outDir, 'ground_truth.csv'),
    baselinePath: path.join(outDir, 'catalyst-baseline.json'),
    manifestPath: path.join(outDir, 'dataset-manifest.json'),
    onTopicTarget,
    offTopicTarget,
  };
}

function printHelp() {
  console.log(`
CiteWise T5 Dataset Curation Script
Usage: node api/scripts/curate-t5-dataset.js [options]

Options:
  --out-dir <dir>         Output directory (default: api/test-data/t5-benchmark)
  --on-topic <n>          Number of Relevant papers to curate (default: 20)
  --off-topic <n>         Number of Not Relevant papers to curate (default: 20)
  --skip-existing         Reuse existing valid PDFs already in <out-dir>/pdfs
  --overwrite-baseline    Overwrite catalyst-baseline.json even if it already exists
  --dry-run               Print planned arXiv queries and output paths without downloading
  --help, -h              Show this help message
`);
}

const DEFAULT_BASELINE = {
  title: 'Citation-Aware Retrieval-Augmented Generation for Traceable Academic Literature Synthesis',
  rationale:
    'Students and researchers using large language models for literature reviews frequently encounter fabricated citations, unverified claims, and weak alignment to stated research gaps. Combining retrieval-augmented generation (RAG) with verifiable source grounding and structured rubric evaluation can improve provenance and source-selection reliability.',
  gaps: [
    'Large language models lack reliable source provenance and frequently hallucinate unsupported claims or citations during academic literature synthesis.',
    'Automated literature evaluation pipelines often lack transparent, multi-criterion rubric scoring and quote-level verification back to source pages.',
    'Existing RAG benchmarks rarely evaluate end-to-end citation faithfulness, gap alignment, and human-in-the-loop validation for scholarly synthesis.',
  ],
};

// Targeted on-topic queries focused on RAG, citation faithfulness, hallucination, and scholarly literature synthesis
const ON_TOPIC_QUERIES = [
  {
    name: 'rag-citation-provenance',
    query:
      '(ti:"retrieval-augmented" OR ti:"retrieval augmented" OR abs:"retrieval-augmented generation") AND (abs:"citation" OR abs:"provenance" OR abs:"attribution" OR abs:"faithfulness") AND (cat:cs.CL OR cat:cs.IR OR cat:cs.AI)',
    webQuery: '"retrieval-augmented generation" citation provenance attribution',
    maxResults: 35,
  },
  {
    name: 'rag-hallucination-literature',
    query:
      '(ti:"retrieval-augmented" OR ti:"retrieval augmented" OR abs:"retrieval-augmented generation") AND (abs:"hallucination" OR abs:"literature review" OR abs:"scientific literature" OR abs:"survey" OR abs:"factuality") AND (cat:cs.CL OR cat:cs.IR OR cat:cs.AI)',
    webQuery: '"retrieval-augmented generation" hallucination literature review',
    maxResults: 35,
  },
  {
    name: 'llm-literature-synthesis-citations',
    query:
      '(ti:"literature review" OR ti:"scientific synthesis" OR ti:"citation") AND (abs:"large language model" OR abs:"retrieval-augmented") AND (cat:cs.CL OR cat:cs.DL OR cat:cs.IR)',
    webQuery: '"literature review" "large language model" citation',
    maxResults: 25,
  },
];

// Clearly off-topic domain queries across physics, biology, and pure mathematics
const OFF_TOPIC_QUERIES = [
  { name: 'astrophysics', query: 'cat:astro-ph.GA', webQuery: 'galaxy redshift dark matter halo astrophysics', maxResults: 15 },
  { name: 'quant-biology', query: 'cat:q-bio.BM', webQuery: 'protein folding molecular dynamics membrane', maxResults: 15 },
  { name: 'number-theory', query: 'cat:math.NT', webQuery: 'prime numbers modular forms elliptic curve', maxResults: 15 },
  { name: 'condensed-matter', query: 'cat:cond-mat.mtrl-sci', webQuery: 'superconductivity crystal lattice phonon band', maxResults: 15 },
];

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const ON_TOPIC_KEYWORDS = [
  'retrieval-augmented',
  'retrieval augmented',
  'rag',
  'citation',
  'provenance',
  'hallucination',
  'literature review',
  'literature synthesis',
  'scientific literature',
  'attribution',
  'factuality',
  'grounding',
];

const OFF_TOPIC_EXCLUSIONS = [
  'retrieval-augmented',
  'retrieval augmented',
  'large language model',
  'citation',
  'literature review',
  /\brag\b/,
];

function decodeXmlEntities(str) {
  return String(str ?? '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'");
}

function sanitizeArxivId(idUrl) {
  const raw = String(idUrl ?? '').trim().split('/').pop() || '';
  return raw.replace(/v\d+$/i, '').replace(/[^a-zA-Z0-9._-]/g, '_');
}

export function parseArxivAtomXml(xml) {
  const entries = [];
  const entryRe = /<entry>([\s\S]*?)<\/entry>/g;
  let m;
  while ((m = entryRe.exec(xml)) !== null) {
    const block = m[1];
    const idMatch = block.match(/<id>([\s\S]*?)<\/id>/);
    const titleMatch = block.match(/<title>([\s\S]*?)<\/title>/);
    const summaryMatch = block.match(/<summary>([\s\S]*?)<\/summary>/);
    const catMatch = block.match(/<arxiv:primary_category[^>]*term="([^"]+)"/) || block.match(/<category[^>]*term="([^"]+)"/);
    const pdfMatch =
      block.match(/<link[^>]*title="pdf"[^>]*href="([^"]+)"/) ||
      block.match(/<link[^>]*href="([^"]+)"[^>]*title="pdf"/);

    if (!idMatch || !titleMatch) continue;
    const arxivId = sanitizeArxivId(idMatch[1]);
    if (!arxivId) continue;

    const pdfUrl = (pdfMatch ? pdfMatch[1] : `https://arxiv.org/pdf/${arxivId}.pdf`).replace(/^http:\/\//, 'https://');
    entries.push({
      arxivId,
      title: decodeXmlEntities(titleMatch[1]).replace(/\s+/g, ' ').trim(),
      abstract: summaryMatch ? decodeXmlEntities(summaryMatch[1]).replace(/\s+/g, ' ').trim() : '',
      category: catMatch ? catMatch[1] : 'unknown',
      pdfUrl: pdfUrl.endsWith('.pdf') ? pdfUrl : `${pdfUrl}.pdf`,
    });
  }
  return entries;
}

export function isRelevantCandidate(entry) {
  const hay = `${entry.title} ${entry.abstract}`.toLowerCase();
  const hasRagOrLiterature =
    hay.includes('retrieval-augmented') ||
    hay.includes('retrieval augmented') ||
    hay.includes('literature review') ||
    hay.includes('scientific synthesis') ||
    hay.includes('citation');
  const keywordHits = ON_TOPIC_KEYWORDS.filter((kw) => hay.includes(kw)).length;
  return hasRagOrLiterature && keywordHits >= 2;
}

export function isOffTopicCandidate(entry) {
  const hay = `${entry.title} ${entry.abstract}`.toLowerCase();
  const cat = String(entry.category || '').toLowerCase();
  if (cat.startsWith('cs.')) return false;
  return !OFF_TOPIC_EXCLUSIONS.some((rule) => (rule instanceof RegExp ? rule.test(hay) : hay.includes(rule)));
}

function stripHtml(html) {
  return decodeXmlEntities(String(html ?? '').replace(/<[^>]+>/g, ' '))
    .replace(/\s+/g, ' ')
    .trim();
}

export function parseArxivSearchHtml(html) {
  const entries = [];
  const blocks = String(html ?? '').split('<li class="arxiv-result">').slice(1);
  for (const block of blocks) {
    const absMatch = block.match(/href="https?:\/\/arxiv\.org\/abs\/([^"#?]+)"/);
    const titleMatch = block.match(/<p class="title[^"]*">([\s\S]*?)<\/p>/);
    const fullAbsMatch = block.match(/<span class="abstract-full[^"]*">([\s\S]*?)<\/span>/);
    const shortAbsMatch = block.match(/<span class="abstract-short[^"]*">([\s\S]*?)<\/span>/);
    const tagMatch = block.match(/<span class="tag[^"]*">([^<]+)<\/span>/);
    const pdfMatch = block.match(/href="(https?:\/\/arxiv\.org\/pdf\/[^"]+)"/);

    if (!absMatch || !titleMatch) continue;
    const arxivId = sanitizeArxivId(absMatch[1]);
    if (!arxivId) continue;

    const rawAbstract = fullAbsMatch
      ? fullAbsMatch[1].replace(/<a[^>]*>[\s\S]*?<\/a>/g, ' ')
      : shortAbsMatch
        ? shortAbsMatch[1]
        : '';
    const rawPdfUrl = (pdfMatch ? pdfMatch[1] : `https://arxiv.org/pdf/${arxivId}.pdf`).replace(/^http:\/\//, 'https://');

    entries.push({
      arxivId,
      title: stripHtml(titleMatch[1]),
      abstract: stripHtml(rawAbstract),
      category: tagMatch ? tagMatch[1].trim() : 'unknown',
      pdfUrl: rawPdfUrl.endsWith('.pdf') ? rawPdfUrl : `${rawPdfUrl}.pdf`,
    });
  }
  return entries;
}

async function fetchArxivQuery(queryObj) {
  const { query, webQuery, maxResults } = typeof queryObj === 'string'
    ? { query: queryObj, webQuery: queryObj, maxResults: 25 }
    : queryObj;

  const apiUrl = `https://export.arxiv.org/api/query?search_query=${encodeURIComponent(query)}&start=0&max_results=${maxResults}&sortBy=relevance&sortOrder=descending`;
  const res = await fetch(apiUrl, {
    headers: { 'User-Agent': 'CiteWise-T5-Benchmark-Curator/1.0 (academic validation)' },
    signal: AbortSignal.timeout(30000),
  });
  if (res.ok) {
    const xml = await res.text();
    const parsed = parseArxivAtomXml(xml);
    if (parsed.length > 0) return parsed;
  }

  if (res.status !== 429 && res.status < 500) {
    throw new Error(`arXiv API returned HTTP ${res.status} for query "${query}"`);
  }

  // Fallback to arxiv.org/search HTML when export.arxiv.org rate-limits (HTTP 429)
  const size = maxResults <= 25 ? 25 : 50;
  const searchUrl = `https://arxiv.org/search/?query=${encodeURIComponent(webQuery || query)}&searchtype=all&abstracts=show&order=-announced_date_first&size=${size}`;
  console.warn(`  [Fallback] arXiv Atom API returned HTTP ${res.status}; querying arxiv.org/search...`);
  const htmlRes = await fetch(searchUrl, {
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; CiteWise-T5-Benchmark/1.0)' },
    signal: AbortSignal.timeout(30000),
  });
  if (!htmlRes.ok) {
    throw new Error(`arXiv search fallback returned HTTP ${htmlRes.status} for "${webQuery || query}"`);
  }
  const html = await htmlRes.text();
  return parseArxivSearchHtml(html).slice(0, maxResults);
}

function looksLikePdf(buf) {
  return Buffer.isBuffer(buf) && buf.length >= 5 && buf.subarray(0, 5).toString('latin1') === '%PDF-';
}

async function validatePdfBuffer(buf) {
  if (!looksLikePdf(buf)) {
    throw new Error('Downloaded file does not have a valid %PDF- header');
  }
  const parsed = await pdfParse(buf);
  const flatLen = String(parsed.text || '').replace(/\s+/g, ' ').trim().length;
  if (flatLen < 1000) {
    throw new Error(`Insufficient extractable text (${flatLen} chars < 1000)`);
  }
  return {
    pages: parsed.numpages || 1,
    chars: flatLen,
  };
}

function findExistingPdfForArxivId(pdfDir, arxivId) {
  if (!fs.existsSync(pdfDir)) return null;
  const suffix = `_${arxivId}.pdf`;
  const match = fs.readdirSync(pdfDir).find((f) => f.endsWith(suffix));
  return match ? path.join(pdfDir, match) : null;
}

async function downloadAndVerifyPdf(entry, destPath, pdfDir, skipExisting) {
  if (skipExisting) {
    const existingPath = fs.existsSync(destPath) ? destPath : findExistingPdfForArxivId(pdfDir, entry.arxivId);
    if (existingPath) {
      const existing = fs.readFileSync(existingPath);
      const stats = await validatePdfBuffer(existing);
      if (existingPath !== destPath) {
        fs.copyFileSync(existingPath, destPath);
      }
      const sha256 = crypto.createHash('sha256').update(existing).digest('hex');
      return { ...stats, sizeBytes: existing.length, sha256, reused: true };
    }
  }

  const res = await fetch(entry.pdfUrl, {
    headers: { 'User-Agent': 'CiteWise-T5-Benchmark-Curator/1.0 (academic validation)' },
    redirect: 'follow',
    signal: AbortSignal.timeout(30000),
  });
  if (!res.ok) {
    throw new Error(`HTTP ${res.status} downloading ${entry.pdfUrl}`);
  }
  const buffer = Buffer.from(await res.arrayBuffer());
  const stats = await validatePdfBuffer(buffer);
  const sha256 = crypto.createHash('sha256').update(buffer).digest('hex');
  fs.writeFileSync(destPath, buffer);
  return { ...stats, sizeBytes: buffer.length, sha256, reused: false };
}

function csvCell(val) {
  const s = String(val ?? '');
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

async function main(opts) {
  console.log('=== CiteWise T5 Benchmark Dataset Curation ===');
  console.log(`Output Directory : ${opts.outDir}`);
  console.log(`Target Counts    : ${opts.onTopicTarget} Relevant + ${opts.offTopicTarget} Not Relevant`);

  if (opts.dryRun) {
    console.log('\n[DRY RUN] Planned On-Topic arXiv Queries:');
    ON_TOPIC_QUERIES.forEach((q) => console.log(`  - ${q.name} (max=${q.maxResults}): ${q.query}`));
    console.log('\n[DRY RUN] Planned Off-Topic arXiv Queries:');
    OFF_TOPIC_QUERIES.forEach((q) => console.log(`  - ${q.name} (max=${q.maxResults}): ${q.query}`));
    console.log(`\n[DRY RUN] Would write PDFs to: ${opts.pdfDir}`);
    console.log(`[DRY RUN] Would write ground truth to: ${opts.groundTruthPath}`);
    console.log(`[DRY RUN] Would write CATalyst baseline to: ${opts.baselinePath}`);
    return;
  }

  fs.mkdirSync(opts.pdfDir, { recursive: true });

  if (opts.overwriteBaseline || !fs.existsSync(opts.baselinePath)) {
    fs.writeFileSync(opts.baselinePath, JSON.stringify(DEFAULT_BASELINE, null, 2) + '\n', 'utf8');
    console.log(`Wrote CATalyst baseline: ${opts.baselinePath}`);
  } else {
    console.log(`Preserving existing CATalyst baseline: ${opts.baselinePath}`);
  }

  const seenIds = new Set();
  const onTopicCandidates = [];
  if (opts.onTopicTarget > 0) {
    for (const q of ON_TOPIC_QUERIES) {
      console.log(`Querying arXiv [on-topic:${q.name}]...`);
      const entries = await fetchArxivQuery(q);
      for (const e of entries) {
        if (seenIds.has(e.arxivId)) continue;
        if (!isRelevantCandidate(e)) continue;
        seenIds.add(e.arxivId);
        onTopicCandidates.push({ ...e, expectedLabel: 'Relevant' });
      }
      await sleep(3000);
    }
  }

  const offTopicCandidates = [];
  if (opts.offTopicTarget > 0) {
    for (const q of OFF_TOPIC_QUERIES) {
      console.log(`Querying arXiv [off-topic:${q.name}]...`);
      const entries = await fetchArxivQuery(q);
      for (const e of entries) {
        if (seenIds.has(e.arxivId)) continue;
        if (!isOffTopicCandidate(e)) continue;
        seenIds.add(e.arxivId);
        offTopicCandidates.push({ ...e, expectedLabel: 'Not Relevant' });
      }
      await sleep(3000);
    }
  }

  console.log(`\nCandidates discovered: on-topic=${onTopicCandidates.length}, off-topic=${offTopicCandidates.length}`);

  const manifest = [];
  const curateGroup = async (candidates, targetCount, prefix) => {
    let saved = 0;
    for (const entry of candidates) {
      if (saved >= targetCount) break;
      const idxLabel = String(saved + 1).padStart(2, '0');
      const filename = `${prefix}_${idxLabel}_${entry.arxivId}.pdf`;
      const destPath = path.join(opts.pdfDir, filename);

      try {
        console.log(`  [${prefix} ${saved + 1}/${targetCount}] ${entry.arxivId} -> ${filename}`);
        const stats = await downloadAndVerifyPdf(entry, destPath, opts.pdfDir, opts.skipExisting);
        manifest.push({
          filename,
          expected_label: entry.expectedLabel,
          arxiv_id: entry.arxivId,
          category: entry.category,
          title: entry.title,
          pdf_url: entry.pdfUrl,
          pages: stats.pages,
          extractable_chars: stats.chars,
          size_kb: Math.round(stats.sizeBytes / 1024),
          sha256: stats.sha256,
        });
        saved++;
        if (!stats.reused) await sleep(800);
      } catch (err) {
        console.warn(`  Skipped ${entry.arxivId}: ${err.message}`);
        if (fs.existsSync(destPath) && !opts.skipExisting) {
          fs.unlinkSync(destPath);
        }
      }
    }
    return saved;
  };

  const onSaved = await curateGroup(onTopicCandidates, opts.onTopicTarget, 'relevant');
  const offSaved = await curateGroup(offTopicCandidates, opts.offTopicTarget, 'not_relevant');

  // Write ground_truth.csv
  const csvLines = ['filename,expected_label,arxiv_id,category,title'];
  for (const row of manifest) {
    csvLines.push(
      [row.filename, row.expected_label, row.arxiv_id, row.category, row.title].map(csvCell).join(',')
    );
  }
  fs.writeFileSync(opts.groundTruthPath, csvLines.join('\n') + '\n', 'utf8');
  fs.writeFileSync(opts.manifestPath, JSON.stringify(manifest, null, 2) + '\n', 'utf8');

  console.log('\n=== Curation Summary ===');
  console.log(`Relevant PDFs curated     : ${onSaved}/${opts.onTopicTarget}`);
  console.log(`Not Relevant PDFs curated : ${offSaved}/${opts.offTopicTarget}`);
  console.log(`Total PDFs                : ${manifest.length}`);
  console.log(`Ground truth CSV          : ${opts.groundTruthPath}`);
  console.log(`Manifest JSON             : ${opts.manifestPath}`);
  console.log(`CATalyst baseline JSON    : ${opts.baselinePath}`);

  if (onSaved < opts.onTopicTarget || offSaved < opts.offTopicTarget) {
    console.warn('\nWarning: Fewer PDFs than target were curated. Review queries or re-run with adjusted targets.');
    process.exitCode = 1;
  }
}

// Run only when invoked directly (not when imported by unit tests)
const invokedDirectly = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (invokedDirectly) {
  let opts;
  try {
    opts = parseCliArgs(process.argv.slice(2));
  } catch (err) {
    console.error(`[FATAL] ${err.message}`);
    process.exit(1);
  }
  if (opts.help) {
    printHelp();
    process.exit(0);
  }
  main(opts).catch((err) => {
    console.error('Dataset curation failed:', err);
    process.exit(1);
  });
}
