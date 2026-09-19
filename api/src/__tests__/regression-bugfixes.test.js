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

// ─────────────────────────────────────────────────────────────────────────────
// SUITE 5 – September 2026 bug report
//
//   11. the scorer announced "capped at N" in validationFlags but stored the
//       uncapped metric, so a paper the rubric judged insufficient still came
//       back "Recommended"
//   12. compound surnames lost their particle: "J. Dela Cruz" -> "Cruz, J. D."
//   13. the upload gate tested mime OR extension, so any file renamed .pdf was
//       accepted and queued for AI scoring
//   14. multer's size error escaped to the generic handler as a 500 in a shape
//       no client could read
//   1/3/8/9. unauthenticated group + workflow routes, the signup error that
//       blamed a duplicate email for a weak password, raw Postgres text
//       reaching the client, and the unenforced 8-character minimum
// ─────────────────────────────────────────────────────────────────────────────

describe('APA author parsing – compound surnames (finding 12)', () => {
  it('keeps a Filipino compound surname together', async () => {
    const { toApaName } = await import('../modules/citewise/helpers/citationMetadata.js');
    expect(toApaName('J. Dela Cruz')).toBe('Dela Cruz, J.');
  });

  it('keeps "Delos Santos" together', async () => {
    const { toApaName } = await import('../modules/citewise/helpers/citationMetadata.js');
    expect(toApaName('Maria Delos Santos')).toBe('Delos Santos, M.');
  });

  it('keeps "San Juan" together', async () => {
    const { toApaName } = await import('../modules/citewise/helpers/citationMetadata.js');
    expect(toApaName('R. San Juan')).toBe('San Juan, R.');
  });

  it('uses the full compound surname for the in-text citation', async () => {
    const { toApaName, formatInTextAuthors } = await import('../modules/citewise/helpers/citationMetadata.js');
    const names = ['J. Dela Cruz', 'M. Okafor', 'L. Bernardo'].map(toApaName);
    expect(formatInTextAuthors(names)).toBe('Dela Cruz et al.');
  });

  it('still handles an ordinary two-part name', async () => {
    const { toApaName } = await import('../modules/citewise/helpers/citationMetadata.js');
    expect(toApaName('Ashish Vaswani')).toBe('Vaswani, A.');
  });
});

describe('Rubric scoring – declared caps must be applied (finding 11)', () => {
  // Reproduces document 197 from the September sweep verbatim: the rubric
  // announced two caps and stored the uncapped numbers anyway.
  const RAW = JSON.stringify({
    gapAlignmentScore: 95,
    methodologyScore: 90,
    theoreticalScore: 75,
    citationScore: 90,
    overallScore: 88.75,
    confidenceLevel: 'High',
    mismatchFlags: [],
    weaknessFlags: ['NO_THEORY_OR_FRAMEWORK'],
    validationFlags: [
      'Methodology capped at 74 because one supporting methodology evidence item was verified',
      'Theory/Framework capped at 39 because no explicit framework evidence was verified',
    ],
    evidenceExcerpts: [
      { criterion: 'Gap Alignment', quoteText: 'Sparse attention patterns have been explored.', pageNumber: 2, relevanceLevel: 'High', evidenceType: 'supporting' },
    ],
  });

  it('clamps a metric to the cap named in its own validation flag', async () => {
    const { parseAIResponse } = await import('../modules/citewise/helpers/rubricScoring.js');
    const parsed = parseAIResponse(RAW, 197);
    expect(parsed.methodologyScore).toBe(74);
    expect(parsed.theoreticalScore).toBe(39);
  });

  it('recomputes the overall score from the capped metrics', async () => {
    const { parseAIResponse } = await import('../modules/citewise/helpers/rubricScoring.js');
    const parsed = parseAIResponse(RAW, 197);
    // 95*.35 + 74*.30 + 39*.20 + 90*.15
    expect(parsed.overallScore).toBeCloseTo(76.75, 2);
  });

  it('stops recommending a paper once the caps drop it below the threshold', async () => {
    const { parseAIResponse } = await import('../modules/citewise/helpers/rubricScoring.js');
    const parsed = parseAIResponse(RAW, 197);
    expect(parsed.recommendationStatus).not.toBe('Recommended');
    expect(parsed.relevanceLevel).not.toBe('High');
  });

  it('leaves scores alone when no cap was declared', async () => {
    const { parseAIResponse } = await import('../modules/citewise/helpers/rubricScoring.js');
    const raw = JSON.stringify({
      gapAlignmentScore: 95, methodologyScore: 90, theoreticalScore: 75, citationScore: 90,
      overallScore: 88.75, confidenceLevel: 'High', mismatchFlags: [], weaknessFlags: [],
      validationFlags: [],
      evidenceExcerpts: [{ criterion: 'Gap Alignment', quoteText: 'x', pageNumber: 1, relevanceLevel: 'High', evidenceType: 'supporting' }],
    });
    const parsed = parseAIResponse(raw, 1);
    expect(parsed.methodologyScore).toBe(90);
    expect(parsed.overallScore).toBeCloseTo(88.75, 2);
  });

  it('applies caps to the custom-weight path too', async () => {
    const { parseAIResponse } = await import('../modules/citewise/helpers/rubricScoring.js');
    const parsed = parseAIResponse(RAW, 197, { gap: 0.25, methodology: 0.25, theory: 0.25, citation: 0.25 });
    expect(parsed.methodologyScore).toBe(74);
    expect(parsed.overallScore).toBeCloseTo((95 + 74 + 39 + 90) / 4, 2);
  });
});

