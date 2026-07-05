import { z } from 'zod';
import { priorityGateResultTypeSchema } from './priority-gate.schema.js';

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

export const updateAdminRuleAdminNoteBodySchema = z
  .object({
    adminNote: z.string().max(2000).nullable(),
  })
  .strict();

export type UpdateAdminRuleAdminNoteBody = z.infer<typeof updateAdminRuleAdminNoteBodySchema>;

export const updateAdminRulePriorityItemSchema = z
  .object({
    ruleId: z.uuid(),
    priority: z.number().int().nonnegative(),
  })
  .strict();

export const updateAdminRulePrioritiesBodySchema = z
  .object({
    items: z.array(updateAdminRulePriorityItemSchema).min(1),
  })
  .strict()
  .superRefine((body, context) => {
    const ruleIds = new Set<string>();
    const priorities = new Set<number>();

    for (const item of body.items) {
      if (ruleIds.has(item.ruleId)) {
        context.addIssue({
          code: 'custom',
          message: `Duplicate ruleId: ${item.ruleId}`,
          path: ['items'],
        });
      }

      if (priorities.has(item.priority)) {
        context.addIssue({
          code: 'custom',
          message: `Duplicate priority: ${item.priority}`,
          path: ['items'],
        });
      }

      ruleIds.add(item.ruleId);
      priorities.add(item.priority);
    }
  });

export type UpdateAdminRulePrioritiesBody = z.infer<typeof updateAdminRulePrioritiesBodySchema>;

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
    questionTitle: z.string().min(1),
    operator: adminRuleConditionOperatorSchema,
    decisionValues: z.array(adminRuleDecisionValueSchema),
    decisionValueText: z.string().min(1),
    state: adminRuleConditionStateSchema,
  })
  .strict();

export type AdminRuleCondition = z.infer<typeof adminRuleConditionSchema>;

export const adminRuleTableRowSchema = z
  .object({
    id: z.uuid(),
    priority: z.number().int(),
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

export const adminRuleDetailSchema = adminRuleTableRowSchema.extend({
  resultDescription: z.string().min(1),
  ctaLabel: z.string().nullable(),
  ctaTarget: z.string().nullable(),
  recommendCategory: z
    .object({
      id: z.uuid(),
      key: z.string().min(1),
      name: z.string().min(1),
    })
    .nullable(),
});

export type AdminRuleDetail = z.infer<typeof adminRuleDetailSchema>;

export const updateAdminRuleAdminNoteResponseSchema = adminRuleTableRowSchema;

export type UpdateAdminRuleAdminNoteResponse = z.infer<
  typeof updateAdminRuleAdminNoteResponseSchema
>;

export const updateAdminRulePrioritiesResponseSchema = z
  .object({
    items: z.array(adminRuleTableRowSchema),
  })
  .strict();

export type UpdateAdminRulePrioritiesResponse = z.infer<
  typeof updateAdminRulePrioritiesResponseSchema
>;
