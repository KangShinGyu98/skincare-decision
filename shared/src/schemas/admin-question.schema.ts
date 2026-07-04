import { z } from 'zod';
import { questionAnswerSchema, questionAnswerTypeSchema } from './priority-gate.schema.js';

export const adminQuestionStatusSchema = z.enum(['active', 'inactive']);

export type AdminQuestionStatus = z.infer<typeof adminQuestionStatusSchema>;

export const adminQuestionScreenSchema = z.enum(['priority_gate', 'context']);

export type AdminQuestionScreen = z.infer<typeof adminQuestionScreenSchema>;

export const adminQuestionUiSectionSchema = z.enum([
  'life_routine',
  'owned_products',
  'basic',
  'category',
]);

export type AdminQuestionUiSection = z.infer<typeof adminQuestionUiSectionSchema>;

export const adminQuestionCategorySchema = z.enum([
  'toner',
  'sunscreen',
  'serum',
  'lipcare',
  'moisturizer',
  'cleanser',
]);

export type AdminQuestionCategory = z.infer<typeof adminQuestionCategorySchema>;

export const adminQuestionsQuerySchema = z
  .object({
    screen: adminQuestionScreenSchema.optional(),
    uiSection: adminQuestionUiSectionSchema.optional(),
    category: adminQuestionCategorySchema.optional(),
    status: adminQuestionStatusSchema.optional(),
  })
  .strict();

export type AdminQuestionsQuery = z.infer<typeof adminQuestionsQuerySchema>;

export const adminQuestionParamSchema = z
  .object({
    questionVariantId: z.uuid(),
  })
  .strict();

export type AdminQuestionParam = z.infer<typeof adminQuestionParamSchema>;

export const updateAdminQuestionStatusBodySchema = z
  .object({
    status: adminQuestionStatusSchema,
  })
  .strict();

export type UpdateAdminQuestionStatusBody = z.infer<typeof updateAdminQuestionStatusBodySchema>;

export const adminQuestionTableRowSchema = z
  .object({
    id: z.uuid(),
    questionId: z.uuid(),
    question: z.string().min(1),
    questionVariant: z.string().min(1),
    answerType: questionAnswerTypeSchema,
    userOptions: z.array(questionAnswerSchema),
    visibilityConditionText: z.string().min(1),
    screen: adminQuestionScreenSchema,
    uiSection: adminQuestionUiSectionSchema,
    status: adminQuestionStatusSchema,
    memo: z.string().nullable(),
  })
  .strict();

export type AdminQuestionTableRow = z.infer<typeof adminQuestionTableRowSchema>;

export const adminQuestionsResponseSchema = z
  .object({
    items: z.array(adminQuestionTableRowSchema),
  })
  .strict();

export type AdminQuestionsResponse = z.infer<typeof adminQuestionsResponseSchema>;

export const updateAdminQuestionStatusResponseSchema = adminQuestionTableRowSchema;

export type UpdateAdminQuestionStatusResponse = z.infer<
  typeof updateAdminQuestionStatusResponseSchema
>;