describe('RRL upload – content and size validation (findings 13 & 14)', () => {
  const PDF_HEADER = Buffer.from('%PDF-1.4\n%\xE2\xE3\xCF\xD3\n', 'latin1');
  let app;

  beforeEach(async () => {
    process.env.SUPABASE_URL ||= 'http://127.0.0.1:1/';
    process.env.SUPABASE_KEY ||= 'test-key';
    process.env.SUPABASE_ANON_KEY ||= 'test-key';
    vi.resetModules();

    // Only auth.getUser and a no-row lookup are reached by the paths under test.
    vi.doMock('../common/config/supabaseClient.js', () => {
      const chain = {
        select: () => chain,
        eq: () => chain,
        maybeSingle: async () => ({ data: null, error: null }),
        single: async () => ({ data: null, error: null }),
      };
      return {
        default: {
          auth: { getUser: async () => ({ data: { user: { id: 'user-1' } }, error: null }) },
          from: () => chain,
        },
      };
    });

    app = (await import('../app.js')).default;
  });

  afterEach(() => { vi.doUnmock('../common/config/supabaseClient.js'); });

  it('rejects a text file that was merely renamed .pdf', async () => {
    const res = await request(app)
      .post('/api/rrl/upload')
      .set('Authorization', 'Bearer test-token')
      .set('X-Session-Id', 'session-1')
      .attach('files', Buffer.from('plain text wearing a pdf extension'), 'not-a-pdf.pdf');

    expect(res.status).toBe(200);
    expect(res.body.data.acceptedFiles).toBe(0);
    const result = res.body.data.results[0];
    expect(result.success).toBe(false);
    expect(result.message).toMatch(/pdf/i);
  });

  it('rejects a file whose PDF header is intact but is otherwise not a PDF', async () => {
    const res = await request(app)
      .post('/api/rrl/upload')
      .set('Authorization', 'Bearer test-token')
      .set('X-Session-Id', 'session-1')
      .attach('files', Buffer.from('%PDF'), 'too-short.pdf'); // 4 bytes, no '-'

    expect(res.body.data.acceptedFiles).toBe(0);
    expect(res.body.data.results[0].message).toMatch(/pdf/i);
  });

  it('still reports an empty file as empty rather than as a bad PDF', async () => {
    const res = await request(app)
      .post('/api/rrl/upload')
      .set('Authorization', 'Bearer test-token')
      .set('X-Session-Id', 'session-1')
      .attach('files', Buffer.alloc(0), 'empty.pdf');

    expect(res.body.data.results[0].message).toMatch(/empty/i);
  });

  it('answers an oversized upload with 413 in the same envelope as other rejections', async () => {
    const tooBig = Buffer.concat([PDF_HEADER, Buffer.alloc(21 * 1024 * 1024, 0x20)]);
    const res = await request(app)
      .post('/api/rrl/upload')
      .set('Authorization', 'Bearer test-token')
      .set('X-Session-Id', 'session-1')
      .attach('files', tooBig, 'huge.pdf');

    expect(res.status).toBe(413);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/20 MB|size|large|limit/i);
    // the queue UI renders data.results[], so the shape has to match
    expect(Array.isArray(res.body.data?.results)).toBe(true);
  });
});

