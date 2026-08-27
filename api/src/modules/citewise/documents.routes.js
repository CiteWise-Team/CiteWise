// /api/v1/documents  – document listing, insights, re-assess, approval, delete
// Ports DocumentAnalysisController.java + DocumentApprovalController.java

import express from 'express';
import supabase from '../../common/config/supabaseClient.js';
import { scoringPipeline } from './rrl.routes.js';
import { extractCitationMetadata } from './helpers/citationMetadata.js';

const router = express.Router();

const WEIGHT_GAP    = 0.35;
const WEIGHT_METHOD = 0.30;
const WEIGHT_THEORY = 0.20;
const WEIGHT_CITATION = 0.15;

function calcOverall(g, m, t, c) {
  return (g * WEIGHT_GAP) + (m * WEIGHT_METHOD) + (t * WEIGHT_THEORY) + (c * WEIGHT_CITATION);
}

function parseJson(str, fallback = []) {
  if (!str) return fallback;
  try { return JSON.parse(str); } catch { return fallback; }
}

// Helper: load full insight + excerpts for a document id
async function loadInsight(docId) {
  const { data: insight } = await supabase
    .from('document_insights').select('*').eq('document_id', docId).maybeSingle();
  if (!insight) return null;
  const { data: excerpts } = await supabase
    .from('evidence_excerpts').select('*').eq('document_insight_id', insight.id).order('display_order');
  return { ...insight, evidenceExcerpts: excerpts ?? [] };
}

// GET /api/v1/documents/session/:sessionId
router.get('/session/:sessionId', async (req, res) => {
  const { sessionId } = req.params;
  const headerSession = req.headers['x-session-id'];
  if (headerSession && headerSession !== sessionId) return res.status(404).end();

  const { data: docs, error } = await supabase
    .from('uploaded_documents').select('*').eq('session_id', sessionId);
  if (error) return res.status(500).json({ message: error.message });

  const summaries = await Promise.all((docs ?? []).map(async (doc) => {
    const title = extractCitationMetadata(doc.file_name, doc.parsed_text, doc.citation_metadata_json).title;
    const insight = await loadInsight(doc.id);
    if (insight) {
      const g  = insight.gap_alignment_score  ?? 0;
      const m  = insight.methodology_score    ?? 0;
      const t  = insight.theoretical_score    ?? 0;
      const c  = insight.citation_score       ?? 0;
      const relevancy = insight.overall_score ?? calcOverall(g, m, t, c);
      return {
        id:                   doc.id,
        fileName:             doc.file_name,
        title,
        sizeBytes:            doc.size_bytes,
        scoringStatus:        'complete',
        relevancyScore:       relevancy,
        gapAlignmentScore:    g,
        methodologyScore:     m,
        theoreticalScore:     t,
        citationScore:        c,
        approved:             doc.approved,
        recommendationStatus: insight.recommendation_status,
        relevanceLevel:       insight.relevance_level,
      };
    }
    return {
      id:           doc.id,
      fileName:     doc.file_name,
      title,
      sizeBytes:    doc.size_bytes,
      scoringStatus:(doc.scoring_status ?? 'pending').toLowerCase(),
      relevancyScore: null,
      gapAlignmentScore: null, methodologyScore: null, theoreticalScore: null, citationScore: null,
      approved:     doc.approved,
      recommendationStatus: null, relevanceLevel: null,
    };
  }));

  return res.json(summaries);
});

