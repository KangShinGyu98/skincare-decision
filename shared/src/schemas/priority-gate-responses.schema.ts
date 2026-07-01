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

export const priorityGateResponseValueSchema = z
  .object({
    questionId: z.uuid(),
    value: z.array(z.number().int()),
  })
  .strict();

export type PriorityGateResponseValue = z.infer<typeof priorityGateResponseValueSchema>;

export const upsertPriorityGateResponsesRequestSchema = z
  .object({
    responses: z.record(z.uuid(), priorityGateResponseValueSchema),
  })
  .strict();

export type UpsertPriorityGateResponsesRequest = z.infer<
  typeof upsertPriorityGateResponsesRequestSchema
>;

export const upsertPriorityGateResponsesResponseSchema = z
  .object({
    responses: z.record(z.uuid(), priorityGateResponseValueSchema),
    previewResults: z.array(previewResultSchema).min(1).max(3),
  })
  .strict();

export type UpsertPriorityGateResponsesResponse = z.infer<
  typeof upsertPriorityGateResponsesResponseSchema
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
