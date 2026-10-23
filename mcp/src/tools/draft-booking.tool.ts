import { z } from 'zod';
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
    .describe(
      'Optional UUID or name of the service to be booked (omit if site has no services).',
    ),
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
    .describe('Optional number of slots to book (default 1).'),
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
            resourceId: z.string().optional(),
            date: z.string().optional(),
            timeSlot: z.string().optional(),
            serviceId: z.string().optional(),
            notes: z.string().optional(),
          }),
        )
        .optional(),
    )
    .optional()
    .describe(
      'Optional list of specific slots (can span multiple dates or non-consecutive times) in the booking.',
    ),
  resourceId: z
    .string()
    .optional()
    .describe(
      'Optional UUID of the specific staff member or resource assigned to the booking (can be in slots array).',
    ),
  notes: z
    .string()
    .optional()
    .describe('Optional general notes or special requests for the booking.'),
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
};

export const draftBookingTool = {
  name: 'draftBooking',
  description:
    'Prepare a draft booking summary for the visitor to review and confirm on the UI. Call this once all booking details (service, staff, date, time, name, phone, email) have been collected.',
  readOnly: true,
  inputSchema,
  errorMessage: 'Unable to prepare draft booking.',
  async execute(args: z.infer<z.ZodObject<typeof inputSchema>>) {
    return {
      success: true,
      draftReady: true,
      draft: args,
      message:
        'The draft booking summary has been displayed on the customer widget for review and confirmation.',
    };
  },
} satisfies ToolDefinition<typeof inputSchema>;
