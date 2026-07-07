import { z } from 'zod';
import { priorityGateResultTypeSchema, questionAnswerTypeSchema } from './priority-gate.schema.js';

export const adminRuleStatusSchema = z.enum(['active', 'inactive']);

export type AdminRuleStatus = z.infer<typeof adminRuleStatusSchema>;

export const adminRuleConditionOperatorSchema = z.enum([
  'EQ',
  'IN',
  'CONTAINS',
  'GTE',
  'LTE',
  'NEQ',
]);

export type AdminRuleConditionOperator = z.infer<typeof adminRuleConditionOperatorSchema>;

export const adminRuleConditionStateSchema = z.enum(['REQUIRED', 'EXCLUDED']);

export type AdminRuleConditionState = z.infer<typeof adminRuleConditionStateSchema>;

export const adminRulesQuerySchema = z
  .object({
    resultType: priorityGateResultTypeSchema.optional(),
    status: adminRuleStatusSchema.optional(),
  })
  .strict();

export type AdminRulesQuery = z.infer<typeof adminRulesQuerySchema>;

export const adminRuleParamSchema = z
  .object({
    ruleId: z.uuid(),
  })
  .strict();

export type AdminRuleParam = z.infer<typeof adminRuleParamSchema>;

export const updateAdminRuleStatusBodySchema = z
  .object({
    status: adminRuleStatusSchema,
  })
  .strict();

export type UpdateAdminRuleStatusBody = z.infer<typeof updateAdminRuleStatusBodySchema>;

export const updateAdminRuleSortOrderBodySchema = z
  .object({
    ruleIds: z.array(z.uuid()).min(1),
  })
  .strict();

export type UpdateAdminRuleSortOrderBody = z.infer<typeof updateAdminRuleSortOrderBodySchema>;

const nullableNonEmptyString = (maxLength: number) =>
  z.preprocess(
    (value) => (typeof value === 'string' && value.trim().length === 0 ? null : value),
    z.string().trim().min(1).max(maxLength).nullable().default(null),
  );

const nullableString = (maxLength: number) =>
  z.preprocess(
    (value) => (typeof value === 'string' && value.trim().length === 0 ? null : value),
    z.string().trim().max(maxLength).nullable().default(null),
  );

const optionalSearchStringSchema = z.preprocess(
  (value) => (typeof value === 'string' && value.trim().length === 0 ? undefined : value),
  z.string().trim().min(1).max(100).optional(),
);

export const adminRuleConditionInputSchema = z
  .object({
    questionId: z.uuid(),
    operator: adminRuleConditionOperatorSchema,
    value: z.array(z.number().int()).min(1),
    state: adminRuleConditionStateSchema,
  })
  .strict();

export type AdminRuleConditionInput = z.infer<typeof adminRuleConditionInputSchema>;

export const adminRuleMutationBodySchema = z
  .object({
    name: z.string().trim().min(1).max(200),
    status: adminRuleStatusSchema,
    resultType: priorityGateResultTypeSchema,
    resultTitle: z.string().trim().min(1),
    resultDescription: z.string().trim().min(1),
    ctaLabel: nullableNonEmptyString(100),
    ctaTarget: nullableNonEmptyString(255),
    adminNote: nullableString(2000),
    conditions: z.array(adminRuleConditionInputSchema).default([]),
  })
  .strict()
  .superRefine((body, context) => {
    if (body.ctaLabel && !body.ctaTarget) {
      context.addIssue({
        code: 'custom',
        message: 'ctaTarget is required when ctaLabel is provided',
        path: ['ctaTarget'],
      });
    }
  });

export const createAdminRuleBodySchema = adminRuleMutationBodySchema;

export type CreateAdminRuleBody = z.infer<typeof createAdminRuleBodySchema>;

export const updateAdminRuleBodySchema = adminRuleMutationBodySchema;

export type UpdateAdminRuleBody = z.infer<typeof updateAdminRuleBodySchema>;

export const adminRuleQuestionSearchQuerySchema = z
  .object({
    q: optionalSearchStringSchema,
    limit: z.coerce.number().int().min(1).max(50).default(20),
  })
  .strict();

export type AdminRuleQuestionSearchQuery = z.infer<typeof adminRuleQuestionSearchQuerySchema>;

export const adminRuleDecisionValueSchema = z
  .object({
    label: z.string().min(1),
    value: z.number().int(),
  })
  .strict();

export type AdminRuleDecisionValue = z.infer<typeof adminRuleDecisionValueSchema>;