describe('Signup – error attribution and password policy (findings 3 & 9)', () => {
  let app;
  let createUserResult;

  beforeEach(async () => {
    process.env.SUPABASE_URL ||= 'http://127.0.0.1:1/';
    process.env.SUPABASE_KEY ||= 'test-key';
    process.env.SUPABASE_ANON_KEY ||= 'test-key';
    vi.resetModules();
    createUserResult = { data: null, error: null };

    vi.doMock('../common/config/supabaseClient.js', () => {
      const chain = {
        select: () => chain, eq: () => chain, insert: async () => ({ error: null }),
        maybeSingle: async () => ({ data: null, error: null }),
      };
      return {
        default: {
          auth: {
            admin: { createUser: async () => createUserResult },
            getUser: async () => ({ data: { user: { id: 'user-1' } }, error: null }),
          },
          from: () => chain,
        },
      };
    });
    app = (await import('../app.js')).default;
  });

  afterEach(() => { vi.doUnmock('../common/config/supabaseClient.js'); });

  it('does not blame a duplicate email when Supabase rejects a weak password', async () => {
    // Supabase answers 422 for BOTH a duplicate email and a weak password; the
    // old code branched on the status, so every weak password was reported as
    // "An account with this email address already exists."
    createUserResult = {
      data: null,
      error: { message: 'Password should be at least 6 characters.', status: 422, code: 'weak_password' },
    };

    const res = await request(app)
      .post('/api/auth/signup')
      .send({ email: 'brand.new.address@example.com', password: 'abcdefgh' });

    expect(res.status).toBe(400);
    expect(res.body.message).not.toMatch(/already exists/i);
    expect(res.body.message).toMatch(/password/i);
  });

  it('still reports a genuine duplicate email as a duplicate', async () => {
    createUserResult = {
      data: null,
      error: { message: 'A user with this email address has already been registered', status: 422, code: 'email_exists' },
    };

    const res = await request(app)
      .post('/api/auth/signup')
      .send({ email: 'taken@example.com', password: 'abcdefgh' });

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/already exists/i);
  });

  it('enforces the 8-character minimum the form advertises', async () => {
    const res = await request(app)
      .post('/api/auth/signup')
      .send({ email: 'short.pw@example.com', password: 'abc1234' }); // 7 chars

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/8/);
    expect(res.body.message).not.toMatch(/already exists/i);
  });

  it('accepts a password of exactly 8 characters', async () => {
    createUserResult = { data: { user: { id: 'new-user' } }, error: null };

    const res = await request(app)
      .post('/api/auth/signup')
      .send({ email: 'ok.pw@example.com', password: 'abcd1234' });

    expect(res.status).toBe(201);
  });
});

