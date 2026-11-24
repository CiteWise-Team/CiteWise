import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import request from 'supertest';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const WEB_ROOT = path.resolve(__dirname, '../../../web/src');

describe('CATalyst workflow bugfixes', () => {
  describe('GapAPI URL routing and groupAccess compatibility', () => {
    it('routes GapAPI({ group_id, summary_id }) to /gap/:group_id so requireGroupAccess validates the workspace ID', async () => {
      const calls = [];
      globalThis.localStorage = {
        getItem: () => 'token-123',
        setItem: () => {},
        removeItem: () => {},
      };
      globalThis.fetch = vi.fn(async (url, options) => {
        calls.push({ url, options });
        return {
          ok: true,
          status: 202,
          headers: { get: () => 'application/json' },
          json: async () => ({ success: true, jobId: 'job-1' }),
        };
      });

      const { GapAPI } = await import('../../../web/src/api/workflow.api.js');
      await GapAPI({ group_id: 'grp-123', summary_id: 'sum-999' });

      expect(calls).toHaveLength(1);
      expect(calls[0].url).toBe('/gap/grp-123');
      expect(JSON.parse(calls[0].options.body)).toEqual({
        group_id: 'grp-123',
        summary_id: 'sum-999',
      });
    });

    afterEach(() => {
      delete globalThis.fetch;
      delete globalThis.localStorage;
    });
  });

  describe('gap.service.js resilience', () => {
    beforeEach(() => {
      vi.resetModules();
    });

    afterEach(() => {
      vi.doUnmock('../modules/gap/gap.repository.js');
      vi.doUnmock('../modules/summarizer/summarizer.service.js');
    });

    it('returns 404 when fetchSummaryDataByIdService reports missing summary instead of throwing', async () => {
      vi.doMock('../modules/summarizer/summarizer.service.js', () => ({
        fetchSummaryDataByIdService: async () => ({ status: 404, message: 'No data found for ID: sum-missing' }),
      }));

      const { runGapExtractorService } = await import('../modules/gap/gap.service.js');
      const res = await runGapExtractorService({ group_id: 'grp-1', summary_id: 'sum-missing' });
      expect(res.status).toBe(404);
      expect(res.message).toMatch(/No data found/);
    });

    it('flattens JSON string arrays, native arrays, and malformed fallback strings safely', async () => {
      vi.doMock('../modules/gap/gap.repository.js', () => ({
        triggerGapExtractorWorkflow: async () => [],
        insertDataToGapRepository: async () => ({}),
        getGapUsingGroupIdRepo: async () => [
          { title: 'Paper A', gap: '["Gap A1", "Gap A2"]' },
          { title: 'Paper B', gap: ['Gap B1'] },
          { title: 'Paper C', gap: 'Gap C1; Gap C2' },
          { title: 'Paper D', gap: null },
        ],
      }));

      const { fetchGapsDataUsingGroupIdService } = await import('../modules/gap/gap.service.js');
      const res = await fetchGapsDataUsingGroupIdService('grp-1');
      expect(res.status).toBe(200);
      expect(res.data).toEqual([
        { id: '1', title: 'Paper A', gap: 'Gap A1' },
        { id: '2', title: 'Paper A', gap: 'Gap A2' },
        { id: '3', title: 'Paper B', gap: 'Gap B1' },
        { id: '4', title: 'Paper C', gap: 'Gap C1' },
        { id: '5', title: 'Paper C', gap: 'Gap C2' },
      ]);
    });
  });

  describe('POST /api/gap/:group_id accepts owner request with summary_id in body', () => {
    let app;

    beforeEach(async () => {
      vi.resetModules();
      const tables = {
        Group: [{ id: 'grp-1', owner_id: 'owner-1', name: 'Workspace' }],
        group_members: [],
      };
      const chainFor = (table) => {
        const filters = [];
        const rows = () => (tables[table] ?? []).filter((r) => filters.every(([k, v]) => r[k] === v));
        const q = {
          select: () => q,
          eq: (k, v) => { filters.push([k, v]); return q; },
          limit: () => q,
          maybeSingle: async () => ({ data: rows()[0] ?? null, error: null }),
          single: async () => ({ data: rows()[0] ?? null, error: rows()[0] ? null : { message: 'not found' } }),
          then: (resolve) => Promise.resolve({ data: rows(), error: null }).then(resolve),
        };
        return q;
      };
      vi.doMock('../common/config/supabaseClient.js', () => ({
        default: {
          from: (t) => chainFor(t),
          auth: { getUser: async (token) => ({ data: { user: { id: token } }, error: null }) },
        },
      }));
      app = (await import('../app.js')).default;
    });

    afterEach(() => {
      vi.doUnmock('../common/config/supabaseClient.js');
    });

    it('returns 202 instead of 404 when owner calls POST /api/gap/:group_id with summary_id', async () => {
      const res = await request(app)
        .post('/api/gap/grp-1')
        .set('Authorization', 'Bearer owner-1')
        .send({ group_id: 'grp-1', summary_id: 'sum-123' });

      expect(res.status).toBe(202);
      expect(res.body.jobId).toBeTruthy();
    });
  });

  describe('Workspace.jsx and SummarizerResult.jsx regression guards', () => {
    it('Workspace.jsx does not overwrite result state with boolean true in handleResultComplete', () => {
      const src = fs.readFileSync(path.join(WEB_ROOT, 'pages/Workspace.jsx'), 'utf8');
      expect(src).not.toMatch(/handleResultComplete[\s\S]{0,120}handleStepResult\s*\(\s*step\s*,\s*true\s*\)/);
    });

    it('SummarizerResult.jsx only sets selectedPaper from result when result is an object', () => {
      const src = fs.readFileSync(path.join(WEB_ROOT, 'components/workspace/output/SummarizerResult.jsx'), 'utf8');
      expect(src).toMatch(/if\s*\(\s*result\s*&&\s*typeof result\s*===\s*["']object["']\s*\)/);
    });
  });
});
