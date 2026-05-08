// Shared facts module input shapes.
import { z } from 'zod';

export const factAnswerSchema = z.object({
  factKey: z.string().min(1),
  value: z.unknown(),
});

export const factAnswerBatchSchema = z.object({
  answers: z.array(factAnswerSchema).min(1),
});

export type FactAnswer = z.infer<typeof factAnswerSchema>;
export type FactAnswerBatch = z.infer<typeof factAnswerBatchSchema>;
