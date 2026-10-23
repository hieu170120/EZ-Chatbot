import axios from 'axios';
import { z } from 'zod';
import { apiClient, mcpHeaders } from '../config/api-client';
import type { ValidatedContext } from '../schemas/context.schema';
import type { ToolDefinition } from './index';

const inputSchema = {
  resourceId: z
    .string()
    .uuid('Must be a valid UUID')
    .describe(
      'Required UUID of the specific staff member or resource whose slot was held.',
    ),
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Must be in YYYY-MM-DD format')
    .describe('Date of the appointment in YYYY-MM-DD format.'),
  timeSlot: z
    .string()
    .regex(/^\d{2}:\d{2}$/, 'Must be in HH:MM format')
    .describe('Time slot for the appointment in HH:MM format (24-hour clock).'),
};

export const releaseHoldTool = {
  name: 'releaseHold',
  description:
    'Release a previously held booking slot if the user changes their mind and selects a different time or cancels the booking process.',
  readOnly: false,
  inputSchema,
  errorMessage: 'Unable to release held slot.',
  async execute(
    args: z.infer<z.ZodObject<typeof inputSchema>>,
    context: ValidatedContext,
  ) {
    try {
      const { data } = await apiClient.post(
        '/internal/mcp/booking/release',
        args,
        {
          headers: mcpHeaders(context),
        },
      );
      return data;
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.data?.message) {
        throw new Error(error.response.data.message);
      }
      throw error;
    }
  },
} satisfies ToolDefinition<typeof inputSchema>;
