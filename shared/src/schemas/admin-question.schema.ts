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
    uiSection: adminQuestionUiSectionSchema,
  })
  .strict();

export type AdminQuestionsQuery = z.infer<typeof adminQuestionsQuerySchema>;

export const adminQuestionParamSchema = z
  .object({
    questionId: z.uuid(),
  })
  .strict();

export type AdminQuestionParam = z.infer<typeof adminQuestionParamSchema>;

export const adminQuestionVariantParamSchema = z
  .object({
    questionVariantId: z.uuid(),
  })
  .strict();

export type AdminQuestionVariantParam = z.infer<typeof adminQuestionVariantParamSchema>;

export const updateAdminQuestionStatusBodySchema = z
  .object({
    status: adminQuestionStatusSchema,
  })
  .strict();

export type UpdateAdminQuestionStatusBody = z.infer<typeof updateAdminQuestionStatusBodySchema>;

export const updateAdminQuestionSortOrderBodySchema = z
  .object({
    questionVariantIds: z.array(z.uuid()).min(1),
  })
  .strict();

export type UpdateAdminQuestionSortOrderBody = z.infer<
  typeof updateAdminQuestionSortOrderBodySchema
>;

export const adminQuestionVisibilityConditionInputSchema = z
  .object({
    questionId: z.uuid(),
    operator: adminRuleConditionOperatorSchema,
    value: z.number().int(),
    state: adminRuleConditionStateSchema,
  })
  .strict();

export type AdminQuestionVisibilityConditionInput = z.infer<
  typeof adminQuestionVisibilityConditionInputSchema
>;

export const adminQuestionVisibilityConditionSchema = adminQuestionVisibilityConditionInputSchema
  .extend({
    questionKey: z.string().min(1),
  })
  .strict();

export type AdminQuestionVisibilityCondition = z.infer<
  typeof adminQuestionVisibilityConditionSchema
>;

export const adminQuestionVariantMutationSchema = z
  .object({
    id: z.uuid().optional(),
    title: z.string().trim().min(1),
    answers: z.array(z.string().trim().min(1)).min(1),
    screen: adminQuestionScreenSchema,
    uiSection: adminQuestionUiSectionSchema,
    category: adminQuestionCategorySchema.nullable(),
    sort_order: z.number().int().nonnegative(),
    sortAfterQuestionVariantId: z.uuid().nullable().optional(),
    status: adminQuestionStatusSchema,
    visibilityConditions: z.array(adminQuestionVisibilityConditionInputSchema),
  })
  .strict();

export type AdminQuestionVariantMutation = z.infer<typeof adminQuestionVariantMutationSchema>;

export const adminQuestionMutationBodySchema = z
  .object({
    question: z.string().trim().min(1).max(100),
    answerType: questionAnswerTypeSchema,
    answerCount: z.number().int().min(1),
    status: adminQuestionStatusSchema,
    variants: z.array(adminQuestionVariantMutationSchema).min(1),
  })
  .strict()
  .superRefine((body, context) => {
    body.variants.forEach((variant, variantIndex) => {
      if (variant.answers.length !== body.answerCount) {
        context.addIssue({
          code: 'custom',
          message: '답변 개수는 answerCount와 같아야 합니다.',
          path: ['variants', variantIndex, 'answers'],
        });
      }
    });
  });

export const createAdminQuestionBodySchema = adminQuestionMutationBodySchema;

export type CreateAdminQuestionBody = z.infer<typeof createAdminQuestionBodySchema>;

export const updateAdminQuestionBodySchema = adminQuestionMutationBodySchema;

export type UpdateAdminQuestionBody = z.infer<typeof updateAdminQuestionBodySchema>;

export const adminQuestionTableRowSchema = z
  .object({
    id: z.uuid(),
    questionId: z.uuid(),
    questionVariantId: z.uuid(),
    sort_order: z.number().int(),
    question: z.string().min(1),
    questionVariant: z.string().min(1),
    answerType: questionAnswerTypeSchema,
    userOptions: z.array(questionAnswerSchema),
    visibilityConditions: z.array(adminQuestionVisibilityConditionSchema),
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

export const updateAdminQuestionSortOrderResponseSchema = adminQuestionsResponseSchema;

export type UpdateAdminQuestionSortOrderResponse = z.infer<
  typeof updateAdminQuestionSortOrderResponseSchema
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
    visibilityConditions: z.array(adminQuestionVisibilityConditionSchema),
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
