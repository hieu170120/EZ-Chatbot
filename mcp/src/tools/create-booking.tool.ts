import axios from 'axios';
import { z } from 'zod';
import { apiClient, mcpHeaders } from '../config/api-client';
import type { ValidatedContext } from '../schemas/context.schema';
import type { ToolDefinition } from './index';

const inputSchema = {
  customerName: z
    .string()
    .trim()
    .min(2, 'Name is required')
    .describe('Full name of the customer booking the appointment.'),
  customerEmail: z
    .string()
    .trim()
    .email('Invalid email')
    .or(z.literal(''))
    .optional()
    .describe(
      'Optional email address of the customer for notifications and confirmations.',
    ),
  phone: z
    .string()
    .trim()
    .min(1, 'Phone number is required')
    .describe('Customer phone number.'),
  serviceId: z
    .string()
    .optional()
    .describe('Optional UUID or name of the service to be booked.'),
  serviceIds: z
    .array(z.string())
    .optional()
    .describe(
      'Optional array of service UUIDs or names when booking multiple services / slots.',
    ),
  slotCount: z
    .number()
    .int()
    .min(1)
    .optional()
    .describe('Optional number of consecutive slots to book (default 1).'),
  slots: z
    .preprocess(
      (val) => {
        if (typeof val === 'string') {
          try {
            return JSON.parse(val);
          } catch {
            return val;
          }
        }
        return val;
      },
      z
        .array(
          z.object({
            resourceId: z.string(),
            date: z.string(),
            timeSlot: z.string(),
            serviceId: z.string().optional(),
            notes: z.string().optional(),
          }),
        )
        .optional(),
    )
    .optional()
    .describe(
      'Optional list of explicit slots (can be multi-date or non-consecutive) to book.',
    ),
  resourceId: z
    .string()
    .optional()
    .describe(
      'Optional UUID or name of the specific staff member or resource (e.g. room, court, equipment, stylist) assigned to the booking.',
    ),
  notes: z
    .string()
    .optional()
    .describe(
      'Optional notes, purpose, or custom service description for the booking.',
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
  sessionId: z
    .string()
    .uuid('Must be a valid UUID')
    .optional()
    .describe(
      'Optional sessionId returned from holdSlot. ALWAYS pass this if you have called holdSlot earlier.',
    ),
};

export const createBookingTool = {
  name: 'createBooking',
  description:
    'Create a new booking/appointment. Ensure you have gathered all required details before calling this.',
  readOnly: false,
  inputSchema,
  errorMessage: 'Unable to create booking.',
  async execute(
    args: z.infer<z.ZodObject<typeof inputSchema>>,
    context: ValidatedContext,
  ) {
    try {
      const { data } = await apiClient.post(
        '/internal/mcp/booking/create',
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
