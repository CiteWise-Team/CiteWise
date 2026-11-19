/**
 * CiteWise Validation Evidence Telemetry Test Suite (Fixes #1–#18).
 *
 * Verifies:
 *   - T1 & T2: fresh manual sessionId isolation, user_id & import_fidelity_json snapshot
 *   - T3: independent extraction_status + upload_rejections logging
 *   - T4: 15s SRS target, p95, and within15sPct in summarizeTimings & /assessment-timings
 *   - T6: deterministic keyphrase-overlap evaluateGapCoverage
 *   - T7, T8, B, F: immutable draft_snapshots on save-draft, GET /snapshots,
 *                   automated APA 7th compliance checker, and approved_at timestamp
 *   - Security & benchmark integrity: no hardcoded credentials/placeholders in E2E scripts,
 *                                     40 SHA-256 checksums in dataset-manifest.json
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { evaluateGapCoverage } from '../modules/citewise/helpers/gapCoverage.js';
import { checkApa7Compliance, validateReferenceEntry, validateInTextCitations } from '../modules/citewise/helpers/apaChecker.js';
import { summarizeTimings, SRS_TARGET_MS } from '../modules/citewise/helpers/assessmentTiming.js';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(HERE, '../../..');
const readRepoFile = (rel) => fs.readFileSync(path.join(REPO_ROOT, rel), 'utf8');

function makeTelemetrySupabaseMock(state) {
  return {
    auth: {
      getUser: async (token) =>
        token === 'valid-jwt'
          ? { data: { user: { id: 'user-val-1', email: 'validator@citewise.edu' } }, error: null }
          : { data: { user: null }, error: { message: 'Invalid token' } },
    },
    from: (table) => {
      const ctx = { table, op: 'select', filters: [], payload: null };
      const rowsFor = () => (state[table] ||= []);
      const applyFilters = (rows) =>
        rows.filter((r) =>
          ctx.filters.every((f) => (f.type === 'eq' ? String(r[f.col]) === String(f.val) : true))
        );

      const execute = async () => {
        const list = rowsFor();
        if (ctx.op === 'select') {
          return { data: applyFilters(list), error: null };
        }
        if (ctx.op === 'insert') {
          const items = Array.isArray(ctx.payload) ? ctx.payload : [ctx.payload];
          const inserted = items.map((item) => {
            const row = { id: list.length + 1, created_at: new Date().toISOString(), ...item };
            list.push(row);
            return row;
          });
          return { data: inserted, error: null };
        }
        if (ctx.op === 'upsert') {
          const idx = list.findIndex((r) => r.session_id === ctx.payload.session_id);
          const row = { id: idx >= 0 ? list[idx].id : list.length + 1, created_at: new Date().toISOString(), ...ctx.payload };
          if (idx >= 0) list[idx] = { ...list[idx], ...row };
          else list.push(row);
          return { data: [row], error: null };
        }
        if (ctx.op === 'update') {
          const matched = applyFilters(list);
          matched.forEach((r) => Object.assign(r, ctx.payload));
          return { data: matched, error: null };
        }
        if (ctx.op === 'delete') {
          const matched = new Set(applyFilters(list));
          state[table] = list.filter((r) => !matched.has(r));
          return { data: [], error: null };
        }
        return { data: [], error: null };
      };

      const chain = {
        select: () => { ctx.op = 'select'; return chain; },
        insert: (p) => { ctx.op = 'insert'; ctx.payload = p; return chain; },
        upsert: (p) => { ctx.op = 'upsert'; ctx.payload = p; return chain; },
        update: (p) => { ctx.op = 'update'; ctx.payload = p; return chain; },
        delete: () => { ctx.op = 'delete'; return chain; },
        eq: (col, val) => { ctx.filters.push({ type: 'eq', col, val }); return chain; },
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

describe('T6 Gap Coverage Helper (gapCoverage.js)', () => {
  it('scores paraphrased gaps as covered and flags uncovered gaps', () => {
    const gaps = [
      'Large language models hallucinate unsupported citations during academic synthesis.',
      'Existing benchmarks rarely evaluate quote-level provenance back to source pages.',
      'Quantum entanglement decoherence in superconducting qubits.',
    ];
    const draft = {
      contentText:
        'Recent studies show that large language models frequently hallucinate fabricated citations in scholarly synthesis. ' +
        'Moreover, current evaluation benchmarks seldom verify quote-level provenance directly against source pages.',
      gapText:
        'A persistent limitation is that benchmarks rarely check quote-level provenance back to exact source pages.',
      primaryFocusGap: gaps[1],
    };

    const result = evaluateGapCoverage(gaps, draft);
    expect(result.totalGaps).toBe(3);
    expect(result.coveredCount).toBe(2);
    expect(result.coveragePct).toBeCloseTo(66.67, 1);
    expect(result.meetsTarget100Pct).toBe(false);
    expect(result.primaryFocusCovered).toBe(true);
    expect(result.perGap[0].covered).toBe(true);
    expect(result.perGap[1].covered).toBe(true);
    expect(result.perGap[2].covered).toBe(false);
  });
});

describe('T8 Automated APA 7th Compliance Checker (apaChecker.js)', () => {
  it('passes well-formed APA 7th references and in-text citations', () => {
    const content =
      'Citation-aware retrieval reduces hallucinations (Smith & Jones, 2024; Gao et al., 2023).';
    const refs = [
      'Gao, T., Yen, H., Yu, J., & Chen, D. (2023). Enabling large language models to generate text with citations. EMNLP.',
      'Smith, A., & Jones, B. (2024). Verifiable academic synthesis with RAG. Journal of AI Research.',
    ].join('\n');

    const report = checkApa7Compliance(content, refs, []);
    expect(report.referenceCount).toBe(2);
    expect(report.inTextCitationCount).toBe(2);
    expect(report.formatErrorCount).toBe(0);
    expect(report.errorRatePct).toBe(0);
    expect(report.meetsTarget15Pct).toBe(true);
    expect(report.meetsZeroUnverified).toBe(true);
    expect(report.referencesOutOfOrderCount).toBe(0);
  });

  it('flags malformed references and in-text citations cleanly', () => {
    const badRef = validateReferenceEntry('Smith, A. and Jones, B. 2024 paper_01.pdf');
    expect(badRef.valid).toBe(false);
    expect(badRef.issues).toContain('MISSING_OR_MALFORMED_YEAR');

    const badInText = validateInTextCitations('Claims were tested (Smith and Jones 2024; Lee et al, 2023).');
    expect(badInText).toHaveLength(2);
    expect(badInText[0].issues).toContain('MISSING_COMMA_BEFORE_YEAR');
    expect(badInText[0].issues).toContain('USE_AMPERSAND_IN_PARENTHETICAL');
    expect(badInText[1].issues).toContain('ET_AL_MISSING_PERIOD');
  });
});

describe('T4 Assessment Timings Summary (15s SRS Target & p95)', () => {
  it('reports mean, p95, and within15sPct while excluding reused AI responses', () => {
    const rows = [
      { page_count: 5, extraction_method: 'local', extraction_ms: 200, ai_ms: 9000, assessment_ms: 10000, total_ms: 10200, status: 'COMPLETE', reused_ai_response: false },
      { page_count: 12, extraction_method: 'local', extraction_ms: 300, ai_ms: 13000, assessment_ms: 14000, total_ms: 14300, status: 'COMPLETE', reused_ai_response: false },
      { page_count: 25, extraction_method: 'local', extraction_ms: 500, ai_ms: 24000, assessment_ms: 26000, total_ms: 26500, status: 'COMPLETE', reused_ai_response: false },
      { page_count: 10, extraction_method: 'local', extraction_ms: 200, ai_ms: 0, assessment_ms: 50, total_ms: 50, status: 'COMPLETE', reused_ai_response: true },
    ];
    const summary = summarizeTimings(rows, SRS_TARGET_MS);
    expect(summary.targetMs).toBe(15000);
    expect(summary.srsTargetMs).toBe(15000);
    expect(summary.runs).toBe(3);
    expect(summary.overall.within15sCount).toBe(2);
    expect(summary.overall.within15sPct).toBeCloseTo(66.67, 1);
    expect(summary.overall.p95AssessmentSeconds).toBe(26);
    expect(summary.overall.meanAssessmentSeconds).toBeCloseTo(16.67, 1);
  });
});

describe('End-to-End Validation Telemetry Routes (T1/T2/T3/T4/T7/T8/B/C/F)', () => {
  let app;
  let dbState;

  beforeEach(async () => {
    process.env.SUPABASE_URL ||= 'http://127.0.0.1:1/';
    process.env.SUPABASE_KEY ||= 'test-key';
    process.env.SUPABASE_ANON_KEY ||= 'test-key';
    vi.resetModules();

    dbState = {
      Topic: [{ id: 1, group_id: 'grp-shared', title: 'RAG Study', rationale: 'Ground citations.' }],
      GapResult: [{ id: 1, group_id: 'grp-shared', gap: JSON.stringify(['Gap 1', 'Gap 2']) }],
      research_baselines: [],
      uploaded_documents: [
        { id: 10, session_id: 'sess-1', file_name: 'a.pdf', approved: false, scoring_status: 'COMPLETE' },
      ],
      upload_rejections: [],
      assessment_timings: [
        { id: 1, session_id: 'sess-1', page_count: 8, extraction_method: 'local', extraction_ms: 200, ai_ms: 11000, assessment_ms: 12000, total_ms: 12200, status: 'COMPLETE', reused_ai_response: false },
      ],
      generated_draft: [
        {
          id: 50,
          session_id: 'sess-1',
          content_text: 'Original AI draft (Smith, 2024).',
          references_text: 'Smith, A. (2024). Grounding RAG. Venue.',
          validation_status: 'PASSED',
          metrics_json: JSON.stringify({
            approvedDocumentIds: [10],
            gapsUsed: ['Gap 1'],
            citationIntegrity: { unverified: [], omittedDocuments: [] },
          }),
        },
      ],
      draft_snapshots: [],
    };

    vi.doMock('../common/config/supabaseClient.js', () => ({ default: makeTelemetrySupabaseMock(dbState) }));
    app = (await import('../app.js')).default;
  });

  afterEach(() => {
    vi.doUnmock('../common/config/supabaseClient.js');
  });

  it('snapshots T2 import_fidelity_json + user_id and isolates ?mode=manual session_id from auto arm', async () => {
    const autoRes = await request(app)
      .post('/api/catalyst/import')
      .set('Authorization', 'Bearer valid-jwt')
      .send({ workspaceId: 'grp-shared', setupMode: 'auto' });
    expect(autoRes.status).toBe(200);
    expect(autoRes.body.data.importFidelity.titleMatchesSource).toBe(true);
    expect(autoRes.body.data.importFidelity.storedGapCount).toBe(2);

    const manualRes = await request(app)
      .post('/api/catalyst/manual-baseline')
      .set('Authorization', 'Bearer valid-jwt')
      .send({ workspaceId: 'grp-shared', title: 'Manual Copy', rationale: 'Typed manually.', gaps: ['Gap 1'] });
    expect(manualRes.status).toBe(200);
    // Manual arm must NOT collide with auto arm session_id on the same workspaceId
    expect(manualRes.body.data.sessionId).not.toBe(autoRes.body.data.sessionId);
    expect(dbState.research_baselines).toHaveLength(2);
    expect(dbState.research_baselines[0].user_id).toBe('user-val-1');
    expect(dbState.research_baselines[1].user_id).toBe('user-val-1');
  });

  it('logs pre-insert rejected uploads to upload_rejections for T3 denominator recovery', async () => {
    const res = await request(app)
      .post('/api/rrl/upload')
      .set('Authorization', 'Bearer valid-jwt')
      .set('X-Session-Id', 'sess-1')
      .attach('files', Buffer.from('not a pdf'), { filename: 'notes.txt', contentType: 'text/plain' })
      .attach('files', Buffer.from('corrupt bytes'), { filename: 'fake.pdf', contentType: 'application/pdf' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(false);
    expect(dbState.upload_rejections).toHaveLength(2);
    expect(dbState.upload_rejections.map((r) => r.rejection_reason)).toEqual([
      'UNSUPPORTED_TYPE',
      'INVALID_MAGIC_BYTES',
    ]);
    expect(dbState.upload_rejections[0].user_id).toBe('user-val-1');
  });

  it('records approved_at timestamp on PATCH /:id/approval and defaults /assessment-timings to 15s SRS target', async () => {
    const approveRes = await request(app)
      .patch('/api/v1/documents/10/approval')
      .set('Authorization', 'Bearer valid-jwt')
      .set('X-Session-Id', 'sess-1')
      .send({ status: 'APPROVED' });
    expect(approveRes.status).toBe(200);
    expect(dbState.uploaded_documents[0].approved).toBe(true);
    expect(dbState.uploaded_documents[0].approved_at).toBeTruthy();

    const timingsRes = await request(app)
      .get('/api/v1/documents/assessment-timings?sessionId=sess-1')
      .set('Authorization', 'Bearer valid-jwt');
    expect(timingsRes.status).toBe(200);
    expect(timingsRes.body.data.targetMs).toBe(15000);
    expect(timingsRes.body.data.overall.within15sPct).toBe(100);
  });

  it('snapshots original PASSED draft before save-draft overwrite and serves GET /snapshots', async () => {
    const saveRes = await request(app)
      .post('/api/v1/synthesis/save-draft')
      .set('Authorization', 'Bearer valid-jwt')
      .send({
        sessionId: 'sess-1',
        contentText: 'Edited draft text (Smith, 2024).',
        referencesText: 'Smith, A. (2024). Grounding RAG. Venue.',
        source: 'edited',
      });
    expect(saveRes.status).toBe(200);
    expect(saveRes.body.apaCheck.errorRatePct).toBe(0);
    // Snapshot 1 = pre_edit_backup of original PASSED draft; Snapshot 2 = manual_save
    expect(dbState.draft_snapshots).toHaveLength(2);
    expect(dbState.draft_snapshots[0].snapshot_type).toBe('pre_edit_backup');
    expect(dbState.draft_snapshots[0].content_text).toBe('Original AI draft (Smith, 2024).');
    expect(dbState.draft_snapshots[1].snapshot_type).toBe('manual_save');

    const histRes = await request(app)
      .get('/api/v1/synthesis/snapshots?sessionId=sess-1')
      .set('Authorization', 'Bearer valid-jwt');
    expect(histRes.status).toBe(200);
    expect(histRes.body.data).toHaveLength(2);
  });
});

describe('Security & Benchmark Artifact Hygiene (Fixes #1, #12, #13, #14)', () => {
  it('verifies E2E scripts have no hardcoded credentials, placeholders, or broken endpoints', () => {
    const puppeteerSrc = readRepoFile('api/scripts/e2e-mvp-puppeteer.js');
    const playwrightSrc = readRepoFile('e2e-tests/run-mvp-validation.js');

    expect(puppeteerSrc).not.toContain('nyxobadinas@gmail.com');
    expect(puppeteerSrc).not.toContain('122633090003');
    expect(puppeteerSrc).not.toContain("'95%'");
    expect(puppeteerSrc).not.toContain("logMetric('CATalyst Gap Coverage', '100%', '100%'");
    expect(puppeteerSrc).not.toContain("logMetric('APA 7 Citation Error', '<15%', '0%'");

    expect(playwrightSrc).not.toContain('nyxobadinas@gmail.com');
    expect(playwrightSrc).not.toContain('122633090003');
    expect(playwrightSrc).not.toContain('msedge.exe');
    expect(playwrightSrc).not.toContain('/api/extractor/file');
    expect(playwrightSrc).toContain('/api/rrl/upload');
    expect(playwrightSrc).toContain('documentIds: uploadedDocIds');
  });

  it('verifies all 40 T5 dataset-manifest.json entries include valid SHA-256 checksums', () => {
    const manifest = JSON.parse(readRepoFile('api/test-data/t5-benchmark/dataset-manifest.json'));
    expect(manifest).toHaveLength(40);
    for (const entry of manifest) {
      expect(entry.sha256).toMatch(/^[a-f0-9]{64}$/);
    }
  });
});
