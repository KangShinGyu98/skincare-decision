// Shared entry point for product attribute validation by category.
import { z } from 'zod';

export const productCategoryKeySchema = z.enum([
  'toner',
  'sunscreen',
  'serum',
  'lipcare',
  'moisturizer',
  'cleanser',
]);

export const genericProductAttributesSchema = z.record(z.string(), z.unknown());

export const productAttributeEnvelopeSchema = z.object({
  categoryKey: productCategoryKeySchema,
  attributes: genericProductAttributesSchema,
});

export type ProductCategoryKey = z.infer<typeof productCategoryKeySchema>;
export type GenericProductAttributes = z.infer<typeof genericProductAttributesSchema>;
export type ProductAttributeEnvelope = z.infer<typeof productAttributeEnvelopeSchema>;