// GET /api/v1/documents/:id/insights
router.get('/:id/insights', async (req, res) => {
  const docId     = Number(req.params.id);
  const sessionId = req.headers['x-session-id'];

  if (sessionId) {
    const { data: doc } = await supabase.from('uploaded_documents').select('session_id').eq('id', docId).maybeSingle();
    if (!doc || (sessionId && doc.session_id !== sessionId)) return res.status(404).end();
  }

  const insight = await loadInsight(docId);
  if (!insight) return res.status(404).end();

  const { data: doc } = await supabase.from('uploaded_documents').select('file_name').eq('id', docId).maybeSingle();
  const overallScore  = insight.overall_score ?? insight.average_overall_score;

  return res.json({
    documentId:          insight.document_id,
    filename:            doc?.file_name ?? null,
    gapAlignmentScore:   insight.gap_alignment_score,
    methodologyScore:    insight.methodology_score,
    theoreticalScore:    insight.theoretical_score,
    citationScore:       insight.citation_score,
    overallScore,
    scores: {
      gapAlignment:  insight.gap_alignment_score,
      methodology:   insight.methodology_score,
      theory:        insight.theoretical_score,
      citationQuality:insight.citation_score,
      overall:        overallScore,
    },
    recommendationStatus: insight.recommendation_status,
    confidenceLevel:      insight.confidence_level,
    relevanceLevel:       insight.relevance_level,
    mismatchFlags:        parseJson(insight.mismatch_flags_json),
    weaknessFlags:        parseJson(insight.weakness_flags_json),
    validationFlags:      parseJson(insight.validation_flags_json),
    evidenceExcerpts:     (insight.evidenceExcerpts ?? []).map(e => ({
      criterion:     e.criterion,
      quoteText:     e.quote_text,
      pageNumber:    e.page_number,
      relevanceLevel:e.relevance_level,
      evidenceType:  e.evidence_type,
      displayOrder:  e.display_order,
    })),
  });
});

// POST /api/v1/documents/:id/assess  – re-trigger n8n scoring
router.post('/:id/assess', async (req, res) => {
  const docId     = Number(req.params.id);
  const sessionId = req.headers['x-session-id'];

  const { data: doc } = await supabase.from('uploaded_documents').select('*').eq('id', docId).maybeSingle();
  if (!doc) return res.status(404).json({ success: false, message: 'Document not found', data: null });
  if (sessionId && doc.session_id !== sessionId) return res.status(404).json({ success: false, message: 'Document not found', data: null });
  if (!doc.parsed_text?.trim()) return res.status(400).json({ success: false, message: 'Document text is empty', data: null });

  // Delete existing insight so scoring pipeline will re-run
  const { data: existing } = await supabase.from('document_insights').select('id').eq('document_id', docId).maybeSingle();
  if (existing) await supabase.from('document_insights').delete().eq('id', existing.id);

  // Reset scoring status
  await supabase.from('uploaded_documents').update({ scoring_status: 'PENDING', scoring_error_message: null }).eq('id', docId);

  setImmediate(() => scoringPipeline(docId, doc.session_id));

  return res.json({ success: true, message: 'Assessment queued', data: 'queued' });
});

// Helper to safely parse doc ID as number or string
const parseDocId = (idParam) => {
  if (!idParam) return idParam;
  const num = Number(idParam);
  return isNaN(num) ? idParam : num;
};

// PATCH /api/v1/documents/:id/approval
router.patch('/:id/approval', async (req, res) => {
  const rawId     = req.params.id;
  const docId     = parseDocId(rawId);
  const sessionId = req.headers['x-session-id'];

  let { data: doc } = await supabase.from('uploaded_documents').select('*').eq('id', docId).maybeSingle();
  if (!doc && docId !== rawId) {
    const { data: docRaw } = await supabase.from('uploaded_documents').select('*').eq('id', rawId).maybeSingle();
    doc = docRaw;
  }
  if (!doc) return res.status(404).json({ success: false, message: 'Document not found' });

  const status   = req.body?.status ?? 'READY';
  const approved = status.toUpperCase() === 'APPROVED';

  const updatePayload = { approved };
  if (sessionId && (!doc.session_id || doc.session_id !== sessionId)) {
    updatePayload.session_id = sessionId;
  }

  await supabase.from('uploaded_documents').update(updatePayload).eq('id', doc.id);

  const activeSession = sessionId || doc.session_id;
  const { data: approvedDocs } = await supabase
    .from('uploaded_documents').select('id')
    .eq('session_id', activeSession).eq('approved', true);

  return res.json({
    success: true,
    message: 'Approval updated',
    data: { approvedCount: approvedDocs?.length ?? 0, averageScore: 0 },
  });
});

