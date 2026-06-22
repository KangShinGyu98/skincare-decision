import { z } from 'zod';
import { productCategoryItemSchema } from './product-category.schema.js';
import {
  currentResponseSchema,
  questionAnswerSchema,
  questionAnswerTypeSchema,
} from './priority-gate.schema.js';

export const categoryDecisionQuerySchema = z
  .object({
    category: z.string().min(1).optional(),
  })
  .strict();

export type CategoryDecisionQuery = z.infer<typeof categoryDecisionQuerySchema>;

export const categoryDecisionUiSectionSchema = z.enum(['category', 'basic']);

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

export const categoryDecisionResponseSchema = z
  .object({
    selectedCategory: productCategoryItemSchema.nullable(),
    sections: z.array(categoryDecisionSectionSchema),
  })
  .strict();

export type CategoryDecisionResponse = z.infer<typeof categoryDecisionResponseSchema>;

export const upsertCategoryDecisionResponseRequestSchema = z
  .object({
    questionId: z.uuid(),
    questionVariantId: z.uuid(),
    value: z.array(z.number().int()),
  })
  .strict();

export type UpsertCategoryDecisionResponseRequest = z.infer<
  typeof upsertCategoryDecisionResponseRequestSchema
>;

const categoryDecisionCtaSchema = z
  .object({
    label: z.string().min(1),
    target: z.string().min(1),
  })
  .strict();

const categoryDecisionPreviewResultSchema = z
  .object({
    title: z.string().min(1),
    description: z.string().min(1),
    cta: categoryDecisionCtaSchema.nullable(),
    selectedCategory: productCategoryItemSchema.nullable(),
    answeredQuestionCount: z.number().int().nonnegative(),
    totalQuestionCount: z.number().int().nonnegative(),
  })
  .strict();

export const upsertCategoryDecisionResponseResponseSchema = z
  .object({
    response: upsertCategoryDecisionResponseRequestSchema,
    previewResult: categoryDecisionPreviewResultSchema,
  })
  .strict();

export type UpsertCategoryDecisionResponseResponse = z.infer<
  typeof upsertCategoryDecisionResponseResponseSchema
>;
