// POST /api/rrl/upload  – PDF upload, text extraction, async n8n scoring
// Ports DocumentUploadController.java + DocumentUploadService.java

import express from 'express';
import multer  from 'multer';
import crypto  from 'crypto';
import fetch   from 'node-fetch';
import FormData from 'form-data';
import supabase from '../../common/config/supabaseClient.js';
import requireAuth from '../../common/middlewares/auth.middleware.js';
import { 
  uploadPdfToR2, 
  uploadTextToR2, 
  getTextFromR2,
  isR2Configured, 
  getPresignedDownloadUrl 
} from '../../common/config/r2Client.js';


// --- Background Extraction Queue ---
// Limits parallel LlamaParse requests to avoid rate limit/timeouts on free tiers
const extractionQueue = [];
let isProcessingQueue = false;

async function processExtractionQueue() {
  if (isProcessingQueue) return;
  isProcessingQueue = true;
  while (extractionQueue.length > 0) {
    const batch = extractionQueue.splice(0, 3); // Process 3 at a time
    await Promise.all(batch.map(item => 
      asyncExtractPipeline(item.docId, item.sessionId, item.buffer, item.fileName, item.hash)
        .catch(err => console.error(`[Queue Error] doc ${item.docId}:`, err))
    ));
    // Brief cooldown between batches
    if (extractionQueue.length > 0) {
      await new Promise(r => setTimeout(r, 2000));
    }
  }
  isProcessingQueue = false;
}
// -----------------------------------
import { selectRelevantChunks } from './helpers/chunking.js';
import { parseAIResponse } from './helpers/rubricScoring.js';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const pdfParse = require('pdf-parse');

const router = express.Router();

// All RRL upload/scoring routes require a valid user session.
router.use(requireAuth);

const MAX_FILE_MB = 20;
const upload = multer({
  storage: multer.memoryStorage(),
  limits:  { fileSize: MAX_FILE_MB * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    cb(null, true);
  },
});


// --- helpers ---

function sha256(buf) {
  return crypto.createHash('sha256').update(buf).digest('hex');
}

function sanitizeText(raw) {
  if (!raw) return '';
  return raw
    .replace(/\x00/g, '')
    .replace(/[\x01-\x08\x0b\x0c\x0e-\x1f\x7f]/g, ' ')
    .replace(/[￾￿]/g, '')
    .replace(/[ \t\v\f]+/g, ' ')
    .replace(/\r\n?/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

// Helper to parse PDF via LlamaParse REST API
async function parsePdfWithLlamaParse(buffer, fileName) {
  const apiKey = process.env.LLAMAPARSE_API_KEY;
  if (!apiKey) throw new Error('LLAMAPARSE_API_KEY is not set');

  const formData = new FormData();
  formData.append('file', buffer, { filename: fileName, contentType: 'application/pdf' });

  console.info(`[LlamaParse] Uploading ${fileName} for extraction...`);
  const uploadRes = await fetch('https://api.cloud.llamaindex.ai/api/parsing/upload', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      ...formData.getHeaders()
    },
    body: formData
  });
  
  if (!uploadRes.ok) {
    const txt = await uploadRes.text().catch(()=>'');
    throw new Error(`LlamaParse upload failed: ${uploadRes.statusText} ${txt}`);
  }
  const uploadData = await uploadRes.json();
  const jobId = uploadData.id;

  console.info(`[LlamaParse] Uploaded ${fileName}, Job ID: ${jobId}. Polling...`);
  let status = 'PENDING';
  let attempts = 0;
  while (status === 'PENDING' || status === 'RUNNING') {
    if (attempts++ > 150) throw new Error('LlamaParse job timed out (waited 5 minutes)');
    await new Promise(r => setTimeout(r, 2000));
    const statusRes = await fetch(`https://api.cloud.llamaindex.ai/api/parsing/job/${jobId}`, {
      headers: { 'Authorization': `Bearer ${apiKey}` }
    });
    const statusData = await statusRes.json();
    status = statusData.status;
    if (status === 'ERROR' || status === 'FAILED') throw new Error('LlamaParse job failed during processing');
  }

  console.info(`[LlamaParse] Job ${jobId} SUCCESS. Fetching markdown...`);
  const resultRes = await fetch(`https://api.cloud.llamaindex.ai/api/parsing/job/${jobId}/result/markdown`, {
    headers: { 'Authorization': `Bearer ${apiKey}` }
  });
  if (!resultRes.ok) throw new Error('Failed to fetch markdown result');
  const resultData = await resultRes.json();
  return resultData.markdown;
}


