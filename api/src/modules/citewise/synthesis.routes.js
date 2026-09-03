// /api/v1/synthesis  – RAG intro drafting via n8n + draft persistence
// Ports DraftGenerationController.java + RAGSynthesisService.java + SynthesisN8nClient.java

import express from 'express';
import fetch   from 'node-fetch';
import { v4 as uuidv4 } from 'uuid';
import supabase from '../../common/config/supabaseClient.js';
import requireAuth from '../../common/middlewares/auth.middleware.js';
import { getTextFromR2 } from '../../common/config/r2Client.js';
import {
  extractCitationMetadata,
  buildReferenceList,
  reconcileInTextCitations,
} from './helpers/citationMetadata.js';

const router = express.Router();

// All synthesis routes require a valid user session.
router.use(requireAuth);


// Source tier logic (port of RAGSynthesisService.determineSourceTier)
// Note: Since all documents in this pipeline have been explicitly approved by the user,
// user approval overrides low AI relevance scores. Approved docs default to SUPPORTING
// rather than EXCLUDED unless explicitly excluded by the user.
function determineSourceTier(insight) {
  const overall    = insight?.overall_score ?? null;
  const rec        = insight?.recommendation_status ?? null;
  const rel        = insight?.relevance_level ?? null;

  if ((overall !== null && overall >= 75) || rec === 'Recommended' || rel === 'High') return 'CORE';
  if ((overall !== null && overall >= 60 && overall < 75) || rec === 'Needs Review' || rel === 'Medium') return 'SUPPORTING';
  if (overall !== null && overall >= 40 && overall < 60) return 'TANGENTIAL';
  return 'SUPPORTING';
}

const TIER_META = {
  CORE:       { payloadValue: 'Core Source',       guidance: 'Use as main synthesis evidence.' },
  SUPPORTING: { payloadValue: 'Supporting Source', guidance: 'Use as supporting evidence.' },
  TANGENTIAL: { payloadValue: 'Tangential Source', guidance: 'Use for broad background.' },
  EXCLUDED:   { payloadValue: 'Excluded Source',   guidance: 'Do not include this document text as synthesis evidence.' },
};

// Default component weights — mirror documents.routes.js. Users may override
// these from the relevance-customization panel; weights arrive as a 0..1 map.
const DEFAULT_WEIGHTS = { gapAlignment: 0.35, methodology: 0.30, theoretical: 0.20, citation: 0.15 };

// Recompute an overall score (0..100) from sub-scores using user weights.
function weightedOverall(insight, weights) {
  if (!insight || !weights) return null;
  const pairs = [
    ['gapAlignment', insight.gap_alignment_score],
    ['methodology',  insight.methodology_score],
    ['theoretical',  insight.theoretical_score],
    ['citation',     insight.citation_score],
  ];
  let sum = 0, wTotal = 0;
  for (const [key, raw] of pairs) {
    if (raw == null || Number.isNaN(Number(raw))) continue;
    const val = Number(raw) <= 1 ? Number(raw) * 100 : Number(raw);
    const w = Number(weights[key]) || 0;
    sum += val * w; wTotal += w;
  }
  return wTotal === 0 ? null : sum / wTotal;
}

// Map an explicit user RRL-usage choice to a tier (overrides the AI tier).
const USAGE_TIER_MAP = {
  core:       'CORE',
  supporting: 'SUPPORTING',
  background: 'TANGENTIAL',
  exclude:    'EXCLUDED',
};

// Resolve the final tier for a document, honoring (1) explicit user override,
// (2) user-customized weights, then (3) the default AI tiering.
function resolveTier(insight, usageChoice, weights) {
  if (usageChoice && USAGE_TIER_MAP[usageChoice]) return USAGE_TIER_MAP[usageChoice];
  if (weights) {
    const overall = weightedOverall(insight, weights);
    if (overall != null) {
      if (overall >= 75) return 'CORE';
      if (overall >= 60) return 'SUPPORTING';
      if (overall >= 40) return 'TANGENTIAL';
      return 'SUPPORTING';
    }
  }
  return determineSourceTier(insight);
}

function parseJsonArray(str) {
  if (!str) return [];
  try {
    const parsed = JSON.parse(str);
    return Array.isArray(parsed) ? parsed.map(v => typeof v === 'string' ? v : JSON.stringify(v)) : [];
  } catch { return []; }
}

