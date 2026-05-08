// Shared events module input shapes.
import { z } from 'zod';

export const sessionEventSchema = z.object({
  eventName: z.string().min(1),
  screen: z.string().min(1),
  payload: z.record(z.string(), z.unknown()).default({}),
});

export type SessionEventPayload = z.infer<typeof sessionEventSchema>;