async function parsePdfHybrid(buffer, fileName) {
  try {
    console.info(`[pdf-parse] Attempting fast local extraction for ${fileName}...`);
    const data = await pdfParse(buffer);
    const text = data.text || '';
    const cleanText = text.replace(/\s+/g, ' ').trim();
    
    // Heuristic: if text is > 1000 chars, it's likely a native PDF, bypass LlamaParse
    if (cleanText.length > 1000) {
      console.info(`[pdf-parse] SUCCESS. Extracted ${cleanText.length} chars locally for ${fileName}.`);
      return text;
    }
    console.info(`[pdf-parse] Text too short (${cleanText.length} chars) for ${fileName}, likely scanned. Falling back to LlamaParse.`);
  } catch (err) {
    console.warn(`[pdf-parse] Local parsing failed for ${fileName}: ${err.message}. Falling back to LlamaParse.`);
  }

  return await parsePdfWithLlamaParse(buffer, fileName);
}

// Fire-and-forget n8n scoring for one uploaded document (exported so /assess can reuse)
export async function scoringPipeline(docId, sessionId) {
  try {
    // Fetch document row
    const { data: doc, error: docErr } = await supabase
      .from('uploaded_documents').select('*').eq('id', docId).single();
    if (docErr || !doc) { console.warn(`[scoring] doc ${docId} not found`); return; }

    if (doc.scoring_status === 'PROCESSING') { console.info(`[scoring] doc ${docId} already processing`); return; }
    
    let rawJson = null;
    const { data: existing } = await supabase.from('document_insights').select('*').eq('document_id', docId).maybeSingle();
    if (existing) {
      if (existing.raw_ai_response_json) {
        console.info(`[scoring] doc ${docId} already has insight. Reusing raw_ai_response_json for new weights.`);
        rawJson = existing.raw_ai_response_json;
      } else {
        console.info(`[scoring] doc ${docId} already has insight but no raw json. Will re-fetch.`);
      }
      // Delete existing insight so we can insert the newly calculated one
      await supabase.from('document_insights').delete().eq('id', existing.id);
    }

    // Mark PROCESSING
    await supabase.from('uploaded_documents').update({
      scoring_status:     'PROCESSING',
      scoring_started_at: new Date().toISOString(),
      scoring_error_message: null,
    }).eq('id', docId);

    // Load baseline
    const { data: baselines } = await supabase
      .from('research_baselines')
      .select('*')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: false })
      .limit(1);
    const baseline = baselines?.[0] ?? null;
    if (!baseline) {
      console.warn(`[scoring] no baseline for session ${sessionId}, skipping doc ${docId}`);
      await supabase.from('uploaded_documents').update({
        scoring_status: 'FAILED', scoring_error_message: 'Missing semantic baseline',
        scoring_completed_at: new Date().toISOString(),
      }).eq('id', docId);
      return;
    }

    let fullText = doc.parsed_text;
    if (doc.r2_text_key) {
      try {
        const r2Content = await getTextFromR2(doc.r2_text_key);
        if (r2Content?.trim()) fullText = r2Content;
      } catch (r2Err) {
        console.warn(`[scoring] Failed to fetch full text from R2 for doc ${docId}, falling back to inline text:`, r2Err.message);
      }
    }

    const selectedText = selectRelevantChunks(fullText, baseline, {
      maxChars:  parseInt(process.env.CITEWISE_SCORING_MAX_CHARS_TO_N8N) || 9000,
      maxChunks: parseInt(process.env.CITEWISE_SCORING_MAX_CHUNKS)       || 6,
      chunkSize: parseInt(process.env.CITEWISE_SCORING_CHUNK_SIZE)        || 1000,
      overlap:   parseInt(process.env.CITEWISE_SCORING_CHUNK_OVERLAP)     || 100,
    });

    if (!selectedText || !selectedText.trim()) {
      console.warn(`[scoring] doc ${docId} has no extractable text, skipping n8n and marking as FAILED.`);
      await supabase.from('uploaded_documents').update({
        scoring_status:        'FAILED',
        scoring_error_message: 'The PDF contains no extractable text (e.g. scanned image or empty document). Please upload a readable, text-based PDF.',
        scoring_completed_at:  new Date().toISOString(),
      }).eq('id', docId);
      return;
    }

    const gapsRaw = baseline.research_gaps;
    const gapsStr = Array.isArray(gapsRaw) ? gapsRaw.join('; ') : (gapsRaw ?? '');

    let customWeights = null;
    if (doc.metric_weights_json) {
      try { 
        customWeights = typeof doc.metric_weights_json === 'string' 
          ? JSON.parse(doc.metric_weights_json) 
          : doc.metric_weights_json; 
      } catch (e) {
        console.error('Failed to parse custom weights:', e);
      }
    }

    const scoringPayload = JSON.stringify({
      extracted_text: selectedText,
      text:           selectedText,
      chatInput:      selectedText,
      input:          selectedText,
      customWeights:  customWeights,
      baseline: {
        title:         baseline.project_title ?? '',
        rationale:     baseline.rationale     ?? '',
        researchGaps:  gapsStr,
      },
    });

    if (!rawJson) {
      const webhookUrl = process.env.CITEWISE_N8N_SCORING_WEBHOOK_URL || 'http://localhost:5678/webhook/citewise-evaluator-fixed';
      console.info(`[scoring] calling n8n for doc ${docId} (${selectedText.length} chars)`);

      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    scoringPayload,
        timeout: parseInt(process.env.CITEWISE_N8N_READ_TIMEOUT_MS) || 120000,
      });

      if (!response.ok) {
        const errText = await response.text().catch(() => '');
        throw new Error(`n8n returned ${response.status}: ${errText.slice(0, 200)}`);
      }

      rawJson = await response.text();
      if (!rawJson?.trim()) throw new Error('n8n returned empty body');
    }

    const insight = parseAIResponse(rawJson, docId, customWeights);
    if (!insight) throw new Error('n8n response parsed but produced no usable insight');

    // Save insight + excerpts
    const { data: savedInsight, error: insErr } = await supabase
      .from('document_insights')
      .insert({
        document_id:            docId,
        gap_alignment_score:    insight.gapAlignmentScore,
        methodology_score:      insight.methodologyScore,
        theoretical_score:      insight.theoreticalScore,
        citation_score:         insight.citationScore,
        overall_score:          insight.overallScore,
        average_overall_score:  null,
        recommendation_status:  insight.recommendationStatus,
        confidence_level:       insight.confidenceLevel,
        relevance_level:        insight.relevanceLevel,
        mismatch_flags_json:    insight.mismatchFlagsJson,
        weakness_flags_json:    insight.weaknessFlagsJson,
        validation_flags_json:  insight.validationFlagsJson,
        raw_ai_response_json:   insight.rawAiResponseJson,
        generated_at:           insight.generatedAt,
      })
      .select()
      .single();
    if (insErr) throw new Error(`Failed to save insight: ${insErr.message}`);

    if (insight.evidenceExcerpts?.length) {
      const rows = insight.evidenceExcerpts.map(e => ({
        document_insight_id: savedInsight.id,
        quote_text:     e.quoteText,
        page_number:    e.pageNumber,
        relevance_level:e.relevanceLevel,
        criterion:      e.criterion,
        evidence_type:  e.evidenceType,
        display_order:  e.displayOrder,
      }));
      const { error: exErr } = await supabase.from('evidence_excerpts').insert(rows);
      if (exErr) console.warn(`[scoring] excerpt insert error for doc ${docId}:`, exErr.message);
    }

    await supabase.from('uploaded_documents').update({
      scoring_status:      'COMPLETE',
      scoring_completed_at: new Date().toISOString(),
      scoring_error_message: null,
    }).eq('id', docId);

    console.info(`[scoring] ✅ doc ${docId} complete – recommendation=${insight.recommendationStatus}`);

    // Fire-and-forget AI metadata extraction so synthesis has reliable
    // citation metadata (author, year, title) without the user having to
    // rename their PDF files.
    setImmediate(() => extractMetadataPipeline(docId, doc.file_name, doc.parsed_text));
  } catch (err) {
    const status = err.message?.toLowerCase().includes('timed out') ? 'TIMEOUT' : 'FAILED';
    await supabase.from('uploaded_documents').update({
      scoring_status:      status,
      scoring_completed_at: new Date().toISOString(),
      scoring_error_message: err.message?.slice(0, 280),
    }).eq('id', docId);
    console.error(`[scoring] doc ${docId} FAILED:`, err.message);
  }
}

