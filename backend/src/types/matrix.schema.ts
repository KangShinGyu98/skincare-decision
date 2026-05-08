// Shared matrix module input shapes.
import { z } from 'zod';

export const matrixFilterSchema = z.object({
  filterKey: z.string().min(1),
  sourceType: z.enum(['BASIC_CONDITION', 'PERSONALIZED', 'MANUAL', 'TRACEBACK', 'CONCERN_PRESET']),
});

export const matrixFilterStateSchema = z.object({
  categoryKey: z.string().min(1),
  filters: z.array(matrixFilterSchema),
});

export type MatrixFilter = z.infer<typeof matrixFilterSchema>;
export type MatrixFilterState = z.infer<typeof matrixFilterStateSchema>;
