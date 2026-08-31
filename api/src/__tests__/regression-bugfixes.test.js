/**
 * CiteWise – regression tests for the August 2026 bug report
 *
 * Each suite pins one root cause that was found and fixed:
 *   1. rate limiter mounted before cors()  -> 429s carried no CORS headers, so the
 *      browser reported "TypeError: Failed to fetch" instead of the 429 body
 *   2. polling budget vs. the limiter ceiling
 *   3. n8n synthesis workflows had branches that never reached a
 *      "Respond to Webhook" node -> HTTP 200 with an empty body
 *   4. single-flight token refresh / session teardown in the web HTTP client
 *
 * Run with:  npm test
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import request from 'supertest';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(HERE, '../../..');
const readSource = (rel) => fs.readFileSync(path.join(REPO_ROOT, rel), 'utf8');

// ─────────────────────────────────────────────────────────────────────────────
// SUITE 1 – CORS must be applied before rate limiting
// ─────────────────────────────────────────────────────────────────────────────

describe('Rate limiting / CORS middleware order', () => {
  const ORIGIN = 'http://localhost:5173';
  let app;

  beforeEach(async () => {
    process.env.SUPABASE_URL ||= 'http://127.0.0.1:1/';
    process.env.SUPABASE_KEY ||= 'test-key';
    process.env.SUPABASE_ANON_KEY ||= 'test-key';
    vi.resetModules();
    app = (await import('../app.js')).default;
  });

  it('answers a CORS preflight without consuming the rate-limit budget', async () => {
    const res = await request(app)
      .options('/api/v1/documents/session/abc')
      .set('Origin', ORIGIN)
      .set('Access-Control-Request-Method', 'GET')
      .set('Access-Control-Request-Headers', 'x-session-id');

    expect(res.status).toBeLessThan(300);
    expect(res.headers['access-control-allow-origin']).toBe(ORIGIN);
    // If the limiter had seen this request it would have set the standard headers.
    expect(res.headers['ratelimit-remaining']).toBeUndefined();
  });

  it('attaches CORS headers to a 429 so the frontend can read the message', async () => {
    // The AI limiter is the tightest one (40 / 10 min); drive it past its ceiling.
    let res;
    for (let i = 0; i < 41; i++) {
      res = await request(app)
        .post('/api/v1/synthesis/paraphrase')
        .set('Origin', ORIGIN)
        .set('Content-Type', 'application/json')
        .send({});
    }

    expect(res.status).toBe(429);
    // This is the assertion that failed before the fix: with the limiter mounted
    // ahead of cors(), the 429 carried no Access-Control-Allow-Origin, the browser
    // discarded the response, and fetch() rejected with the opaque
    // "TypeError: Failed to fetch" seen on the AI Assessment page.
    expect(res.headers['access-control-allow-origin']).toBe(ORIGIN);
    expect(res.body.message).toMatch(/too many/i);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// SUITE 2 – the general API budget has to clear normal dashboard polling
// ─────────────────────────────────────────────────────────────────────────────

describe('API rate-limit ceiling vs. dashboard polling', () => {
  const DASHBOARD = 'web/src/citewise/module2/literature-review/components/ValidationDashboardLayout.jsx';

  it('leaves headroom for the assessment dashboard polls', () => {
    const appSrc = readSource('api/src/app.js');
    const windowMs = 10 * 60 * 1000;
    const generalMax = Number(
      appSrc.match(/const apiLimiter = rateLimit\(\{[\s\S]*?max:\s*(\d+)/)[1]
    );

    // Read the poll intervals from source so this fails if someone tightens an
    // interval without revisiting the budget.
    const dashboardSrc = readSource(DASHBOARD);
    const intervalsMs = [...dashboardSrc.matchAll(/setTimeout\(\s*fetch\w+\s*,\s*(\d+)\)/g)]
      .map((m) => Number(m[1]));

    expect(intervalsMs.length).toBeGreaterThan(0);
    const fastestMs = Math.min(...intervalsMs);
    const worstCase = (windowMs / fastestMs) * intervalsMs.length;

    // Before the fix: max was 200 while polling alone needed 240+, so ordinary use
    // exhausted the budget within minutes and every request started failing.
    expect(generalMax).toBeGreaterThan(worstCase);
  });

  it('backs the document poll off when nothing is being assessed', () => {
    const dashboardSrc = readSource(DASHBOARD);
    expect(dashboardSrc).toMatch(/documentsActiveRef/);
    expect(dashboardSrc).toMatch(/documentsActiveRef\.current \? 5000 : 30000/);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// SUITE 3 – every n8n synthesis branch must reach a Respond to Webhook node
// ─────────────────────────────────────────────────────────────────────────────

describe('n8n synthesis workflows always respond to the webhook', () => {
  const WORKFLOWS = ['workflows/synthesis_fixed.json', 'workflows/synthesis.json'];

  /** Walks every reachable main-connection path from the webhook trigger. */
  function findNonRespondingTerminals(wf) {
    const conns = wf.connections || {};
    const respond = new Set(
      wf.nodes.filter((n) => n.type === 'n8n-nodes-base.respondToWebhook').map((n) => n.name)
    );
    const trigger = wf.nodes.find((n) => n.type === 'n8n-nodes-base.webhook');
    const terminals = new Set();
    const seen = new Set();

    (function walk(name) {
      if (seen.has(name)) return;
      seen.add(name);
      const targets = [];
      for (const outputs of Object.values(conns[name] || {})) {
        for (const branch of outputs) {
          for (const t of branch || []) targets.push(t.node);
        }
      }
      if (!targets.length && !respond.has(name)) terminals.add(name);
      targets.forEach(walk);
    })(trigger.name);

    return [...terminals];
  }

  it.each(WORKFLOWS)('%s has no branch that ends without responding', (rel) => {
    const wf = JSON.parse(readSource(rel));

    // responseMode: responseNode is what makes an unresponded branch surface as
    // HTTP 200 with an empty body rather than an error.
    const trigger = wf.nodes.find((n) => n.type === 'n8n-nodes-base.webhook');
    expect(trigger.parameters.responseMode).toBe('responseNode');

    // Before the fix: ['IF Validation Passed 8', 'IF Validation Passed 9'].
    expect(findNonRespondingTerminals(wf)).toEqual([]);
  });

  it.each(WORKFLOWS)('%s gives every AI agent a chat model', (rel) => {
    const wf = JSON.parse(readSource(rel));

    const fed = new Set();
    for (const outputs of Object.values(wf.connections || {})) {
      for (const [type, branches] of Object.entries(outputs)) {
        if (type !== 'ai_languageModel') continue;
        for (const branch of branches) {
          for (const t of branch || []) fed.add(t.node);
        }
      }
    }

    const agents = wf.nodes.filter((n) => n.type === '@n8n/n8n-nodes-langchain.agent');
    expect(agents.length).toBeGreaterThan(0);

    // Before the fix: the two retry agents ('AI Agent - RAG Synthesis Attempt 8'
    // and '... 9') had no ai_languageModel connection. n8n reports "No node
    // connected to required input 'Chat Model'" and the node throws, so the retry
    // path died before any Respond node ran — another route to an empty HTTP 200.
    expect(agents.filter((a) => !fed.has(a.name)).map((a) => a.name)).toEqual([]);
  });

  it.each(WORKFLOWS)('%s routes the guardrail retries through their IF nodes', (rel) => {
    const conns = JSON.parse(readSource(rel)).connections;

    for (const guard of ['Validate Draft Guardrails 8', 'Validate Draft Guardrails 9']) {
      // A Code node only ever emits on output 0, so extra outputs wired off the
      // guardrail node could never fire — routing belongs on the IF node.
      expect(conns[guard].main).toHaveLength(1);
    }

    expect(conns['IF Validation Passed 8'].main[0][0].node).toBe('Deterministic Citation Engine1');
    expect(conns['IF Validation Passed 8'].main[1][0].node).toBe('Prepare Retry Context 6');
    expect(conns['IF Validation Passed 9'].main[0][0].node).toBe('Deterministic Citation Engine1');
    expect(conns['IF Validation Passed 9'].main[1][0].node).toBe('Build Failure Response1');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// SUITE 4 – the web HTTP client's 401 handling
// ─────────────────────────────────────────────────────────────────────────────

describe('web HTTP client – token refresh and session teardown', () => {
  let store;
  let http;
  let sessionExpiredEvents;
  let refreshCalls;

  const json = (status, body) => ({
    status,
    ok: status >= 200 && status < 300,
    headers: { get: (h) => (h === 'content-type' ? 'application/json' : null) },
    json: async () => body,
    text: async () => JSON.stringify(body),
  });

  beforeEach(async () => {
    store = new Map();
    sessionExpiredEvents = 0;
    refreshCalls = [];

    vi.stubGlobal('localStorage', {
      getItem: (k) => (store.has(k) ? store.get(k) : null),
      setItem: (k, v) => store.set(k, String(v)),
      removeItem: (k) => store.delete(k),
    });
    vi.stubGlobal('CustomEvent', class { constructor(type) { this.type = type; } });
    vi.stubGlobal('window', {
      dispatchEvent: (e) => {
        if (e.type === 'citewise:session-expired') sessionExpiredEvents++;
      },
    });

    vi.resetModules();
    http = await import('../../../web/src/api/http.js');
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('refreshes once for concurrent 401s instead of reusing a rotated token', async () => {
    store.set('token', 'expired-access');
    store.set('refresh_token', 'R1');

    vi.stubGlobal('fetch', vi.fn(async (url, opts) => {
      if (String(url).includes('/auth/refresh')) {
        refreshCalls.push(JSON.parse(opts.body).refresh_token);
        return json(200, { ok: true, access_token: 'new-access', refresh_token: 'R2' });
      }
      return opts.headers.Authorization === 'Bearer new-access'
        ? json(200, { data: 'ok' })
        : json(401, { error: 'expired' });
    }));

    // Three polls hit a 401 at the same moment, as they do on the dashboard.
    const results = await Promise.all([
      http.apiFetch('/api/v1/documents/session/a'),
      http.apiFetch('/api/v1/documents/session/b'),
      http.apiFetch('/api/v1/documents/1/insights'),
    ]);

    results.forEach((r) => expect(r.res.status).toBe(200));

    // The bug: each caller read the refresh token itself, so the later ones sent
    // the already-rotated R1. Supabase rejects a reused refresh token, which then
    // logged out a session that was perfectly valid.
    expect(refreshCalls).toEqual(['R1']);
    expect(store.get('token')).toBe('new-access');
    expect(store.get('refresh_token')).toBe('R2');
    expect(sessionExpiredEvents).toBe(0);
  });

  it('starts a fresh refresh on a later expiry rather than replaying the old result', async () => {
    store.set('token', 'expired-1');
    store.set('refresh_token', 'R1');

    let accessToken = 'access-1';
    vi.stubGlobal('fetch', vi.fn(async (url, opts) => {
      if (String(url).includes('/auth/refresh')) {
        refreshCalls.push(JSON.parse(opts.body).refresh_token);
        accessToken = `access-${refreshCalls.length + 1}`;
        return json(200, {
          ok: true,
          access_token: accessToken,
          refresh_token: `R${refreshCalls.length + 1}`,
        });
      }
      return opts.headers.Authorization === `Bearer ${accessToken}`
        ? json(200, { data: 'ok' })
        : json(401, { error: 'expired' });
    }));

    await http.apiFetch('/api/v1/documents/session/a');
    store.set('token', 'expired-2'); // a second expiry, later on
    await http.apiFetch('/api/v1/documents/session/b');

    expect(refreshCalls).toEqual(['R1', 'R2']);
  });

  it('clears the session and broadcasts when there is no refresh token', async () => {
    store.set('token', 'dead-access');
    store.set('user', JSON.stringify({ email: 'nyx@example.com' }));

    vi.stubGlobal('fetch', vi.fn(async () => json(401, { error: 'Invalid or expired token' })));

    const { res } = await http.apiFetch('/api/catalyst/import', { method: 'POST' });

    expect(res.status).toBe(401);
    // The bug: a 401 with no refresh token fell straight through. `user` stayed in
    // localStorage, so the navbar kept rendering the signed-in account on the
    // login page and the route guards still admitted the dead session.
    expect(store.get('token')).toBeUndefined();
    expect(store.get('user')).toBeUndefined();
    expect(sessionExpiredEvents).toBe(1);
  });

  it('keeps the session when the refresh endpoint itself is unreachable', async () => {
    store.set('token', 'maybe-ok');
    store.set('refresh_token', 'R1');
    store.set('user', JSON.stringify({ email: 'nyx@example.com' }));

    vi.stubGlobal('fetch', vi.fn(async (url) => {
      if (String(url).includes('/auth/refresh')) throw new TypeError('Failed to fetch');
      return json(401, { error: 'expired' });
    }));

    const { res } = await http.apiFetch('/api/v1/documents/session/a');

    expect(res.status).toBe(401);
    // A network blip is inconclusive — don't sign the user out over it.
    expect(store.get('user')).toBeDefined();
    expect(sessionExpiredEvents).toBe(0);
  });

  it('does not retry more than once for a single request', async () => {
    store.set('token', 'expired');
    store.set('refresh_token', 'R1');

    const calls = [];
    vi.stubGlobal('fetch', vi.fn(async (url) => {
      calls.push(String(url));
      if (String(url).includes('/auth/refresh')) {
        return json(200, { ok: true, access_token: 'still-rejected' });
      }
      return json(401, { error: 'expired' }); // the server keeps rejecting
    }));

    const { res } = await http.apiFetch('/api/v1/documents/session/a');

    expect(res.status).toBe(401);
    const dataCalls = calls.filter((u) => !u.includes('/auth/refresh'));
    expect(dataCalls).toHaveLength(2); // original + exactly one retry, no loop
    expect(sessionExpiredEvents).toBe(1);
  });
});
