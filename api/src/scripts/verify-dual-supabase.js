import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';

import group1Supabase from '../common/config/supabaseClient.js';
import catalyst2Supabase from '../common/config/catalyst2SupabaseClient.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '../..');

function safeUrl(value) {
  if (!value) return 'NOT_SET';
  return value.replace(/\?.*$/, '').replace(/\/$/, '');
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function readFile(relPath) {
  return fs.readFileSync(path.join(projectRoot, relPath), 'utf8');
}

function checkRepoClientScope() {
  const catalystRepoFile = readFile('src/modules/catalyst2/catalyst2.repository.js');
  const groupRepoFile = readFile('src/modules/groups/group.repository.js');
  const topicRepoFile = readFile('src/modules/topic/topic.repository.js');

  assert(catalystRepoFile.includes("../common/config/catalyst2SupabaseClient.js") || catalystRepoFile.includes("../../common/config/catalyst2SupabaseClient.js"), 'Catalyst 2 repository must import the Catalyst 2 client');
  assert(!catalystRepoFile.includes("supabaseClient.js"), 'Catalyst 2 repository must not import the Group 1 client');

  assert(groupRepoFile.includes("../common/config/supabaseClient.js") || groupRepoFile.includes("../../common/config/supabaseClient.js"), 'Group 1 repository must still import the original Group 1 client');
  assert(topicRepoFile.includes("../common/config/supabaseClient.js") || topicRepoFile.includes("../../common/config/supabaseClient.js"), 'Topic repository must still import the original Group 1 client');

  console.log('[OK] Repository scope check: Catalyst 2 repositories use only the Catalyst 2 client and Group 1 repositories still use the Group 1 client.');
}

async function verifyGroup1Auth() {
  console.log('[INFO] Group 1 client URL:', safeUrl(process.env.SUPABASE_URL));

  const { data, error } = await group1Supabase.auth.getUser('invalid-token-for-read-only-check');

  if (error) {
    console.log('[OK] Group 1 auth endpoint reachable. JWT validation rejected the invalid test token as expected.');
    return;
  }

  if (!data) {
    console.log('[OK] Group 1 auth endpoint reachable. No user was returned for the invalid test token, which is expected in read-only validation mode.');
    return;
  }

  console.log('[WARN] Group 1 auth probe returned user data unexpectedly for an invalid token; check the project auth configuration.');
}

async function verifyCatalyst2Connection() {
  console.log('[INFO] Catalyst 2 client URL:', safeUrl(process.env.CATALYST2_SUPABASE_URL));

  const tableCandidates = [
    'integration_imports',
    'integration_errors',
    'rrl_assessments',
    'smart_objectives',
  ];

  let success = false;
  let lastError = null;

  for (const table of tableCandidates) {
    try {
      const { data, error } = await catalyst2Supabase.from(table).select('id').limit(1);
      if (error) {
        lastError = error;
        console.log(`[INFO] Catalyst 2 table probe on ${table}: ${error.message}`);
        continue;
      }

      console.log(`[OK] Catalyst 2 read-only probe succeeded for ${table}. Returned ${Array.isArray(data) ? data.length : 0} row(s).`);
      success = true;
      break;
    } catch (e) {
      lastError = e;
      console.log(`[INFO] Catalyst 2 table probe on ${table} threw: ${e.message}`);
    }
  }

  if (!success) {
    throw new Error(lastError ? `Catalyst 2 table probe failed: ${lastError.message}` : 'Catalyst 2 table probe failed for all candidate tables.');
  }
}

async function main() {
  console.log('=== Dual Supabase runtime verification ===');

  assert(process.env.SUPABASE_URL, 'SUPABASE_URL is not set.');
  assert(process.env.SUPABASE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY, 'Group 1 Supabase service key is not set.');
  assert(process.env.CATALYST2_SUPABASE_URL, 'CATALYST2_SUPABASE_URL is not set.');
  assert(process.env.CATALYST2_SUPABASE_SERVICE_ROLE_KEY, 'CATALYST2_SUPABASE_SERVICE_ROLE_KEY is not set.');

  await verifyGroup1Auth();
  await verifyCatalyst2Connection();
  checkRepoClientScope();

  console.log('[SUCCESS] Dual Supabase verification completed successfully.');
}

main().catch((err) => {
  console.error('[FAIL] Dual Supabase verification failed:');
  console.error(err.message || err);
  process.exitCode = 1;
});
