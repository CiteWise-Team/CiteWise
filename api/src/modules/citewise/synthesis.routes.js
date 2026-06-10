// /api/v1/synthesis  – RAG intro drafting via n8n + draft persistence
// Ports DraftGenerationController.java + RAGSynthesisService.java + SynthesisN8nClient.java

import express from 'express';
import fetch   from 'node-fetch';
import { v4 as uuidv4 } from 'uuid';
import supabase from '../../common/config/supabaseClient.js';

const router = express.Router();

// Source tier logic (port of RAGSynthesisService.determineSourceTier)
function determineSourceTier(insight) {
  const overall    = insight?.overall_score ?? null;
  const rec        = insight?.recommendation_status ?? null;
  const rel        = insight?.relevance_level ?? null;
  const mismatchJson = insight?.mismatch_flags_json ?? '';

  const hasMismatch = mismatchJson.toUpperCase().includes('TOPIC_MISMATCH');

  if ((overall !== null && overall < 40) || rec === 'Low Relevance' || rel === 'Low' || hasMismatch) return 'EXCLUDED';
  if ((overall !== null && overall >= 75) || rec === 'Recommended' || rel === 'High') return 'CORE';
  if ((overall !== null && overall >= 60 && overall < 75) || rec === 'Needs Review' || rel === 'Medium') return 'SUPPORTING';
  if (overall !== null && overall >= 40 && overall < 60) return 'TANGENTIAL';
  return 'SUPPORTING';
}

const TIER_META = {
  CORE:       { payloadValue: 'Core Source',       guidance: 'Use as main synthesis evidence.' },
  SUPPORTING: { payloadValue: 'Supporting Source', guidance: 'Use cautiously as supporting evidence.' },
  TANGENTIAL: { payloadValue: 'Tangential Source', guidance: 'Do not center the generated introduction on this source; use only for broad background if needed.' },
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
      const rec = insight?.recommendation_status ?? null;
      const rel = insight?.relevance_level ?? null;
      const hasMismatch = (insight?.mismatch_flags_json ?? '').toUpperCase().includes('TOPIC_MISMATCH');
      if (overall < 40 || rec === 'Low Relevance' || rel === 'Low' || hasMismatch) return 'EXCLUDED';
      if (overall >= 75) return 'CORE';
      if (overall >= 60) return 'SUPPORTING';
      if (overall >= 40) return 'TANGENTIAL';
      return 'SUPPORTING';
    }
  }
  return determineSourceTier(insight);
}

// Simple citation metadata from filename (mirrors CitationMetadataExtractor minimal logic)
// Checks whether a string looks like a generic/suspicious author label rather
// than a real human name (mirrors the same guard in the n8n Build Synthesis Packet node).
function suspiciousAuthor(value) {
  const s = String(value ?? '').trim().toLowerCase();
  if (!s) return true;
  return /^(article|articles|unknown|author|authors|source|sources|paper|papers|research|study|studies|journal|document|documents|untitled)$/.test(s)
    || /^(article|articles)\b/.test(s);
}