describe('Group + workflow routes require a session (finding 1)', () => {
  let app;
  const GROUP = { id: 'g1', name: 'test', owner_id: 'user-1', join_code: 'TT-A62DBC' };

  function fakeSupabase(groupRow) {
    const chain = {
      select: () => chain,
      insert: () => chain,
      update: () => chain,
      delete: () => chain,
      eq: () => chain,
      single: async () => (groupRow
        ? { data: groupRow, error: null }
        : { data: null, error: { message: 'Cannot coerce the result to a single JSON object' } }),
      maybeSingle: async () => ({ data: groupRow ?? null, error: null }),
      then: (resolve) => resolve({ data: groupRow ? [groupRow] : [], error: null }),
    };
    return {
      auth: { getUser: async (t) => (t === 'good' ? { data: { user: { id: 'user-1' } }, error: null } : { data: null, error: { message: 'bad token' } }) },
      from: () => chain,
    };
  }

  async function boot(groupRow = GROUP) {
    process.env.SUPABASE_URL ||= 'http://127.0.0.1:1/';
    process.env.SUPABASE_KEY ||= 'test-key';
    process.env.SUPABASE_ANON_KEY ||= 'test-key';
    vi.resetModules();
    vi.doMock('../common/config/supabaseClient.js', () => ({ default: fakeSupabase(groupRow) }));
    return (await import('../app.js')).default;
  }

  afterEach(() => { vi.doUnmock('../common/config/supabaseClient.js'); });

  it('refuses to list a user\'s workspaces without a token', async () => {
    app = await boot();
    const res = await request(app).get('/api/groups/user-1');
    expect(res.status).toBe(401);
    expect(JSON.stringify(res.body)).not.toMatch(/join_code/i);
  });

  it('refuses a workspace list belonging to somebody else', async () => {
    app = await boot();
    const res = await request(app).get('/api/groups/someone-else').set('Authorization', 'Bearer good');
    expect(res.status).toBe(403);
  });

  it('still returns your own workspaces', async () => {
    app = await boot();
    const res = await request(app).get('/api/groups/user-1').set('Authorization', 'Bearer good');
    expect(res.status).toBe(200);
  });

  it('refuses an unauthenticated delete', async () => {
    app = await boot();
    const res = await request(app).delete('/api/groups/delete/g1');
    expect(res.status).toBe(401);
  });

  it('refuses to delete a workspace owned by someone else', async () => {
    app = await boot({ ...GROUP, owner_id: 'another-user' });
    const res = await request(app).delete('/api/groups/delete/g1').set('Authorization', 'Bearer good');
    expect(res.status).toBe(403);
  });

  it('answers 404 — not 500 — for a workspace that does not exist', async () => {
    app = await boot(null);
    const res = await request(app).delete('/api/groups/delete/missing').set('Authorization', 'Bearer good');
    expect(res.status).toBe(404);
    // finding 8: the raw Postgres text must not reach the caller
    expect(JSON.stringify(res.body)).not.toMatch(/coerce/i);
  });

  it.each([
    ['/api/extractor/g1'],
    ['/api/summarizer/g1'],
    ['/api/gap/g1'],
    ['/api/topic/g1'],
  ])('refuses %s without a token', async (url) => {
    app = await boot();
    const res = await request(app).get(url);
    expect(res.status).toBe(401);
  });
});

describe('Error handler does not leak internals (finding 8)', () => {
  function capture() {
    return { code: null, body: null, status(c) { this.code = c; return this; }, json(b) { this.body = b; return this; } };
  }

  it('hides raw database text behind a generic 500', async () => {
    const { default: errorHandler } = await import('../common/middlewares/errorHandler.js');
    const res = capture();
    errorHandler(
      new Error('Failed to delete group: Error deleting group: Cannot coerce the result to a single JSON object'),
      {}, res, () => {},
    );
    expect(res.code).toBe(500);
    expect(JSON.stringify(res.body)).not.toMatch(/coerce|postgres|supabase/i);
  });

  it('keeps a deliberate client-error message intact', async () => {
    const { default: errorHandler } = await import('../common/middlewares/errorHandler.js');
    const res = capture();
    const err = new Error('Session ID is required');
    err.status = 400;
    errorHandler(err, {}, res, () => {});
    expect(res.code).toBe(400);
    expect(JSON.stringify(res.body)).toMatch(/Session ID is required/);
  });
});

