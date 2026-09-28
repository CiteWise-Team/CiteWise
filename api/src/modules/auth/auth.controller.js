import supabase from '../../common/config/supabaseClient.js';
import fetch from 'node-fetch';

// Kept in step with the "Min 8 characters" hint on the registration form.
const MIN_PASSWORD_LENGTH = 8;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function sendError(res, status, message) {
  return res.status(status).json({ error: message, message });
}

// Supabase stores addresses lowercased; normalizing here keeps the duplicate
// check, the password grant and the stored Profile all agreeing on one form.
function normalizeEmail(email) {
  return typeof email === 'string' ? email.trim().toLowerCase() : '';
}

function supabaseAuthConfig() {
  const url = process.env.SUPABASE_URL?.replace(/\/$/, '');
  const anonKey = process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_KEY;
  return url && anonKey ? { url, anonKey } : null;
}

async function tokenGrant(grantType, body) {
  const config = supabaseAuthConfig();
  if (!config) {
    const err = new Error('Supabase env vars are not configured');
    err.status = 500;
    throw err;
  }

  const response = await fetch(`${config.url}/auth/v1/token?grant_type=${grantType}`, {
    method: 'POST',
    headers: { apikey: config.anonKey, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await response.json().catch(() => ({}));
  return { ok: response.ok, status: response.status, data };
}

// GoTrue has reported errors as `error_description` (legacy) and as
// `msg` + `error_code` (current). Reading only the legacy field turned every
// sign-in failure into a bare "Login failed".
function describeAuthFailure(status, data) {
  const code = data.error_code || data.code || data.error;
  if (code === 'invalid_credentials' || code === 'invalid_grant') {
    return { status: 401, message: 'Incorrect email or password.' };
  }
  if (code === 'email_not_confirmed') {
    return { status: 403, message: 'Please confirm your email address before signing in.' };
  }
  if (code === 'user_banned') {
    return { status: 403, message: 'This account has been disabled.' };
  }
  if (status === 429 || code === 'over_request_rate_limit') {
    return { status: 429, message: 'Too many sign-in attempts. Please wait a moment and try again.' };
  }
  if (status >= 500) {
    return { status: 502, message: 'The sign-in service is unavailable. Please try again shortly.' };
  }
  return { status: 400, message: data.msg || data.error_description || data.message || 'Sign in failed.' };
}

function sessionPayload(data) {
  return {
    ok: true,
    access_token: data.access_token,
    refresh_token: data.refresh_token,
    expires_in: data.expires_in,
    user: data.user,
  };
}

// Usernames come from the email's local part, so james.resma@cit.edu and
// james.resma@gmail.com both want "james.resma". A collision used to fail the
// Profile insert after the auth user already existed.
async function ensureProfile(userId, email) {
  const { data: existing, error: lookupError } = await supabase
    .from('Profile')
    .select('id')
    .eq('id', userId)
    .maybeSingle();
  if (lookupError) return { error: lookupError };
  if (existing) return { error: null };

  const base = email.split('@')[0];
  const candidates = [base, `${base}_${userId.replace(/-/g, '').slice(0, 6)}`];

  let lastError = null;
  for (const username of candidates) {
    const { error } = await supabase.from('Profile').insert([{ id: userId, username }]);
    if (!error) return { error: null, username };
    lastError = error;
    if (error.code !== '23505') break;
  }
  return { error: lastError };
}

// --------------------------
// Signup
// --------------------------
async function signup(req, res) {
  try {
    const email = normalizeEmail(req.body?.email);
    const password = req.body?.password;
    if (!email || !password) {
      return sendError(res, 400, 'Email and password are required');
    }
    if (!EMAIL_PATTERN.test(email)) {
      return sendError(res, 400, 'Please enter a valid email address');
    }
    if (String(password).length < MIN_PASSWORD_LENGTH) {
      return sendError(res, 400, `Password must be at least ${MIN_PASSWORD_LENGTH} characters`);
    }

    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true
    });

    if (authError) {
      // Supabase answers 422 for a weak password as well as for a taken email,
      // so the status alone cannot tell them apart. Branching on it reported
      // every rejected password as "this account already exists" and sent the
      // user off to sign in to an account that was never created.
      const isDuplicate = authError.code === 'email_exists' ||
                          authError.message?.toLowerCase().includes('already registered') ||
                          authError.message?.toLowerCase().includes('already exists');

      if (!isDuplicate) {
        console.error('Supabase createUser error:', authError);
        return sendError(res, 400, authError.message || 'Failed to create account');
      }

      // Accounts left half-created by an earlier failed signup are recovered
      // here, but only when the caller proves ownership with the right password.
      const grant = await tokenGrant('password', { email, password }).catch(() => null);
      if (grant?.ok && grant.data.user?.id) {
        const { error: profileError } = await ensureProfile(grant.data.user.id, email);
        if (profileError) {
          console.error('Profile repair error:', profileError);
          return sendError(res, 500, 'Could not finish setting up your account. Please try again.');
        }
        return res.status(201).json({ ok: true, user: { id: grant.data.user.id, email } });
      }
      return sendError(res, 400, 'An account with this email address already exists. Please sign in instead.');
    }

    const userId = authData.user.id;
    const { error: profileError, username } = await ensureProfile(userId, email);

    if (profileError) {
      console.error('Profile creation error:', profileError);
      // Roll back so the address is not left registered without a profile,
      // which made every retry report "already exists".
      const { error: deleteError } = await supabase.auth.admin.deleteUser(userId);
      if (deleteError) console.error('Signup rollback failed:', deleteError);
      return sendError(res, 500, 'Could not finish creating your account. Please try again.');
    }

    res.status(201).json({ ok: true, user: { id: userId, email, username } });
  } catch (err) {
    console.error('Signup exception:', err);
    sendError(res, 500, 'Failed to create account');
  }
}

// --------------------------
// Login
// --------------------------
async function login(req, res) {
  try {
    const email = normalizeEmail(req.body?.email);
    const password = req.body?.password;
    if (!email || !password) return sendError(res, 400, 'Email and password required');

    const { ok, status, data } = await tokenGrant('password', { email, password });
    if (!ok) {
      const failure = describeAuthFailure(status, data);
      console.error('Login error:', status, data.error_code || data.code || data.error);
      return sendError(res, failure.status, failure.message);
    }

    const { error: profileError } = await ensureProfile(data.user.id, email);
    if (profileError) console.error('Profile repair on login failed:', profileError);

    res.json(sessionPayload(data));
  } catch (err) {
    console.error('Login exception:', err);
    sendError(res, err.status || 500, err.status ? err.message : 'Sign in failed');
  }
}

// --------------------------
// Refresh Token
// --------------------------
async function refresh(req, res) {
  try {
    const refresh_token = req.body?.refresh_token;
    if (!refresh_token) return sendError(res, 400, 'Refresh token required');

    const { ok, status, data } = await tokenGrant('refresh_token', { refresh_token });
    if (!ok) {
      return sendError(res, status >= 500 ? 502 : 401, 'Your session has expired. Please sign in again.');
    }

    res.json(sessionPayload(data));
  } catch (err) {
    console.error('Refresh exception:', err);
    sendError(res, err.status || 500, 'Token refresh failed');
  }
}

// --------------------------
// Logout
// --------------------------
async function logout(req, res) {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return sendError(res, 400, 'No token provided');

    // Revokes the refresh tokens of this session so it cannot be renewed.
    const { error } = await supabase.auth.admin.signOut(token, 'local');
    if (error) return sendError(res, 400, error.message);

    res.json({ ok: true });
  } catch (err) {
    console.error('Logout exception:', err);
    sendError(res, 500, 'Logout failed');
  }
}

export { signup, login, refresh, logout };
