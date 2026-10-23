import axios from 'axios';
import { z } from 'zod';
import { apiClient, mcpHeaders } from '../config/api-client';
import type { ValidatedContext } from '../schemas/context.schema';
import type { ToolDefinition } from './index';

const inputSchema = {
  email: z
    .string()
    .trim()
    .email()
    .max(254)
    .describe('Email address of the user to retrieve profile details for.'),
};

export interface UserDetailsOutput {
  id?: string;
  name: string;
  email: string;
  phone: string | null;
  role: string;
  avatarUrl?: string | null;
}

export const getUserDetailsTool = {
  name: 'getUserDetails',
  description: 'Return tenant-scoped, non-sensitive user profile details.',
  inputSchema,
  errorMessage: 'Unable to retrieve user details.',
  async execute(
    { email }: z.infer<z.ZodObject<typeof inputSchema>>,
    context: ValidatedContext,
  ): Promise<UserDetailsOutput> {
    const { siteId, authorizedActor } = context;
    try {
      const { data } = await apiClient.get<UserDetailsOutput>(
        '/internal/mcp/users/by-email',
        {
          headers: mcpHeaders(context),
          params: { email, siteId, userId: authorizedActor.id },
        },
      );
      return data;
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 404) {
        return { email, name: 'Guest Visitor', role: 'VISITOR', phone: null };
      }
      throw error;
    }
  },
} satisfies ToolDefinition<typeof inputSchema, UserDetailsOutput>;