// ── AI metadata extraction pipeline ─────────────────────────────────────
// Called after scoring completes. Sends the first 4 000 chars of the parsed
// text to the n8n metadata extractor webhook, which uses an AI model to
// extract title, authors, year, journal, and DOI. The result is stored in
// citation_metadata_json on the document row so synthesis.routes.js can use
// it instead of the filename-based heuristic.

async function extractMetadataPipeline(docId, fileName, parsedText) {
  const webhookUrl = process.env.CITEWISE_N8N_METADATA_WEBHOOK_URL;
  if (!webhookUrl) return; // feature is opt-in; skip when not configured

  try {
    const textSample = String(parsedText ?? '').slice(0, 4000).trim();
    if (!textSample) return;

    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ documentId: docId, filename: fileName, text: textSample }),
      timeout: parseInt(process.env.CITEWISE_N8N_READ_TIMEOUT_MS) || 60000,
    });

    if (!response.ok) {
      console.warn(`[metadata] doc ${docId} webhook returned ${response.status}`);
      return;
    }

    const raw = await response.text();
    if (!raw?.trim()) return;

    let payload = JSON.parse(raw);
    if (Array.isArray(payload) && payload.length) payload = payload[0];
    // n8n may wrap in output/body/data
    for (const f of ['output', 'body', 'data', 'json', 'result', 'metadata']) {
      if (payload[f] && typeof payload[f] === 'object') { payload = payload[f]; break; }
    }

    let { title, authorDisplay, authors, year, journal, doi } = payload;
    if (!title && !authorDisplay && !year) {
      console.warn(`[metadata] doc ${docId} – n8n returned no usable metadata`);
      return;
    }

    
      // ====================================================================
      // ENRICHMENT: Crossref API for missing DOI or Journal
      // ====================================================================
      if (title && (!doi || !journal)) {
        try {
          console.info('[metadata] doc ' + docId + ' - missing DOI/Journal. Querying Crossref...');
          const q = encodeURIComponent(title);
          const crRes = await fetch('https://api.crossref.org/works?query.bibliographic=' + q + '&select=DOI,title,container-title,volume,issue,page,publisher&rows=1&mailto=citewise@duckdns.org');
          if (crRes.ok) {
            const crData = await crRes.json();
            const items = crData?.message?.items || [];
            if (items.length > 0) {
              const item = items[0];
              const crTitle = (item.title && item.title[0]) ? item.title[0].toLowerCase() : '';
              const myTitle = title.toLowerCase();
              
              const minMatch = Math.min(15, myTitle.length);
              if (crTitle.includes(myTitle) || myTitle.includes(crTitle) || (myTitle.length >= minMatch && crTitle.substring(0,minMatch) === myTitle.substring(0,minMatch))) {
                 console.info('[metadata] doc ' + docId + ' - Crossref match found!');
                 if (!doi && item.DOI) doi = item.DOI;
                 if (!journal && item['container-title'] && item['container-title'][0]) journal = item['container-title'][0];
              } else {
                 console.info('[metadata] doc ' + docId + ' - Crossref top result didnt match title. Got: ' + crTitle);
              }
            }
          }
        } catch (crErr) {
          console.warn('[metadata] doc ' + docId + ' - Crossref enrichment failed:', crErr.message);
        }
      }
      // ====================================================================

      const metaToStore = {
      title:          title         || null,
      authorDisplay:  authorDisplay || null,
      authors:        Array.isArray(authors) ? authors : (authorDisplay ? [authorDisplay] : []),
      year:           year          || null,
      journal:        journal       || null,
      doi:            doi           || null,
      metadataReliable: Boolean(title && year && authorDisplay),
      source: 'n8n-ai',
    };

    await supabase
      .from('uploaded_documents')
      .update({ citation_metadata_json: JSON.stringify(metaToStore) })
      .eq('id', docId);

    console.info(`[metadata] ✅ doc ${docId} – AI metadata stored (title="${title?.slice(0, 60)}")`);
  } catch (err) {
    // Non-fatal — heuristic extraction in synthesis.routes.js is the fallback.
    console.warn(`[metadata] doc ${docId} extraction failed:`, err.message);
  }
}

