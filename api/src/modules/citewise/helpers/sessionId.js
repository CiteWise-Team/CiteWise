import crypto from 'crypto';

// A CiteWise session used to be a crypto.randomUUID() minted in the browser and
// kept only in that browser's localStorage, while the documents themselves live
// on the server keyed by that id. Clearing site data, or simply signing in on a
// second machine, left every uploaded paper stranded.
//
// Deriving the id from the user and the workspace makes it the same everywhere
// the account is used. It runs on the server with a secret so it stays
// unguessable: knowing someone's user id and workspace id is not enough to read
// their documents.

function secret() {
  return process.env.SESSION_ID_SECRET
    || process.env.SUPABASE_SERVICE_ROLE_KEY
    || process.env.SUPABASE_KEY
    || 'citewise-insecure-development-secret';
}

/** Stable, v4-shaped session id for one user in one workspace. */
export function deriveSessionId(userId, groupId) {
  if (!userId || !groupId) return null;

  const digest = crypto
    .createHmac('sha256', secret())
    .update(`${userId}:${groupId}`)
    .digest();

  const bytes = Buffer.from(digest.subarray(0, 16));
  bytes[6] = (bytes[6] & 0x0f) | 0x40; // version 4
  bytes[8] = (bytes[8] & 0x3f) | 0x80; // RFC 4122 variant

  const hex = bytes.toString('hex');
  return [
    hex.slice(0, 8),
    hex.slice(8, 12),
    hex.slice(12, 16),
    hex.slice(16, 20),
    hex.slice(20),
  ].join('-');
}
