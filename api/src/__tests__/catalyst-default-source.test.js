/**
 * When no RRL paper is approved, synthesis falls back to the original PDF
 * uploaded in the CATalyst Extractor for the session's workspace.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const tables = {};

function query(table) {
  const q = {
    filters: {},
    select() { return q; },
    eq(col, val) { q.filters[col] = val; return q; },
    order() { return q; },
    limit() { return q; },
    maybeSingle() {
      const rows = (tables[table] ?? []).filter((r) => Object.entries(q.filters).every(([k, v]) => r[k] === v));
      return Promise.resolve({ data: rows[0] ?? null, error: null });
    },
    then(resolve) {
      const rows = (tables[table] ?? []).filter((r) => Object.entries(q.filters).every(([k, v]) => r[k] === v));
      return Promise.resolve({ data: rows, error: null }).then(resolve);
    },
  };
  return q;
}

vi.mock('../common/config/supabaseClient.js', () => ({ default: { from: (t) => query(t) } }));
vi.mock('../common/config/r2Client.js', () => ({ getBufferFromR2: vi.fn(async () => null) }));
vi.mock('node-fetch', () => ({ default: vi.fn(async () => ({ ok: false })) }));

const { loadCatalystSourceDocs, loadCatalystSourceRows, r2KeyFromFileUrl, isCatalystSourceId } =
  await import('../modules/citewise/helpers/catalystSource.js');

beforeEach(() => {
  tables.GapResult = [];
  tables.research_baselines = [{ session_id: 's1', catalyst_workspace_id: 'g1' }];
  tables.Extractor = [
    { id: 7, group_id: 'g1', file_name: 'Paper.pdf', file_url: '/api/extractor/file/view?key=catalyst%2Fg1%2F1-Paper.pdf', title: 'My Study', abstract: 'An abstract.', introduction: 'Intro text.' },
    { id: 3, group_id: 'g1', file_name: 'Paper.pdf', file_url: 'old', title: 'Old upload', abstract: 'Old.' },
    { id: 9, group_id: 'other', file_name: 'Else.pdf', title: 'Other group', abstract: 'x' },
  ];
});

describe('CATalyst default source', () => {
  it('resolves the R2 key from both stored file_url shapes', () => {
    expect(r2KeyFromFileUrl('/api/extractor/file/view?key=catalyst%2Fg1%2F1-Paper.pdf')).toBe('catalyst/g1/1-Paper.pdf');
    process.env.R2_PUBLIC_URL = 'https://cdn.example.com/';
    expect(r2KeyFromFileUrl('https://cdn.example.com/catalyst/g1/1-Paper.pdf')).toBe('catalyst/g1/1-Paper.pdf');
    delete process.env.R2_PUBLIC_URL;
    expect(r2KeyFromFileUrl(null)).toBeNull();
  });

  it('carries over every paper whose gaps were extracted', async () => {
    tables.Extractor.push({ id: 8, group_id: 'g1', file_name: 'Second.pdf', title: 'Second Paper', abstract: 'b' });
    tables.Extractor.push({ id: 10, group_id: 'g1', file_name: 'Unused.pdf', title: 'Never analysed', abstract: 'c' });
    tables.GapResult = [{ group_id: 'g1', title: 'My Study' }, { group_id: 'g1', title: 'second paper' }];
    const rows = await loadCatalystSourceRows('s1');
    expect(rows.map((r) => r.id).sort()).toEqual([7, 8]);
  });

  it('loads only the session workspace Extractor rows, newest per file', async () => {
    const rows = await loadCatalystSourceRows('s1');
    expect(rows.map((r) => r.id)).toEqual([7]);
    expect(await loadCatalystSourceRows('unknown')).toEqual([]);
  });

  it('falls back to Extractor section text when the PDF cannot be read', async () => {
    const [doc] = await loadCatalystSourceDocs('s1');
    expect(doc.id).toBe('catalyst-7');
    expect(isCatalystSourceId(doc.id)).toBe(true);
    expect(doc.isCatalystSource).toBe(true);
    expect(doc.file_name).toBe('Paper.pdf');
    expect(doc.parsed_text).toContain('Abstract\nAn abstract.');
    expect(doc.parsed_text).toContain('Introduction\nIntro text.');
  });
});

describe('synthesis routes use the CATalyst fallback', () => {
  const HERE = path.dirname(fileURLToPath(import.meta.url));
  const code = fs.readFileSync(path.join(HERE, '../modules/citewise/synthesis.routes.js'), 'utf8');

  it('/generate and /update-citations always add the CATalyst PDFs as sources', () => {
    expect(code).toMatch(/const docsWithText = withCatalystSources\(/);
    expect(code).toMatch(/approvedDocs = withCatalystSources\(approvedDocs, await loadCatalystSourceDocs\(sessionId\)\);/);
  });

  it('exposes GET /default-source', () => {
    expect(code).toContain("router.get('/default-source'");
  });
});
