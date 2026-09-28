import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import request from 'supertest';

describe('Auth – signup recovery, login errors, logout', () => {
  let app;
  let state;

  beforeEach(async () => {
    process.env.SUPABASE_URL ||= 'http://127.0.0.1:1/';
    process.env.SUPABASE_KEY ||= 'test-key';
    process.env.SUPABASE_ANON_KEY ||= 'test-key';
    vi.resetModules();

    state = {
      createUser: { data: null, error: null },
      existingProfile: null,
      insertErrors: [],
      inserted: [],
      deleted: [],
      signedOut: [],
      grant: { status: 200, body: {} },
      grantCalls: [],
    };

    vi.doMock('node-fetch', () => ({
      default: async (url, opts) => {
        state.grantCalls.push({ url, body: JSON.parse(opts.body) });
        const { status, body } = state.grant;
        return { ok: status < 400, status, json: async () => body };
      },
    }));

    vi.doMock('../common/config/supabaseClient.js', () => {
      const chain = {
        select: () => chain,
        eq: () => chain,
        maybeSingle: async () => ({ data: state.existingProfile, error: null }),
        insert: async (rows) => {
          const error = state.insertErrors.shift() || null;
          if (!error) state.inserted.push(rows[0]);
          return { error };
        },
      };
      return {
        default: {
          auth: {
            admin: {
              createUser: async () => state.createUser,
              deleteUser: async (id) => { state.deleted.push(id); return { error: null }; },
              signOut: async (jwt) => { state.signedOut.push(jwt); return { error: null }; },
            },
            getUser: async () => ({ data: { user: { id: 'user-1' } }, error: null }),
          },
          from: () => chain,
        },
      };
    });
    app = (await import('../app.js')).default;
  });

  afterEach(() => {
    vi.doUnmock('../common/config/supabaseClient.js');
    vi.doUnmock('node-fetch');
  });

  it('normalizes the email before creating the account', async () => {
    let received;
    state.createUser = { data: { user: { id: 'u1' } }, error: null };
    const { default: supabase } = await import('../common/config/supabaseClient.js');
    const original = supabase.auth.admin.createUser;
    supabase.auth.admin.createUser = async (args) => { received = args; return original(args); };

    const res = await request(app)
      .post('/api/auth/signup')
      .send({ email: '  James.Resma@CIT.edu ', password: 'abcd1234' });

    expect(res.status).toBe(201);
    expect(received.email).toBe('james.resma@cit.edu');
  });

  it('falls back to a suffixed username when the plain one is taken', async () => {
    state.createUser = { data: { user: { id: 'abcdef12-3456' } }, error: null };
    state.insertErrors = [{ code: '23505', message: 'duplicate key value violates unique constraint' }];

    const res = await request(app)
      .post('/api/auth/signup')
      .send({ email: 'james.resma@cit.edu', password: 'abcd1234' });

    expect(res.status).toBe(201);
    expect(state.inserted[0].username).toBe('james.resma_abcdef');
    expect(state.deleted).toEqual([]);
  });

  it('rolls the auth user back when the profile cannot be created', async () => {
    state.createUser = { data: { user: { id: 'u-rollback' } }, error: null };
    state.insertErrors = [{ code: '42501', message: 'permission denied' }];

    const res = await request(app)
      .post('/api/auth/signup')
      .send({ email: 'someone@cit.edu', password: 'abcd1234' });

    expect(res.status).toBe(500);
    expect(state.deleted).toEqual(['u-rollback']);
    expect(res.body.message).not.toMatch(/already exists/i);
  });

  it('repairs a half-created account when the owner re-registers with the right password', async () => {
    state.createUser = { data: null, error: { code: 'email_exists', message: 'already registered' } };
    state.grant = { status: 200, body: { access_token: 'a', user: { id: 'orphan-1' } } };

    const res = await request(app)
      .post('/api/auth/signup')
      .send({ email: 'james.resma@cit.edu', password: 'abcd1234' });

    expect(res.status).toBe(201);
    expect(state.inserted[0]).toMatchObject({ id: 'orphan-1', username: 'james.resma' });
  });

  it('still reports a duplicate when the password does not match', async () => {
    state.createUser = { data: null, error: { code: 'email_exists', message: 'already registered' } };
    state.grant = { status: 400, body: { error_code: 'invalid_credentials', msg: 'Invalid login credentials' } };

    const res = await request(app)
      .post('/api/auth/signup')
      .send({ email: 'james.resma@cit.edu', password: 'wrongpass' });

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/already exists/i);
    expect(state.inserted).toEqual([]);
  });

  it('reports wrong credentials from the current GoTrue error format', async () => {
    state.grant = { status: 400, body: { code: 400, error_code: 'invalid_credentials', msg: 'Invalid login credentials' } };

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'james.resma@cit.edu', password: 'wrongpass' });

    expect(res.status).toBe(401);
    expect(res.body.error).toBe('Incorrect email or password.');
  });

  it('signs in with a normalized email and creates a missing profile', async () => {
    state.grant = { status: 200, body: { access_token: 'at', refresh_token: 'rt', user: { id: 'u2', email: 'james.resma@cit.edu' } } };

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'James.Resma@cit.edu ', password: 'abcd1234' });

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ ok: true, access_token: 'at', refresh_token: 'rt' });
    expect(state.grantCalls[0].body.email).toBe('james.resma@cit.edu');
    expect(state.inserted[0]).toMatchObject({ id: 'u2', username: 'james.resma' });
  });

  it('revokes the session on logout', async () => {
    const res = await request(app)
      .post('/api/auth/logout')
      .set('Authorization', 'Bearer tok-1');

    expect(res.status).toBe(200);
    expect(state.signedOut).toEqual(['tok-1']);
  });

  it('throttles repeated failed sign-ins for one account', async () => {
    state.grant = { status: 400, body: { error_code: 'invalid_credentials' } };
    let last;
    for (let i = 0; i < 11; i++) {
      last = await request(app).post('/api/auth/login').send({ email: 'target@cit.edu', password: 'guess' + i });
    }
    expect(last.status).toBe(429);

    const other = await request(app).post('/api/auth/login').send({ email: 'other@cit.edu', password: 'x' });
    expect(other.status).toBe(401);
  });
});
