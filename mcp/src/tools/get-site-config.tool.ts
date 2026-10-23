import { apiClient, mcpHeaders } from '../config/api-client';
import type { ValidatedContext } from '../schemas/context.schema';
import type { ToolDefinition } from './index';

export const getSiteConfigTool = {
  name: 'getSiteConfig',
  description:
    'Return the current site settings, booking services, staff/resources, and booking hours used to render booking chips.',
  inputSchema: {},
  errorMessage: 'Unable to retrieve site configuration.',
  async execute(_args: Record<string, never>, context: ValidatedContext) {
    const { siteId, authorizedActor } = context;
    const { data } = await apiClient.get(
      `/internal/mcp/sites/${siteId}/settings`,
      {
        headers: mcpHeaders(context),
        params: { userId: authorizedActor.id },
      },
    );
    return data;
  },
} satisfies ToolDefinition<Record<string, never>>;