// Background worker for non-blocking LlamaParse extraction
export async function asyncExtractPipeline(docId, sessionId, buffer, fileName, hash) {
  try {
    console.info(`[asyncExtract] Starting background LlamaParse for doc ${docId} (${fileName})...`);
    const markdown = await parsePdfWithLlamaParse(buffer, fileName);
    if (!markdown?.trim()) {
      throw new Error('LlamaParse returned empty extracted text');
    }

    const r2TextKey = `text/${sessionId}/${hash}.md`;
    await uploadTextToR2(markdown, r2TextKey);

    const previewText = markdown.slice(0, 4000);
    const charCount = markdown.trim().length;

    await supabase.from('uploaded_documents').update({
      parsed_text: previewText,
      r2_text_key: r2TextKey,
      character_count: charCount,
      scoring_status: 'PENDING',
      scoring_error_message: null,
    }).eq('id', docId);

    console.info(`[asyncExtract] ✅ doc ${docId} text extraction complete (${charCount} chars). Transitioned to PENDING.`);
  } catch (err) {
    console.error(`[asyncExtract] doc ${docId} extraction failed:`, err.message);
    await supabase.from('uploaded_documents').update({
      scoring_status: 'FAILED',
      scoring_error_message: `Extraction failed: ${err.message?.slice(0, 200)}`,
    }).eq('id', docId);
  }
}