// PATCH /api/v1/documents/:id/citation_override
router.patch('/:id/citation_override', async (req, res) => {
  const docId = Number(req.params.id);
  const sessionId = req.headers['x-session-id'];
  const { reference } = req.body;

  if (!reference || typeof reference !== 'string') {
    return res.status(400).json({ success: false, message: 'Reference string is required' });
  }

  const { data: doc } = await supabase.from('uploaded_documents').select('*').eq('id', docId).maybeSingle();
  if (!doc || (sessionId && doc.session_id !== sessionId)) {
    return res.status(404).json({ success: false, message: 'Document not found' });
  }

  // Parse the reference string to build the citation metadata
  const refString = reference.trim();
  const dateMatch = refString.match(/\(\s*((?:19|20)\d{2}|n\.d\.)[^)]*\)\./);
  let year = 'n.d.';
  let authorPart = refString;
  let titlePart = '';
  
  if (dateMatch) {
    year = dateMatch[1];
    const idx = dateMatch.index;
    authorPart = refString.slice(0, idx).trim();
    titlePart = refString.slice(idx + dateMatch[0].length).trim();
  }

  const firstComma = authorPart.indexOf(',');
  let firstAuthor = firstComma > 0 ? authorPart.slice(0, firstComma).trim() : authorPart.replace(/\.$/, '').trim();
  
  const commaCount = (authorPart.match(/,/g) || []).length;
  const isMulti = authorPart.includes('&') || commaCount > 3;
  const isTwo = authorPart.includes('&') && commaCount <= 3;
  
  let inTextAuthors = firstAuthor;
  if (isMulti && !isTwo) {
    inTextAuthors = `${firstAuthor} et al.`;
  } else if (isTwo) {
    const afterAmp = authorPart.split('&')[1] || '';
    const secondComma = afterAmp.indexOf(',');
    const secondAuthor = secondComma > 0 ? afterAmp.slice(0, secondComma).trim() : afterAmp.replace(/\.$/, '').trim();
    if (secondAuthor) inTextAuthors = `${firstAuthor} & ${secondAuthor}`;
  }

  const existingMeta = doc.citation_metadata_json ? JSON.parse(doc.citation_metadata_json) : {};
  const oldCitation = existingMeta.citation || {};

  // If they just pasted a title and link (no APA year detected), keep the old in-text authors/year!
  if (!dateMatch && oldCitation.inTextAuthors) {
    inTextAuthors = oldCitation.inTextAuthors;
    year = oldCitation.year || 'n.d.';
  }

  const yearLabel = year || 'n.d.';
  const citationObj = {
    reference: refString,
    inTextParenthetical: `(${inTextAuthors}, ${yearLabel})`,
    inTextNarrative: `${inTextAuthors} (${yearLabel})`,
    inTextAuthors,
    year: yearLabel,
    shortTitle: titlePart ? titlePart.split(/\s+/).slice(0, 4).join(' ') : (oldCitation.shortTitle || 'Untitled'),
    reliable: true,
    sourceFile: doc.file_name
  };

  const newMeta = {
    ...existingMeta,
    title: titlePart || existingMeta.title || '',
    authorDisplay: authorPart,
    year: year !== 'n.d.' ? year : null,
    metadataReliable: true,
    citation: citationObj
  };

  await supabase.from('uploaded_documents')
    .update({ citation_metadata_json: JSON.stringify(newMeta) })
    .eq('id', docId);

  return res.json({
    success: true,
    message: 'Citation overridden successfully',
    citation: citationObj
  });
});

// DELETE /api/v1/documents/:id
router.delete('/:id', async (req, res) => {
  const docId     = Number(req.params.id);
  const sessionId = req.headers['x-session-id'];

  const { data: doc } = await supabase.from('uploaded_documents').select('*').eq('id', docId).maybeSingle();
  if (!doc || (sessionId && doc.session_id !== sessionId)) return res.status(404).end();

  const { data: insight } = await supabase.from('document_insights').select('id').eq('document_id', docId).maybeSingle();
  if (insight) await supabase.from('document_insights').delete().eq('id', insight.id);

  await supabase.from('uploaded_documents').delete().eq('id', docId);
  return res.status(204).end();
});

export default router;
