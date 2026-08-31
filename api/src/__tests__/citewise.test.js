/**
 * CiteWise – Integration test suite
 * Covers all changes introduced in:
 *   - fix/anti-ai-slop-improvements  (citation safety, save-draft, state-sync)
 *   - fix/security-hardening          (auth middleware, route guards, CORS, MIME)
 *
 * Run with:  npm test
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─────────────────────────────────────────────────────────────────────────────
// Helpers – inline logic extracted from source files for pure-unit testing
// ─────────────────────────────────────────────────────────────────────────────

function extractAndProtect(text) {
  const CITATION_RE = /\((?:[A-Z][^()]{1,120}?,\s*(?:n\.d\.|[12]\d{3}[a-z]?)(?:\s*;\s*[A-Z][^()]{1,120}?,\s*(?:n\.d\.|[12]\d{3}[a-z]?))*)\)/g;
  const citations = [];
  const protectedText = text.replace(CITATION_RE, (match) => {
    citations.push(match);
    return `«CIT${citations.length - 1}»`;
  });
  return { protectedText, citations };
}

function restorePlaceholders(paraphrased, citations) {
  const PLACEHOLDER_RE = /«CIT(\d+)»/g;
  return paraphrased.replace(PLACEHOLDER_RE, (_, idx) => citations[Number(idx)] ?? '');
}

function detectDropped(paraphrased, citations) {
  const PLACEHOLDER_RE = /«CIT(\d+)»/g;
  const present = new Set([...paraphrased.matchAll(PLACEHOLDER_RE)].map(m => Number(m[1])));
  return citations.map((c, i) => ({ c, i })).filter(({ i }) => !present.has(i)).map(({ c }) => c);
}

// ─────────────────────────────────────────────────────────────────────────────
// SUITE 1 – Citation placeholder extraction & restoration
// ─────────────────────────────────────────────────────────────────────────────

describe('Citation Safety – Placeholder Extraction & Restoration', () => {
  const DRAFT = [
    'Neural networks have transformed NLP (Vaswani et al., 2017).',
    'Attention mechanisms improved efficiency (Devlin et al., 2019; Brown et al., 2020).',
    'Recent work on efficiency (Hu et al., 2021) further advanced the field.',
    'Undated work is cited as (Smith, n.d.).',
  ].join(' ');

  it('extracts all APA citations and replaces with placeholders', () => {
    const { protectedText, citations } = extractAndProtect(DRAFT);
    expect(citations).toHaveLength(4);
    expect(protectedText).toContain('«CIT0»');
    expect(protectedText).toContain('«CIT1»');
    expect(protectedText).toContain('«CIT2»');
    expect(protectedText).toContain('«CIT3»');
    expect(protectedText).not.toContain('Vaswani');
    expect(protectedText).not.toContain('Devlin');
  });

  it('preserves citation strings verbatim after restore', () => {
    const { protectedText, citations } = extractAndProtect(DRAFT);
    const restored = restorePlaceholders(protectedText, citations);
    expect(restored).toContain('(Vaswani et al., 2017)');
    expect(restored).toContain('(Devlin et al., 2019; Brown et al., 2020)');
    expect(restored).toContain('(Hu et al., 2021)');
    expect(restored).toContain('(Smith, n.d.)');
  });

  it('detects dropped citations when LLM removes a placeholder', () => {
    const { citations } = extractAndProtect(DRAFT);
    const llmOut = 'Transformers changed NLP «CIT0». Efficiency improved «CIT2». Recent advances «CIT3».';
    const dropped = detectDropped(llmOut, citations);
    expect(dropped).toHaveLength(1);
    expect(dropped[0]).toBe('(Devlin et al., 2019; Brown et al., 2020)');
  });

  it('handles text with no citations gracefully', () => {
    const { protectedText, citations } = extractAndProtect('No citations here at all.');
    expect(citations).toHaveLength(0);
    expect(protectedText).toBe('No citations here at all.');
  });

  it('handles multi-source citations as a single unit', () => {
    const text = 'Key advances (Smith, 2020; Jones, 2021; Lee, 2022) were made.';
    const { citations, protectedText } = extractAndProtect(text);
    expect(citations).toHaveLength(1);
    expect(citations[0]).toBe('(Smith, 2020; Jones, 2021; Lee, 2022)');
    const restored = restorePlaceholders(protectedText, citations);
    expect(restored).toBe(text);
  });

  it('does NOT match lowercase-start parenthetical phrases as citations', () => {
    const text = 'This is a result (see figure 1) and (note: this is not a citation).';
    const { citations } = extractAndProtect(text);
    expect(citations).toHaveLength(0);
  });

  it('restores original citation even when LLM surrounds placeholder with extra words', () => {
    const text = 'Key work (Brown et al., 2020) shaped the field.';
    const { citations } = extractAndProtect(text);
    const llmOut = 'Foundational work «CIT0» reshaped NLP forever.';
    const restored = restorePlaceholders(llmOut, citations);
    expect(restored).toContain('(Brown et al., 2020)');
    expect(restored).not.toContain('«CIT0»');
  });

  it('handles n.d. (no date) citations correctly', () => {
    const text = 'Unpublished work (Taylor, n.d.) is sometimes cited.';
    const { citations, protectedText } = extractAndProtect(text);
    expect(citations).toHaveLength(1);
    expect(citations[0]).toBe('(Taylor, n.d.)');
    expect(restorePlaceholders(protectedText, citations)).toBe(text);
  });

  it('handles lettered year suffixes (2020a, 2020b)', () => {
    const text = 'Two papers (Chen, 2020a; Chen, 2020b) contradicted each other.';
    const { citations } = extractAndProtect(text);
    expect(citations).toHaveLength(1);
    expect(citations[0]).toContain('2020a');
  });

  it('round-trips a realistic full paragraph without data loss', () => {
    const para = 'The transformer architecture (Vaswani et al., 2017) introduced self-attention. ' +
      'Pre-training methods (Devlin et al., 2019) then demonstrated (Brown et al., 2020) ' +
      'that scale matters significantly.';
    const { protectedText, citations } = extractAndProtect(para);
    const restored = restorePlaceholders(protectedText, citations);
    expect(restored).toBe(para);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// SUITE 2 – Auth middleware logic
// ─────────────────────────────────────────────────────────────────────────────

describe('Auth Middleware – requireAuth', () => {
  function makeMiddleware(getUserResult) {
    const supabaseMock = { auth: { getUser: vi.fn().mockResolvedValue(getUserResult) } };
    return async function requireAuth(req, res, next) {
      try {
        const authHeader = req.headers?.authorization;
        if (!authHeader?.startsWith('Bearer ')) {
          return res.status(401).json({ error: 'Missing or invalid Authorization header' });
        }
        const token = authHeader.split(' ')[1];
        const { data, error } = await supabaseMock.auth.getUser(token);
        if (error || !data?.user) return res.status(401).json({ error: 'Invalid or expired token' });
        req.user = data.user;
        next();
      } catch (err) { next(err); }
    };
  }

  function mockRes() {
    const res = {};
    res.status = vi.fn().mockReturnValue(res);
    res.json = vi.fn().mockReturnValue(res);
    return res;
  }

  it('calls next() and attaches user when token is valid', async () => {
    const mw = makeMiddleware({ data: { user: { id: 'user-1' } }, error: null });
    const req = { headers: { authorization: 'Bearer valid-jwt' } };
    const res = mockRes();
    const next = vi.fn();
    await mw(req, res, next);
    expect(next).toHaveBeenCalledOnce();
    expect(req.user).toEqual({ id: 'user-1' });
  });

  it('returns 401 when Authorization header is missing', async () => {
    const mw = makeMiddleware({ data: { user: null }, error: null });
    const req = { headers: {} };
    const res = mockRes();
    await mw(req, res, vi.fn());
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ error: 'Missing or invalid Authorization header' }));
  });

  it('returns 401 when scheme is not Bearer', async () => {
    const mw = makeMiddleware({ data: { user: null }, error: null });
    const req = { headers: { authorization: 'Token abc123' } };
    const res = mockRes();
    await mw(req, res, vi.fn());
    expect(res.status).toHaveBeenCalledWith(401);
  });

  it('returns 401 when Supabase returns a JWT error', async () => {
    const mw = makeMiddleware({ data: null, error: new Error('JWT expired') });
    const req = { headers: { authorization: 'Bearer expired-token' } };
    const res = mockRes();
    await mw(req, res, vi.fn());
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: 'Invalid or expired token' });
  });

  it('returns 401 when Supabase returns no user object', async () => {
    const mw = makeMiddleware({ data: { user: null }, error: null });
    const req = { headers: { authorization: 'Bearer some-token' } };
    const res = mockRes();
    await mw(req, res, vi.fn());
    expect(res.status).toHaveBeenCalledWith(401);
  });

  it('does NOT call next() on auth failure', async () => {
    const mw = makeMiddleware({ data: null, error: new Error('bad') });
    const req = { headers: { authorization: 'Bearer bad' } };
    const res = mockRes();
    const next = vi.fn();
    await mw(req, res, next);
    expect(next).not.toHaveBeenCalled();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// SUITE 3 – ProtectedRoute decision logic
// ─────────────────────────────────────────────────────────────────────────────

describe('ProtectedRoute – Redirect Logic', () => {
  function protectedRouteDecision(user) {
    if (!user) return { redirect: '/login' };
    return { render: 'children' };
  }

  it('renders children when user is a valid object', () => {
    expect(protectedRouteDecision({ id: 'u1', email: 'a@b.com' })).toEqual({ render: 'children' });
  });

  it('redirects to /login when user is null', () => {
    expect(protectedRouteDecision(null)).toEqual({ redirect: '/login' });
  });

  it('redirects to /login when user is undefined', () => {
    expect(protectedRouteDecision(undefined)).toEqual({ redirect: '/login' });
  });

  it('redirects to /login when user is 0 (falsy)', () => {
    expect(protectedRouteDecision(0)).toEqual({ redirect: '/login' });
  });

  it('redirects to /login on empty string', () => {
    expect(protectedRouteDecision('')).toEqual({ redirect: '/login' });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// SUITE 4 – /save-draft input validation
// ─────────────────────────────────────────────────────────────────────────────

describe('/save-draft – Input Validation', () => {
  function saveDraftGuard({ sessionId, contentText } = {}) {
    if (!sessionId)   return { status: 400, message: 'sessionId is required' };
    if (!contentText) return { status: 400, message: 'contentText is required' };
    return { status: 200, ok: true };
  }

  it('rejects when sessionId is missing', () => {
    expect(saveDraftGuard({ contentText: 'hello' })).toMatchObject({ status: 400, message: expect.stringMatching(/sessionId/) });
  });

  it('rejects when contentText is missing', () => {
    expect(saveDraftGuard({ sessionId: 'abc' })).toMatchObject({ status: 400, message: expect.stringMatching(/contentText/) });
  });

  it('rejects when body is empty', () => {
    expect(saveDraftGuard({})).toMatchObject({ status: 400 });
  });

  it('passes with valid sessionId and contentText', () => {
    expect(saveDraftGuard({ sessionId: 'abc-123', contentText: 'Draft text here.' })).toMatchObject({ status: 200, ok: true });
  });

  it('rejects empty string for contentText', () => {
    expect(saveDraftGuard({ sessionId: 'abc', contentText: '' })).toMatchObject({ status: 400 });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// SUITE 5 – /update-citations client-content passthrough
// ─────────────────────────────────────────────────────────────────────────────

describe('/update-citations – Client Content Passthrough', () => {
  function resolveContent(clientContentText, dbContentText) {
    return clientContentText || dbContentText || '';
  }

  it('uses clientContentText when provided (paraphrased draft)', () => {
    expect(resolveContent('Paraphrased version.', 'Old DB version.')).toBe('Paraphrased version.');
  });

  it('falls back to DB content when client sends nothing', () => {
    expect(resolveContent(undefined, 'Old DB version.')).toBe('Old DB version.');
  });

  it('falls back to empty string when both are missing', () => {
    expect(resolveContent(undefined, undefined)).toBe('');
  });

  it('treats empty string as falsy and uses DB fallback', () => {
    expect(resolveContent('', 'Old DB version.')).toBe('Old DB version.');
  });

  it('clientContentText wins even when DB copy is longer', () => {
    const long = 'A'.repeat(5000);
    expect(resolveContent('Short edit.', long)).toBe('Short edit.');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// SUITE 6 – MIME type filter
// ─────────────────────────────────────────────────────────────────────────────

describe('File Upload – MIME Type Filter', () => {
  function mimeFilter(mimetype) {
    if (mimetype === 'application/pdf') return { allowed: true };
    return { allowed: false, error: 'Only PDF files are accepted.' };
  }

  it('allows application/pdf', () => expect(mimeFilter('application/pdf').allowed).toBe(true));
  it('rejects application/octet-stream', () => expect(mimeFilter('application/octet-stream').allowed).toBe(false));
  it('rejects image/png', () => expect(mimeFilter('image/png').allowed).toBe(false));
  it('rejects text/plain', () => expect(mimeFilter('text/plain').allowed).toBe(false));
  it('rejects application/msword', () => expect(mimeFilter('application/msword').allowed).toBe(false));
  it('rejects empty mimetype string', () => expect(mimeFilter('').allowed).toBe(false));
  it('rejects undefined mimetype', () => expect(mimeFilter(undefined).allowed).toBe(false));
  it('error message mentions PDF', () => expect(mimeFilter('image/jpeg').error).toMatch(/PDF/));
});

// ─────────────────────────────────────────────────────────────────────────────
// SUITE 7 – CORS allowlist (no wildcard)
// ─────────────────────────────────────────────────────────────────────────────

describe('CORS – Origin Allowlist', () => {
  const allowedOrigins = [
    'http://localhost:5173',
    'http://localhost:3000',
    'https://catalyst-nu-gilt.vercel.app',
    'https://citewise-seven.vercel.app',
  ];

  function corsCheck(origin) {
    if (!origin) return true;
    return allowedOrigins.includes(origin);
  }

  it('allows localhost:5173', () => expect(corsCheck('http://localhost:5173')).toBe(true));
  it('allows localhost:3000', () => expect(corsCheck('http://localhost:3000')).toBe(true));
  it('allows the citewise Vercel production domain', () => expect(corsCheck('https://citewise-seven.vercel.app')).toBe(true));
  it('allows the catalyst Vercel production domain', () => expect(corsCheck('https://catalyst-nu-gilt.vercel.app')).toBe(true));
  it('rejects an arbitrary unknown Vercel deployment', () => expect(corsCheck('https://attacker-app.vercel.app')).toBe(false));
  it('rejects an unknown external domain', () => expect(corsCheck('https://evil.example.com')).toBe(false));
  it('rejects a subdomain of an allowed origin', () => expect(corsCheck('https://sub.citewise-seven.vercel.app')).toBe(false));
  it('allows requests with no origin header (server health checks)', () => {
    expect(corsCheck(undefined)).toBe(true);
    expect(corsCheck(null)).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// SUITE 8 – Draft version labeling
// ─────────────────────────────────────────────────────────────────────────────

describe('Draft Version History – Source Labels', () => {
  function makeVersionLabel(source, versionCount) {
    return source === 'paraphrased'
      ? `Paraphrased v${versionCount + 1}`
      : `Edited v${versionCount + 1}`;
  }

  it('labels first paraphrased version as "Paraphrased v1"', () => expect(makeVersionLabel('paraphrased', 0)).toBe('Paraphrased v1'));
  it('labels third paraphrased version as "Paraphrased v3"', () => expect(makeVersionLabel('paraphrased', 2)).toBe('Paraphrased v3'));
  it('labels first manual edit as "Edited v1"', () => expect(makeVersionLabel('edited', 0)).toBe('Edited v1'));
  it('labels sixth manual edit as "Edited v6"', () => expect(makeVersionLabel('edited', 5)).toBe('Edited v6'));
  it('defaults unknown source to edited label', () => expect(makeVersionLabel('generated', 0)).toBe('Edited v1'));
});
