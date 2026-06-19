import { z } from 'zod';

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

export const currentResponseSchema = z
  .object({
    value: z.array(z.number().int()),
  })
  .strict();

export type CurrentResponseDto = z.infer<typeof currentResponseSchema>;

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
  })
  .strict();

export type PriorityGateResponseDto = z.infer<typeof priorityGateResponseSchema>;
