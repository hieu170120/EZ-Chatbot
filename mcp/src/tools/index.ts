import axios from 'axios';
import type {
  McpServer,
  ToolCallback,
} from '@modelcontextprotocol/sdk/server/mcp.js';
import type { ShapeOutput } from '@modelcontextprotocol/sdk/server/zod-compat.js';
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';
import {
  getValidatedContext,
  type ValidatedContext,
} from '../schemas/context.schema';
import { getConversationTool } from './get-conversation.tool';
import { getSiteConfigTool } from './get-site-config.tool';
import { getUserDetailsTool } from './get-user-details.tool';
import { searchKnowledgeTool } from './search-knowledge.tool';
import { listDocumentsTool } from './list-documents.tool';
import { getAvailableSlotsTool } from './get-available-slots.tool';
import { createBookingTool } from './create-booking.tool';
import { draftBookingTool } from './draft-booking.tool';
import { cancelBookingTool } from './cancel-booking.tool';
import { holdSlotTool } from './hold-slot.tool';
import { releaseHoldTool } from './release-hold.tool';

export type ToolDefinition<Input extends z.ZodRawShape, Output = unknown> = {
  name: string;
  description: string;
  inputSchema: Input;
  errorMessage: string;
  readOnly?: boolean;
  execute(args: ShapeOutput<Input>, context: ValidatedContext): Promise<Output>;
  formatResult?(value: Output): CallToolResult;
};

const jsonResult = (value: unknown): CallToolResult => ({
  content: [{ type: 'text', text: JSON.stringify(value) ?? 'null' }],
});

const errorResult = (message: string): CallToolResult => ({
  isError: true,
  content: [{ type: 'text', text: message }],
});

export const createToolHandler = <Input extends z.ZodRawShape, Output>(
  tool: ToolDefinition<Input, Output>,
  trustedContext?: ValidatedContext,
) =>
  (async (
    args: ShapeOutput<Input>,
    extra: unknown,
  ): Promise<CallToolResult> => {
    try {
      const context = getValidatedContext(extra, trustedContext);
      console.error(
        `[MCP Tool] ${tool.name} called for Site ${context.siteId} by Actor ${context.authorizedActor.id}`,
      );
      const result = await tool.execute(args, context);
      return tool.formatResult?.(result) ?? jsonResult(result);
    } catch (error) {
      const errorMessage = axios.isAxiosError(error)
        ? (error.response?.data?.message ?? error.message)
        : error instanceof Error
          ? error.message
          : tool.errorMessage;

      console.error(`${tool.name} failed:`, errorMessage);
      return errorResult(
        typeof errorMessage === 'string'
          ? errorMessage
          : JSON.stringify(errorMessage),
      );
    }
  }) as ToolCallback<Input>;

const registerTool = <Input extends z.ZodRawShape, Output>(
  server: McpServer,
  tool: ToolDefinition<Input, Output>,
  trustedContext?: ValidatedContext,
) => {
  server.registerTool(
    tool.name,
    {
      description: tool.description,
      inputSchema: tool.inputSchema,
      annotations: {
        readOnlyHint: tool.readOnly !== false,
        destructiveHint: false,
        openWorldHint: false,
      },
    },
    createToolHandler(tool, trustedContext),
  );
};

export const registerAllTools = (
  server: McpServer,
  trustedContext?: ValidatedContext,
) => {
  const registrations = [
    () => registerTool(server, getConversationTool, trustedContext),
    () => registerTool(server, getUserDetailsTool, trustedContext),
    () => registerTool(server, getSiteConfigTool, trustedContext),
    () => registerTool(server, searchKnowledgeTool, trustedContext),
    () => registerTool(server, listDocumentsTool, trustedContext),
    () => registerTool(server, getAvailableSlotsTool, trustedContext),
    () => registerTool(server, draftBookingTool, trustedContext),
    () => registerTool(server, holdSlotTool, trustedContext),
    () => registerTool(server, releaseHoldTool, trustedContext),
    () => registerTool(server, createBookingTool, trustedContext),
    () => registerTool(server, cancelBookingTool, trustedContext),
  ];
  registrations.forEach((register) => register());
};
