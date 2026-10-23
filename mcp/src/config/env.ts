import 'dotenv/config';

const requiredEnv = (name: 'API_BASE_URL' | 'API_SECRET_TOKEN') => {
  const value = process.env[name]?.trim();
  if (!value) {
    if (process.env.NODE_ENV === 'test') {
      return name === 'API_BASE_URL'
        ? 'http://localhost:3000/api/v1'
        : 'test-secret-token';
    }
    throw new Error(`${name} is required`);
  }
  return value;
};

const transport = process.env.MCP_TRANSPORT?.trim() || 'stdio';
if (transport !== 'stdio' && transport !== 'http') {
  throw new Error('MCP_TRANSPORT must be "stdio" or "http"');
}

const configuredPort = process.env.MCP_PORT?.trim();
if (transport === 'http' && !configuredPort) {
  throw new Error('MCP_PORT is required when MCP_TRANSPORT=http');
}

const httpPort = configuredPort ? Number(configuredPort) : undefined;
if (
  httpPort !== undefined &&
  (!Number.isSafeInteger(httpPort) || httpPort < 1 || httpPort > 65_535)
) {
  throw new Error('MCP_PORT must be an integer between 1 and 65535');
}

export const env = {
  apiBaseUrl: requiredEnv('API_BASE_URL').replace(/\/+$/, ''),
  apiSecretToken: requiredEnv('API_SECRET_TOKEN'),
  transport,
  httpHost: process.env.MCP_HOST?.trim() || '127.0.0.1',
  httpPort,
  stdioAccessToken: process.env.MCP_ACCESS_TOKEN?.trim(),
};
