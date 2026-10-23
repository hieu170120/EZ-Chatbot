import { apiClient, mcpHeaders } from '../config/api-client';
import {
  buildConversationResult,
  type ConversationRecord,
} from '../lib/conversation-formatter';
import type { ValidatedContext } from '../schemas/context.schema';
import type { ToolDefinition } from './index';

export const getConversationTool = {
  name: 'getConversationContext',
  description: 'Return the current tenant-scoped conversation context.',
  inputSchema: {},
  errorMessage: 'Unable to retrieve conversation context.',
  formatResult: buildConversationResult,
  async execute(_args: Record<string, never>, context: ValidatedContext) {
    const { conversationId, siteId, authorizedActor } = context;
    const { data } = await apiClient.get<ConversationRecord>(
      `/internal/mcp/conversations/${conversationId}`,
      {
        headers: mcpHeaders(context),
        params: { siteId, userId: authorizedActor.id },
      },
    );
    return data;
  },
} satisfies ToolDefinition<Record<string, never>, ConversationRecord>;
