/**
 * CiteWise T1 Setup-Time Reduction & ?mode=manual Telemetry Test Suite.
 *
 * Verifies:
 *   1. POST /api/catalyst/import records setup_mode='auto' + setup_started_at
 *   2. POST /api/catalyst/manual-baseline records setup_mode='manual' + setup_started_at
 *   3. POST /api/catalyst/setup-timing records setup_completed_at + computes duration
 *   4. GET /api/catalyst/setup-timings/export exports JSON summary (reductionPct) & CSV
 *   5. Graceful fallback when migration 006 columns are not yet applied
 *   6. Frontend WorkspaceImportLayout.jsx ?mode=manual & setup-timing contract
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(HERE, '../../..');

function makeCatalystSupabaseMock(state, { missingTimingCols = false } = {}) {
  const TIMING_COLS = ['setup_mode', 'setup_started_at', 'setup_completed_at'];

  const hasTimingColInPayload = (obj) =>
    obj && typeof obj === 'object' && TIMING_COLS.some((c) => Object.prototype.hasOwnProperty.call(obj, c));

  return {
    auth: {
      getUser: async (token) =>
        token === 'valid-jwt'
          ? { data: { user: { id: 'user-t1', email: 'rater@citewise.edu' } }, error: null }
          : { data: { user: null }, error: { message: 'Invalid token' } },
    },
    from: (table) => {
      const ctx = { table, op: 'select', filters: [], payload: null, selectCols: '*' };
      const applyFilters = (rows) =>
        rows.filter((r) =>
          ctx.filters.every((f) => (f.type === 'eq' ? String(r[f.col]) === String(f.val) : true))
        );

      const execute = async () => {
        if (table === 'Topic') {
          return { data: applyFilters(state.topics), error: null };
        }
        if (table === 'GapResult') {
          return { data: applyFilters(state.gaps), error: null };
        }
        if (table === 'research_baselines') {
          if (
            missingTimingCols &&
            ((typeof ctx.selectCols === 'string' && TIMING_COLS.some((c) => ctx.selectCols.includes(c))) ||
              hasTimingColInPayload(ctx.payload))
          ) {
            return {
              data: null,
              error: { message: 'Could not find the setup_mode column of research_baselines in the schema cache' },
            };
          }

          if (ctx.op === 'select') {
            return { data: applyFilters(state.baselines), error: null };
          }
          if (ctx.op === 'upsert') {
            const idx = state.baselines.findIndex((b) => b.session_id === ctx.payload.session_id);
            const row = { created_at: new Date().toISOString(), ...ctx.payload };
            if (idx >= 0) state.baselines[idx] = { ...state.baselines[idx], ...row };
            else state.baselines.unshift(row);
            return { data: [row], error: null };
          }
          if (ctx.op === 'update') {
            const matched = applyFilters(state.baselines);
            matched.forEach((b) => Object.assign(b, ctx.payload));
            return { data: matched, error: null };
          }
          if (ctx.op === 'insert') {
            const row = { created_at: new Date().toISOString(), ...ctx.payload };
            state.baselines.unshift(row);
            return { data: [row], error: null };
          }
        }
        return { data: [], error: null };
      };

      const chain = {
        select: (cols = '*') => {
          ctx.op = 'select';
          ctx.selectCols = cols;
          return chain;
        },
        upsert: (payload) => {
          ctx.op = 'upsert';
          ctx.payload = payload;
          return chain;
        },
        update: (payload) => {
          ctx.op = 'update';
          ctx.payload = payload;
          return chain;
        },
        insert: (payload) => {
          ctx.op = 'insert';
          ctx.payload = payload;
          return chain;
        },
        eq: (col, val) => {
          ctx.filters.push({ type: 'eq', col, val });
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

describe('T1 Setup-Time Reduction & ?mode=manual Telemetry', () => {
  let app;
  let dbState;

  beforeEach(async () => {
    process.env.SUPABASE_URL ||= 'http://127.0.0.1:1/';
    process.env.SUPABASE_KEY ||= 'test-key';
    process.env.SUPABASE_ANON_KEY ||= 'test-key';
    vi.resetModules();

    dbState = {
      topics: [{ id: 1, group_id: 'grp-auto-1', title: 'RAG Provenance Study', rationale: 'Reduce hallucinations.' }],
      gaps: [{ id: 1, group_id: 'grp-auto-1', gap: JSON.stringify(['Lack of quote verification', 'Weak gap alignment']) }],
      baselines: [],
    };

    vi.doMock('../common/config/supabaseClient.js', () => ({ default: makeCatalystSupabaseMock(dbState) }));
    app = (await import('../app.js')).default;
  });

  afterEach(() => {
    vi.doUnmock('../common/config/supabaseClient.js');
  });

  it('records auto vs manual setup timings and exports CSV & JSON with reductionPct', async () => {
    // 1. Auto import arm (5 seconds setup)
    const autoImport = await request(app)
      .post('/api/catalyst/import')
      .set('Authorization', 'Bearer valid-jwt')
      .send({
        workspaceId: 'grp-auto-1',
        setupMode: 'auto',
        setupStartedAt: '2026-11-19T12:00:00.000Z',
      });
    expect(autoImport.status).toBe(200);
    expect(autoImport.body.data.setupMode).toBe('auto');
    const autoSid = autoImport.body.data.sessionId;

    const autoDone = await request(app)
      .post('/api/catalyst/setup-timing')
      .set('Authorization', 'Bearer valid-jwt')
      .send({
        sessionId: autoSid,
        setupMode: 'auto',
        setupCompletedAt: '2026-11-19T12:00:05.000Z',
      });
    expect(autoDone.status).toBe(200);
    expect(autoDone.body.data.setupDurationSeconds).toBe(5);

    // 2. Manual ?mode=manual arm (50 seconds setup -> 90% reduction by auto)
    const manualSave = await request(app)
      .post('/api/catalyst/manual-baseline')
      .set('Authorization', 'Bearer valid-jwt')
      .send({
        workspaceId: 'grp-manual-1',
        title: 'Manual RAG Study',
        rationale: 'Copy-pasted rationale.',
        gaps: ['Gap A', 'Gap B'],
        setupStartedAt: '2026-11-19T12:01:00.000Z',
      });
    expect(manualSave.status).toBe(200);
    expect(manualSave.body.data.setupMode).toBe('manual');
    const manualSid = manualSave.body.data.sessionId;

    const manualDone = await request(app)
      .post('/api/catalyst/setup-timing')
      .set('Authorization', 'Bearer valid-jwt')
      .send({
        sessionId: manualSid,
        setupMode: 'manual',
        setupCompletedAt: '2026-11-19T12:01:50.000Z',
      });
    expect(manualDone.status).toBe(200);
    expect(manualDone.body.data.setupDurationSeconds).toBe(50);

    // 3. Export JSON summary
    const exportJson = await request(app)
      .get('/api/catalyst/setup-timings/export')
      .set('Authorization', 'Bearer valid-jwt');
    expect(exportJson.status).toBe(200);
    expect(exportJson.body.data.summary).toEqual({
      totalRows: 2,
      autoCount: 1,
      manualCount: 1,
      autoMeanSeconds: 5,
      manualMeanSeconds: 50,
      reductionPct: 90,
    });

    // 4. Export CSV
    const exportCsv = await request(app)
      .get('/api/catalyst/setup-timings/export?format=csv')
      .set('Authorization', 'Bearer valid-jwt');
    expect(exportCsv.status).toBe(200);
    expect(exportCsv.headers['content-type']).toContain('text/csv');
    expect(exportCsv.text).toContain('session_id,catalyst_workspace_id,project_title,source_system,setup_mode,setup_started_at,setup_completed_at,setup_duration_seconds');
    expect(exportCsv.text).toContain(',auto,2026-11-19T12:00:00.000Z,2026-11-19T12:00:05.000Z,5');
    expect(exportCsv.text).toContain(',manual,2026-11-19T12:01:00.000Z,2026-11-19T12:01:50.000Z,50');
  });

  it('rejects manual-baseline without title or content', async () => {
    const noTitle = await request(app)
      .post('/api/catalyst/manual-baseline')
      .set('Authorization', 'Bearer valid-jwt')
      .send({ rationale: 'Only rationale' });
    expect(noTitle.status).toBe(400);

    const noBody = await request(app)
      .post('/api/catalyst/manual-baseline')
      .set('Authorization', 'Bearer valid-jwt')
      .send({ title: 'Title Only', rationale: '', gaps: [] });
    expect(noBody.status).toBe(400);
  });

  it('degrades gracefully when migration 006 columns are not yet in Supabase', async () => {
    vi.resetModules();
    vi.doMock('../common/config/supabaseClient.js', () => ({
      default: makeCatalystSupabaseMock(dbState, { missingTimingCols: true }),
    }));
    const unmigratedApp = (await import('../app.js')).default;

    const res = await request(app ? unmigratedApp : unmigratedApp)
      .post('/api/catalyst/import')
      .set('Authorization', 'Bearer valid-jwt')
      .send({ workspaceId: 'grp-auto-1', setupStartedAt: '2026-11-19T12:00:00.000Z' });
    expect(res.status).toBe(200);

    const timingRes = await request(unmigratedApp)
      .post('/api/catalyst/setup-timing')
      .set('Authorization', 'Bearer valid-jwt')
      .send({ sessionId: res.body.data.sessionId, setupMode: 'auto' });
    expect(timingRes.status).toBe(200);
    expect(timingRes.body.data.migrated).toBe(false);
  });

  it('verifies WorkspaceImportLayout.jsx implements ?mode=manual and setup-timing hooks', () => {
    const src = fs.readFileSync(
      path.join(REPO_ROOT, 'web/src/citewise/module1/catalyst-import/components/WorkspaceImportLayout.jsx'),
      'utf8'
    );
    expect(src).toContain('new URLSearchParams(window.location.search).get("mode") === "manual"');
    expect(src).toContain('!catalystData && !isManualMode');
    expect(src).toContain('/api/catalyst/manual-baseline');
    expect(src).toContain('/api/catalyst/setup-timing');
    expect(src).toContain('Research Title');
    expect(src).toContain('Rationale');
    expect(src).toContain('Research Gaps');
  });
});
