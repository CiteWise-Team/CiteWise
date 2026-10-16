// Loading a document's full text together with its page map.

import { createRequire } from 'module';
import supabase from '../../../common/config/supabaseClient.js';
import { getTextFromR2, getBufferFromR2 } from '../../../common/config/r2Client.js';
import { extractPdfPages, parseOffsets } from './pageText.js';

const require = createRequire(import.meta.url);
const pdfParse = require('pdf-parse');

// Page/timing columns come from migration 004. Writing them separately from
// the main insert/update keeps uploads and scoring working on a database that
// has not been migrated yet; the only loss is the traceability data.
export async function updateDocumentFields(docId, fields, label = 'document') {
  try {
    const { error } = await supabase.from('uploaded_documents').update(fields).eq('id', docId);
    if (error) throw error;
  } catch (err) {
    console.warn(`[${label}] could not store ${Object.keys(fields).join(', ')} for doc ${docId} (is migration 004 applied?):`, err.message);
  }
}

export async function recordAssessmentTiming(row) {
  try {
    const { error } = await supabase.from('assessment_timings').insert(row);
    if (error) throw error;
  } catch (err) {
    console.warn(`[timing] could not log assessment timing for doc ${row.document_id} (is migration 004 applied?):`, err.message);
  }
}

export async function loadFullText(doc) {
  if (doc.r2_text_key) {
    try {
      const r2Text = await getTextFromR2(doc.r2_text_key);
      if (r2Text?.trim()) return r2Text;
    } catch (err) {
      console.warn(`[pages] Failed to load R2 text for doc ${doc.id}:`, err.message);
    }
  }
  return doc.parsed_text ?? '';
}

// Documents uploaded before page tracking have no offsets. For native PDFs the
// original file in R2 re-parses to the identical text, so the offsets can be
// recovered once and saved. Scanned (LlamaParse) uploads cannot be recovered
// this way and simply stay without page data.
export async function ensurePageOffsets(doc, fullText) {
  const stored = parseOffsets(doc.page_offsets_json);
  if (stored) return stored;
  if (!doc.r2_file_key || !fullText) return null;

  try {
    const buffer = await getBufferFromR2(doc.r2_file_key);
    if (!buffer) return null;
    const { text, pageOffsets, pageCount } = await extractPdfPages(pdfParse, buffer);
    if (!pageOffsets || text !== fullText) return null;
    await updateDocumentFields(doc.id, { page_offsets_json: pageOffsets, page_count: pageCount }, 'pages');
    doc.page_offsets_json = pageOffsets;
    doc.page_count = pageCount;
    return pageOffsets;
  } catch (err) {
    console.warn(`[pages] Could not backfill page offsets for doc ${doc.id}:`, err.message);
    return null;
  }
}