export const adminRuleConditionSchema = z
  .object({
    id: z.uuid(),
    questionId: z.uuid(),
    questionTitle: z.string(),
    operator: adminRuleConditionOperatorSchema,
    decisionValues: z.array(adminRuleDecisionValueSchema),
    decisionValueText: z.string().min(1),
    state: adminRuleConditionStateSchema,
  })
  .strict();

export type AdminRuleCondition = z.infer<typeof adminRuleConditionSchema>;

export const adminRuleDetailQuestionVariantSchema = z
  .object({
    id: z.uuid(),
    title: z.string().min(1),
    answers: z.array(z.string()),
  })
  .strict();

export type AdminRuleDetailQuestionVariant = z.infer<typeof adminRuleDetailQuestionVariantSchema>;

export const adminRuleDetailConditionSchema = adminRuleConditionSchema.extend({
  questionKey: z.string().min(1),
  questionVariant: adminRuleDetailQuestionVariantSchema.nullable(),
  value: z.array(z.number().int()),
});

export type AdminRuleDetailCondition = z.infer<typeof adminRuleDetailConditionSchema>;

export const adminRuleQuestionSearchItemSchema = z
  .object({
    questionId: z.uuid(),
    questionKey: z.string().min(1),
    answerType: questionAnswerTypeSchema,
    answerValues: z.array(z.number().int()),
    questionVariant: adminRuleDetailQuestionVariantSchema.nullable(),
  })
  .strict();

export type AdminRuleQuestionSearchItem = z.infer<typeof adminRuleQuestionSearchItemSchema>;

export const adminRuleQuestionSearchResponseSchema = z
  .object({
    items: z.array(adminRuleQuestionSearchItemSchema),
  })
  .strict();

export type AdminRuleQuestionSearchResponse = z.infer<typeof adminRuleQuestionSearchResponseSchema>;

export const adminRuleTableRowSchema = z
  .object({
    id: z.uuid(),
    sort_order: z.number().int(),
    ruleName: z.string().min(1),
    conditions: z.array(adminRuleConditionSchema),
    conclusion: z.string().min(1),
    resultType: priorityGateResultTypeSchema,
    status: adminRuleStatusSchema,
    adminNote: z.string().nullable(),
  })
  .strict();

export type AdminRuleTableRow = z.infer<typeof adminRuleTableRowSchema>;

export const adminRulesResponseSchema = z
  .object({
    items: z.array(adminRuleTableRowSchema),
  })
  .strict();

export type AdminRulesResponse = z.infer<typeof adminRulesResponseSchema>;

export const updateAdminRuleStatusResponseSchema = adminRuleTableRowSchema;

export type UpdateAdminRuleStatusResponse = z.infer<typeof updateAdminRuleStatusResponseSchema>;

export const adminRuleCtaSchema = z
  .object({
    label: z.string().min(1),
    target: z.string().min(1),
  })
  .strict();

export type AdminRuleCta = z.infer<typeof adminRuleCtaSchema>;

export const adminRuleDetailSchema = adminRuleTableRowSchema
  .extend({
    name: z.string().min(1),
    resultTitle: z.string().min(1),
    conditions: z.array(adminRuleDetailConditionSchema),
    resultDescription: z.string().min(1),
    ctaLabel: z.string().nullable(),
    ctaTarget: z.string().nullable(),
    cta: adminRuleCtaSchema.nullable(),
  })
  .superRefine((detail, context) => {
    if (detail.ctaLabel && !detail.ctaTarget) {
      context.addIssue({
        code: 'custom',
        message: 'ctaTarget is required when ctaLabel is provided',
        path: ['ctaTarget'],
      });
    }
  });

export type AdminRuleDetail = z.infer<typeof adminRuleDetailSchema>;

export const createAdminRuleResponseSchema = adminRuleDetailSchema;

export type CreateAdminRuleResponse = z.infer<typeof createAdminRuleResponseSchema>;

export const updateAdminRuleResponseSchema = adminRuleDetailSchema;

export type UpdateAdminRuleResponse = z.infer<typeof updateAdminRuleResponseSchema>;

export const deleteAdminRuleResponseSchema = z
  .object({
    id: z.uuid(),
    deleted: z.literal(true),
  })
  .strict();

export type DeleteAdminRuleResponse = z.infer<typeof deleteAdminRuleResponseSchema>;

export const updateAdminRuleSortOrderResponseSchema = z
  .object({
    items: z.array(adminRuleTableRowSchema),
  })
  .strict();

export type UpdateAdminRuleSortOrderResponse = z.infer<
  typeof updateAdminRuleSortOrderResponseSchema
>;
