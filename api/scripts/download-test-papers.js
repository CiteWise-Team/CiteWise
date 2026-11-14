import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const pdfParse = require('pdf-parse');

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TARGET_DIR = path.resolve(__dirname, '../../test-papers');

if (!fs.existsSync(TARGET_DIR)) {
  fs.mkdirSync(TARGET_DIR, { recursive: true });
}

const PAPERS = [
  {
    role: 'catalyst-gap-extraction',
    arxivId: '2005.11401',
    fileName: '00_baseline_lewis2020_rag.pdf',
    description: 'Foundational RAG paper for CATalyst gap extraction (19 pages)',
  },
  {
    role: 'citewise-level-1',
    arxivId: '2304.05406',
    fileName: '01_citewise_3pages_literature_chat.pdf',
    description: 'Literature conversational RAG paper (3 pages)',
  },
  {
    role: 'citewise-level-2',
    arxivId: '2312.12006',
    fileName: '02_citewise_5pages_chatgpt_assistant.pdf',
    description: 'ChatGPT assistant evaluation paper (5 pages)',
  },
  {
    role: 'citewise-level-3',
    arxivId: '2402.03367',
    fileName: '03_citewise_8pages_self_rag.pdf',
    description: 'Self-RAG critique and retrieval paper (8 pages)',
  },
  {
    role: 'citewise-level-4',
    arxivId: '2305.14283',
    fileName: '04_citewise_13pages_flare_active_rag.pdf',
    description: 'Active RAG / FLARE paper (13 pages)',
  },
  {
    role: 'citewise-level-5',
    arxivId: '2312.10997',
    fileName: '05_citewise_21pages_rag_comprehensive_survey.pdf',
    description: 'Comprehensive RAG survey paper (21 pages)',
  },
];

async function downloadPaper(paper) {
  const filePath = path.join(TARGET_DIR, paper.fileName);
  const url = `https://arxiv.org/pdf/${paper.arxivId}.pdf`;

  console.log(`Downloading ${paper.arxivId} (${paper.role}) -> ${paper.fileName}...`);
  const res = await fetch(url, {
    headers: { 'User-Agent': 'CiteWise-Benchmark-Downloader/1.0 (academic research benchmark)' },
  });

  if (!res.ok) {
    throw new Error(`Failed to download ${url}: HTTP ${res.status}`);
  }

  const arrayBuffer = await res.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  fs.writeFileSync(filePath, buffer);

  const parsed = await pdfParse(buffer);
  return {
    ...paper,
    filePath,
    fileSizeKB: Math.round(buffer.length / 1024),
    pages: parsed.numpages,
    charCount: parsed.text.length,
    firstLine: parsed.text.trim().split('\n')[0]?.slice(0, 80),
  };
}

async function main() {
  console.log(`Target directory: ${TARGET_DIR}\n`);
  const results = [];
  for (const paper of PAPERS) {
    try {
      const info = await downloadPaper(paper);
      results.push(info);
      console.log(`  ✓ Saved ${info.fileName} | ${info.pages} pages | ${info.fileSizeKB} KB | ${info.charCount} chars\n`);
    } catch (err) {
      console.error(`  ✗ Error downloading ${paper.fileName}:`, err.message);
    }
  }

  console.log('\n--- Summary of Downloaded Papers ---');
  console.table(
    results.map((r) => ({
      Role: r.role,
      File: r.fileName,
      Pages: r.pages,
      SizeKB: r.sizeKB ?? r.fileSizeKB,
      Chars: r.charCount,
      FirstLine: r.firstLine,
    }))
  );
}

main().catch((err) => {
  console.error('Fatal error in downloader:', err);
  process.exit(1);
});
