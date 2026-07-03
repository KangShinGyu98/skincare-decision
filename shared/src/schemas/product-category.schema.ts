import { z } from 'zod';

export const productCategoryItemSchema = z
  .object({
    id: z.uuid(),
    key: z.string().min(1),
    name: z.string().min(1),
    description: z.string().nullable(),
    sortOrder: z.number().int(),
  })
  .strict();

export type ProductCategoryItemDto = z.infer<typeof productCategoryItemSchema>;

export const productCategoriesResponseSchema = z
  .object({
    items: z.array(productCategoryItemSchema),
  })
  .strict();

export type ProductCategoriesResponseDto = z.infer<typeof productCategoriesResponseSchema>;