// Async background synthesis worker
async function asyncSynthesisJob({
  sessionId,
  chosenGap,
  userInstructions,
  weights,
  userGaps,
  rrlUsage,
  approvedDocs,
}) {
  console.info(`[synthesis-async] Background synthesis started for session ${sessionId}...`);
  try {
    // Load baseline
    const { data: baselines } = await supabase
      .from('research_baselines').select('*')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: false }).limit(1);
    const baseline = baselines?.[0] ?? null;

    // Load insights + determine tiers
    const tieredDocs = await Promise.all(approvedDocs.map(async (doc) => {
      const { data: insight } = await supabase.from('document_insights').select('*').eq('document_id', doc.id).maybeSingle();
      const { data: excerpts } = insight
        ? await supabase.from('evidence_excerpts').select('*').eq('document_insight_id', insight.id).order('display_order')
        : { data: [] };
      const fullInsight = insight ? { ...insight, evidenceExcerpts: excerpts ?? [] } : null;
      const docUsage = rrlUsage[doc.id] ?? rrlUsage[String(doc.id)] ?? {};
      const usageChoice = docUsage.usage ?? null;
      const tier = resolveTier(fullInsight, usageChoice, weights);
      const emphasizedExcerpts = docUsage.emphasizedExcerpts ?? [];
      const customExcerpts = docUsage.customExcerpts ?? [];
      return { doc, insight: fullInsight, tier, emphasizedExcerpts, customExcerpts };
    }));

    const usableDocs = tieredDocs.filter(d => d.tier !== 'EXCLUDED');
    if (!usableDocs.length) {
      console.warn(`[synthesis-async] No usable documents for session ${sessionId}`);
      await supabase.from('generated_draft').update({
        validation_status: 'FAILED',
        metrics_json: JSON.stringify({ error: 'No sufficiently relevant approved sources are available for synthesis.' }),
      }).eq('session_id', sessionId);
      return;
    }

    // Build n8n payload
    const gapsRaw = baseline?.research_gaps;
    const baselineGaps = Array.isArray(gapsRaw) ? gapsRaw : (gapsRaw ? [gapsRaw] : []);
    const gapsArray = userGaps && userGaps.length ? userGaps : baselineGaps;

    const citationByDocId = new Map();
    for (const { doc } of usableDocs) {
      citationByDocId.set(
        String(doc.id),
        extractCitationMetadata(doc.file_name, doc.parsed_text, doc.citation_metadata_json),
      );
    }
    const allCitationMetas = [...citationByDocId.values()];
    const lowConfidence = allCitationMetas.filter((m) => !m.metadataReliable);

    const citationRules =
      'CITATION RULES (STRICT): every approved document carries a `citation` object '
      + '(`inTextParenthetical`, `inTextNarrative`, `reference`) extracted from that PDF\'s own '
      + 'front matter. Cite ONLY by copying those strings verbatim. Never invent, guess, shorten, '
      + 'reorder or re-date an author. Never place a paper\'s TITLE in the author position. Never take '
      + 'a year from the body text, a dataset name, or another work\'s in-text citation. '
      + 'When `citation.reliable` is false the metadata could not be verified: cite it exactly as '
      + 'supplied (APA title-in-author-position and/or "n.d.") and do not substitute a guessed author or year. '
      + 'The References section must contain exactly one entry per cited source, copied verbatim from `citation.reference`.';

    const baseInstructions =
      'The CATalyst Title, Rationale, and Research Gap are the primary source of truth. '
      + 'Approved documents are supplementary evidence. You should aim to cite the approved documents provided in the `approvedDocuments` array. '
      + 'However, if an approved document contains absolutely no usable content related to the topic or chosen research gap, you have the freedom to omit it from the synthesis. '
      + 'Do not force a citation if the document is completely irrelevant to the narrative. '
      + 'The primaryFocusGap is the user\'s selected gap and should be treated as the main structural narrative pivot. '
      + 'The remaining gaps provide supporting context. '
      + 'When a source provides emphasizedExcerpts or customHighlights, treat those passages as the user\'s highlighted, highest-priority evidence. '
      + citationRules;

    // Resolve full text lazily from R2 if r2_text_key is available
    const resolvedApprovedDocuments = await Promise.all(
      usableDocs.map(async ({ doc, insight, tier, emphasizedExcerpts, customExcerpts }) => {
        let fullText = doc.parsed_text;
        if (doc.r2_text_key) {
          try {
            const r2Text = await getTextFromR2(doc.r2_text_key);
            if (r2Text?.trim()) fullText = r2Text;
          } catch (r2Err) {
            console.warn(`[synthesis-async] Failed to load R2 text for doc ${doc.id}:`, r2Err.message);
          }
        }

        const meta = citationByDocId.get(String(doc.id));
        const emphasizeSet = new Set((emphasizedExcerpts || []).map(Number));
        const dbExcerpts = (insight?.evidenceExcerpts ?? []).map((e, idx) => ({
          quoteText:     e.quote_text,
          pageNumber:    e.page_number,
          relevanceLevel:e.relevance_level,
          criterion:     e.criterion,
          evidenceType:  e.evidence_type,
          displayOrder:  e.display_order,
          emphasized:    emphasizeSet.has(idx),
        }));
        const userCustomHighlights = (customExcerpts || []).map((t) => ({
          quoteText: String(t).trim(),
          pageNumber: null,
          relevanceLevel: 'High',
          criterion: 'User Emphasis',
          evidenceType: 'Custom Highlight',
          displayOrder: 0,
          emphasized: true,
          isCustom: true,
        })).filter((c) => c.quoteText);
        const excerpts = [...userCustomHighlights, ...dbExcerpts];
        const userEmphasizedExcerpts = excerpts.filter((e) => e.emphasized);
        const scores = {
          gapAlignment:  insight?.gap_alignment_score ?? null,
          methodology:   insight?.methodology_score    ?? null,
          theory:        insight?.theoretical_score    ?? null,
          citationQuality:insight?.citation_score      ?? null,
          overall:        insight?.overall_score        ?? null,
        };

        return {
          documentId:          String(doc.id),
          filename:            doc.file_name ?? '',
          extracted_text:      fullText,
          sourceTier:          TIER_META[tier].payloadValue,
          sourceUseGuidance:   TIER_META[tier].guidance,
          overallScore:        insight?.overall_score         ?? null,
          recommendationStatus:insight?.recommendation_status ?? null,
          confidenceLevel:     insight?.confidence_level       ?? null,
          relevanceLevel:      insight?.relevance_level         ?? null,
          mismatchFlagsJson:   insight?.mismatch_flags_json  ?? '[]',
          weaknessFlagsJson:   insight?.weakness_flags_json  ?? '[]',
          mismatchFlags:       parseJsonArray(insight?.mismatch_flags_json),
          weaknessFlags:       parseJsonArray(insight?.weakness_flags_json),
          scores,
          evidenceExcerpts:    excerpts,
          emphasizedExcerpts:  userEmphasizedExcerpts,
          customHighlights:    (customExcerpts || []).map((t) => String(t).trim()).filter(Boolean),
          metadata:            meta,
          citation:            meta.citation,
        };
      })
    );

    const payload = {
      sessionId,
      synthesisInstructions: userInstructions
        ? `${baseInstructions} ADDITIONAL USER INSTRUCTIONS (must be followed): ${userInstructions}`
        : baseInstructions,
      userInstructions: userInstructions || null,
      baseline: {
        title:     baseline?.project_title ?? '',
        rationale: baseline?.rationale     ?? '',
        gaps:      gapsArray,
        ...(chosenGap?.trim() ? { primaryFocusGap: chosenGap.trim(), chosenGap: chosenGap.trim() } : {}),
      },
      sourceTierSummary: {
        core:       usableDocs.filter(d => d.tier === 'CORE').length,
        supporting: usableDocs.filter(d => d.tier === 'SUPPORTING').length,
        tangential: usableDocs.filter(d => d.tier === 'TANGENTIAL').length,
      },
      citationRules,
      referenceList: buildReferenceList(allCitationMetas),
      approvedDocuments: resolvedApprovedDocuments,
    };

    const webhookUrl = process.env.CITEWISE_N8N_SYNTHESIS_WEBHOOK_URL
      || 'http://localhost:5678/webhook/citewise-synthesizer-fixed';

    let n8nData;
    const n8nRes = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Connection: 'close' },
      body:    JSON.stringify(payload),
      timeout: parseInt(process.env.CITEWISE_N8N_READ_TIMEOUT_MS) || 120000,
    });
    const raw = await n8nRes.text();

    if (!raw?.trim()) {
      throw new Error(`Synthesis webhook returned an empty response. HTTP ${n8nRes.status}`);
    }
    if (!n8nRes.ok) {
      throw new Error(`Synthesis workflow returned HTTP ${n8nRes.status}: ${raw.slice(0, 300)}`);
    }

    let root;
    try {
      root = JSON.parse(raw);
    } catch {
      throw new Error(`Synthesis workflow returned a non-JSON response: ${raw.slice(0, 300)}`);
    }
    if (Array.isArray(root) && root.length) root = root[0];
    for (const f of ['output','body','data','json','result']) {
      if (root[f] && typeof root[f] === 'object') { root = root[f]; break; }
      if (root[f] && typeof root[f] === 'string') { try { root = JSON.parse(root[f]); break; } catch {} }
    }
    n8nData = root;

    const success          = n8nData.success !== false;
    const message          = n8nData.message ?? '';
    const validationStatus = n8nData.validationStatus ?? '';
    const validationFlags  = Array.isArray(n8nData.validationFlags) ? n8nData.validationFlags : [];

    // Citation integrity pass
    const citationFixes = [];
    const unverifiedCitations = [];
    const reconcile = (text) => {
      const { text: fixed, fixes, unverified } = reconcileInTextCitations(text, allCitationMetas);
      citationFixes.push(...fixes);
      unverifiedCitations.push(...unverified);
      return fixed;
    };

    const contentText = reconcile(n8nData.contentText ?? '');
    const sections = n8nData.sections
      ? {
          ...n8nData.sections,
          background: reconcile(n8nData.sections.background),
          rationale:  reconcile(n8nData.sections.rationale),
          gap:        reconcile(n8nData.sections.gap),
        }
      : null;

    const fullTextToCheck = contentText + ' ' + 
      (sections?.background || '') + ' ' + 
      (sections?.rationale || '') + ' ' + 
      (sections?.gap || '');

    const citedMetas = allCitationMetas.filter((meta) => {
      if (!meta?.citation) return false;
      const inTextP = meta.citation.inTextParenthetical;
      const inTextAuthors = meta.citation.inTextAuthors;
      const shortTitle = meta.citation.shortTitle;
      const srcFile = meta.citation.sourceFile;
      if (inTextP && fullTextToCheck.includes(inTextP)) return true;
      if (inTextAuthors && fullTextToCheck.includes(inTextAuthors)) return true;
      if (shortTitle && fullTextToCheck.includes(shortTitle)) return true;
      if (srcFile && fullTextToCheck.includes(srcFile)) return true;
      return false;
    });

    const referencesText = n8nData.referencesText ?? ((citedMetas.length > 0 ? buildReferenceList(citedMetas) : buildReferenceList(allCitationMetas)) || '');

    const omittedDocuments = usableDocs
      .filter(d => {
        const meta = citationByDocId.get(String(d.doc.id));
        return meta && !citedMetas.includes(meta);
      })
      .map(d => ({
        file: d.doc.file_name || d.doc.name || 'Unnamed source',
        id: d.doc.id,
      }));

    const citationIntegrity = {
      correctedCount:  citationFixes.length,
      corrections:     citationFixes,
      unverified:      [...new Set(unverifiedCitations)],
      lowConfidenceSources: lowConfidence.map((m) => ({
        file:     m.citation.sourceFile,
        citation: m.citation.inTextParenthetical,
        warnings: m.warnings,
      })),
      omittedDocuments,
    };

    if (!success || (validationStatus && validationStatus.toUpperCase() !== 'PASSED')) {
      console.warn(`[synthesis-async] Synthesis validation not passed: status="${validationStatus}"`);
      await supabase.from('generated_draft').update({
        validation_status: validationStatus || 'FAILED',
        validation_flags_json: JSON.stringify(validationFlags),
        metrics_json: JSON.stringify({
          error: message || n8nData.errorMessage || 'Synthesis validation failed',
          retryRecommended: n8nData.retryRecommended ?? false,
        }),
      }).eq('session_id', sessionId);
      return;
    }

    // Persist finalized draft
    await supabase.from('generated_draft').update({
      content_text:                contentText,
      references_text:             referencesText,
      background_text:             sections?.background ?? null,
      rationale_text:              sections?.rationale  ?? null,
      gap_text:                    sections?.gap        ?? null,
      citations_used_json:         n8nData.citationsUsed ? JSON.stringify(n8nData.citationsUsed) : '[]',
      validation_status:           'PASSED',
      validation_flags_json:       JSON.stringify(validationFlags),
      unsupported_claim_flags_json:JSON.stringify(n8nData.unsupportedClaimFlags ?? []),
      metrics_json:                JSON.stringify({
        ...(n8nData.metrics ?? {}),
        citationIntegrity,
      }),
    }).eq('session_id', sessionId);

    console.info(`[synthesis-async] ✅ Draft synthesis completed and persisted for session ${sessionId}.`);
  } catch (err) {
    console.error(`[synthesis-async] Fatal error during synthesis for session ${sessionId}:`, err.message);
    await supabase.from('generated_draft').update({
      validation_status: 'FAILED',
      metrics_json: JSON.stringify({ error: err.message }),
    }).eq('session_id', sessionId);
  }
}

