import { z } from 'zod';
import { apiClient, mcpHeaders } from '../config/api-client';
import type { ValidatedContext } from '../schemas/context.schema';
import type { ToolDefinition } from './index';

const inputSchema = {
  date: z
    .string()
    .regex(/^(\d{4}-\d{2}-\d{2})(,\s*\d{4}-\d{2}-\d{2})*$/, 'Must be in YYYY-MM-DD format')
    .describe(
      'Target date or comma-separated list of dates for fetching available booking slots (YYYY-MM-DD format).',
    ),
  resourceId: z
    .string()
    .optional()
    .describe(
      'Optional UUID or name (or comma-separated UUIDs/names) of specific staff member(s) or resource(s) to check availability for (e.g. "Sân 2" or UUID). If the customer chose a specific staff or resource, you MUST pass resourceId to filter slots for that resource only. Omit ONLY when customer chooses No Preference / Không ưu tiên.',
    ),
  serviceId: z
    .string()
    .optional()
    .describe(
      'Optional UUID or name (or comma-separated UUIDs/names) of the service(s) the customer selected.',
    ),
};

export const getAvailableSlotsTool = {
  name: 'getAvailableSlots',
  description:
    'Get available time slots for booking an appointment on a specific date. ' +
    'Call this after the customer has chosen a service and (optionally) a staff member. ' +
    'If resourceId is omitted (customer has no staff preference), each returned slot will contain ' +
    'an "availableResources" array listing all free staff members for that time. ' +
    'If resourceId is provided, only slots where that specific staff member is free are returned.',
  inputSchema,
  errorMessage: 'Unable to get available slots.',
  async execute(
    args: z.infer<z.ZodObject<typeof inputSchema>>,
    context: ValidatedContext,
  ) {
    const { data } = await apiClient.get('/internal/mcp/booking/slots', {
      headers: mcpHeaders(context),
      params: {
        date: args.date,
        resourceId: args.resourceId,
        serviceId: args.serviceId,
      },
    });
    return data;
  },
} satisfies ToolDefinition<typeof inputSchema>;
