import { z } from 'zod';
import { priorityGateResultTypeSchema } from './priority-gate.schema.js';

export const adminRuleStatusSchema = z.enum(['active', 'inactive']);

export type AdminRuleStatus = z.infer<typeof adminRuleStatusSchema>;

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

export const adminRuleTableRowSchema = z
  .object({
    id: z.uuid(),
    ruleName: z.string().min(1),
    questions: z.array(z.string().min(1)),
    conditionText: z.string().min(1),
    conclusion: z.string().min(1),
    resultType: priorityGateResultTypeSchema,
    status: adminRuleStatusSchema,
    memo: z.string().nullable(),
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