// POST /api/v1/synthesis/generate?sessionId=...&chosenGap=...
// Returns HTTP 202 Accepted in <100ms and executes synthesis asynchronously in background.
router.post('/generate', async (req, res) => {
  const sessionId = req.query.sessionId;
  const body = req.body || {};
  const chosenGap = (req.query.chosenGap ?? body.primaryFocusGap) || null;
  const userInstructions = (body.userInstructions || '').toString().trim();
  const weights = body.weights && typeof body.weights === 'object' ? body.weights : null;
  const userGaps = Array.isArray(body.gaps) ? body.gaps.map((g) => String(g).trim()).filter(Boolean) : null;
  const rrlUsage = body.rrlUsage && typeof body.rrlUsage === 'object' ? body.rrlUsage : {};
  const approvedDocumentIds = Array.isArray(body.approvedDocumentIds) ? body.approvedDocumentIds : null;

  if (!sessionId) return res.status(400).json({ success: false, message: 'sessionId is required', data: null });

  // Sync approved IDs from client payload to database if provided
  const parseId = (id) => (isNaN(Number(id)) ? id : Number(id));
  const payloadDocIds = (approvedDocumentIds || []).map(parseId).filter(Boolean);
  const rrlDocIds = Object.keys(rrlUsage || {})
    .filter((id) => rrlUsage[id]?.usage !== 'exclude')
    .map(parseId)
    .filter(Boolean);
  const allApprovedIds = [...new Set([...payloadDocIds, ...rrlDocIds])];

  if (allApprovedIds.length > 0) {
    await supabase.from('uploaded_documents').update({ approved: true, session_id: sessionId }).in('id', allApprovedIds);
  }

  // Load approved documents
  let { data: approvedDocs, error: docsErr } = await supabase
    .from('uploaded_documents').select('*')
    .eq('session_id', sessionId).eq('approved', true);
  if (docsErr) return res.status(500).json({ success: false, message: docsErr.message });

  if (allApprovedIds.length > 0) {
    const existingIds = new Set((approvedDocs || []).map((d) => String(d.id)));
    const missingIds = allApprovedIds.filter((id) => !existingIds.has(String(id)));
    if (missingIds.length > 0) {
      const { data: docsById } = await supabase.from('uploaded_documents').select('*').in('id', missingIds);
      if (docsById && docsById.length > 0) {
        approvedDocs = [...(approvedDocs || []), ...docsById];
      }
    }
  }

  if (Array.isArray(approvedDocumentIds)) {
    const allowed = new Set(approvedDocumentIds.map(String));
    approvedDocs = (approvedDocs || []).filter(d => allowed.has(String(d.id)));
  }

  const docsWithText = (approvedDocs ?? []).filter(d => d.parsed_text?.trim() || d.r2_text_key);
  if (!docsWithText.length) {
    return res.status(400).json({ success: false, message: 'Approve at least one document before generating an introduction.' });
  }

  // Reset or create placeholder draft row in GENERATING status
  await supabase.from('generated_draft').delete().eq('session_id', sessionId);
  const { data: placeholderDraft, error: draftInitErr } = await supabase
    .from('generated_draft')
    .insert({
      session_id:                  sessionId,
      content_text:                '',
      references_text:             '',
      background_text:             null,
      rationale_text:              null,
      gap_text:                    null,
      citations_used_json:         '[]',
      validation_status:           'GENERATING',
      validation_flags_json:       '[]',
      unsupported_claim_flags_json:'[]',
      metrics_json:                '{}',
    })
    .select()
    .single();

  if (draftInitErr) {
    console.error('[synthesis] failed to initialize draft row:', draftInitErr.message);
    return res.status(500).json({ success: false, message: draftInitErr.message });
  }

  // Dispatch background job (Heroku-safe async execution)
  setImmediate(() => {
    asyncSynthesisJob({
      sessionId,
      chosenGap,
      userInstructions,
      weights,
      userGaps,
      rrlUsage,
      approvedDocs: docsWithText,
    });
  });

  return res.status(202).json({
    success: true,
    status: 'GENERATING',
    draftId: placeholderDraft.id,
    sessionId,
    message: 'Draft synthesis started in the background.',
  });
});

