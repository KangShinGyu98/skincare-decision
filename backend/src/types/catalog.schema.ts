// Shared catalog module input shapes.
import { z } from 'zod';

export const catalogQuerySchema = z.object({
  categoryKey: z.string().min(1).optional(),
  productId: z.string().uuid().optional(),
});

export type CatalogQuery = z.infer<typeof catalogQuerySchema>;
