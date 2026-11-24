/**
 * A pasted workspace link or workspace ID must not give another signed-in user
 * access. Only the owner and accepted members may read or change a workspace.
 */

import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest';
import request from 'supertest';

const OWNER = 'user-owner';
const MEMBER = 'user-member';
const STRANGER = 'user-stranger';
const GROUP = 'group-1';

const tables = {
  Group: [{ id: GROUP, owner_id: OWNER, name: 'Mine' }],
  group_members: [{ group_id: GROUP, user_id: MEMBER, role: 'member' }],
  Topic: [{ group_id: GROUP, title: 'Secret title', rationale: 'Secret rationale' }],
  GapResult: [{ group_id: GROUP, title: 'Paper', gap: '["Secret gap"]' }],
  Extractor: [{ id: 1, group_id: GROUP, title: 'Paper', file_name: 'paper.pdf' }],
  research_baselines: [],
};

function query(table) {
  const filters = [];
  const rows = () => (tables[table] ?? []).filter((r) => filters.every(([k, v]) => r[k] === v));
  const q = {
    select: () => q,
    eq: (k, v) => { filters.push([k, v]); return q; },
    order: () => q,
    limit: () => q,
    maybeSingle: async () => ({ data: rows()[0] ?? null, error: null }),
    single: async () => ({ data: rows()[0] ?? null, error: rows()[0] ? null : { message: 'not found' } }),
    upsert: async () => ({ error: null }),
    insert: () => q,
    update: () => q,
    then: (resolve) => Promise.resolve({ data: rows(), error: null }).then(resolve),
  };
  return q;
}

let app;

beforeAll(async () => {
  vi.resetModules();
  vi.doMock('../common/config/supabaseClient.js', () => ({
    default: {
      from: (t) => query(t),
      auth: { getUser: async (token) => ({ data: { user: { id: token } }, error: null }) },
    },
  }));
  app = (await import('../app.js')).default;
});

afterAll(() => {
  vi.doUnmock('../common/config/supabaseClient.js');
});

const as = (user) => ({ Authorization: `Bearer ${user}` });

describe('workspace access', () => {
  const reads = [
    `/api/catalyst/${GROUP}`,
    `/api/catalyst/${GROUP}/topics`,
    `/api/extractor/${GROUP}`,
    `/api/gap/${GROUP}`,
    `/api/topic/${GROUP}`,
    `/api/v1/documents/session-for-group/${GROUP}`,
    `/api/groups/access/${GROUP}`,
  ];

  it.each(reads)('blocks a non-member from GET %s', async (url) => {
    const res = await request(app).get(url).set(as(STRANGER));
    expect(res.status).toBe(404);
    expect(JSON.stringify(res.body)).not.toContain('Secret');
  });

  it.each([OWNER, MEMBER])('lets %s through the access check', async (user) => {
    const res = await request(app).get(`/api/groups/access/${GROUP}`).set(as(user));
    expect(res.status).toBe(200);
    expect(res.body.data.access).toBe(true);
  });

  it('blocks a non-member from importing the workspace by ID', async () => {
    const res = await request(app).post('/api/catalyst/import').set(as(STRANGER)).send({ workspaceId: GROUP });
    expect(res.status).toBe(404);
  });

  it('blocks a non-member from running CATalyst workflows on the workspace', async () => {
    expect((await request(app).post(`/api/gap/${GROUP}`).set(as(STRANGER)).send({ group_id: GROUP })).status).toBe(404);
    expect((await request(app).post('/api/topic/run').set(as(STRANGER)).send({ group_id: GROUP })).status).toBe(404);
  });

  it('blocks a member path param paired with a foreign body group id', async () => {
    tables.Group.push({ id: 'group-2', owner_id: STRANGER });
    const res = await request(app).post('/api/gap/group-2').set(as(STRANGER)).send({ group_id: GROUP });
    expect(res.status).toBe(404);
  });

  it('blocks a non-member from viewing the workspace PDFs', async () => {
    const res = await request(app)
      .get(`/api/extractor/file/view?key=${encodeURIComponent(`catalyst/${GROUP}/1-paper.pdf`)}`)
      .set(as(STRANGER));
    expect(res.status).toBe(404);
    const bad = await request(app).get('/api/extractor/file/view?key=other/thing.pdf').set(as(OWNER));
    expect(bad.status).toBe(404);
  });

  it('lets the owner import the workspace', async () => {
    const res = await request(app).post('/api/catalyst/import').set(as(OWNER)).send({ workspaceId: GROUP });
    expect(res.status).toBe(200);
  });
});
