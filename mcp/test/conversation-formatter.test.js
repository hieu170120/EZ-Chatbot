process.env.API_BASE_URL =
  process.env.API_BASE_URL || 'http://localhost:3000/api/v1';
process.env.API_SECRET_TOKEN =
  process.env.API_SECRET_TOKEN || 'test-secret-token';

const assert = require('node:assert/strict');
const {
  buildConversationResult,
} = require('../dist/lib/conversation-formatter.js');

const result = buildConversationResult({
  summary: 's'.repeat(10_000),
  messages: Array.from({ length: 12 }, (_, index) => ({
    role: 'assistant',
    timestamp: 'invalid',
    content: `${index}`.repeat(1_000),
  })),
});
const payload = JSON.parse(result.content[0].text);

assert.ok(result.content[0].text.length <= 7_000);
assert.equal(payload.messages.length, 10);
assert.ok(payload.messages.every(({ content }) => content.length <= 500));
