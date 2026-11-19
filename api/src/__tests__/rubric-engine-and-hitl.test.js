/**
 * CiteWise General Objective 2 — RRL Rubric Engine, HITL Validation Module,
 * and T5 Benchmark Pipeline Test Suite.
 *
 * Covers:
 *   1. RRL Rubric Engine (rubricScoring.js): weighted scoring, caps, thresholds, payload unwrapping
 *   2. Semantic Chunking & Page Traceability (chunking.js, pageText.js)
 *   3. End-to-End scoringPipeline (rrl.routes.js) with mocked Supabase + n8n
 *   4. HITL Validation Module REST API (documents.routes.js via supertest)
 *   5. HITL Frontend Store & Module 2 Guardrails (citewiseStore.js & UI contracts)
 *   6. T5 Batch Benchmark Utilities, Dataset Curation Parser, & Runner (dry-run + mocked-live)
 *
 * Run with:  cd api && npm test
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  computeOverallScore,
  computeRecommendation,
  computeRelevanceLevel,
  parseAIResponse,
} from '../modules/citewise/helpers/rubricScoring.js';
import { selectRelevantChunks } from '../modules/citewise/helpers/chunking.js';
import {
  buildSearchIndex,
  extractPdfPages,
  resolveExcerptPage,
} from '../modules/citewise/helpers/pageText.js';
import { makePdf } from '../../scripts/lib/makePdf.js';
import { parseArxivAtomXml, isRelevantCandidate, isOffTopicCandidate } from '../../scripts/curate-t5-dataset.js';
import { runT5Benchmark, parseCliArgs } from '../../scripts/run-t5-benchmark.js';
import {
  parseGroundTruthCsv,
  parseBaselineJson,
  classifyStrictBinary,
  classifyScoreThreshold,
  buildResultRow,
  computeBenchmarkSummary,
  formatSummaryCsv,
  formatSummaryConsoleReport,
  resolveThrottleDelayMs,
} from '../../scripts/lib/t5BenchmarkUtils.js';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(HERE, '../../..');
const readRepoFile = (rel) => fs.readFileSync(path.join(REPO_ROOT, rel), 'utf8');

// ─────────────────────────────────────────────────────────────────────────────
// SUITE 1 – RRL Rubric Engine (rubricScoring.js)
// ─────────────────────────────────────────────────────────────────────────────

describe('RRL Rubric Engine – 4-Criterion Scoring & Classification', () => {
  it('computes default weighted overall score (35% Gap, 30% Method, 20% Theory, 15% Citation)', () => {
    const score = computeOverallScore(90, 80, 70, 80);
    // 90*0.35 + 80*0.30 + 70*0.20 + 80*0.15 = 31.5 + 24 + 14 + 12 = 81.5
    expect(score).toBeCloseTo(81.5, 4);
  });

  it('normalizes custom weights that do not sum to 1 and falls back when all weights are 0', () => {
    const custom = computeOverallScore(100, 60, 0, 0, {
      gap: 3,
      methodology: 1,
      theory: 0,
      citation: 0,
    });
    expect(custom).toBeCloseTo(90, 4);

    const zeroFallback = computeOverallScore(90, 80, 70, 80, {
      gap: 0,
      methodology: 0,
      theory: 0,
      citation: 0,
    });
    expect(zeroFallback).toBeCloseTo(81.5, 4);
  });

  it('classifies Recommended ONLY when all rubric gates and evidence pass', () => {
    const excerpts = [{ quoteText: 'Verified RAG synthesis quote.', criterion: 'Gap Alignment' }];

    expect(computeRecommendation(75, 70, 70, 50, 60, 'High', [], excerpts)).toBe('Recommended');
    expect(computeRecommendation(75.15, 74, 74, 64, 95, 'High', [], excerpts)).toBe('Recommended');
    expect(computeRecommendation(85, 80, 75, 60, 70, 'Medium', [], excerpts)).toBe('Recommended');
    expect(computeRelevanceLevel('Recommended', 75)).toBe('High');
  });

  it('downgrades to Needs Review when overall >= 75 but a sub-criterion or confidence fails', () => {
    const excerpts = [{ quoteText: 'Some supporting quote.', criterion: 'Gap Alignment' }];

    expect(computeRecommendation(82, 69, 90, 80, 85, 'High', [], excerpts)).toBe('Needs Review');
    expect(computeRecommendation(82, 85, 69, 80, 85, 'High', [], excerpts)).toBe('Needs Review');
    expect(computeRecommendation(76.75, 95, 74, 39, 90, 'High', [], excerpts)).toBe('Needs Review');
    expect(computeRecommendation(82, 85, 80, 80, 59, 'High', [], excerpts)).toBe('Needs Review');
    expect(computeRecommendation(85, 85, 85, 85, 85, 'Low', [], excerpts)).toBe('Needs Review');
    expect(computeRecommendation(74.9, 85, 85, 85, 85, 'High', [], excerpts)).toBe('Needs Review');

    expect(computeRelevanceLevel('Needs Review', 65)).toBe('Medium');
    expect(computeRelevanceLevel('Needs Review', 55)).toBe('Low');
  });

  it('classifies Low Relevance on low overall, low gap, missing evidence, or critical mismatch', () => {
    const excerpts = [{ quoteText: 'Some quote.', criterion: 'Gap Alignment' }];

    expect(computeRecommendation(49.9, 60, 60, 60, 60, 'Medium', [], excerpts)).toBe('Low Relevance');
    expect(computeRecommendation(65, 39, 80, 80, 80, 'High', [], excerpts)).toBe('Low Relevance');
    expect(computeRecommendation(90, 90, 90, 90, 90, 'High', [], [])).toBe('Low Relevance');
    expect(computeRecommendation(88, 85, 85, 85, 85, 'High', ['TOPIC_MISMATCH'], excerpts)).toBe('Low Relevance');
    expect(computeRecommendation(88, 85, 85, 85, 85, 'High', ['Critical scope mismatch'], excerpts)).toBe(
      'Low Relevance'
    );
    expect(computeRelevanceLevel('Low Relevance', 45)).toBe('Low');
  });

  it('unwraps nested n8n payload envelopes, normalizes 0-1 scores, and enforces multiple declared caps', () => {
    const nested = JSON.stringify([
      {
        output: JSON.stringify({
          scores: {
            gapAlignment: 0.92,
            methodology: 0.88,
            theory: 0.85,
            citationQuality: 0.9,
            overall: 0.89,
          },
          confidenceLevel: 'High',
          validationFlags: [
            'Gap Alignment capped at 74 because one supporting gap evidence item was verified',
            'Methodology capped at 70 because one supporting methodology evidence item was verified',
            'Methodology capped at 64 because evaluation metrics were limited',
          ],
          evidenceExcerpts: [
            {
              criterion: 'Gap Alignment',
              quoteText: 'RAG improves factual provenance in literature reviews.',
              pageNumber: 2,
              relevanceLevel: 'High',
              evidenceType: 'supporting',
            },
          ],
        }),
      },
    ]);

    const parsed = parseAIResponse(nested, 42);
    expect(parsed).not.toBeNull();
    expect(parsed.gapAlignmentScore).toBe(74);
    expect(parsed.methodologyScore).toBe(64); // min(70, 64)
    expect(parsed.theoreticalScore).toBe(85);
    expect(parsed.citationScore).toBe(90);
    // 74*0.35 + 64*0.30 + 85*0.20 + 90*0.15 = 25.9 + 19.2 + 17 + 13.5 = 75.6
    expect(parsed.overallScore).toBeCloseTo(75.6, 2);
    expect(parsed.recommendationStatus).toBe('Needs Review');
    expect(parsed.relevanceLevel).toBe('Medium');
  });

  it('returns null for empty, whitespace, or unparseable AI responses', () => {
    expect(parseAIResponse('', 1)).toBeNull();
    expect(parseAIResponse('   ', 1)).toBeNull();
    expect(parseAIResponse('{not-valid-json', 1)).toBeNull();
    expect(parseAIResponse(null, 1)).toBeNull();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// SUITE 2 – Semantic Chunking & Quote-to-Page Traceability
// ─────────────────────────────────────────────────────────────────────────────

describe('Semantic Chunking & Quote Page Traceability', () => {
  it('selects baseline-relevant chunks with page hints over unrelated filler', () => {
    const pages = [
      'Unrelated background paragraph about historical typography and printing presses from the nineteenth century. '.repeat(3),
      'Retrieval-augmented generation (RAG) addresses citation hallucination in academic literature synthesis through source provenance verification. '.repeat(3),
      'Our evaluation benchmark measures methodology rigor, citation faithfulness, and open research gaps across 40 peer-reviewed manuscripts. '.repeat(3),
    ];
    const fullText = `\n\n${pages[0]}\n\n${pages[1]}\n\n${pages[2]}`;
    const pageOffsets = [2, 2 + pages[0].length + 2, 2 + pages[0].length + 2 + pages[1].length + 2];

    const baseline = {
      project_title: 'Citation-Aware Retrieval-Augmented Generation for Literature Synthesis',
      rationale: 'Prevent hallucinated citations and improve source provenance.',
      research_gaps: ['Hallucination and lack of source provenance in academic synthesis'],
    };

    const selected = selectRelevantChunks(fullText, baseline, {
      maxChars: 900,
      maxChunks: 2,
      pageOffsets,
    });

    expect(selected).toContain('Retrieval-augmented generation');
    expect(selected).toContain('page=2');
    expect(selected.length).toBeLessThanOrEqual(900);
  });

  it('verifies quote page numbers against extracted PDF offsets and marks unverified fallbacks', () => {
    const p1 = 'Introduction to citation provenance and retrieval-augmented generation.';
    const p2 = 'Experimental results demonstrate 92 percent source-selection accuracy across benchmarks.';
    const text = `\n\n${p1}\n\n${p2}`;
    const pageOffsets = [2, 2 + p1.length + 2];
    const index = buildSearchIndex(text);

    const verified = resolveExcerptPage({
      index,
      pageOffsets,
      quote: 'Experimental results demonstrate 92 percent source-selection accuracy',
      aiPage: 1, // wrong AI guess should be overridden by located page 2
    });
    expect(verified).toEqual({ pageNumber: 2, pageVerified: true });

    const unverified = resolveExcerptPage({
      index,
      pageOffsets,
      quote: 'This fabricated sentence does not appear anywhere in the paper text.',
      aiPage: 2,
    });
    expect(unverified).toEqual({ pageNumber: 2, pageVerified: false });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// SUITE 3 – scoringPipeline Integration (Mocked Supabase + n8n + R2)
// ─────────────────────────────────────────────────────────────────────────────

describe('scoringPipeline – Backend RRL Rubric Execution & DB Persistence', () => {
  afterEach(() => {
    vi.doUnmock('../common/config/supabaseClient.js');
    vi.doUnmock('../common/config/r2Client.js');
    vi.doUnmock('node-fetch');
    vi.resetModules();
  });

  function createPipelineMocks({ docRow, baselineRow, existingInsights = [], n8nResponse }) {
    const insertedInsights = [];
    const insertedExcerpts = [];
    const insertedTimings = [];
    const docUpdates = [];

    const supabaseMock = {
      auth: { getUser: async () => ({ data: { user: { id: 'user-1' } }, error: null }) },
      from: (table) => {
        if (table === 'uploaded_documents') {
          return {
            select: () => ({
              eq: () => ({
                single: async () => ({ data: docRow, error: null }),
                maybeSingle: async () => ({ data: docRow, error: null }),
              }),
            }),
            update: (payload) => {
              docUpdates.push(payload);
              return {
                eq: async () => ({ error: null }),
              };
            },
          };
        }
        if (table === 'document_insights') {
          return {
            select: () => ({
              eq: () => ({
                order: () => ({
                  limit: async () => ({ data: existingInsights, error: null }),
                }),
              }),
            }),
            delete: () => ({
              eq: async () => ({ error: null }),
            }),
            insert: (payload) => {
              const saved = { id: 901, ...payload };
              insertedInsights.push(saved);
              return {
                select: () => ({
                  single: async () => ({ data: saved, error: null }),
                }),
              };
            },
          };
        }
        if (table === 'research_baselines') {
          return {
            select: () => ({
              eq: () => ({
                order: () => ({
                  limit: async () => ({ data: baselineRow ? [baselineRow] : [], error: null }),
                }),
              }),
            }),
          };
        }
        if (table === 'evidence_excerpts') {
          return {
            insert: async (rows) => {
              insertedExcerpts.push(...rows);
              return { error: null };
            },
          };
        }
        if (table === 'assessment_timings') {
          return {
            insert: async (row) => {
              insertedTimings.push(row);
              return { error: null };
            },
          };
        }
        return {
          select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: null, error: null }) }) }),
        };
      },
    };

    const fetchMock = vi.fn(async () => n8nResponse);

    return {
      supabaseMock,
      fetchMock,
      insertedInsights,
      insertedExcerpts,
      insertedTimings,
      docUpdates,
    };
  }

  it('scores an on-topic paper via n8n, persists insight + page-verified excerpts + timing', async () => {
    vi.resetModules();
    delete process.env.CITEWISE_N8N_METADATA_WEBHOOK_URL;

    const p1 = 'Retrieval-augmented generation reduces citation hallucination in academic literature synthesis.';
    const p2 = 'Our methodology benchmarks provenance across 40 scholarly PDFs with explicit evaluation metrics.';
    const fullText = `\n\n${p1}\n\n${p2}`;
    const pageOffsets = [2, 2 + p1.length + 2];

    const mocks = createPipelineMocks({
      docRow: {
        id: 11,
        session_id: 'sess-1',
        file_name: 'rag_synthesis.pdf',
        parsed_text: fullText,
        page_count: 2,
        page_offsets_json: pageOffsets,
        extraction_method: 'local',
        extraction_ms: 120,
        scoring_status: 'PENDING',
      },
      baselineRow: {
        session_id: 'sess-1',
        project_title: 'Citation-Aware RAG for Literature Synthesis',
        rationale: 'Prevent hallucination and improve provenance.',
        research_gaps: ['Hallucinated citations in LLM literature synthesis'],
      },
      n8nResponse: {
        ok: true,
        status: 200,
        text: async () =>
          JSON.stringify({
            gapAlignmentScore: 88,
            methodologyScore: 84,
            theoreticalScore: 80,
            citationScore: 86,
            confidenceLevel: 'High',
            mismatchFlags: [],
            weaknessFlags: [],
            validationFlags: [],
            evidenceExcerpts: [
              {
                criterion: 'Methodology',
                quoteText: 'Our methodology benchmarks provenance across 40 scholarly PDFs with explicit evaluation metrics.',
                pageNumber: 1,
                relevanceLevel: 'High',
                evidenceType: 'supporting',
              },
            ],
          }),
      },
    });

    vi.doMock('../common/config/supabaseClient.js', () => ({ default: mocks.supabaseMock }));
    vi.doMock('../common/config/r2Client.js', () => ({
      isR2Configured: false,
      uploadPdfToR2: vi.fn(),
      uploadTextToR2: vi.fn(),
      getTextFromR2: vi.fn(),
      getBufferFromR2: vi.fn(),
      getPresignedDownloadUrl: vi.fn(),
    }));
    vi.doMock('node-fetch', () => ({ default: mocks.fetchMock }));

    const { scoringPipeline } = await import('../modules/citewise/rrl.routes.js');
    await scoringPipeline(11, 'sess-1');

    expect(mocks.fetchMock).toHaveBeenCalledTimes(1);
    expect(mocks.insertedInsights).toHaveLength(1);
    expect(mocks.insertedInsights[0].recommendation_status).toBe('Recommended');
    expect(mocks.insertedInsights[0].overall_score).toBeCloseTo(84.9, 2);
    expect(mocks.insertedExcerpts).toHaveLength(1);
    expect(mocks.insertedExcerpts[0].page_number).toBe(2);
    expect(mocks.insertedExcerpts[0].page_verified).toBe(true);
    expect(mocks.docUpdates.some((u) => u.scoring_status === 'COMPLETE')).toBe(true);
    expect(mocks.insertedTimings[0].status).toBe('COMPLETE');
    expect(mocks.insertedTimings[0].reused_ai_response).toBe(false);
  });

  it('reuses stored raw_ai_response_json on weight reassessment without calling n8n', async () => {
    vi.resetModules();
    const rawAi = JSON.stringify({
      gapAlignmentScore: 90,
      methodologyScore: 60,
      theoreticalScore: 60,
      citationScore: 70,
      confidenceLevel: 'High',
      mismatchFlags: [],
      weaknessFlags: [],
      validationFlags: [],
      evidenceExcerpts: [
        { criterion: 'Gap Alignment', quoteText: 'Strong gap alignment evidence.', pageNumber: 1, relevanceLevel: 'High' },
      ],
    });

    const mocks = createPipelineMocks({
      docRow: {
        id: 12,
        session_id: 'sess-2',
        file_name: 'weight_reassess.pdf',
        parsed_text: 'Strong gap alignment evidence in RAG literature review.',
        page_count: 1,
        page_offsets_json: [0],
        metric_weights_json: JSON.stringify({ gap: 0.8, methodology: 0.1, theory: 0.05, citation: 0.05 }),
        scoring_status: 'PENDING',
      },
      baselineRow: {
        session_id: 'sess-2',
        project_title: 'RAG Literature Review',
        rationale: 'Gap alignment priority',
        research_gaps: ['Gap alignment'],
      },
      existingInsights: [{ id: 55, document_id: 12, raw_ai_response_json: rawAi }],
      n8nResponse: { ok: true, status: 200, text: async () => '{}' },
    });

    vi.doMock('../common/config/supabaseClient.js', () => ({ default: mocks.supabaseMock }));
    vi.doMock('../common/config/r2Client.js', () => ({
      isR2Configured: false,
      uploadPdfToR2: vi.fn(),
      uploadTextToR2: vi.fn(),
      getTextFromR2: vi.fn(),
      getBufferFromR2: vi.fn(),
      getPresignedDownloadUrl: vi.fn(),
    }));
    vi.doMock('node-fetch', () => ({ default: mocks.fetchMock }));

    const { scoringPipeline } = await import('../modules/citewise/rrl.routes.js');
    await scoringPipeline(12, 'sess-2');

    expect(mocks.fetchMock).not.toHaveBeenCalled();
    expect(mocks.insertedInsights).toHaveLength(1);
    // 90*0.8 + 60*0.1 + 60*0.05 + 70*0.05 = 72 + 6 + 3 + 3.5 = 84.5
    expect(mocks.insertedInsights[0].overall_score).toBeCloseTo(84.5, 2);
    // Methodology is 60 (< 70), so strict recommendation must remain Needs Review
    expect(mocks.insertedInsights[0].recommendation_status).toBe('Needs Review');
    expect(mocks.insertedTimings[0].reused_ai_response).toBe(true);
  });

  it('marks document FAILED cleanly when n8n returns HTTP 429 or extracted text is empty', async () => {
    vi.resetModules();
    const mocksEmpty = createPipelineMocks({
      docRow: {
        id: 13,
        session_id: 'sess-3',
        file_name: 'empty.pdf',
        parsed_text: '   ',
        scoring_status: 'PENDING',
      },
      baselineRow: {
        session_id: 'sess-3',
        project_title: 'RAG',
        rationale: 'Test',
        research_gaps: ['Gap'],
      },
      n8nResponse: { ok: true, status: 200, text: async () => '{}' },
    });

    vi.doMock('../common/config/supabaseClient.js', () => ({ default: mocksEmpty.supabaseMock }));
    vi.doMock('../common/config/r2Client.js', () => ({
      isR2Configured: false,
      uploadPdfToR2: vi.fn(),
      uploadTextToR2: vi.fn(),
      getTextFromR2: vi.fn(),
      getBufferFromR2: vi.fn(),
      getPresignedDownloadUrl: vi.fn(),
    }));
    vi.doMock('node-fetch', () => ({ default: mocksEmpty.fetchMock }));

    const { scoringPipeline } = await import('../modules/citewise/rrl.routes.js');
    await scoringPipeline(13, 'sess-3');
    expect(mocksEmpty.fetchMock).not.toHaveBeenCalled();
    expect(mocksEmpty.docUpdates.some((u) => u.scoring_status === 'FAILED')).toBe(true);
    expect(mocksEmpty.insertedTimings[0].status).toBe('FAILED');

    vi.resetModules();
    const mocks429 = createPipelineMocks({
      docRow: {
        id: 14,
        session_id: 'sess-3',
        file_name: 'rate_limited.pdf',
        parsed_text: 'Valid extracted academic text about retrieval-augmented generation.',
        page_count: 3,
        scoring_status: 'PENDING',
      },
      baselineRow: {
        session_id: 'sess-3',
        project_title: 'RAG',
        rationale: 'Test',
        research_gaps: ['Gap'],
      },
      n8nResponse: { ok: false, status: 429, text: async () => 'Too Many Requests' },
    });

    vi.doMock('../common/config/supabaseClient.js', () => ({ default: mocks429.supabaseMock }));
    vi.doMock('../common/config/r2Client.js', () => ({
      isR2Configured: false,
      uploadPdfToR2: vi.fn(),
      uploadTextToR2: vi.fn(),
      getTextFromR2: vi.fn(),
      getBufferFromR2: vi.fn(),
      getPresignedDownloadUrl: vi.fn(),
    }));
    vi.doMock('node-fetch', () => ({ default: mocks429.fetchMock }));

    const { scoringPipeline: scoringPipeline429 } = await import('../modules/citewise/rrl.routes.js');
    await scoringPipeline429(14, 'sess-3');
    expect(mocks429.docUpdates.some((u) => u.scoring_status === 'FAILED' && /429/.test(u.scoring_error_message))).toBe(
      true
    );
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// SUITE 4 – HITL Validation Module API (documents.routes.js via supertest)
// ─────────────────────────────────────────────────────────────────────────────

describe('HITL Validation Module API – /api/v1/documents', () => {
  let app;
  let dbState;

  function makeFakeSupabase(state) {
    return {
      auth: {
        getUser: async (token) =>
          token === 'valid-jwt'
            ? { data: { user: { id: 'user-hitl', email: 'researcher@citewise.edu' } }, error: null }
            : { data: { user: null }, error: { message: 'Invalid token' } },
      },
      from: (table) => {
        const ctx = { table, filters: [], op: 'select', payload: null, inCol: null, inVals: null };
        const applyFilters = (rows) =>
          rows.filter((r) => {
            for (const f of ctx.filters) {
              if (f.type === 'eq' && String(r[f.col]) !== String(f.val)) return false;
              if (f.type === 'is' && f.val === null && r[f.col] != null) return false;
              if (f.type === 'in' && !f.vals.map(String).includes(String(r[f.col]))) return false;
            }
            return true;
          });

        const execute = async () => {
          if (table === 'uploaded_documents') {
            if (ctx.op === 'select') {
              const matched = applyFilters(state.docs).map((d) => ({
                ...d,
                document_insights: state.insights
                  .filter((ins) => ins.document_id === d.id)
                  .map((ins) => ({
                    ...ins,
                    evidence_excerpts: state.excerpts.filter((ex) => ex.document_insight_id === ins.id),
                  })),
              }));
              return { data: matched, error: null };
            }
            if (ctx.op === 'update') {
              const matched = applyFilters(state.docs);
              matched.forEach((d) => Object.assign(d, ctx.payload));
              return { data: matched, error: null };
            }
            if (ctx.op === 'delete') {
              const matchedIds = new Set(applyFilters(state.docs).map((d) => d.id));
              state.docs = state.docs.filter((d) => !matchedIds.has(d.id));
              return { data: null, error: null };
            }
          }
          if (table === 'document_insights') {
            if (ctx.op === 'select') {
              return { data: applyFilters(state.insights), error: null };
            }
            if (ctx.op === 'delete') {
              const matchedIds = new Set(applyFilters(state.insights).map((ins) => ins.id));
              state.insights = state.insights.filter((ins) => !matchedIds.has(ins.id));
              return { data: null, error: null };
            }
          }
          if (table === 'evidence_excerpts') {
            return { data: applyFilters(state.excerpts), error: null };
          }
          return { data: [], error: null };
        };

        const chain = {
          select: () => {
            ctx.op = 'select';
            return chain;
          },
          update: (payload) => {
            ctx.op = 'update';
            ctx.payload = payload;
            return chain;
          },
          delete: () => {
            ctx.op = 'delete';
            return chain;
          },
          eq: (col, val) => {
            ctx.filters.push({ type: 'eq', col, val });
            return chain;
          },
          is: (col, val) => {
            ctx.filters.push({ type: 'is', col, val });
            return chain;
          },
          in: (col, vals) => {
            ctx.filters.push({ type: 'in', col, vals });
            return chain;
          },
          order: () => chain,
          limit: () => chain,
          maybeSingle: async () => {
            const res = await execute();
            return { data: res.data?.[0] ?? null, error: res.error };
          },
          single: async () => {
            const res = await execute();
            return { data: res.data?.[0] ?? null, error: res.error };
          },
          then: (resolve, reject) => execute().then(resolve, reject),
        };
        return chain;
      },
    };
  }

  beforeEach(async () => {
    process.env.SUPABASE_URL ||= 'http://127.0.0.1:1/';
    process.env.SUPABASE_KEY ||= 'test-key';
    process.env.SUPABASE_ANON_KEY ||= 'test-key';
    vi.resetModules();

    dbState = {
      docs: [
        {
          id: 1,
          session_id: 'sess-hitl',
          file_name: 'rag_paper.pdf',
          size_bytes: 20480,
          approved: false,
          scoring_status: 'COMPLETE',
          page_count: 8,
          scoring_duration_ms: 4200,
          metric_weights_json: null,
          parsed_text: 'Retrieval-Augmented Generation for Knowledge-Intensive NLP Tasks',
        },
        {
          id: 2,
          session_id: 'sess-hitl',
          file_name: 'astrophysics_paper.pdf',
          size_bytes: 18432,
          approved: false,
          scoring_status: 'COMPLETE',
          page_count: 11,
          scoring_duration_ms: 3800,
          metric_weights_json: JSON.stringify({ gap: 0.5, methodology: 0.3, theory: 0.1, citation: 0.1 }),
          parsed_text: 'Correlated variability in the blazar 3C 454.3',
        },
        {
          id: 3,
          session_id: 'sess-hitl',
          file_name: 'pending_paper.pdf',
          size_bytes: 12000,
          approved: false,
          scoring_status: 'PROCESSING',
          page_count: 5,
          metric_weights_json: null,
          parsed_text: 'Pending assessment text',
        },
      ],
      insights: [
        {
          id: 101,
          document_id: 1,
          gap_alignment_score: 90,
          methodology_score: 84,
          theoretical_score: 80,
          citation_score: 86,
          overall_score: 85.6,
          recommendation_status: 'Recommended',
          confidence_level: 'High',
          relevance_level: 'High',
          mismatch_flags_json: '[]',
          weakness_flags_json: '[]',
          validation_flags_json: '[]',
        },
        {
          id: 102,
          document_id: 2,
          gap_alignment_score: 12,
          methodology_score: 25,
          theoretical_score: 20,
          citation_score: 30,
          overall_score: 0,
          recommendation_status: 'Low Relevance',
          confidence_level: 'Low',
          relevance_level: 'Low',
          mismatch_flags_json: '["TOPIC_MISMATCH"]',
          weakness_flags_json: '["NO_EXPLICIT_GAP_STATEMENT"]',
          validation_flags_json: '["Overall score set to 0 because TOPIC_MISMATCH was detected"]',
        },
      ],
      excerpts: [
        {
          id: 1001,
          document_insight_id: 101,
          quote_text: 'RAG models combine parametric and non-parametric memory for provenance.',
          page_number: 2,
          page_verified: true,
          criterion: 'Gap Alignment',
          relevance_level: 'High',
          evidence_type: 'supporting',
          display_order: 1,
        },
      ],
    };

    vi.doMock('../common/config/supabaseClient.js', () => ({ default: makeFakeSupabase(dbState) }));
    app = (await import('../app.js')).default;
  });

  afterEach(() => {
    vi.doUnmock('../common/config/supabaseClient.js');
  });

  it('enforces requireAuth on HITL document routes', async () => {
    const res = await request(app).get('/api/v1/documents/session/sess-hitl');
    expect(res.status).toBe(401);
  });

  it('lists session documents with rubric scores and enforces session header isolation', async () => {
    const mismatch = await request(app)
      .get('/api/v1/documents/session/sess-hitl')
      .set('Authorization', 'Bearer valid-jwt')
      .set('X-Session-Id', 'other-session');
    expect(mismatch.status).toBe(404);

    const ok = await request(app)
      .get('/api/v1/documents/session/sess-hitl')
      .set('Authorization', 'Bearer valid-jwt')
      .set('X-Session-Id', 'sess-hitl');
    expect(ok.status).toBe(200);
    expect(ok.body).toHaveLength(3);
    expect(ok.body[0]).toMatchObject({
      id: 1,
      fileName: 'rag_paper.pdf',
      relevancyScore: 85.6,
      recommendationStatus: 'Recommended',
      relevanceLevel: 'High',
      approved: false,
    });
    expect(ok.body[1]).toMatchObject({
      id: 2,
      recommendationStatus: 'Low Relevance',
      relevanceLevel: 'Low',
    });
  });

  it('returns 202 for processing docs and full 4-criterion rubric breakdown for completed docs', async () => {
    const pendingRes = await request(app)
      .get('/api/v1/documents/3/insights')
      .set('Authorization', 'Bearer valid-jwt')
      .set('X-Session-Id', 'sess-hitl');
    expect(pendingRes.status).toBe(202);
    expect(pendingRes.body.status).toBe('PROCESSING');

    const readyRes = await request(app)
      .get('/api/v1/documents/1/insights')
      .set('Authorization', 'Bearer valid-jwt')
      .set('X-Session-Id', 'sess-hitl');
    expect(readyRes.status).toBe(200);
    expect(readyRes.body).toMatchObject({
      documentId: 1,
      gapAlignmentScore: 90,
      methodologyScore: 84,
      theoreticalScore: 80,
      citationScore: 86,
      overallScore: 85.6,
      recommendationStatus: 'Recommended',
      relevanceLevel: 'High',
    });
    expect(readyRes.body.evidenceExcerpts[0]).toMatchObject({
      pageNumber: 2,
      pageVerified: true,
    });
  });

  it('persists HITL approval & unapproval toggles (including manual human override)', async () => {
    const approve1 = await request(app)
      .patch('/api/v1/documents/1/approval')
      .set('Authorization', 'Bearer valid-jwt')
      .set('X-Session-Id', 'sess-hitl')
      .send({ status: 'APPROVED' });
    expect(approve1.status).toBe(200);
    expect(approve1.body.data.approvedCount).toBe(1);
    expect(dbState.docs[0].approved).toBe(true);

    // Human reviewer can override even a Low Relevance paper after confirmation
    const approveOverride = await request(app)
      .patch('/api/v1/documents/2/approval')
      .set('Authorization', 'Bearer valid-jwt')
      .set('X-Session-Id', 'sess-hitl')
      .send({ status: 'APPROVED' });
    expect(approveOverride.status).toBe(200);
    expect(approveOverride.body.data.approvedCount).toBe(2);

    const reject2 = await request(app)
      .patch('/api/v1/documents/2/approval')
      .set('Authorization', 'Bearer valid-jwt')
      .set('X-Session-Id', 'sess-hitl')
      .send({ status: 'READY' });
    expect(reject2.status).toBe(200);
    expect(reject2.body.data.approvedCount).toBe(1);
    expect(dbState.docs[1].approved).toBe(false);
  });

  it('validates assess-batch input and applies custom weights without overwriting existing weights unless requested', async () => {
    const bad = await request(app)
      .post('/api/v1/documents/assess-batch')
      .set('Authorization', 'Bearer valid-jwt')
      .set('X-Session-Id', 'sess-hitl')
      .send({ documentIds: [] });
    expect(bad.status).toBe(400);

    const newWeights = { gap: 0.4, methodology: 0.3, theory: 0.2, citation: 0.1 };
    const applyNoOverwrite = await request(app)
      .post('/api/v1/documents/assess-batch')
      .set('Authorization', 'Bearer valid-jwt')
      .set('X-Session-Id', 'sess-hitl')
      .send({
        documentIds: [1, 2],
        weights: newWeights,
        overwriteWeights: false,
        onlyApplyWeights: true,
      });
    expect(applyNoOverwrite.status).toBe(200);
    expect(JSON.parse(dbState.docs[0].metric_weights_json)).toEqual(newWeights);
    // Doc 2 already had custom weights, so overwriteWeights:false must preserve them
    expect(JSON.parse(dbState.docs[1].metric_weights_json)).toEqual({
      gap: 0.5,
      methodology: 0.3,
      theory: 0.1,
      citation: 0.1,
    });
  });

  it('deletes a document and its insights via DELETE /api/v1/documents/:id', async () => {
    const del = await request(app)
      .delete('/api/v1/documents/2')
      .set('Authorization', 'Bearer valid-jwt')
      .set('X-Session-Id', 'sess-hitl');
    expect(del.status).toBe(200);
    expect(del.body.success).toBe(true);
    expect(dbState.docs.some((d) => d.id === 2)).toBe(false);
    expect(dbState.insights.some((i) => i.document_id === 2)).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// SUITE 5 – HITL Frontend Store & Module 2 Guardrails
// ─────────────────────────────────────────────────────────────────────────────

describe('HITL Frontend Store & Module 2 Guardrail Contracts', () => {
  let storeMap;
  let store;

  beforeEach(async () => {
    storeMap = new Map();
    vi.stubGlobal('localStorage', {
      getItem: (k) => (storeMap.has(k) ? storeMap.get(k) : null),
      setItem: (k, v) => storeMap.set(k, String(v)),
      removeItem: (k) => storeMap.delete(k),
    });
    vi.stubGlobal(
      'CustomEvent',
      class {
        constructor(type, init = {}) {
          this.type = type;
          this.detail = init.detail;
        }
      }
    );
    vi.stubGlobal('window', {
      dispatchEvent: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    });
    vi.resetModules();
    store = await import('../../../web/src/citewise/lib/citewiseStore.js');
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('recomputeOverall handles active/disabled criteria, custom weights, and 0..1 vs 0..100 normalization', () => {
    const prefs = {
      weights: { gapAlignment: 0.5, methodology: 0.3, theoretical: 0.2, citation: 0 },
      enabled: { gapAlignment: true, methodology: true, theoretical: false, citation: false },
    };

    const score = store.recomputeOverall(
      { gapAlignment: 90, methodology: 70, theoretical: 10, citation: 10 },
      prefs
    );
    // (90*0.5 + 70*0.3) / (0.5 + 0.3) = 66 / 0.8 = 82.5 -> rounded 83
    expect(score).toBe(83);

    const decimalScore = store.recomputeOverall(
      { gapAlignment: 0.9, methodology: 0.7, theoretical: 0.5, citation: 0.5 },
      prefs
    );
    expect(decimalScore).toBe(83);

    const allDisabled = store.recomputeOverall(
      { gapAlignment: 90, methodology: 70, theoretical: 50, citation: 50 },
      {
        weights: prefs.weights,
        enabled: { gapAlignment: false, methodology: false, theoretical: false, citation: false },
      }
    );
    expect(allDisabled).toBeNull();
  });

  it('tracks HITL RRL usage controls (core, supporting, exclude) and emphasized excerpts per session', () => {
    store.setRrlUsageFor('s-hitl', 10, { usage: 'core' });
    store.toggleEmphasizedExcerpt('s-hitl', 10, 0);
    store.toggleEmphasizedExcerpt('s-hitl', 10, 2);
    store.toggleEmphasizedExcerpt('s-hitl', 10, 0);

    const state = store.getRrlUsageFor('s-hitl', 10);
    expect(state.usage).toBe('core');
    expect(state.emphasizedExcerpts).toEqual([2]);
  });

  it('preserves HITL safety gates in Module 2 UI components without modification', () => {
    const quickNavSrc = readRepoFile('web/src/citewise/module2/literature-review/components/QuickNavigationList.jsx');
    const footerSrc = readRepoFile('web/src/citewise/module2/literature-review/components/ValidationSummaryFooter.jsx');
    const dashboardSrc = readRepoFile(
      'web/src/citewise/module2/literature-review/components/ValidationDashboardLayout.jsx'
    );

    expect(quickNavSrc).toContain('const LOW_RELEVANCE_THRESHOLD = 50');
    expect(quickNavSrc).toContain('isLowRelevance');
    expect(quickNavSrc).toContain('setLowRelevanceConfirm');
    expect(footerSrc).toContain('const canProceed = approvedCount > 0');
    expect(dashboardSrc).toContain('getActiveApprovedDocs');
    expect(dashboardSrc).toContain('usage !== "exclude"');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// SUITE 6 – T5 Batch Benchmark Utilities, Dataset Parser, & Runner
// ─────────────────────────────────────────────────────────────────────────────

describe('T5 Batch Benchmark Utilities, Dataset Parser & Runner', () => {
  let tmpDir;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'citewise-t5-'));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('parses ground_truth.csv with quoted titles and rejects duplicates or invalid labels', () => {
    const csv = [
      'filename,expected_label,title',
      '"rag_01.pdf",Relevant,"Retrieval-Augmented Generation, A Survey"',
      'astro_01.pdf,Not Relevant,"Galaxies and Dark Matter"',
    ].join('\n');

    const parsed = parseGroundTruthCsv(csv);
    expect(parsed).toHaveLength(2);
    expect(parsed[0]).toMatchObject({
      filename: 'rag_01.pdf',
      expectedLabel: 'Relevant',
      title: 'Retrieval-Augmented Generation, A Survey',
    });
    expect(parsed[1].expectedLabel).toBe('Not Relevant');

    expect(() => parseGroundTruthCsv('filename,expected_label\na.pdf,Maybe')).toThrow(/Invalid expected_label/);
    expect(() =>
      parseGroundTruthCsv('filename,expected_label\na.pdf,Relevant\na.pdf,Not Relevant')
    ).toThrow(/Duplicate filename/);
    expect(() => parseGroundTruthCsv('filename,expected_label')).toThrow(/at least one data row/);
  });

  it('normalizes CATalyst baseline JSON and validates required fields', () => {
    const b1 = parseBaselineJson({
      title: 'RAG for Literature Synthesis',
      rationale: 'Hallucinations break trust.',
      gaps: ['Gap 1', 'Gap 2'],
    });
    expect(b1).toEqual({
      project_title: 'RAG for Literature Synthesis',
      rationale: 'Hallucinations break trust.',
      research_gaps: ['Gap 1', 'Gap 2'],
    });

    const b2 = parseBaselineJson({
      project_title: 'DB Baseline Title',
      rationale: '',
      research_gaps: 'First gap; Second gap',
    });
    expect(b2).toEqual({
      project_title: 'DB Baseline Title',
      rationale: '',
      research_gaps: ['First gap', 'Second gap'],
    });

    expect(() => parseBaselineJson({ title: '', rationale: 'x', gaps: ['g'] })).toThrow(/title/);
    expect(() => parseBaselineJson({ title: 'Title', rationale: '', gaps: [] })).toThrow(/rationale|gaps/);
  });

  it('computes strict binary accuracy, Needs Review breakdown, >=60 / >=70 metrics, T3, T4, and CSV output', () => {
    expect(classifyStrictBinary('Recommended')).toBe('Relevant');
    expect(classifyStrictBinary('Needs Review')).toBe('Not Relevant');
    expect(classifyStrictBinary('Low Relevance')).toBe('Not Relevant');
    expect(classifyStrictBinary('FAILED')).toBe('Not Relevant');
    expect(classifyScoreThreshold(60, 60)).toBe('Relevant');
    expect(classifyScoreThreshold(59.9, 60)).toBe('Not Relevant');
    expect(classifyScoreThreshold(null, 60)).toBe('Not Relevant');

    const rows = [
      buildResultRow({
        filename: 'rel_1.pdf',
        expectedLabel: 'Relevant',
        extractedTextStatus: 'EXTRACTED',
        aiLatencySeconds: 3.2,
        gapAlignmentScore: 88,
        methodologyScore: 82,
        theoreticalScore: 80,
        citationScore: 84,
        finalRubricScore: 84.0,
        classification: 'Recommended',
      }),
      buildResultRow({
        filename: 'rel_2.pdf',
        expectedLabel: 'Relevant',
        extractedTextStatus: 'EXTRACTED',
        aiLatencySeconds: 4.1,
        gapAlignmentScore: 85,
        methodologyScore: 80,
        theoreticalScore: 76,
        citationScore: 82,
        finalRubricScore: 81.25,
        classification: 'Recommended',
      }),
      buildResultRow({
        filename: 'rel_3.pdf',
        expectedLabel: 'Relevant',
        extractedTextStatus: 'EXTRACTED',
        aiLatencySeconds: 3.8,
        gapAlignmentScore: 74,
        methodologyScore: 72,
        theoreticalScore: 65,
        citationScore: 75,
        finalRubricScore: 71.75,
        classification: 'Needs Review',
        weaknessFlags: ['NO_THEORY_OR_FRAMEWORK'],
      }),
      buildResultRow({
        filename: 'off_1.pdf',
        expectedLabel: 'Not Relevant',
        extractedTextStatus: 'EXTRACTED',
        aiLatencySeconds: 2.5,
        gapAlignmentScore: 10,
        methodologyScore: 15,
        theoreticalScore: 10,
        citationScore: 30,
        finalRubricScore: 0,
        classification: 'Low Relevance',
        mismatchFlags: ['TOPIC_MISMATCH'],
      }),
      buildResultRow({
        filename: 'off_2.pdf',
        expectedLabel: 'Not Relevant',
        extractedTextStatus: 'EXTRACTED',
        aiLatencySeconds: 2.9,
        gapAlignmentScore: 52,
        methodologyScore: 60,
        theoreticalScore: 55,
        citationScore: 65,
        finalRubricScore: 56.95,
        classification: 'Needs Review',
        weaknessFlags: ['WEAK_RATIONALE_LINK'],
      }),
    ];

    const summary = computeBenchmarkSummary(rows);
    // Strict binary: rel_1 (TP), rel_2 (TP), rel_3 (FN because Needs Review -> Not Relevant), off_1 (TN), off_2 (TN)
    // Accuracy = 4/5 = 80%
    expect(summary.t5StrictBinary.accuracyPct).toBe(80);
    expect(summary.t5StrictBinary.meetsTarget80).toBe(true);
    expect(summary.t5StrictBinary).toMatchObject({ tp: 2, tn: 2, fp: 0, fn: 1 });

    // Score >= 60 and >= 70 both catch rel_3 (71.75) as Relevant and keep off_2 (56.95) as Not Relevant -> 100%
    expect(summary.t5Score60.accuracyPct).toBe(100);
    expect(summary.t5Score70.accuracyPct).toBe(100);

    expect(summary.needsReviewBreakdown).toMatchObject({
      totalNeedsReview: 2,
      pctOfTotal: 40,
      expectedRelevantCount: 1,
      expectedNotRelevantCount: 1,
    });
    expect(summary.needsReviewBreakdown.topWeaknessFlags).toEqual([
      { flag: 'NO_THEORY_OR_FRAMEWORK', count: 1 },
      { flag: 'WEAK_RATIONALE_LINK', count: 1 },
    ]);
    expect(summary.t3Extraction.extractionRatePct).toBe(100);
    expect(summary.t4Latency.meanAiSeconds).toBe(3.3);

    const csvOut = formatSummaryCsv(rows, summary);
    expect(csvOut).toContain('T5_STRICT_BINARY_ACCURACY_PCT,80%');
    expect(csvOut).toContain('T5_SCORE_GE_60_ACCURACY_PCT,100%');
    expect(csvOut).toContain('T5_SCORE_GE_70_ACCURACY_PCT,100%');
    expect(csvOut).toContain('NEEDS_REVIEW_BREAKDOWN');

    const consoleOut = formatSummaryConsoleReport(summary);
    expect(consoleOut).toContain('Target >= 80%: PASS');
    expect(consoleOut).toContain('Score >= 60');
    expect(consoleOut).toContain('Score >= 70');
  });

  it('enforces safe >= 15s throttling delay for batches > 10 unless allowFast is enabled', () => {
    expect(resolveThrottleDelayMs(null, 40)).toBe(16000);
    expect(resolveThrottleDelayMs('15500', 40)).toBe(15500);
    expect(() => resolveThrottleDelayMs('2000', 40, false)).toThrow(/40 AI requests \/ 10 min/);
    expect(resolveThrottleDelayMs('2000', 40, true)).toBe(2000);
    expect(resolveThrottleDelayMs('0', 5, false)).toBe(0);
  });

  it('parses arXiv Atom XML entries (with XML entities) and filters on-topic vs off-topic candidates', () => {
    const sampleXml = `
      <feed xmlns="http://www.w3.org/2005/Atom" xmlns:arxiv="http://arxiv.org/schemas/atom">
        <entry>
          <id>http://arxiv.org/abs/2401.12345v2</id>
          <title>  Citation-Aware &amp; Traceable  RAG Synthesis </title>
          <summary>Evaluates hallucination &amp; citation provenance in literature review.</summary>
          <arxiv:primary_category term="cs.CL"/>
          <link title="pdf" href="http://arxiv.org/pdf/2401.12345v2"/>
        </entry>
      </feed>
    `;
    const entries = parseArxivAtomXml(sampleXml);
    expect(entries).toHaveLength(1);
    expect(entries[0]).toEqual({
      arxivId: '2401.12345',
      title: 'Citation-Aware & Traceable RAG Synthesis',
      abstract: 'Evaluates hallucination & citation provenance in literature review.',
      category: 'cs.CL',
      pdfUrl: 'https://arxiv.org/pdf/2401.12345v2.pdf',
    });
    expect(isRelevantCandidate(entries[0])).toBe(true);

    // Off-topic exclusion must catch "(rag)" or "rag," via word boundary without false-positiving on "fragment"/"storage"
    expect(isOffTopicCandidate({ title: 'Dark Matter Halos', abstract: 'Fragment storage in galaxies.', category: 'astro-ph.GA' })).toBe(true);
    expect(isOffTopicCandidate({ title: 'Astrophysics with (RAG)', abstract: 'Uses rag, pipelines.', category: 'astro-ph.GA' })).toBe(false);
    expect(isOffTopicCandidate({ title: 'Transformers', abstract: 'NLP paper.', category: 'cs.CL' })).toBe(false);
  });

  it('validates CLI arguments strictly and supports --flag=value and --pdfs list', () => {
    const parsed = parseCliArgs([
      '--pdf-dir=/tmp/pdfs',
      '--pdfs',
      'a.pdf,b.pdf',
      '--limit=10',
      '--offset',
      '5',
      '--retry-429',
      '2',
      '--allow-fast',
    ]);
    expect(parsed.limit).toBe(10);
    expect(parsed.offset).toBe(5);
    expect(parsed.retry429).toBe(2);
    expect(parsed.pdfList).toEqual(['a.pdf', 'b.pdf']);
    expect(parsed.allowFast).toBe(true);

    expect(() => parseCliArgs(['--limit', '0'])).toThrow(/Invalid --limit/);
    expect(() => parseCliArgs(['--limit', 'abc'])).toThrow(/Invalid --limit/);
    expect(() => parseCliArgs(['--offset', 'abc'])).toThrow(/Invalid --offset/);
    expect(() => parseCliArgs(['--delay-ms'])).toThrow(/Missing value for option "--delay-ms"/);
  });

  it('disables CITEWISE_N8N_METADATA_WEBHOOK_URL during live run, retries 429 once, supports --pdfs, and excludes failed AI latency', async () => {
    const pdfDir = path.join(tmpDir, 'retry-pdfs');
    fs.mkdirSync(pdfDir, { recursive: true });
    const linesP1 = Array.from({ length: 20 }, (_, i) => `Page 1 line ${i + 1}: Retrieval-augmented generation citation provenance.`);
    const buf = makePdf([linesP1]);
    fs.writeFileSync(path.join(pdfDir, 'p1.pdf'), buf);
    fs.writeFileSync(path.join(pdfDir, 'p2.pdf'), buf);

    const gtPath = path.join(tmpDir, 'gt.csv');
    fs.writeFileSync(gtPath, 'filename,expected_label\np1.pdf,Relevant\np2.pdf,Not Relevant\n', 'utf8');
    const baselinePath = path.join(tmpDir, 'base.json');
    fs.writeFileSync(baselinePath, JSON.stringify({ title: 'RAG', rationale: 'Provenance', gaps: ['Gap'] }), 'utf8');
    const outputCsvPath = path.join(tmpDir, 'retry-out.csv');

    const docs = [];
    const insights = [];
    const timings = [];
    let nextId = 1;
    let p1Attempts = 0;

    process.env.CITEWISE_N8N_METADATA_WEBHOOK_URL = 'http://localhost:5678/webhook/metadata-test';

    const fakeSupabase = {
      from: (table) => {
        if (table === 'research_baselines') {
          return {
            upsert: async () => ({ error: null }),
            insert: async () => ({ error: null }),
          };
        }
        if (table === 'uploaded_documents') {
          return {
            insert: (row) => {
              const saved = { id: nextId++, ...row };
              docs.push(saved);
              return { select: () => ({ single: async () => ({ data: saved, error: null }) }) };
            },
            update: (fields) => ({
              eq: async (_c, id) => {
                const d = docs.find((x) => x.id === id);
                if (d) Object.assign(d, fields);
                return { error: null };
              },
            }),
            select: () => ({
              eq: (_c, id) => ({
                single: async () => ({ data: docs.find((x) => x.id === id) ?? null, error: null }),
              }),
            }),
          };
        }
        if (table === 'document_insights') {
          return {
            select: () => ({
              eq: (_c, id) => ({
                order: () => ({
                  limit: async () => ({ data: insights.filter((x) => x.document_id === id), error: null }),
                }),
              }),
            }),
          };
        }
        if (table === 'assessment_timings') {
          return {
            select: () => ({
              eq: (_c, id) => ({
                order: () => ({
                  limit: async () => ({ data: timings.filter((x) => x.document_id === id), error: null }),
                }),
              }),
            }),
          };
        }
        if (table === 'mvp_validation_logs') {
          return { insert: async () => ({ error: { message: "Could not find the table 'public.mvp_validation_logs' in the schema cache" } }) };
        }
        return {};
      },
    };

    const fakeScoringPipeline = async (docId) => {
      // Metadata webhook must be cleared during benchmark scoring
      expect(process.env.CITEWISE_N8N_METADATA_WEBHOOK_URL).toBeUndefined();
      const doc = docs.find((d) => d.id === docId);
      if (doc.file_name === 'p1.pdf') {
        p1Attempts++;
        if (p1Attempts === 1) {
          doc.scoring_status = 'FAILED';
          doc.scoring_error_message = 'n8n returned 429: Too Many Requests';
          return;
        }
        doc.scoring_status = 'COMPLETE';
        doc.scoring_error_message = null;
        insights.push({
          document_id: docId,
          gap_alignment_score: 90,
          methodology_score: 85,
          theoretical_score: 80,
          citation_score: 88,
          overall_score: 86.45,
          recommendation_status: 'Recommended',
          confidence_level: 'High',
          relevance_level: 'High',
        });
        timings.push({ document_id: docId, ai_ms: 2500, assessment_duration_seconds: 2.8, status: 'COMPLETE' });
      }
    };

    const res = await runT5Benchmark(
      {
        dryRun: false,
        allowFast: true,
        withMetadata: false,
        pdfDir,
        pdfList: ['p1.pdf'],
        groundTruthPath: gtPath,
        baselinePath,
        outputCsvPath,
        rawDelayMs: '0',
        retry429: 1,
        limit: null,
        offset: 0,
        sessionId: 'reuse-session-id',
      },
      {
        supabase: fakeSupabase,
        scoringPipeline: fakeScoringPipeline,
        updateDocumentFields: async () => {},
        r2: { isR2Configured: false, uploadTextToR2: vi.fn() },
        retry429CooldownMs: 0,
      }
    );

    // Env var restored after benchmark
    expect(process.env.CITEWISE_N8N_METADATA_WEBHOOK_URL).toBe('http://localhost:5678/webhook/metadata-test');
    delete process.env.CITEWISE_N8N_METADATA_WEBHOOK_URL;

    expect(p1Attempts).toBe(2);
    expect(res.results).toHaveLength(1);
    expect(res.results[0].classification).toBe('Recommended');
    expect(res.summary.t5StrictBinary.accuracyPct).toBe(100);
    expect(res.summary.scoredCompleteCount).toBe(1);
    expect(res.summary.scoringFailedCount).toBe(0);
  });

  it('runs runT5Benchmark in both --dry-run and mocked-live modes with real PDFs, persisting DB proof and CSV', async () => {
    const pdfDir = path.join(tmpDir, 'pdfs');
    fs.mkdirSync(pdfDir, { recursive: true });

    const relLinesP1 = Array.from(
      { length: 20 },
      (_, i) => `Page 1 line ${i + 1}: Retrieval-augmented generation reduces citation hallucination in literature synthesis.`
    );
    const relLinesP2 = Array.from(
      { length: 20 },
      (_, i) => `Page 2 line ${i + 1}: We evaluate provenance across 40 papers with explicit methodology metrics.`
    );
    const offLinesP1 = Array.from(
      { length: 20 },
      (_, i) => `Page 1 line ${i + 1}: Spectral analysis of massive galaxies in high-redshift clusters.`
    );
    const offLinesP2 = Array.from(
      { length: 20 },
      (_, i) => `Page 2 line ${i + 1}: Photometric calibration of ultraviolet emission lines in blazars.`
    );

    const relBuf = makePdf([relLinesP1, relLinesP2]);
    const offBuf = makePdf([offLinesP1, offLinesP2]);

    fs.writeFileSync(path.join(pdfDir, 'on_topic.pdf'), relBuf);
    fs.writeFileSync(path.join(pdfDir, 'off_topic.pdf'), offBuf);

    const gtPath = path.join(tmpDir, 'ground_truth.csv');
    fs.writeFileSync(gtPath, 'filename,expected_label\non_topic.pdf,Relevant\noff_topic.pdf,Not Relevant\n', 'utf8');

    const baselinePath = path.join(tmpDir, 'baseline.json');
    fs.writeFileSync(
      baselinePath,
      JSON.stringify({
        title: 'Citation-Aware RAG Literature Synthesis',
        rationale: 'Prevent hallucinated citations.',
        gaps: ['Lack of provenance in LLM synthesis'],
      }),
      'utf8'
    );

    const outputCsvPath = path.join(tmpDir, 'out/summary.csv');

    // 1. Dry-run verification
    const dryRes = await runT5Benchmark({
      dryRun: true,
      allowFast: true,
      pdfDir,
      groundTruthPath: gtPath,
      baselinePath,
      outputCsvPath,
      rawDelayMs: '0',
      limit: null,
      offset: 0,
      sessionId: null,
    });
    expect(dryRes.dryRun).toBe(true);
    expect(dryRes.rows.every((r) => r.extractedTextStatus === 'EXTRACTED')).toBe(true);

    // 2. Mocked live run verifying DB persistence + scoringPipeline + CSV + mvp_validation_logs
    const inserted = { baselines: [], docs: [], insights: [], timings: [], validationLogs: [] };
    let nextDocId = 1;
    const fakeSupabase = {
      from: (table) => {
        if (table === 'research_baselines') {
          return {
            insert: async (row) => {
              inserted.baselines.push(row);
              return { error: null };
            },
          };
        }
        if (table === 'uploaded_documents') {
          return {
            insert: (row) => {
              const saved = { id: nextDocId++, ...row };
              inserted.docs.push(saved);
              return {
                select: () => ({ single: async () => ({ data: saved, error: null }) }),
              };
            },
            select: () => ({
              eq: (_c, id) => ({
                single: async () => ({
                  data: inserted.docs.find((d) => d.id === id) ?? null,
                  error: null,
                }),
              }),
            }),
          };
        }
        if (table === 'document_insights') {
          return {
            select: () => ({
              eq: (_c, id) => ({
                order: () => ({
                  limit: async () => ({
                    data: inserted.insights.filter((i) => i.document_id === id),
                    error: null,
                  }),
                }),
              }),
            }),
          };
        }
        if (table === 'assessment_timings') {
          return {
            select: () => ({
              eq: (_c, id) => ({
                order: () => ({
                  limit: async () => ({
                    data: inserted.timings.filter((t) => t.document_id === id),
                    error: null,
                  }),
                }),
              }),
            }),
          };
        }
        if (table === 'mvp_validation_logs') {
          return {
            insert: async (rows) => {
              inserted.validationLogs.push(...rows);
              return { error: null };
            },
          };
        }
        return {};
      },
    };

    const fakeScoringPipeline = async (docId) => {
      const doc = inserted.docs.find((d) => d.id === docId);
      const isRel = doc.file_name === 'on_topic.pdf';
      doc.scoring_status = 'COMPLETE';
      doc.assessment_duration_seconds = isRel ? 3.4 : 2.1;
      inserted.insights.push({
        document_id: docId,
        gap_alignment_score: isRel ? 90 : 10,
        methodology_score: isRel ? 85 : 15,
        theoretical_score: isRel ? 80 : 10,
        citation_score: isRel ? 88 : 30,
        overall_score: isRel ? 86.45 : 0,
        recommendation_status: isRel ? 'Recommended' : 'Low Relevance',
        confidence_level: isRel ? 'High' : 'Low',
        relevance_level: isRel ? 'High' : 'Low',
        mismatch_flags_json: isRel ? '[]' : '["TOPIC_MISMATCH"]',
        weakness_flags_json: '[]',
        validation_flags_json: '[]',
      });
      inserted.timings.push({
        document_id: docId,
        ai_ms: isRel ? 3100 : 1900,
        assessment_ms: isRel ? 3400 : 2100,
        assessment_duration_seconds: isRel ? 3.4 : 2.1,
        status: 'COMPLETE',
      });
    };

    const liveRes = await runT5Benchmark(
      {
        dryRun: false,
        allowFast: true,
        pdfDir,
        groundTruthPath: gtPath,
        baselinePath,
        outputCsvPath,
        rawDelayMs: '0',
        limit: null,
        offset: 0,
        sessionId: 'bench-sess-1',
      },
      {
        supabase: fakeSupabase,
        scoringPipeline: fakeScoringPipeline,
        updateDocumentFields: async (docId, fields) => {
          const doc = inserted.docs.find((d) => d.id === docId);
          if (doc) Object.assign(doc, fields);
        },
        r2: { isR2Configured: false, uploadTextToR2: vi.fn() },
      }
    );

    expect(liveRes.dryRun).toBe(false);
    expect(liveRes.summary.t5StrictBinary.accuracyPct).toBe(100);
    expect(liveRes.summary.t3Extraction.extractionRatePct).toBe(100);
    expect(inserted.baselines).toHaveLength(1);
    expect(inserted.docs).toHaveLength(2);
    expect(inserted.validationLogs).toHaveLength(6);
    expect(fs.existsSync(outputCsvPath)).toBe(true);
    expect(fs.existsSync(outputCsvPath.replace(/\.csv$/, '.json'))).toBe(true);
    const csvText = fs.readFileSync(outputCsvPath, 'utf8');
    expect(csvText).toContain('T5_STRICT_BINARY_ACCURACY_PCT,100%');
  });

  it('fails fast on missing PDFs and handles corrupt PDFs gracefully during dry-run', async () => {
    const pdfDir = path.join(tmpDir, 'edge-pdfs');
    fs.mkdirSync(pdfDir, { recursive: true });
    const gtPath = path.join(tmpDir, 'edge-gt.csv');
    const baselinePath = path.join(tmpDir, 'edge-baseline.json');
    fs.writeFileSync(
      baselinePath,
      JSON.stringify({ title: 'RAG', rationale: 'Provenance', gaps: ['Gap 1'] }),
      'utf8'
    );
    fs.writeFileSync(gtPath, 'filename,expected_label\nmissing.pdf,Relevant\n', 'utf8');

    await expect(
      runT5Benchmark({
        dryRun: true,
        allowFast: true,
        pdfDir,
        groundTruthPath: gtPath,
        baselinePath,
        outputCsvPath: path.join(tmpDir, 'edge.csv'),
        rawDelayMs: '0',
        limit: null,
        offset: 0,
        sessionId: null,
      })
    ).rejects.toThrow(/Missing 1 PDF file/);

    fs.writeFileSync(path.join(pdfDir, 'corrupt.pdf'), Buffer.from('not-a-real-pdf'));
    fs.writeFileSync(gtPath, 'filename,expected_label\ncorrupt.pdf,Not Relevant\n', 'utf8');
    const dryCorrupt = await runT5Benchmark({
      dryRun: true,
      allowFast: true,
      pdfDir,
      groundTruthPath: gtPath,
      baselinePath,
      outputCsvPath: path.join(tmpDir, 'edge.csv'),
      rawDelayMs: '0',
      limit: null,
      offset: 0,
      sessionId: null,
    });
    expect(dryCorrupt.rows[0].extractedTextStatus).toBe('FAILED');
    expect(dryCorrupt.rows[0].errorMessage).toMatch(/Invalid PDF/);
  });
});
