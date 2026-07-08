import { z } from 'zod';
import {
  adminRuleConditionOperatorSchema,
  adminRuleConditionStateSchema,
} from './admin-rule.schema.js';
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
    questionId: z.uuid(),
  })
  .strict();

export type AdminQuestionParam = z.infer<typeof adminQuestionParamSchema>;

export const updateAdminQuestionStatusBodySchema = z
  .object({
    status: adminQuestionStatusSchema,
  })
  .strict();

export type UpdateAdminQuestionStatusBody = z.infer<typeof updateAdminQuestionStatusBodySchema>;

export const adminQuestionVisibilityConditionInputSchema = z
  .object({
    operator: adminRuleConditionOperatorSchema,
    value: z.number().int(),
    state: adminRuleConditionStateSchema,
  })
  .strict();

export type AdminQuestionVisibilityConditionInput = z.infer<
  typeof adminQuestionVisibilityConditionInputSchema
>;

export const adminQuestionVariantMutationSchema = z
  .object({
    id: z.uuid().optional(),
    title: z.string().trim().min(1),
    answers: z.array(z.string().trim().min(1)).min(1),
    screen: adminQuestionScreenSchema,
    uiSection: adminQuestionUiSectionSchema,
    category: adminQuestionCategorySchema.nullable().default(null),
    sort_order: z.number().int().nonnegative().default(0),
    status: adminQuestionStatusSchema,
    visibilityConditions: z.array(adminQuestionVisibilityConditionInputSchema).default([]),
  })
  .strict();

export type AdminQuestionVariantMutation = z.infer<typeof adminQuestionVariantMutationSchema>;

export const adminQuestionMutationBodySchema = z
  .object({
    question: z.string().trim().min(1).max(100),
    answerType: questionAnswerTypeSchema,
    answerValues: z.array(z.number().int()).min(1),
    status: adminQuestionStatusSchema,
    variants: z.array(adminQuestionVariantMutationSchema).min(1),
  })
  .strict();

export const createAdminQuestionBodySchema = adminQuestionMutationBodySchema;

export type CreateAdminQuestionBody = z.infer<typeof createAdminQuestionBodySchema>;

export const updateAdminQuestionBodySchema = adminQuestionMutationBodySchema;

export type UpdateAdminQuestionBody = z.infer<typeof updateAdminQuestionBodySchema>;

export const adminQuestionTableRowSchema = z
  .object({
    id: z.uuid(),
    questionId: z.uuid(),
    questionVariantId: z.uuid(),
    question: z.string().min(1),
    questionVariant: z.string().min(1),
    answerType: questionAnswerTypeSchema,
    userOptions: z.array(questionAnswerSchema),
    visibilityConditionText: z.string().min(1),
    screen: adminQuestionScreenSchema,
    uiSection: adminQuestionUiSectionSchema,
    category: adminQuestionCategorySchema.nullable(),
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

export const adminQuestionVariantDetailSchema = z
  .object({
    id: z.uuid(),
    title: z.string().min(1),
    answers: z.array(z.string()),
    screen: adminQuestionScreenSchema,
    uiSection: adminQuestionUiSectionSchema,
    sort_order: z.number().int(),
    status: adminQuestionStatusSchema,
    visibilityConditionText: z.string().min(1),
    visibilityConditions: z.array(adminQuestionVisibilityConditionInputSchema),
    category: adminQuestionCategorySchema.nullable(),
  })
  .strict();

export type AdminQuestionVariantDetail = z.infer<typeof adminQuestionVariantDetailSchema>;

export const adminQuestionDetailSchema = z
  .object({
    id: z.uuid(),
    questionId: z.uuid(),
    question: z.string().min(1),
    answerType: questionAnswerTypeSchema,
    answerValues: z.array(z.number().int()),
    status: adminQuestionStatusSchema,
    variants: z.array(adminQuestionVariantDetailSchema),
  })
  .strict();

export type AdminQuestionDetail = z.infer<typeof adminQuestionDetailSchema>;

export const createAdminQuestionResponseSchema = adminQuestionDetailSchema;

export type CreateAdminQuestionResponse = z.infer<typeof createAdminQuestionResponseSchema>;

export const updateAdminQuestionResponseSchema = adminQuestionDetailSchema;

export type UpdateAdminQuestionResponse = z.infer<typeof updateAdminQuestionResponseSchema>;

export const deleteAdminQuestionResponseSchema = z
  .object({
    id: z.uuid(),
    deleted: z.literal(true),
  })
  .strict();

export type DeleteAdminQuestionResponse = z.infer<typeof deleteAdminQuestionResponseSchema>;
