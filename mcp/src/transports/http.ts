import type { Server as HttpServer } from 'node:http';
import { requireBearerAuth } from '@modelcontextprotocol/sdk/server/auth/middleware/bearerAuth.js';
import type { OAuthTokenVerifier } from '@modelcontextprotocol/sdk/server/auth/provider.js';
import { createMcpExpressApp } from '@modelcontextprotocol/sdk/server/express.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import type { Request, Response } from 'express';
import { validateAccessToken } from '../config/api-client';
import { env } from '../config/env';
import { createServer } from '../server';

const MCP_HTTP_PATH = '/mcp';
const MCP_SCOPE = 'mcp:tools';

const tokenVerifier: OAuthTokenVerifier = {
  async verifyAccessToken(token) {
    const validatedContext = await validateAccessToken(token);
    return {
      token,
      clientId: String(validatedContext.authorizedActor.id),
      scopes: [MCP_SCOPE],
      expiresAt: validatedContext.expiresAt,
      extra: { validatedContext },
    };
  },
};

const methodNotAllowed = (_request: Request, response: Response) => {
  response.status(405).json({
    jsonrpc: '2.0',
    error: { code: -32_000, message: 'Method not allowed.' },
    id: null,
  });
};

export const startHttp = async (): Promise<HttpServer> => {
  const httpPort = env.httpPort;
  if (!httpPort) {
    throw new Error('MCP_PORT is required when MCP_TRANSPORT=http');
  }

  const app = createMcpExpressApp({ host: env.httpHost });
  app.get('/health', (_request: Request, response: Response) => {
    response
      .status(200)
      .json({ status: 'ok', timestamp: new Date().toISOString() });
  });
  app.use(
    MCP_HTTP_PATH,
    requireBearerAuth({
      verifier: tokenVerifier,
      requiredScopes: [MCP_SCOPE],
    }),
  );
  app.post(MCP_HTTP_PATH, async (request: Request, response: Response) => {
    const server = createServer();
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: undefined,
      enableJsonResponse: true,
    });

    response.on('close', () => {
      void transport.close();
      void server.close();
    });

    try {
      await server.connect(transport);
      await transport.handleRequest(request, response, request.body);
    } catch (error) {
      console.error('MCP HTTP request failed:', error);
      if (!response.headersSent) {
        response.status(500).json({
          jsonrpc: '2.0',
          error: { code: -32_603, message: 'Internal server error.' },
          id: null,
        });
      }
    }
  });
  app.get(MCP_HTTP_PATH, methodNotAllowed);
  app.delete(MCP_HTTP_PATH, methodNotAllowed);

  return new Promise((resolve, reject) => {
    const httpServer = app.listen(httpPort, env.httpHost, () => {
      console.error(
        `MCP Streamable HTTP listening at http://${env.httpHost}:${httpPort}${MCP_HTTP_PATH}`,
      );
      resolve(httpServer);
    });
    httpServer.once('error', reject);
  });
};