// GET /api/v1/synthesis/status?sessionId=...
// Fast status endpoint for frontend polling
router.get('/status', async (req, res) => {
  const { sessionId } = req.query;
  if (!sessionId) return res.status(400).json({ success: false, message: 'sessionId is required' });

  const { data: draft, error } = await supabase
    .from('generated_draft')
    .select('*')
    .eq('session_id', sessionId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) return res.status(500).json({ success: false, message: error.message });
  if (!draft) {
    return res.status(404).json({ success: false, status: 'NOT_FOUND', message: 'No draft found for this session' });
  }

  if (draft.validation_status === 'GENERATING') {
    return res.json({
      success: true,
      status: 'GENERATING',
      sessionId,
      draftId: draft.id,
      createdAt: draft.created_at,
    });
  }

  const metrics = draft.metrics_json
    ? (typeof draft.metrics_json === 'string' ? JSON.parse(draft.metrics_json) : draft.metrics_json)
    : {};

  if (draft.validation_status === 'FAILED') {
    return res.json({
      success: false,
      status: 'FAILED',
      message: metrics.error || 'Synthesis generation failed',
      validationFlags: draft.validation_flags_json
        ? (typeof draft.validation_flags_json === 'string' ? JSON.parse(draft.validation_flags_json) : draft.validation_flags_json)
        : [],
      metrics,
      createdAt: draft.created_at,
    });
  }

  const citationsUsed = draft.citations_used_json
    ? (typeof draft.citations_used_json === 'string' ? JSON.parse(draft.citations_used_json) : draft.citations_used_json)
    : [];

  const validationFlags = draft.validation_flags_json
    ? (typeof draft.validation_flags_json === 'string' ? JSON.parse(draft.validation_flags_json) : draft.validation_flags_json)
    : [];

  return res.json({
    success: true,
    status: draft.validation_status || 'PASSED',
    draftId: draft.id,
    sessionId,
    contentText: draft.content_text,
    referencesText: draft.references_text,
    sections: {
      background: draft.background_text,
      rationale:  draft.rationale_text,
      gap:        draft.gap_text,
    },
    citationsUsed,
    citationIntegrity: metrics.citationIntegrity ?? null,
    validationStatus: draft.validation_status,
    validationFlags,
    metrics,
    createdAt: draft.created_at,
  });
});