describe('CiteWise session id follows the account, not the browser (finding 5)', () => {
  // It used to be crypto.randomUUID() in the browser, kept only in localStorage,
  // so signing in elsewhere left every uploaded paper unreachable.
  const load = () => import('../modules/citewise/helpers/sessionId.js');

  beforeEach(() => { process.env.SESSION_ID_SECRET = 'test-secret'; });

  it('gives the same id for the same user and workspace', async () => {
    const { deriveSessionId } = await load();
    expect(deriveSessionId('user-1', 'group-1')).toBe(deriveSessionId('user-1', 'group-1'));
  });

  it('gives a different id to a different user in the same workspace', async () => {
    const { deriveSessionId } = await load();
    expect(deriveSessionId('user-1', 'group-1')).not.toBe(deriveSessionId('user-2', 'group-1'));
  });

  it('gives a different id to the same user in a different workspace', async () => {
    const { deriveSessionId } = await load();
    expect(deriveSessionId('user-1', 'group-1')).not.toBe(deriveSessionId('user-1', 'group-2'));
  });

  it('produces a v4-shaped uuid so it fits the existing session column', async () => {
    const { deriveSessionId } = await load();
    expect(deriveSessionId('user-1', 'group-1'))
      .toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
  });

  it('is not guessable without the server secret', async () => {
    const { deriveSessionId } = await load();
    const withOne = deriveSessionId('user-1', 'group-1');
    process.env.SESSION_ID_SECRET = 'a-different-secret';
    vi.resetModules();
    const { deriveSessionId: again } = await load();
    expect(again('user-1', 'group-1')).not.toBe(withOne);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// SUITE 6 – deleting a document answered 204 No Content, and the HTTP client
// treated every body-less response as a broken backend:
//   "Invalid response from server: Expected JSON."
// All four delete buttons (import, RRL upload, assessment, draft) hit this.
// ─────────────────────────────────────────────────────────────────────────────

describe('web HTTP client – responses with no body', () => {
  let store;
  let http;

  const noBody = (status) => ({
    status,
    ok: status >= 200 && status < 300,
    headers: { get: () => null },          // 204 carries no content-type
    json: async () => { throw new Error('no body'); },
    text: async () => '',
  });

  beforeEach(async () => {
    store = new Map();
    vi.stubGlobal('localStorage', {
      getItem: (k) => (store.has(k) ? store.get(k) : null),
      setItem: (k, v) => store.set(k, String(v)),
      removeItem: (k) => store.delete(k),
    });
    vi.stubGlobal('CustomEvent', class { constructor(type) { this.type = type; } });
    vi.stubGlobal('window', { dispatchEvent: () => {} });
    vi.resetModules();
    http = await import('../../../web/src/api/http.js');
  });

  afterEach(() => { vi.unstubAllGlobals(); });

  it('treats a 204 as success rather than a broken backend', async () => {
    store.set('token', 'T');
    vi.stubGlobal('fetch', vi.fn(async () => noBody(204)));

    const { res, data } = await http.apiFetch('/api/v1/documents/42', { method: 'DELETE' });

    expect(res.status).toBe(204);
    expect(data).toBeNull();
  });

  it('lets apiRequest resolve on a 204 instead of throwing', async () => {
    store.set('token', 'T');
    vi.stubGlobal('fetch', vi.fn(async () => noBody(204)));

    await expect(http.apiRequest('/api/v1/documents/42', { method: 'DELETE' })).resolves.toBeNull();
  });

  it('still surfaces a non-JSON error response as an error', async () => {
    store.set('token', 'T');
    vi.stubGlobal('fetch', vi.fn(async () => ({
      status: 502,
      ok: false,
      headers: { get: () => 'text/html' },
      json: async () => { throw new Error('not json'); },
      text: async () => '<html>gateway</html>',
    })));

    await expect(http.apiFetch('/api/v1/documents/42', { method: 'DELETE' })).rejects.toThrow(/502/);
  });
});

describe('DELETE /api/v1/documents/:id answers in the usual envelope', () => {
  let app;

  beforeEach(async () => {
    process.env.SUPABASE_URL ||= 'http://127.0.0.1:1/';
    process.env.SUPABASE_KEY ||= 'test-key';
    process.env.SUPABASE_ANON_KEY ||= 'test-key';
    vi.resetModules();

    vi.doMock('../common/config/supabaseClient.js', () => {
      const chain = {
        select: () => chain,
        delete: () => chain,
        eq: () => chain,
        maybeSingle: async () => ({ data: { id: 42, session_id: 'session-1' }, error: null }),
        then: (resolve) => resolve({ data: null, error: null }),
      };
      return {
        default: {
          auth: { getUser: async () => ({ data: { user: { id: 'user-1' } }, error: null }) },
          from: () => chain,
        },
      };
    });
    app = (await import('../app.js')).default;
  });

  afterEach(() => { vi.doUnmock('../common/config/supabaseClient.js'); });

  it('returns JSON the upload queue can read, not an empty 204', async () => {
    const res = await request(app)
      .delete('/api/v1/documents/42')
      .set('Authorization', 'Bearer test-token')
      .set('X-Session-Id', 'session-1');

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/json/);
    expect(res.body.success).toBe(true);
  });
});
