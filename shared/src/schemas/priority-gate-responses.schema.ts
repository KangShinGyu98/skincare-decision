import { z } from 'zod';
import {
  priorityGatePreviewResultSchema,
  questionUiSectionSchema,
} from './priority-gate.schema.js';

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
    previewResults: z.array(priorityGatePreviewResultSchema).min(1),
  })
  .strict();

export type UpsertPriorityGateResponsesResponse = z.infer<
  typeof upsertPriorityGateResponsesResponseSchema
>;

export const resetPriorityGateResponsesRequestSchema = z
  .object({
    uiSection: questionUiSectionSchema,
  })
  .strict();

export type ResetPriorityGateResponsesRequest = z.infer<
  typeof resetPriorityGateResponsesRequestSchema
>;

export const resetPriorityGateResponsesResponseSchema = z
  .object({
    deletedCount: z.number().int().nonnegative(),
  })
  .strict();

export type ResetPriorityGateResponsesResponse = z.infer<
  typeof resetPriorityGateResponsesResponseSchema
>;

export const createPriorityGateSnapshotResponseSchema = z
  .object({
    decisionRunId: z.string().min(1),
    previewResult: priorityGatePreviewResultSchema,
  })
  .strict();

export type CreatePriorityGateSnapshotResponse = z.infer<
  typeof createPriorityGateSnapshotResponseSchema
>;
