// No zod import needed
import { apiClient, mcpHeaders } from '../config/api-client';
import type { ValidatedContext } from '../schemas/context.schema';
import type { ToolDefinition } from './index';

const inputSchema = {};

export const listDocumentsTool = {
  name: 'listDocuments',
  description: 'List all documents in the current site knowledge base.',
  inputSchema,
  errorMessage: 'Unable to list documents.',
  async execute(_args: unknown, context: ValidatedContext) {
    const { data } = await apiClient.get('/internal/mcp/kb/documents', {
      headers: mcpHeaders(context),
    });
    return data;
  },
} satisfies ToolDefinition<typeof inputSchema>;
