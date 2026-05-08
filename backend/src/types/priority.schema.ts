// Shared priority module input shapes.
import { z } from 'zod';

export const priorityEvaluationSchema = z.object({
  sessionId: z.string().uuid().optional(),
  facts: z.record(z.string(), z.unknown()).default({}),
});

export type PriorityEvaluation = z.infer<typeof priorityEvaluationSchema>;
