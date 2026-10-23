/**
 * Plan 1.5 — JWT Test Token Generator for MCP Standalone Agent Testing
 *
 * Usage:
 *   node scripts/gen-mcp-token.js [siteId] [conversationId]
 *
 * Example:
 *   node scripts/gen-mcp-token.js aaaaaaaa-0000-0000-0000-000000000001 bbbbbbbb-0000-0000-0000-000000000001
 *
 * Output: A JWT token to use as MCP_ACCESS_TOKEN in MCP server .env
 *         and as X-MCP-Context header in manual HTTP tests.
 */

'use strict';

const { createHmac } = require('node:crypto');
const { readFileSync, existsSync } = require('node:fs');
const { resolve } = require('node:path');

// ─── Load JWT_SECRET from the backend .env (source of truth) ────────────────
const backendEnvPath = resolve(
  __dirname,
  '../../final-project-ez-chatbot-api/.env',
);

let JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  if (!existsSync(backendEnvPath)) {
    console.error(`ERROR: Could not find backend .env at: ${backendEnvPath}`);
    console.error(
      'Please set JWT_SECRET as an environment variable or verify the path.',
    );
    process.exit(1);
  }

  const envContent = readFileSync(backendEnvPath, 'utf-8');
  const match = envContent.match(/^JWT_SECRET\s*=\s*(.+)$/m);
  if (!match) {
    console.error('ERROR: JWT_SECRET not found in backend .env');
    process.exit(1);
  }
  JWT_SECRET = match[1].trim();
}

const SUB = 1; // service account ID

// ─── Args ────────────────────────────────────────────────────────────────────
const siteId = process.argv[2] ?? '19f0abf7-b56f-4fa4-9a34-f09a1dd4d773';
const conversationId =
  process.argv[3] ?? 'bbbbbbbb-0000-0000-0000-000000000001';

// ─── Minimal JWT implementation (HS256, no dependency needed) ────────────────
const b64url = (obj) => Buffer.from(JSON.stringify(obj)).toString('base64url');

const header = { alg: 'HS256', typ: 'JWT' };

const nowSec = Math.floor(Date.now() / 1000);
const payload = {
  sub: SUB,
  siteId,
  conversationId,
  iat: nowSec,
  exp: nowSec + 60 * 60 * 24 * 365, // 365 days for dev/testing
};

const signingInput = `${b64url(header)}.${b64url(payload)}`;
const sig = createHmac('sha256', JWT_SECRET)
  .update(signingInput)
  .digest('base64url');

const token = `${signingInput}.${sig}`;

// ─── Output ──────────────────────────────────────────────────────────────────
console.log('\n✅ MCP Test JWT Token Generated\n');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('TOKEN:');
console.log(token);
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('\nContext:');
console.log(`  siteId         : ${siteId}`);
console.log(`  conversationId : ${conversationId}`);
console.log(
  `  expires        : ${new Date((nowSec + 86400 * 365) * 1000).toISOString()} (365 days)`,
);
console.log('\n📋 .env for MCP server (stdio mode):');
console.log('   MCP_TRANSPORT=stdio');
console.log(`   MCP_ACCESS_TOKEN=${token}`);
console.log('\n📋 Antigravity IDE mcp_servers.json snippet:');
console.log(
  JSON.stringify(
    {
      'ez-chatbot-mcp': {
        command: 'node',
        args: [
          'd:/Zodinet/ez-chatbot-project/final-project-ez-mcp/dist/index.js',
        ],
        env: {
          MCP_TRANSPORT: 'stdio',
          MCP_ACCESS_TOKEN: token,
          API_BASE_URL: 'http://localhost:3000',
          API_SECRET_TOKEN: 'your-API-secret-token',
        },
      },
    },
    null,
    2,
  ),
);
console.log('');
