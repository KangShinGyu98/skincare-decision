// Health endpoint response schema.
import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export const healthResponseSchema = z.object({
  status: z.literal('ok'),
  service: z.literal('backend'),
  timestamp: z.string().datetime(),
});

export class HealthResponseDto extends createZodDto(healthResponseSchema) {}

export type HealthResponse = z.infer<typeof healthResponseSchema>;