// GET /api/v1/synthesis/export?draftId=...&format=txt
router.get('/export', async (req, res) => {
  const { draftId, format = 'txt' } = req.query;
  if (!draftId) return res.status(400).json({ message: 'draftId is required' });

  const { data: draft } = await supabase.from('generated_draft').select('*').eq('id', draftId).maybeSingle();
  if (!draft) return res.status(404).end();

  let content = draft.content_text ?? '';
  if (draft.references_text?.trim()) content += '\n\nReferences\n' + draft.references_text;

  res.setHeader('Content-Type', 'application/octet-stream');
  res.setHeader('Content-Disposition', `attachment; filename="draft_${draftId}.${format.toLowerCase()}"`);
  return res.send(Buffer.from(content, 'utf8'));
});

// ── Title generation derived from the research gap(s) ───────────────
// Req 1: the title is an OUTCOME of the chosen gap analysis (+ rationale +
// RRLs), not the starting point. This builds candidate titles deterministically
// from the selected gap so it works without depending on an external webhook;
// if CITEWISE_N8N_TITLE_WEBHOOK_URL is set, that takes precedence.

const STOPWORDS = new Set(['the','a','an','of','to','in','on','for','and','or','with','by','is','are','that','this','these','those','as','at','from','into','about','between','among','their','its','it','be','using','use','used','based','study','research','paper','gap','gaps','lack','limited','little','few','no','not','there','has','have','been','which','while','however','although','despite','within','across','toward','towards','more','less','can','may','should','would']);

