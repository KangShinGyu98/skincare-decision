// Shared traceback module input shapes.
import { z } from 'zod';

export const tracebackReportSchema = z.object({
  symptoms: z.array(z.string().min(1)).min(1),
  affectedAreas: z.array(z.string().min(1)).min(1),
  productIds: z.array(z.string().uuid()).optional(),
});

export type TracebackReport = z.infer<typeof tracebackReportSchema>;
