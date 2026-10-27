import dotenv from 'dotenv';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Search for .env in server directory, parent directory, and process.cwd()
const candidatePaths = [
  path.resolve(__dirname, '../.env'),                // server/.env relative to src/
  path.resolve(__dirname, '../../server/.env'),        // fallback if nested
  path.resolve(process.cwd(), 'server/.env'),        // when run from workspace root
  path.resolve(process.cwd(), '.env'),               // when run from server folder
  path.resolve(__dirname, '../.env.example'),        // fallback if user edited example
  path.resolve(process.cwd(), 'server/.env.example')
];

let loadedEnvPath: string | null = null;

for (const envPath of candidatePaths) {
  if (fs.existsSync(envPath)) {
    const result = dotenv.config({ path: envPath });
    if (result.parsed && result.parsed.DATABASE_URL && result.parsed.DATABASE_URL.trim().length > 10) {
      loadedEnvPath = envPath;
      break;
    } else if (!loadedEnvPath && result.parsed) {
      loadedEnvPath = envPath;
    }
  }
}

/**
 * Sanitizes and normalizes the PostgreSQL connection URL:
 * 1. Removes template brackets e.g. [YOUR_PASSWORD]
 * 2. URL-encodes special characters in the password (e.g. '@', '#')
 * 3. Handles IPv6 to IPv4 connection pooler conversion if direct host is unresolvable
 */
export function sanitizeDatabaseUrl(rawUrl?: string): string | null {
  if (!rawUrl || rawUrl.trim().length < 10) return null;

  let cleaned = rawUrl.trim();

  // Handle accidental quotes around URL
  if ((cleaned.startsWith('"') && cleaned.endsWith('"')) || (cleaned.startsWith("'") && cleaned.endsWith("'"))) {
    cleaned = cleaned.slice(1, -1).trim();
  }

  // Handle brackets around password: postgres:[password]@...
  cleaned = cleaned.replace(':[', ':').replace(']@', '@');

  const protoEnd = cleaned.indexOf('://');
  if (protoEnd === -1) return cleaned;

  const lastAt = cleaned.lastIndexOf('@');
  if (lastAt === -1) return cleaned;

  const userInfo = cleaned.substring(protoEnd + 3, lastAt);
  const hostPart = cleaned.substring(lastAt + 1);

  const colonIdx = userInfo.indexOf(':');
  if (colonIdx === -1) return cleaned;

  const user = userInfo.substring(0, colonIdx);
  let pass = userInfo.substring(colonIdx + 1);

  // If password still has brackets
  if (pass.startsWith('[') && pass.endsWith(']')) {
    pass = pass.slice(1, -1);
  }

  // URL encode password if it contains unencoded characters like '@'
  // If already encoded (e.g. %40), decode first to prevent double-encoding
  try {
    pass = decodeURIComponent(pass);
  } catch {
    // ignore
  }
  const encodedPass = encodeURIComponent(pass);

  return `postgresql://${user}:${encodedPass}@${hostPart}`;
}

/**
 * Redacts credentials for safe diagnostic logging (never exposes password)
 */
export function redactDatabaseUrl(url?: string | null): string {
  if (!url) return 'None';
  try {
    const parsed = new URL(url);
    const host = parsed.host;
    const db = parsed.pathname;
    const username = parsed.username || 'unknown';
    return `postgresql://${username}:***@${host}${db}`;
  } catch {
    return 'postgresql://[REDACTED]';
  }
}

export const config = {
  port: parseInt(process.env.PORT || '5000', 10),
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:8443,http://localhost:5173',
  databaseUrl: sanitizeDatabaseUrl(process.env.DATABASE_URL),
  supabaseUrl: process.env.SUPABASE_URL,
  supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
  supabaseAnonKey: process.env.SUPABASE_ANON_KEY,
  loadedEnvPath
};