// Extracts citation metadata from PDF text content + filename.
// Order of preference:
//   1. Stored AI metadata (citation_metadata_json column, populated by the
//      n8n metadata-extractor webhook after scoring).
//   2. Heuristic extraction from the parsed PDF text (covers arXiv, IEEE,
//      ACM, and most standard academic formats).
//   3. Filename-pattern fallback ("Author (Year) Title.pdf").
function extractCitationFromFilename(filename, text, storedMetaJson) {
  // ── 1. Use AI-extracted metadata when available ──────────────────
  if (storedMetaJson) {
    try {
      const stored = typeof storedMetaJson === 'string' ? JSON.parse(storedMetaJson) : storedMetaJson;
      if (stored && stored.metadataReliable && stored.title && stored.year && stored.authorDisplay) {
        return {
          author: stored.authorDisplay,
          authorDisplay: stored.authorDisplay,
          authors: Array.isArray(stored.authors) ? stored.authors : [stored.authorDisplay],
          year: stored.year,
          title: stored.title,
          journal: stored.journal || '',
          volume: stored.volume || '', issue: stored.issue || '', pages: stored.pages || '',
          doi: stored.doi || '', url: stored.url || '', publisher: stored.publisher || '',
          sourceType: 'document', metadataReliable: true, warnings: [],
        };
      }
    } catch { /* fall through to heuristic */ }
  }

  const name = (filename ?? '').replace(/\.pdf$/i, '').trim();
  const raw  = String(text ?? '').replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  // First 6 000 chars hold title + authors + abstract for virtually all papers.
  const head = raw.slice(0, 6000);

  let year = null, title = null, authorDisplay = null, authors = [], journal = null, doi = null;

  // ── DOI ──────────────────────────────────────────────────────────
  const doiMatch = head.match(/\b(?:doi|DOI)[:\s\/]+([^\s,;)\]]+)/);
  if (doiMatch) doi = doiMatch[1].replace(/[.,;)\]]+$/, '');

  // ── Year: arXiv ID in filename (YYMM.NNNNN → 20YY) ───────────────
  const arxivFilename = name.match(/^(\d{2})\d{2}\.\d{4,}/);
  if (arxivFilename) {
    const yy = parseInt(arxivFilename[1], 10);
    year = String(yy <= 30 ? 2000 + yy : 1900 + yy);
  }

  // ── Year: arXiv header in text ("arXiv:2207.02475v1 [...] Jul 2022") ─
  if (!year) {
    const arxivHeader = head.match(/arXiv:\d{4}\.\d+[^\n]*?(20[0-2]\d|19[89]\d)/);
    if (arxivHeader) year = arxivHeader[1];
  }

  // ── Year: copyright / submission / publication date ───────────────
  if (!year) {
    const patterns = [
      /(?:©|copyright|\(c\))\s*(20[0-2]\d|19[89]\d)/i,
      /(?:received|accepted|published|submitted)[^\n]{0,40}(20[0-2]\d|19[89]\d)/i,
      /\b(20[0-2]\d|19[89]\d)\b/,
    ];
    for (const p of patterns) {
      const m = head.match(p);
      if (m) { year = m[1]; break; }
    }
  }

  // ── Title: first substantial line before "Abstract" ──────────────
  const abstractIdx = head.search(/\bAbstract\b/i);
  const zone = abstractIdx > 100 ? head.slice(0, abstractIdx) : head.slice(0, 2500);

  const skipLine = (l) =>
    /^(arXiv:|doi:|https?:|©|preprint|submitted|received|accepted|proceedings|journal|volume|issue|pages|conference|workshop|email|@|\d+\s*$)/i.test(l);

  const zoneLines = zone.split('\n').map(l => l.replace(/\s+/g, ' ').trim()).filter(l => l.length >= 10);

  for (const line of zoneLines) {
    if (!skipLine(line) && line.length >= 15 && line.length <= 350) {
      title = line;
      break;
    }
  }

  // ── Authors: lines after the title, before abstract ──────────────
  if (title) {
    const titleIdx = zoneLines.findIndex(l => l === title);
    const candidates = zoneLines.slice(titleIdx + 1, titleIdx + 8);
    for (const c of candidates) {
      if (skipLine(c) || /@/.test(c) || /^\d/.test(c)) continue;
      // Must contain at least one capitalised surname-like word.
      if (/[A-Z][a-z]{2,}/.test(c) && c.length < 250) {
        const cleaned = c
          .replace(/^\s*\d+[-–—]\s*/g, '')           // strip leading "5– " or "1- " markers
          .replace(/\s*\d+[-–—]\d*\s*/g, ' ')        // strip mid-string page-range style "5–7"
          .replace(/\s*[²-¹⁰-⁹*†‡§¶#]+\s*/g, ' ') // superscript chars
          .replace(/\s*\d+\s*(?=[,\s]|$)/g, ' ')     // trailing/isolated digit superscripts
          .replace(/\s{2,}/g, ' ')
          .trim();

        // After cleaning, the line must still start with a capital letter (real name).
        if (!cleaned || !/^[A-Z]/.test(cleaned)) continue;

        authorDisplay = cleaned;
        authors = authorDisplay
          .replace(/\s+(?:and|AND|&)\s+/g, ', ')
          .split(/\s*,\s*/)
          .map(a => a.replace(/\s*\d+\s*$/, '').trim())
          .filter(a => a.length >= 3 && /^[A-Z]/.test(a));
        if (authors.length === 0) { authorDisplay = null; continue; }
        break;
      }
    }
  }

  // ── Journal / conference ──────────────────────────────────────────
  const journalPat = [
    /(?:published in|in:)\s+([^\n]{10,80})/i,
    /(?:IEEE|ACM|Nature|Science|Springer|Elsevier|AAAI|NeurIPS|ICML|ICLR)[^\n]{0,60}/i,
  ];
  for (const p of journalPat) {
    const m = head.match(p);
    if (m) { journal = (m[1] ?? m[0]).trim(); break; }
  }

  // ── Filename fallback ("Author (Year) Title.pdf") ─────────────────
  if (!title || !authorDisplay) {
    const patterns = [
      /^([A-Z][a-zA-Z\s&.-]{2,40})\s+\(?(20[0-2]\d|19[89]\d)\)?\s+(.{10,})$/,
      /^(20[0-2]\d|19[89]\d)[_\s-]+([A-Z][a-zA-Z\s.-]{2,30})[_\s-]+(.{10,})$/,
    ];
    for (const p of patterns) {
      const m = name.match(p);
      if (m) {
        if (!authorDisplay) { authorDisplay = m[1].trim(); authors = [authorDisplay]; }
        if (!year) year = m[2];
        if (!title) title = m[3].replace(/[_-]/g, ' ').trim();
        break;
      }
    }
  }

  // Last resort: use the filename stem as title so the document isn't
  // discarded completely when no other title can be found.
  if (!title && name) {
    title = name.replace(/[_-]/g, ' ').replace(/\b\d{4,}\b/g, '').trim() || null;
  }

  const metadataReliable = Boolean(title && year && authorDisplay && !suspiciousAuthor(authorDisplay));
  const warnings = [];
  if (!authorDisplay) warnings.push('MISSING_AUTHOR');
  if (!year)          warnings.push('MISSING_YEAR');
  if (!title)         warnings.push('MISSING_TITLE');
  if (!metadataReliable) warnings.push('LOW_CONFIDENCE_METADATA');

  return {
    author: authorDisplay,
    authorDisplay,
    authors,
    year,
    title,
    journal: journal || '',
    volume: '', issue: '', pages: '',
    doi: doi || '', url: '', publisher: '',
    sourceType: 'document',
    metadataReliable,
    warnings: [...new Set(warnings)],
  };
}

function parseJsonArray(str) {
  if (!str) return [];
  try {
    const parsed = JSON.parse(str);
    return Array.isArray(parsed) ? parsed.map(v => typeof v === 'string' ? v : JSON.stringify(v)) : [];
  } catch { return []; }
}

// POST /api/v1/synthesis/generate?sessionId=...&chosenGap=...
// Optional JSON body for user-guided synthesis:
//   { userInstructions, weights, gaps[], primaryFocusGap, rrlUsage: { [docId]: { usage, emphasizedExcerpts[] } } }
router.post('/generate', async (req, res) => {
  const sessionId = req.query.sessionId;
  const body = req.body || {};
  const chosenGap = (req.query.chosenGap ?? body.primaryFocusGap) || null;
  const userInstructions = (body.userInstructions || '').toString().trim();
  const weights = body.weights && typeof body.weights === 'object' ? body.weights : null;
  const userGaps = Array.isArray(body.gaps) ? body.gaps.map((g) => String(g).trim()).filter(Boolean) : null;
  const rrlUsage = body.rrlUsage && typeof body.rrlUsage === 'object' ? body.rrlUsage : {};

  if (!sessionId) return res.status(400).json({ success: false, message: 'sessionId is required', data: null });

  // Load baseline
  const { data: baselines } = await supabase
    .from('research_baselines').select('*')
    .eq('session_id', sessionId)
    .order('created_at', { ascending: false }).limit(1);
  const baseline = baselines?.[0] ?? null;
  if (!baseline) console.warn(`[synthesis] no baseline for session ${sessionId}`);

  // Load approved documents with text
  const { data: approvedDocs, error: docsErr } = await supabase
    .from('uploaded_documents').select('*')
    .eq('session_id', sessionId).eq('approved', true);
  if (docsErr) return res.status(500).json({ success: false, message: docsErr.message });

  const docsWithText = (approvedDocs ?? []).filter(d => d.parsed_text?.trim());
  if (!docsWithText.length) {
    return res.json({ success: false, message: 'Approve at least one document before generating an introduction.' });
  }

  // Load insights + determine tiers
  const tieredDocs = await Promise.all(docsWithText.map(async (doc) => {
    const { data: insight } = await supabase.from('document_insights').select('*').eq('document_id', doc.id).maybeSingle();
    const { data: excerpts } = insight
      ? await supabase.from('evidence_excerpts').select('*').eq('document_insight_id', insight.id).order('display_order')
      : { data: [] };
    const fullInsight = insight ? { ...insight, evidenceExcerpts: excerpts ?? [] } : null;
    const usageChoice = rrlUsage[doc.id]?.usage ?? rrlUsage[String(doc.id)]?.usage ?? null;
    const tier = resolveTier(fullInsight, usageChoice, weights);
    const emphasizedExcerpts = rrlUsage[doc.id]?.emphasizedExcerpts ?? rrlUsage[String(doc.id)]?.emphasizedExcerpts ?? [];
    return { doc, insight: fullInsight, tier, emphasizedExcerpts };
  }));

  const usableDocs = tieredDocs.filter(d => d.tier !== 'EXCLUDED');
  if (!usableDocs.length) {
    return res.json({
      success: false,
      status:  'NO_RELEVANT_SOURCES',
      message: 'No sufficiently relevant approved sources are available for synthesis. Review approved documents in Module 2.',
      meta: { approvedDocumentCount: docsWithText.length, excludedSourceCount: tieredDocs.length },
    });
  }

  // Build n8n payload. User-edited gaps (from the Gap Workshop) take priority
  // over the raw CATalyst baseline gaps when provided.
  const gapsRaw = baseline?.research_gaps;
  const baselineGaps = Array.isArray(gapsRaw) ? gapsRaw : (gapsRaw ? [gapsRaw] : []);
  const gapsArray = userGaps && userGaps.length ? userGaps : baselineGaps;

  const baseInstructions =
    'The CATalyst Title, Rationale, and Research Gap are the primary source of truth. '
    + 'Approved documents are supplementary. Use Core Sources as the main evidence, '
    + 'Supporting Sources cautiously, Tangential Sources only for brief background, '
    + 'and Excluded Sources not at all. Do not let a low-relevance approved document redirect the topic. '
    + 'The primaryFocusGap is the user\'s selected gap and should be treated as the main structural narrative pivot. '
    + 'The remaining gaps provide supporting context. '
    + 'When a source provides emphasizedExcerpts, treat those passages as the user\'s highlighted, highest-priority evidence.';

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
    approvedDocuments: usableDocs.map(({ doc, insight, tier, emphasizedExcerpts }) => {
      const meta = extractCitationFromFilename(doc.file_name, doc.parsed_text, doc.citation_metadata_json);
      const emphasizeSet = new Set((emphasizedExcerpts || []).map(Number));
      const allExcerpts = (insight?.evidenceExcerpts ?? []).map((e, idx) => ({
        quoteText:     e.quote_text,
        pageNumber:    e.page_number,
        relevanceLevel:e.relevance_level,
        criterion:     e.criterion,
        evidenceType:  e.evidence_type,
        displayOrder:  e.display_order,
        emphasized:    emphasizeSet.has(idx),
      }));
      const excerpts = allExcerpts;
      const userEmphasizedExcerpts = allExcerpts.filter((e) => e.emphasized);
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
        extracted_text:      doc.parsed_text,
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
        evidenceExcerpts: excerpts,
        emphasizedExcerpts: userEmphasizedExcerpts,
        metadata: meta,
      };
    }),
  };

  const webhookUrl = process.env.CITEWISE_N8N_SYNTHESIS_WEBHOOK_URL
    || 'http://localhost:5678/webhook/citewise-synthesizer-v2';

  let n8nData;
  try {
    const n8nRes = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Connection: 'close' },
      body:    JSON.stringify(payload),
      timeout: parseInt(process.env.CITEWISE_N8N_READ_TIMEOUT_MS) || 120000,
    });
    const raw = await n8nRes.text();
    if (!raw?.trim()) throw new Error('Synthesis webhook returned empty response');
    let root = JSON.parse(raw);
    if (Array.isArray(root) && root.length) root = root[0];
    for (const f of ['output','body','data','json','result']) {
      if (root[f] && typeof root[f] === 'object') { root = root[f]; break; }
      if (root[f] && typeof root[f] === 'string') { try { root = JSON.parse(root[f]); break; } catch {} }
    }
    n8nData = root;
  } catch (err) {
    console.error('[synthesis] n8n call failed:', err.message);
    return res.status(502).json({ success: false, message: `Synthesis failed: ${err.message}` });
  }

  const contentText   = n8nData.contentText   ?? '';
  const referencesText= n8nData.referencesText ?? '';
  const success       = n8nData.success        !== false;
  const message       = n8nData.message        ?? '';
  const validationStatus = n8nData.validationStatus ?? '';
  const validationFlags  = Array.isArray(n8nData.validationFlags) ? n8nData.validationFlags : [];

  if (!success || (validationStatus && validationStatus.toUpperCase() !== 'PASSED')) {
    return res.json({
      success:    false,
      status:     validationStatus || 'VALIDATION_FAILED',
      message:    message || 'Synthesis failed or validation failed',
      validationFlags,
      retryRecommended: n8nData.retryRecommended ?? false,
      errorMessage:     n8nData.errorMessage     ?? null,
    });
  }

  // Persist draft – replace any previous draft for this session
  await supabase.from('generated_draft').delete().eq('session_id', sessionId);

  const { data: draft, error: draftErr } = await supabase
    .from('generated_draft').insert({
      session_id:                  sessionId,
      content_text:                contentText,
      references_text:             referencesText,
      background_text:             n8nData.sections?.background    ?? null,
      rationale_text:              n8nData.sections?.rationale     ?? null,
      gap_text:                    n8nData.sections?.gap           ?? null,
      citations_used_json:         n8nData.citationsUsed ? JSON.stringify(n8nData.citationsUsed) : '[]',
      validation_status:           n8nData.validationStatus        ?? null,
      validation_flags_json:       n8nData.validationFlags ? JSON.stringify(n8nData.validationFlags) : '[]',
      unsupported_claim_flags_json:n8nData.unsupportedClaimFlags ? JSON.stringify(n8nData.unsupportedClaimFlags) : '[]',
      metrics_json:                n8nData.metrics ? JSON.stringify(n8nData.metrics) : '{}',
    }).select().single();

  if (draftErr) {
    console.error('[synthesis] failed to save draft:', draftErr.message);
    return res.status(500).json({ success: false, message: draftErr.message });
  }

  return res.json({
    draftId:        draft.id,
    sessionId,
    contentText,
    referencesText,
    sections:       n8nData.sections    ?? null,
    citationsUsed:  n8nData.citationsUsed ?? [],
    validationStatus: draft.validation_status,
    validationFlags,
    metrics:        n8nData.metrics ?? null,
    createdAt:      draft.created_at,
    success:        true,
    message,
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

export default router;
