import { z } from 'zod';
import { productCategoryItemSchema } from './product-category.schema.js';

export const questionAnswerTypeSchema = z.enum([
  'BOOLEAN',
  'THREE_CHOICE',
  'FOUR_CHOICE',
  'FIVE_CHOICE',
  'SINGLE_CHOICE',
  'MULTI_CHOICE',
]);

export type QuestionAnswerTypeDto = z.infer<typeof questionAnswerTypeSchema>;

export const questionUiSectionSchema = z.enum(['life_routine', 'owned_products']);

export type QuestionUiSectionDto = z.infer<typeof questionUiSectionSchema>;

export const questionAnswerSchema = z
  .object({
    label: z.string().min(1),
    value: z.number().int(),
  })
  .strict();

export type QuestionAnswerDto = z.infer<typeof questionAnswerSchema>;

export const currentResponseSchema = z.array(z.number().int());

export type CurrentResponseDto = z.infer<typeof currentResponseSchema>;

export const priorityGateResultTypeSchema = z.enum([
  'STOP',
  'HOLD',
  'CAUTION',
  'PASS',
  'ROUTE_CATEGORY',
]);

export const priorityGateCtaSchema = z
  .object({
    label: z.string().min(1),
    target: z.string().min(1),
  })
  .strict();

export const priorityGatePreviewResultSchema = z
  .object({
    resultType: priorityGateResultTypeSchema,
    title: z.string().min(1),
    description: z.string().min(1),
    cta: priorityGateCtaSchema.nullable(),
    recommendCategory: productCategoryItemSchema.nullable(),
    holdCategories: z.array(productCategoryItemSchema),
  })
  .strict();

export type PriorityGatePreviewResultDto = z.infer<typeof priorityGatePreviewResultSchema>;

export const questionSchema = z
  .object({
    questionId: z.uuid(),
    questionVariantId: z.uuid(),
    key: z.string().min(1),
    title: z.string().min(1),
    answerType: questionAnswerTypeSchema,
    uiSection: questionUiSectionSchema,
    sortOrder: z.number().int(),
    answers: z.array(questionAnswerSchema),
    currentResponse: currentResponseSchema.nullable(),
  })
  .strict();

export type QuestionDto = z.infer<typeof questionSchema>;

export const questionSectionSchema = z
  .object({
    key: questionUiSectionSchema,
    questions: z.array(questionSchema),
  })
  .strict();

export type QuestionSectionDto = z.infer<typeof questionSectionSchema>;

export const priorityGateResponseSchema = z
  .object({
    sections: z.array(questionSectionSchema),
    previewResults: z.array(priorityGatePreviewResultSchema).max(3),
  })
  .strict();

export type PriorityGateResponseDto = z.infer<typeof priorityGateResponseSchema>;
export const priorityGateResponseExample = {
  sections: [
    {
      key: 'life_routine',
      questions: [
        {
          questionId: '018f0000-0000-7000-8000-000000000201',
          questionVariantId: '018f0000-0000-7000-8000-000000000101',
          key: 'life.recent_irritation',
          title: 'Recent irritation',
          answerType: 'BOOLEAN',
          uiSection: 'life_routine',
          sortOrder: 10,
          answers: [
            { label: 'No', value: 0 },
            { label: 'Yes', value: 1 },
          ],
          currentResponse: [1],
        },
      ],
    },
  ],
  previewResults: [],
} satisfies PriorityGateResponseDto;