function keyphrasesFromText(text, limit = 6) {
  const words = String(text || '')
    .replace(/[^a-zA-Z0-9\s-]/g, ' ')
    .split(/\s+/)
    .map((w) => w.trim())
    .filter((w) => w.length > 2 && !STOPWORDS.has(w.toLowerCase()));
  // Build 2-word phrases first (more title-like), fall back to single words.
  const phrases = [];
  for (let i = 0; i < words.length - 1; i++) {
    const a = words[i], b = words[i + 1];
    if (a[0] === a[0]?.toUpperCase() || b[0] === b[0]?.toUpperCase()) {
      phrases.push(`${a} ${b}`);
    }
  }
  const seen = new Set();
  const ordered = [...phrases, ...words].filter((p) => {
    const k = p.toLowerCase();
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
  return ordered.slice(0, limit);
}

function titlecase(str) {
  return String(str || '')
    .split(/\s+/)
    .map((w) => (w.length > 3 ? w.charAt(0).toUpperCase() + w.slice(1) : w))
    .join(' ')
    .trim();
}

function buildTitleCandidates(gapText, rationale, contextTerms) {
  const gapPhrases = keyphrasesFromText(gapText, 5);
  const ctx = (contextTerms && contextTerms.length ? contextTerms : keyphrasesFromText(rationale, 4));
  const subject = titlecase(gapPhrases[0] || ctx[0] || 'the Identified Research Gap');
  const aspect = titlecase(gapPhrases[1] || ctx[1] || subject);
  const domain = titlecase(ctx[0] || gapPhrases[2] || 'Contemporary Practice');

  const candidates = [
    `Addressing ${subject}: ${aspect} in ${domain}`,
    `Bridging the Gap in ${subject}: An Analysis of ${aspect}`,
    `Toward ${aspect}: Investigating ${subject} in ${domain}`,
    `${subject} Reconsidered: A Study of ${aspect} and Its Implications`,
    `Rethinking ${domain}: The Role of ${aspect} in ${subject}`,
  ];
  // De-dup and drop empties / degenerate ones.
  const seen = new Set();
  return candidates
    .map((c) => c.replace(/\s+/g, ' ').trim())
    .filter((c) => {
      const k = c.toLowerCase();
      if (seen.has(k) || c.length < 12) return false;
      seen.add(k);
      return true;
    });
}

// POST /api/v1/synthesis/titles
// Body: { sessionId?, gapText, gaps?[], rationale? }
router.post('/titles', async (req, res) => {
  const { sessionId } = req.body || {};
  let gapText = (req.body?.gapText || '').toString().trim();
  let rationale = (req.body?.rationale || '').toString().trim();
  const gaps = Array.isArray(req.body?.gaps) ? req.body.gaps.map((g) => String(g).trim()).filter(Boolean) : [];

  // Backfill from the persisted baseline if not supplied.
  if ((!gapText || !rationale) && sessionId) {
    const { data: baselines } = await supabase
      .from('research_baselines').select('*')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: false }).limit(1);
    const baseline = baselines?.[0];
    if (baseline) {
      if (!rationale) rationale = baseline.rationale || '';
      if (!gapText) {
        const bg = baseline.research_gaps;
        gapText = Array.isArray(bg) ? (bg[0] || '') : (bg || '');
      }
    }
  }

  if (!gapText && gaps.length) gapText = gaps[0];
  if (!gapText) {
    return res.status(400).json({ success: false, message: 'A research gap is required to derive a title.', data: null });
  }

  // Optional external generator.
  const webhookUrl = process.env.CITEWISE_N8N_TITLE_WEBHOOK_URL;
  if (webhookUrl) {
    try {
      const r = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gapText, gaps, rationale }),
        timeout: parseInt(process.env.CITEWISE_N8N_READ_TIMEOUT_MS) || 60000,
      });
      const raw = await r.text();
      if (raw?.trim()) {
        let root = JSON.parse(raw);
        if (Array.isArray(root) && root.length) root = root[0];
        const titles = root.titles || root.suggestions || root.output?.titles;
        if (Array.isArray(titles) && titles.length) {
          return res.json({ success: true, data: { titles: titles.map(String).slice(0, 6), source: 'n8n' } });
        }
      }
    } catch (err) {
      console.warn('[titles] webhook failed, falling back to local generator:', err.message);
    }
  }

  const contextTerms = keyphrasesFromText([rationale, ...gaps.slice(1)].join('. '), 5);
  const titles = buildTitleCandidates(gapText, rationale, contextTerms);
  return res.json({ success: true, data: { titles, source: 'derived' } });
});

