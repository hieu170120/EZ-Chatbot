process.env.API_BASE_URL =
  process.env.API_BASE_URL || 'http://localhost:3000/api/v1';
process.env.API_SECRET_TOKEN =
  process.env.API_SECRET_TOKEN || 'test-secret-token';

const assert = require('node:assert/strict');
const { createBookingTool } = require('../dist/tools/create-booking.tool.js');
const { cancelBookingTool } = require('../dist/tools/cancel-booking.tool.js');
const { listDocumentsTool } = require('../dist/tools/list-documents.tool.js');
const { mcpHeaders } = require('../dist/config/api-client.js');
const { z } = require('zod');

console.log('Running MCP Tools Unit Tests...');

// 1. Test readOnly annotations
assert.equal(
  createBookingTool.readOnly,
  false,
  'createBookingTool must have readOnly: false',
);
assert.equal(
  cancelBookingTool.readOnly,
  false,
  'cancelBookingTool must have readOnly: false',
);
assert.equal(
  listDocumentsTool.readOnly,
  undefined,
  'listDocumentsTool readOnly should default to undefined',
);

// 2. Test mcpHeaders utility
const mockContext = {
  rawToken: 'mock-jwt-token-123',
  siteId: '123e4567-e89b-42d3-a456-426614174000',
  conversationId: '123e4567-e89b-42d3-a456-426614174001',
  authorizedActor: { type: 'service', id: 1 },
};
const headers = mcpHeaders(mockContext);
assert.equal(
  headers['X-MCP-Context'],
  'mock-jwt-token-123',
  'mcpHeaders must map rawToken to X-MCP-Context',
);

// 3. Test createBooking Schema Resilience
const schema = z.object(createBookingTool.inputSchema);

// Test formatted phone number (spaces and hyphens)
const validPayload = {
  customerName: '  John Doe  ',
  customerEmail: '  john@example.com  ',
  phone: ' +84 901 234 567 ',
  serviceId: '123e4567-e89b-42d3-a456-426614174000',
  resourceId: '123e4567-e89b-42d3-a456-426614174002',
  date: '2026-09-01',
  timeSlot: '10:00',
};
const parsed = schema.parse(validPayload);
assert.equal(parsed.customerName, 'John Doe', 'Name should be trimmed');
assert.equal(
  parsed.customerEmail,
  'john@example.com',
  'Email should be trimmed',
);
assert.equal(
  parsed.phone,
  '+84 901 234 567',
  'Phone should be trimmed without restrictive regex',
);

// Test empty email fallback
const emptyEmailPayload = { ...validPayload, customerEmail: '' };
const parsedEmpty = schema.parse(emptyEmailPayload);
assert.equal(
  parsedEmpty.customerEmail,
  '',
  'Empty string email should be allowed',
);

// Test empty phone number rejection
assert.throws(() => {
  schema.parse({ ...validPayload, phone: '' });
}, /Phone number is required/);

// 4. Test getUserDetails Schema
const {
  getUserDetailsTool,
} = require('../dist/tools/get-user-details.tool.js');
const userDetailsSchema = z.object(getUserDetailsTool.inputSchema);

const validUserPayload = { email: '  test@example.com  ' };
const parsedUser = userDetailsSchema.parse(validUserPayload);
assert.equal(parsedUser.email, 'test@example.com', 'Email should be trimmed');

assert.throws(() => {
  userDetailsSchema.parse({ email: 'invalid-email' });
}, /Invalid email/);

console.log('✅ All MCP Tools Unit Tests Passed!');
