// When the user has not approved any RRL papers, synthesis falls back to the
// original PDF uploaded in the CATalyst Extractor for the imported workspace.
// The result is shaped like an uploaded_documents row so the synthesis and
// citation code can use it unchanged; it is never written to that table.

import { createRequire } from 'module';
import fetch from 'node-fetch';
import supabase from '../../../common/config/supabaseClient.js';
import { getBufferFromR2 } from '../../../common/config/r2Client.js';
import { extractPdfPages } from './pageText.js';

const require = createRequire(import.meta.url);
const pdfParse = require('pdf-parse');

export const CATALYST_SOURCE_PREFIX = 'catalyst-';

export function isCatalystSourceId(id) {
  return String(id ?? '').startsWith(CATALYST_SOURCE_PREFIX);
}

// uploadExtractorFileToStorage stores R2 files as either
// `${R2_PUBLIC_URL}/${key}` or `/api/extractor/file/view?key=${key}`.
export function r2KeyFromFileUrl(fileUrl) {
  if (!fileUrl) return null;
  const viewMatch = String(fileUrl).match(/[?&]key=([^&]+)/);
  if (viewMatch) return decodeURIComponent(viewMatch[1]);
  const publicBase = process.env.R2_PUBLIC_URL?.replace(/\/$/, '');
  if (publicBase && fileUrl.startsWith(`${publicBase}/`)) {
    return decodeURIComponent(fileUrl.slice(publicBase.length + 1));
  }
  return null;
}

async function loadPdfBuffer(fileUrl) {
  const r2Key = r2KeyFromFileUrl(fileUrl);
  if (r2Key) {
    const buffer = await getBufferFromR2(r2Key);
    if (buffer) return buffer;
  }
  if (/^https?:\/\//i.test(fileUrl || '')) {
    const res = await fetch(fileUrl);
    if (res.ok) return Buffer.from(await res.arrayBuffer());
  }
  return null;
}

function sectionsText(row) {
  return [
    ['Title', row.title],
    ['Abstract', row.abstract],
    ['Introduction', row.introduction],
    ['Literature Review', row.literature_review],
    ['Methodology', row.methodology],
    ['Results', row.results],
    ['Discussion', row.discussion],
    ['Conclusion', row.conclusion],
  ]
    .filter(([, value]) => typeof value === 'string' && value.trim())
    .map(([label, value]) => `${label}\n${value.trim()}`)
    .join('\n\n');
}

async function toSourceDoc(row) {
  let parsedText = '';
  let pageOffsets = null;
  let pageCount = null;

  try {
    const buffer = await loadPdfBuffer(row.file_url);
    if (buffer) {
      const parsed = await extractPdfPages(pdfParse, buffer);
      parsedText = parsed.text || '';
      pageOffsets = parsed.pageOffsets;
      pageCount = parsed.pageCount ?? null;
    }
  } catch (err) {
    console.warn(`[catalyst-source] Could not read original PDF for Extractor ${row.id}:`, err.message);
  }

  if (!parsedText.trim()) {
    parsedText = sectionsText(row);
    pageOffsets = null;
    pageCount = null;
  }
  if (!parsedText.trim()) return null;

  return {
    id: `${CATALYST_SOURCE_PREFIX}${row.id}`,
    file_name: row.file_name || `${row.title || 'CATalyst document'}.pdf`,
    parsed_text: parsedText,
    page_offsets_json: pageOffsets,
    page_count: pageCount ?? (pageOffsets ? pageOffsets.length : 0),
    citation_metadata_json: null,
    approved: true,
    isCatalystSource: true,
    fileUrl: row.file_url ?? null,
  };
}

export async function loadCatalystSourceRows(sessionId) {
  if (!sessionId) return [];

  const { data: baseline } = await supabase
    .from('research_baselines')
    .select('catalyst_workspace_id')
    .eq('session_id', sessionId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  const groupId = baseline?.catalyst_workspace_id;
  if (!groupId) return [];

  const { data: rows, error } = await supabase
    .from('Extractor')
    .select('*')
    .eq('group_id', groupId)
    .order('created_at', { ascending: false });
  if (error) {
    console.warn(`[catalyst-source] Extractor lookup failed for group ${groupId}:`, error.message);
    return [];
  }

  // Re-uploading the same file in CATalyst creates a new row; keep the newest.
  const seen = new Set();
  const unique = (rows ?? []).filter((row) => {
    const key = row.file_name || row.file_url || row.id;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  // Prefer the papers whose gaps were extracted (GapResult.title is the paper
  // title); those are what the research title and gaps were built from.
  const { data: gapRows } = await supabase.from('GapResult').select('title').eq('group_id', groupId);
  const gapTitles = new Set((gapRows ?? []).map((g) => normalizeTitle(g.title)).filter(Boolean));
  const used = unique.filter((row) => gapTitles.has(normalizeTitle(row.title)));
  return used.length ? used : unique;
}

function normalizeTitle(title) {
  return String(title ?? '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

/** Original CATalyst PDF(s) for the session's workspace, as synthesis source docs. */
export async function loadCatalystSourceDocs(sessionId) {
  const rows = await loadCatalystSourceRows(sessionId);
  const docs = await Promise.all(rows.map(toSourceDoc));
  return docs.filter(Boolean);
}
