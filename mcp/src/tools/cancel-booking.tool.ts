import axios from 'axios';
import { z } from 'zod';
import { apiClient, mcpHeaders } from '../config/api-client';
import type { ValidatedContext } from '../schemas/context.schema';
import type { ToolDefinition } from './index';

const inputSchema = {
  bookingCode: z
    .string()
    .min(1, 'Booking code is required')
    .describe('Unique confirmation code of the booking to cancel.'),
};

export const cancelBookingTool = {
  name: 'cancelBooking',
  description: 'Cancel an existing booking using its booking code.',
  readOnly: false,
  inputSchema,
  errorMessage: 'Unable to cancel booking.',
  async execute(
    args: z.infer<z.ZodObject<typeof inputSchema>>,
    context: ValidatedContext,
  ) {
    try {
      const { data } = await apiClient.post(
        '/internal/mcp/booking/cancel',
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
