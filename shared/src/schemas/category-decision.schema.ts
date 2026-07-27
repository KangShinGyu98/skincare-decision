import { z } from 'zod';
import { productCategoryItemSchema } from './product-category.schema.js';
import {
  currentResponseSchema,
  priorityGatePreviewResultSchema,
  questionAnswerSchema,
  questionAnswerTypeSchema,
} from './priority-gate.schema.js';

export const categoryDecisionQuerySchema = z
  .object({
    category: z.string().min(1).optional(),
  })
  .strict();

export type CategoryDecisionQuery = z.infer<typeof categoryDecisionQuerySchema>;

export const categoryDecisionUiSectionSchema = z.enum(['basic', 'category']);

export type CategoryDecisionUiSection = z.infer<typeof categoryDecisionUiSectionSchema>;

export const categoryDecisionQuestionSchema = z
  .object({
    questionId: z.uuid(),
    questionVariantId: z.uuid(),
    key: z.string().min(1),
    title: z.string().min(1),
    answerType: questionAnswerTypeSchema,
    uiSection: categoryDecisionUiSectionSchema,
    sortOrder: z.number().int(),
    answers: z.array(questionAnswerSchema),
    currentResponse: currentResponseSchema.nullable(),
  })
  .strict();

export type CategoryDecisionQuestion = z.infer<typeof categoryDecisionQuestionSchema>;

export const categoryDecisionSectionSchema = z
  .object({
    key: categoryDecisionUiSectionSchema,
    questions: z.array(categoryDecisionQuestionSchema),
  })
  .strict();

export type CategoryDecisionSection = z.infer<typeof categoryDecisionSectionSchema>;

// 구매 체크리스트 결론 카드는 priority gate 룰 카드를 가공 없이 재사용한다
// (docs/ContentSpec/purchase_checklist_v1.md §0.2).
export const categoryDecisionPreviewResultSchema = priorityGatePreviewResultSchema;

export type CategoryDecisionPreviewResult = z.infer<typeof categoryDecisionPreviewResultSchema>;

export const categoryDecisionResponseSchema = z
  .object({
    selectedCategory: productCategoryItemSchema.nullable(),
    sections: z.array(categoryDecisionSectionSchema),
    previewResults: z.array(categoryDecisionPreviewResultSchema),
  })
  .strict();

export type CategoryDecisionResponse = z.infer<typeof categoryDecisionResponseSchema>;

export const categoryDecisionResponseValueSchema = z
  .object({
    questionId: z.uuid(),
    value: z.array(z.number().int()),
  })
  .strict();

export type CategoryDecisionResponseValue = z.infer<typeof categoryDecisionResponseValueSchema>;

export const upsertCategoryDecisionResponsesRequestSchema = z
  .object({
    category: z.string().min(1),
    responses: z.record(z.uuid(), categoryDecisionResponseValueSchema),
  })
  .strict();

export type UpsertCategoryDecisionResponsesRequest = z.infer<
  typeof upsertCategoryDecisionResponsesRequestSchema
>;

export const upsertCategoryDecisionResponsesResponseSchema = z
  .object({
    responses: z.record(z.uuid(), categoryDecisionResponseValueSchema),
    previewResults: z.array(categoryDecisionPreviewResultSchema),
  })
  .strict();

export type UpsertCategoryDecisionResponsesResponse = z.infer<
  typeof upsertCategoryDecisionResponsesResponseSchema
>;

export const resetCategoryDecisionResponsesRequestSchema = z
  .object({
    uiSection: categoryDecisionUiSectionSchema,
  })
  .strict();

export type ResetCategoryDecisionResponsesRequest = z.infer<
  typeof resetCategoryDecisionResponsesRequestSchema
>;

export const resetCategoryDecisionResponsesResponseSchema = z
  .object({
    deletedCount: z.number().int().nonnegative(),
  })
  .strict();

export type ResetCategoryDecisionResponsesResponse = z.infer<
  typeof resetCategoryDecisionResponsesResponseSchema
>;
