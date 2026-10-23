import axios from 'axios';
import { ValidatedContextSchema } from '../schemas/context.schema';
import { env } from './env';

export const apiClient = axios.create({
  baseURL: env.apiBaseUrl,
  headers: {
    'X-MCP-Secret': env.apiSecretToken,
  },
  timeout: 15_000,
});

export const validateAccessToken = async (token: string) => {
  const { data } = await apiClient.post('/internal/mcp/auth/validate', {
    token,
  });
  const validated = ValidatedContextSchema.parse(data);
  validated.rawToken = token;
  return validated;
};

export const mcpHeaders = (
  context: import('../schemas/context.schema').ValidatedContext,
) => ({
  'X-MCP-Context': context.rawToken || '',
});
