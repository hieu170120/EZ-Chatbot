import { z } from 'zod';

export const ValidatedContextSchema = z
  .object({
    authorizedActor: z.object({
      type: z.literal('service'),
      id: z.number().int().positive(),
    }),
    siteId: z.string(), // changed to string to match backend UUID
    conversationId: z.string(), // changed to string to match backend UUID
    expiresAt: z.number().int().positive().optional(),
    rawToken: z.string().optional(),
  })
  .strict();

export type ValidatedContext = z.infer<typeof ValidatedContextSchema>;

export const ToolContextSchema = z.object({
  authInfo: z.object({
    extra: z.object({
      validatedContext: ValidatedContextSchema,
    }),
  }),
});

export const getValidatedContext = (
  extra: unknown,
  trustedContext?: ValidatedContext,
) =>
  trustedContext ??
  ToolContextSchema.parse(extra).authInfo.extra.validatedContext;
