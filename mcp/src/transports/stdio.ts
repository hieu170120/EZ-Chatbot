import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { validateAccessToken } from '../config/api-client';
import { env } from '../config/env';
import { createServer } from '../server';

export const startStdio = async () => {
  if (!env.stdioAccessToken) {
    throw new Error('MCP_ACCESS_TOKEN is required when MCP_TRANSPORT=stdio');
  }

  const trustedContext = await validateAccessToken(env.stdioAccessToken);
  await createServer(trustedContext).connect(new StdioServerTransport());
};
