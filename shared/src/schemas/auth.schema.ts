import { z } from 'zod';

export const loginBodySchema = z
  .object({
    username: z.string().min(1),
    password: z.string().min(1),
  })
  .strict();

export type LoginBodyDto = z.infer<typeof loginBodySchema>;
