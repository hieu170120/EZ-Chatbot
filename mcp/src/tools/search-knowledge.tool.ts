import { z } from 'zod';
import { apiClient, mcpHeaders } from '../config/api-client';
import type { ValidatedContext } from '../schemas/context.schema';
import type { ToolDefinition } from './index';

const inputSchema = {
  query: z
    .string()
    .trim()
    .min(1)
    .max(1_000)
    .describe(
      'Search query string or question to find relevant knowledge base content.',
    ),
  topK: z
    .number()
    .int()
    .min(1)
    .max(20)
    .optional()
    .describe(
      'Optional maximum number of top search results to return (1-20).',
    ),
};

export const searchKnowledgeTool = {
  name: 'searchKnowledge',
  description: 'Search the current site knowledge base.',
  inputSchema,
  errorMessage: 'Unable to search the knowledge base.',
  async execute(
    { query, topK }: z.infer<z.ZodObject<typeof inputSchema>>,
    context: ValidatedContext,
  ) {
    const { data } = await apiClient.post(
      '/internal/mcp/kb/search',
      { query },
      {
        headers: mcpHeaders(context),
        params: topK ? { topK } : undefined,
      },
    );
    return data;
  },
} satisfies ToolDefinition<typeof inputSchema>;
