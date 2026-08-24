import supabase from '../../common/config/supabaseClient.js';
import fetch from 'node-fetch';

async function signup(req, res) {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required', message: 'Email and password are required' });
    }

    const username = email.split("@")[0];
    console.log('Signup request received for email:', email);

    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true
    });

    if (authError) {
      console.error('Supabase createUser error:', authError);
      const isDuplicate = authError.message?.toLowerCase().includes('already registered') || 
                          authError.message?.toLowerCase().includes('already exists') || 
                          authError.status === 422 || 
                          authError.code === 'email_exists';
      const errorMessage = isDuplicate 
        ? 'An account with this email address already exists. Please sign in instead.' 
        : (authError.message || 'Failed to create account');
      return res.status(400).json({ error: errorMessage, message: errorMessage });
    }

    const userId = authData.user.id;

    const { error: profileError } = await supabase
      .from('Profile')
      .insert([{ id: userId, username }]);

    if (profileError) {
      console.error('Profile creation error:', profileError);
      return res.status(400).json({ error: profileError.message, message: profileError.message });
    }

    res.status(201).json({ ok: true, user: { id: userId, email, username } });
  } catch (err) {
    console.error('Signup exception:', err);
    res.status(500).json({ error: err.message, message: err.message });
  }
}

// --------------------------
// Login
// --------------------------
async function login(req, res) {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email and password required' });

    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_KEY;
    if (!supabaseUrl || !supabaseAnonKey) {
      return res.status(500).json({ error: 'Supabase env vars are not configured' });
    }

    const response = await fetch(
      `${supabaseUrl}/auth/v1/token?grant_type=password`,
      {
        method: 'POST',
        headers: {
          'apikey': supabaseAnonKey,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email, password })
      }
    );

    const data = await response.json();

    // if (data.error) return res.status(400).json({ error: data.error_description });
    if (!response.ok) {
      console.error('Login error:', data);
      return res.status(response.status).json({
        error: data.error_description || "Login failed",
      });
    }
    res.json({
      ok: true,
      access_token: data.access_token,
      refresh_token: data.refresh_token,
      user: data.user
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// --------------------------
// Logout
// --------------------------
async function logout(req, res) {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(400).json({ error: 'No token provided' });

    const { error } = await supabase.auth.admin.invalidateUserRefreshTokens(token);
    if (error) return res.status(400).json({ error: error.message });

    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

export { signup, login, logout };
