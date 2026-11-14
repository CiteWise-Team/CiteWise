// Loading a document's full text together with its page map.

import { createRequire } from 'module';
import supabase from '../../../common/config/supabaseClient.js';
import { getTextFromR2, getBufferFromR2 } from '../../../common/config/r2Client.js';
import { extractPdfPages, parseOffsets } from './pageText.js';

const require = createRequire(import.meta.url);
const pdfParse = require('pdf-parse');

// Page/timing columns come from migrations 004 and 005. Writing them separately
// from the main insert/update keeps uploads and scoring working on a database that
// has not been migrated yet; the only loss is the traceability data.
export async function updateDocumentFields(docId, fields, label = 'document') {
  if (!fields || Object.keys(fields).length === 0) return;
  try {
    const { error } = await supabase.from('uploaded_documents').update(fields).eq('id', docId);
    if (!error) return;

    // If a column is missing (e.g. migration 005 not yet applied), strip the missing
    // column and retry the update for remaining columns.
    const match = error.message?.match(/Could not find the '([^']+)' column/i);
    if (match) {
      const missingCol = match[1];
      const { [missingCol]: _omitted, ...rest } = fields;
      if (Object.keys(rest).length > 0) {
        return updateDocumentFields(docId, rest, label);
      }
      return;
    }
    throw error;
  } catch (err) {
    console.warn(`[${label}] could not store ${Object.keys(fields).join(', ')} for doc ${docId}:`, err.message);
  }
}

export async function recordAssessmentTiming(row) {
  if (!row) return;
  try {
    const { error } = await supabase.from('assessment_timings').insert(row);
    if (!error) return;

    const match = error.message?.match(/Could not find the '([^']+)' column/i);
    if (match) {
      const missingCol = match[1];
      const { [missingCol]: _omitted, ...rest } = row;
      return recordAssessmentTiming(rest);
    }
    throw error;
  } catch (err) {
    console.warn(`[timing] could not log assessment timing for doc ${row.document_id}:`, err.message);
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

// Ensures page_count is populated on the doc object and persisted to DB.
export async function ensurePageCount(doc) {
  if (!doc) return null;
  if (Number.isFinite(doc.page_count) && doc.page_count > 0) {
    return doc.page_count;
  }

  // 1. Recover from existing page_offsets_json if available
  const stored = parseOffsets(doc.page_offsets_json);
  if (stored?.length) {
    doc.page_count = stored.length;
    await updateDocumentFields(doc.id, { page_count: stored.length }, 'page_count');
    return stored.length;
  }

  // 2. Extract from raw PDF in R2 if available
  if (doc.r2_file_key) {
    try {
      const buffer = await getBufferFromR2(doc.r2_file_key);
      if (buffer) {
        const { pageCount } = await extractPdfPages(pdfParse, buffer);
        if (pageCount && pageCount > 0) {
          doc.page_count = pageCount;
          await updateDocumentFields(doc.id, { page_count: pageCount }, 'page_count');
          return pageCount;
        }
      }
    } catch (err) {
      console.warn(`[pages] Could not read page count from PDF for doc ${doc.id}:`, err.message);
    }
  }

  return null;
}

// Documents uploaded before page tracking have no offsets. For native PDFs the
// original file in R2 re-parses to the identical text, so the offsets can be
// recovered once and saved. Scanned (LlamaParse) uploads cannot be recovered
// this way and simply stay without page data.
export async function ensurePageOffsets(doc, fullText) {
  const stored = parseOffsets(doc.page_offsets_json);
  if (stored) {
    if (doc.page_count == null && stored.length > 0) {
      doc.page_count = stored.length;
      await updateDocumentFields(doc.id, { page_count: stored.length }, 'pages');
    }
    return stored;
  }
  if (!doc.r2_file_key || !fullText) return null;

  try {
    const buffer = await getBufferFromR2(doc.r2_file_key);
    if (!buffer) return null;
    const { text, pageOffsets, pageCount } = await extractPdfPages(pdfParse, buffer);
    if (pageCount && doc.page_count == null) {
      doc.page_count = pageCount;
    }
    if (!pageOffsets || text !== fullText) {
      if (pageCount) {
        await updateDocumentFields(doc.id, { page_count: pageCount }, 'pages');
      }
      return null;
    }
    await updateDocumentFields(doc.id, { page_offsets_json: pageOffsets, page_count: pageCount }, 'pages');
    doc.page_offsets_json = pageOffsets;
    doc.page_count = pageCount;
    return pageOffsets;
  } catch (err) {
    console.warn(`[pages] Could not backfill page offsets for doc ${doc.id}:`, err.message);
    return null;
  }
}
