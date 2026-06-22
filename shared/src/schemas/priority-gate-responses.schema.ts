import { z } from 'zod';
import { productCategoryItemSchema } from './product-category.schema.js';

const resultTypeSchema = z.enum(['STOP', 'HOLD', 'CAUTION', 'PASS', 'ROUTE_CATEGORY']);

const ctaSchema = z
  .object({
    label: z.string().min(1),
    target: z.string().min(1),
  })
  .strict();

const previewResultSchema = z
  .object({
    resultType: resultTypeSchema,
    title: z.string().min(1),
    description: z.string().min(1),
    cta: ctaSchema.nullable(),
    recommendCategory: productCategoryItemSchema.nullable(),
    holdCategories: z.array(productCategoryItemSchema),
  })
  .strict();

export const upsertPriorityGateResponseRequestSchema = z
  .object({
    questionId: z.uuid(),
    questionVariantId: z.uuid(),
    value: z.array(z.number().int()),
  })
  .strict();

export type UpsertPriorityGateResponseRequest = z.infer<
  typeof upsertPriorityGateResponseRequestSchema
>;

export const upsertPriorityGateResponseResponseSchema = z
  .object({
    response: upsertPriorityGateResponseRequestSchema,
    previewResult: previewResultSchema,
  })
  .strict();

export type UpsertPriorityGateResponseResponse = z.infer<
  typeof upsertPriorityGateResponseResponseSchema
>;

export const createPriorityGateSnapshotResponseSchema = z
  .object({
    decisionRunId: z.string().min(1),
    previewResult: previewResultSchema,
  })
  .strict();

export type CreatePriorityGateSnapshotResponse = z.infer<
  typeof createPriorityGateSnapshotResponseSchema
>;
