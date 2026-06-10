// /api/v1/documents  – document listing, insights, re-assess, approval, delete
// Ports DocumentAnalysisController.java + DocumentApprovalController.java

import express from 'express';
import supabase from '../../common/config/supabaseClient.js';
import { scoringPipeline } from './rrl.routes.js';

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

// PATCH /api/v1/documents/:id/approval
router.patch('/:id/approval', async (req, res) => {
  const docId     = Number(req.params.id);
  const sessionId = req.headers['x-session-id'];

  const { data: doc } = await supabase.from('uploaded_documents').select('*').eq('id', docId).maybeSingle();
  if (!doc) return res.status(404).end();
  if (sessionId && doc.session_id !== sessionId) return res.status(404).end();

  const status   = req.body?.status ?? 'READY';
  const approved = status.toUpperCase() === 'APPROVED';

  await supabase.from('uploaded_documents').update({ approved }).eq('id', docId);

  const { data: approvedDocs } = await supabase
    .from('uploaded_documents').select('id')
    .eq('session_id', doc.session_id).eq('approved', true);

  return res.json({
    success: true,
    message: 'Approval updated',
    data: { approvedCount: approvedDocs?.length ?? 0, averageScore: 0 },
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
