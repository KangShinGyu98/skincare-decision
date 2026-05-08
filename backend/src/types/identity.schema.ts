// Shared identity module input shapes.
import { z } from 'zod';

export const identityContextSchema = z.object({
  deviceId: z.string().uuid(),
  sessionId: z.string().uuid().optional(),
  userId: z.string().uuid().optional(),
});

export type IdentityContext = z.infer<typeof identityContextSchema>;