// POST /api/v1/synthesis/update-citations
// Updates the current draft's citations locally without calling the LLM.
// Optionally accepts `contentText` from the client body so that post-edit /
// post-paraphrase text can be reconciled and persisted rather than reverting
// to the stale database copy (fixes state-desync issue).
router.post('/update-citations', async (req, res) => {
  const { sessionId, contentText: clientContentText } = req.body;
  if (!sessionId) return res.status(400).json({ success: false, message: 'sessionId is required' });

  const { data: draft } = await supabase.from('generated_draft').select('*').eq('session_id', sessionId).maybeSingle();
  if (!draft) return res.status(404).json({ success: false, message: 'No draft found' });

  const { data: approvedDocs } = await supabase.from('uploaded_documents').select('*').eq('session_id', sessionId).eq('approved', true);
  if (!approvedDocs) return res.status(500).json({ success: false, message: 'Failed to load documents' });

  const allCitationMetas = approvedDocs.map((doc) =>
    extractCitationMetadata(doc.file_name, doc.parsed_text, doc.citation_metadata_json)
  );

  const reconcile = (text) => {
    const { text: fixed } = reconcileInTextCitations(text, allCitationMetas);
    return fixed;
  };

  // Prefer the client's current text (which may be paraphrased / manually edited)
  // over the stale DB copy, so user edits are never silently overwritten.
  const contentText  = reconcile(clientContentText  || draft.content_text   || '');
  const background   = reconcile(draft.background_text  || '');
  const rationale    = reconcile(draft.rationale_text   || '');
  const gap          = reconcile(draft.gap_text         || '');

  const fullTextToCheck = contentText + ' ' + background + ' ' + rationale + ' ' + gap;

  const citedMetas = allCitationMetas.filter((meta) => {
    if (!meta?.citation) return false;
    const { inTextParenthetical, inTextAuthors, shortTitle, sourceFile } = meta.citation;
    if (inTextParenthetical && fullTextToCheck.includes(inTextParenthetical)) return true;
    if (inTextAuthors       && fullTextToCheck.includes(inTextAuthors))       return true;
    if (shortTitle          && fullTextToCheck.includes(shortTitle))          return true;
    if (sourceFile          && fullTextToCheck.includes(sourceFile))          return true;
    return false;
  });

  const referencesText = draft.references_text || (citedMetas.length > 0
    ? buildReferenceList(citedMetas)
    : buildReferenceList(allCitationMetas));

  await supabase.from('generated_draft').update({
    content_text:    contentText,
    background_text: background,
    rationale_text:  rationale,
    gap_text:        gap,
    references_text: referencesText,
  }).eq('id', draft.id);

  return res.json({ success: true, contentText, referencesText });
});