// --- route ---

router.post('/upload', upload.array('files'), async (req, res) => {
  const sessionId = req.headers['x-session-id'];
  if (!sessionId?.trim()) {
    return res.status(400).json({ success: false, message: 'Session ID is required', data: null });
  }
  if (!req.files?.length) {
    return res.status(400).json({ success: false, message: 'At least one PDF is required', data: null });
  }

  const results = [];
  let accepted = 0;

  for (const file of req.files) {
    const fileName  = file.originalname || 'unnamed.pdf';
    const sizeBytes = file.size;
    const mimeType  = file.mimetype || 'application/pdf';

    const isPdf = mimeType === 'application/pdf' || fileName.toLowerCase().endsWith('.pdf');
    if (!isPdf) {
      results.push({ success: false, fileName, sizeBytes, message: 'Unsupported file type', characterCount: 0 });
      continue;
    }
    if (sizeBytes > MAX_FILE_MB * 1024 * 1024) {
      results.push({ success: false, fileName, sizeBytes, message: 'File exceeds size limit', characterCount: 0 });
      continue;
    }
    if (!file.buffer?.length) {
      results.push({ success: false, fileName, sizeBytes, message: 'File is empty', characterCount: 0 });
      continue;
    }

    // Duplicate check: same session + filename
    const { data: existingName } = await supabase
      .from('uploaded_documents').select('id')
      .eq('session_id', sessionId).eq('file_name', fileName).maybeSingle();
    if (existingName) {
      results.push({ success: false, fileName, sizeBytes, message: 'File already uploaded previously', characterCount: 0 });
      continue;
    }

    const hash = sha256(file.buffer);

    const { data: existingHash } = await supabase
      .from('uploaded_documents').select('id')
      .eq('session_id', sessionId).eq('file_hash', hash).maybeSingle();
    if (existingHash) {
      results.push({ success: false, fileName, sizeBytes, message: 'File already uploaded previously', characterCount: 0 });
      continue;
    }

    // Offload raw PDF binary to Cloudflare R2
    const r2FileKey = `raw/${sessionId}/${hash}.pdf`;
    try {
      await uploadPdfToR2(file.buffer, r2FileKey, mimeType);
    } catch (r2Err) {
      console.warn(`[upload] R2 PDF upload skipped/failed for ${fileName}:`, r2Err.message);
    }

    // Attempt fast local extraction
    let localText = '';
    let requiresLlamaParse = false;
    try {
      const data = await pdfParse(file.buffer);
      const text = (data.text || '').replace(/\s+/g, ' ').trim();
      if (text.length > 1000) {
        localText = data.text || '';
      } else {
        requiresLlamaParse = true;
      }
    } catch (err) {
      requiresLlamaParse = true;
    }

    // Path A: Native text extracted locally (<300ms)
    if (!requiresLlamaParse && localText.trim()) {
      const r2TextKey = `text/${sessionId}/${hash}.md`;
      try {
        await uploadTextToR2(localText, r2TextKey);
      } catch (r2TextErr) {
        console.warn(`[upload] R2 text upload skipped/failed for ${fileName}:`, r2TextErr.message);
      }

      const previewText = localText.slice(0, 4000);
      const charCount = localText.trim().length;

      const { data: saved, error: saveErr } = await supabase
        .from('uploaded_documents')
        .insert({
          session_id:     sessionId,
          file_name:      fileName,
          file_hash:      hash,
          size_bytes:     sizeBytes,
          character_count:charCount,
          uploaded_at:    new Date().toISOString(),
          parsed_text:    previewText,
          r2_file_key:    r2FileKey,
          r2_text_key:    r2TextKey,
          approved:       false,
          scoring_status: 'PENDING',
        })
        .select()
        .single();

      if (saveErr) {
        results.push({ success: false, fileName, sizeBytes, message: `Save failed: ${saveErr.message}`, characterCount: 0 });
        continue;
      }

      accepted++;
      results.push({
        success: true,
        documentId: saved.id,
        fileName,
        sizeBytes,
        status: 'PENDING',
        message: 'Parsed successfully; Ready for AI Assessment',
        characterCount: charCount,
      });
      continue;
    }

    // Path B: Scanned PDF requiring LlamaParse – execute non-blocking in background
    const { data: saved, error: saveErr } = await supabase
      .from('uploaded_documents')
      .insert({
        session_id:     sessionId,
        file_name:      fileName,
        file_hash:      hash,
        size_bytes:     sizeBytes,
        character_count: 0,
        uploaded_at:    new Date().toISOString(),
        parsed_text:    '',
        r2_file_key:    r2FileKey,
        r2_text_key:    null,
        approved:       false,
        scoring_status: 'EXTRACTING',
      })
      .select()
      .single();

    if (saveErr) {
      results.push({ success: false, fileName, sizeBytes, message: `Save failed: ${saveErr.message}`, characterCount: 0 });
      continue;
    }

    accepted++;
    results.push({
      success: true,
      documentId: saved.id,
      fileName,
      sizeBytes,
      status: 'EXTRACTING',
      message: 'Uploaded. Extracting full text in background...',
      characterCount: 0,
    });

    // Push to the background extraction queue instead of running immediately in parallel
    extractionQueue.push({ docId: saved.id, sessionId, buffer: file.buffer, fileName, hash });
    processExtractionQueue();
  }

  const anySuccess = accepted > 0;
  return res.json({
    success: anySuccess,
    message: anySuccess
      ? (results.some(r => !r.success) ? 'Upload completed with issues' : 'Upload completed')
      : 'No valid files were uploaded',
    data: {
      totalFiles:   results.length,
      acceptedFiles: accepted,
      failedFiles:  results.length - accepted,
      results,
    },
  });
});

// POST /api/rrl/reextract-metadata/:sessionId
// Re-runs metadata extraction for all documents in a session without
// requiring re-upload. Useful after deploying the improved extractor.
router.post('/reextract-metadata/:sessionId', async (req, res) => {
  const { sessionId } = req.params;
  if (!sessionId?.trim()) return res.status(400).json({ success: false, message: 'sessionId required' });

  const { data: docs, error } = await supabase
    .from('uploaded_documents')
    .select('id, file_name, parsed_text')
    .eq('session_id', sessionId);

  if (error) return res.status(500).json({ success: false, message: error.message });
  if (!docs?.length) return res.json({ success: true, message: 'No documents found', data: { count: 0 } });

  // Kick off extraction for each doc fire-and-forget.
  docs.forEach(d => setImmediate(() => extractMetadataPipeline(d.id, d.file_name, d.parsed_text)));

  return res.json({ success: true, message: `Metadata re-extraction queued for ${docs.length} document(s)`, data: { count: docs.length } });
});

export default router;
