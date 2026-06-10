import supabase from '../../common/config/supabaseClient.js';
import fetch from 'node-fetch';

async function signup(req, res) {
  try {
    const { email, password } = req.body;
    const username = email.split("@")[0];

    if (!email || !password) {
      return res.status(400).json({ error: 'Email, password required' });
    }

    console.log('Signup request received for email:', email,password);


    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true
    });

    if (authError) return res.status(400).json({ error: authError.message });

    const userId = authData.user.id;

    // console.log('Created user with ID:', userId);
    const { error: profileError } = await supabase
      .from('Profile')
      .insert([{ id: userId, username }]);

    if (profileError) return res.status(400).json({ error: profileError.message });

    res.status(201).json({ ok: true, user: { id: userId, email, username } });
  } catch (err) {
    res.status(500).json({ error: err.message });
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
