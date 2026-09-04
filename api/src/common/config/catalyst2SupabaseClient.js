import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import WebSocket from 'ws';

dotenv.config();

const CATALYST2_SUPABASE_URL = process.env.CATALYST2_SUPABASE_URL;
const CATALYST2_SUPABASE_SERVICE_ROLE_KEY = process.env.CATALYST2_SUPABASE_SERVICE_ROLE_KEY;

if (!CATALYST2_SUPABASE_URL || !CATALYST2_SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error('Please set CATALYST2_SUPABASE_URL and CATALYST2_SUPABASE_SERVICE_ROLE_KEY in your environment variables');
}

const catalyst2Supabase = createClient(CATALYST2_SUPABASE_URL, CATALYST2_SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
  realtime: {
    transport: WebSocket,
  },
});

export default catalyst2Supabase;
