import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { ValidatedContext } from './schemas/context.schema';
import { registerAllTools } from './tools/index';

export const createServer = (trustedContext?: ValidatedContext) => {
  const server = new McpServer({
    name: 'chatbot-mcp-server',
    version: '1.0.0',
  });
  registerAllTools(server, trustedContext);
  return server;
};
