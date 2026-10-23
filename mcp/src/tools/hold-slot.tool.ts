import axios from 'axios';
import { z } from 'zod';
import { apiClient, mcpHeaders } from '../config/api-client';
import type { ValidatedContext } from '../schemas/context.schema';
import type { ToolDefinition } from './index';

const inputSchema = {
  serviceId: z
    .string()
    .uuid('Must be a valid UUID')
    .optional()
    .describe('Optional UUID of the service to be booked.'),
  resourceId: z
    .string()
    .uuid('Must be a valid UUID')
    .optional()
    .describe(
      'Optional UUID of the specific staff member or resource assigned to the booking (optional if slots array is provided).',
    ),
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Must be in YYYY-MM-DD format')
    .optional()
    .describe('Date of the appointment in YYYY-MM-DD format.'),
  timeSlot: z
    .string()
    .regex(/^\d{2}:\d{2}$/, 'Must be in HH:MM format')
    .optional()
    .describe('Time slot for the appointment in HH:MM format (24-hour clock).'),
  slotCount: z
    .number()
    .int()
    .min(1)
    .optional()
    .describe('Optional number of consecutive slots to hold (default 1).'),
  slots: z
    .preprocess((val) => {
      if (typeof val === 'string') {
        try {
          return JSON.parse(val);
        } catch {
          return val;
        }
      }
      return val;
    }, z.array(
      z.object({
        resourceId: z.string(),
        date: z.string(),
        timeSlot: z.string(),
        serviceId: z.string().optional(),
      }),
    ).optional())
    .optional()
    .describe('Optional list of specific slots to hold (can be non-consecutive or across multiple dates).'),
};

export const holdSlotTool = {
  name: 'holdSlot',
  description:
    'Hold a booking slot immediately after the user selects a time, before asking for their name or phone number. This prevents others from booking the same slot. Returns a sessionId which MUST be passed to createBooking.',
  readOnly: false,
  inputSchema,
  errorMessage: 'Unable to hold slot.',
  async execute(
    args: z.infer<z.ZodObject<typeof inputSchema>>,
    context: ValidatedContext,
  ) {
    try {
      const { data } = await apiClient.post(
        '/internal/mcp/booking/hold',
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