// POST /api/v1/synthesis/save-draft
// Persists a manually edited or paraphrased draft back to the database so the
// DB is always in sync with whatever the user has on screen.
router.post('/save-draft', async (req, res) => {
  const { sessionId, contentText, referencesText, source } = req.body;
  if (!sessionId)   return res.status(400).json({ success: false, message: 'sessionId is required' });
  if (!contentText) return res.status(400).json({ success: false, message: 'contentText is required' });

  const { data: draft } = await supabase
    .from('generated_draft').select('id').eq('session_id', sessionId).maybeSingle();

  if (!draft) {
    return res.status(404).json({
      success: false,
      message: 'No draft found for this session. Generate a draft first.',
    });
  }

  const { error } = await supabase.from('generated_draft').update({
    content_text:      contentText,
    references_text:   referencesText ?? null,
    // Track the edit source in the validation_status column for audit purposes.
    validation_status: source ? `manual_${source}` : 'manual_edited',
  }).eq('id', draft.id);

  if (error) {
    console.error('[save-draft] Supabase update failed:', error.message);
    return res.status(500).json({ success: false, message: error.message });
  }

  return res.json({ success: true, draftId: draft.id });
});

// POST /api/v1/synthesis/paraphrase
// Paraphrases text to remove AI slop using an n8n workflow load balancer.
//
// Citation-safety strategy: APA parenthetical citations are extracted from the
// input text and replaced with stable numeric placeholders BEFORE the text is
// sent to the LLM. After the LLM returns, placeholders are swapped back for the
// original citation strings verbatim — the LLM can therefore never corrupt a
// citation regardless of how aggressively it rewrites the surrounding prose.
router.post('/paraphrase', async (req, res) => {
  const { text } = req.body;
  if (!text) return res.status(400).json({ success: false, message: 'Text is required' });

  // ── Step 1: extract APA citations and replace with opaque placeholders ───
  // Matches: (Author, YYYY), (Author et al., YYYY), (Author & Author, YYYY),
  // multi-source "(A, YYYY; B, YYYY)", and "n.d." variants.
  const CITATION_RE = /\((?:[A-Z][^()]{1,120}?,\s*(?:n\.d\.|[12]\d{3}[a-z]?)(?:\s*;\s*[A-Z][^()]{1,120}?,\s*(?:n\.d\.|[12]\d{3}[a-z]?))*)\)/g;

  const citations = [];   // ordered list of original citation strings
  const protectedText = text.replace(CITATION_RE, (match) => {
    const idx = citations.length;
    citations.push(match);
    return `«CIT${idx}»`;
  });

  // ── Step 2: call n8n paraphraser with the citation-safe text ────────────
  const baseUrl = (process.env.N8N_BASE_URL || '').replace(/\/$/, '');
  const webhookUrl = process.env.CITEWISE_N8N_PARAPHRASE_WEBHOOK_URL
    || (baseUrl ? `${baseUrl}/webhook/citewise-paraphraser-lb` : 'http://localhost:5678/webhook/citewise-paraphraser-lb');

  let paraphrased;
  try {
    const n8nRes = await fetch(webhookUrl, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json', Connection: 'close' },
      body:    JSON.stringify({ text: protectedText }),
      timeout: parseInt(process.env.CITEWISE_N8N_READ_TIMEOUT_MS) || 120000,
    });
    const raw = await n8nRes.text();
    if (!raw?.trim()) throw new Error('Paraphraser webhook returned empty response');

    let root = JSON.parse(raw);
    if (Array.isArray(root) && root.length) root = root[0];

    for (const f of ['output', 'body', 'data', 'json', 'result', 'paraphrasedText']) {
      if (root[f] && typeof root[f] === 'string') { paraphrased = root[f]; break; }
      if (root[f] && typeof root[f] === 'object' && typeof root[f].paraphrasedText === 'string') {
        paraphrased = root[f].paraphrasedText; break;
      }
    }
    if (!paraphrased && root.paraphrasedText) paraphrased = root.paraphrasedText;
    if (!paraphrased) {
      return res.status(502).json({ success: false, message: 'Could not extract paraphrased text from n8n response' });
    }
  } catch (err) {
    console.error('[paraphrase] n8n call failed:', err.message);
    return res.status(502).json({ success: false, message: `Paraphrase failed: ${err.message}` });
  }

  // ── Step 3: reattach original citations verbatim ─────────────────────────
  const PLACEHOLDER_RE = /«CIT(\d+)»/g;
  const restored = paraphrased.replace(PLACEHOLDER_RE, (_, idx) => citations[Number(idx)] ?? '');

  // Warn about any citations the LLM dropped entirely (no placeholder left).
  const placeholdersInResult = new Set(
    [...paraphrased.matchAll(PLACEHOLDER_RE)].map(m => Number(m[1]))
  );
  const dropped = citations
    .map((c, i) => ({ c, i }))
    .filter(({ i }) => !placeholdersInResult.has(i))
    .map(({ c }) => c);

  if (dropped.length) {
    console.warn(`[paraphrase] LLM dropped ${dropped.length} citation(s):`, dropped.join(' '));
  }

  return res.json({ success: true, text: restored, droppedCitations: dropped });
});

export default router;
