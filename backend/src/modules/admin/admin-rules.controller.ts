import { Controller, Get, Patch } from '@nestjs/common';
import {
  updateAdminRuleAdminNoteBodySchema,
  updateAdminRulePrioritiesBodySchema,
  adminRuleParamSchema,
  adminRulesQuerySchema,
  updateAdminRuleStatusBodySchema,
  type AdminRuleDetail,
  type AdminRuleParam,
  type AdminRulesQuery,
  type AdminRulesResponse,
  type UpdateAdminRuleAdminNoteBody,
  type UpdateAdminRuleAdminNoteResponse,
  type UpdateAdminRulePrioritiesBody,
  type UpdateAdminRulePrioritiesResponse,
  type UpdateAdminRuleStatusBody,
  type UpdateAdminRuleStatusResponse,
} from '@skincare-decision/shared/schemas';
import { Permissions } from '../../common/decorators/auth.decorator';
import { ZodBody, ZodParam, ZodQuery } from '../../common/decorators/zod-body.decorator';
import { AdminRulesService } from './admin-rules.service';

@Permissions('priority_rules:manage:any')
@Controller('/admin/rules')
export class AdminRulesController {
  constructor(private readonly service: AdminRulesService) {}

  @Get()
  findRules(@ZodQuery(adminRulesQuerySchema) query: AdminRulesQuery): Promise<AdminRulesResponse> {
    return this.service.findRules(query);
  }

  @Get(':ruleId')
  findRule(@ZodParam(adminRuleParamSchema) params: AdminRuleParam): Promise<AdminRuleDetail> {
    return this.service.findRule(params.ruleId);
  }

  @Patch('priorities')
  updatePriorities(
    @ZodBody(updateAdminRulePrioritiesBodySchema) body: UpdateAdminRulePrioritiesBody,
  ): Promise<UpdateAdminRulePrioritiesResponse> {
    return this.service.updatePriorities(body);
  }

  @Patch(':ruleId/status')
  updateStatus(
    @ZodParam(adminRuleParamSchema) params: AdminRuleParam,
    @ZodBody(updateAdminRuleStatusBodySchema) body: UpdateAdminRuleStatusBody,
  ): Promise<UpdateAdminRuleStatusResponse> {
    return this.service.updateStatus(params.ruleId, body);
  }

  @Patch(':ruleId/admin-note')
  updateAdminNote(
    @ZodParam(adminRuleParamSchema) params: AdminRuleParam,
    @ZodBody(updateAdminRuleAdminNoteBodySchema) body: UpdateAdminRuleAdminNoteBody,
  ): Promise<UpdateAdminRuleAdminNoteResponse> {
    return this.service.updateAdminNote(params.ruleId, body);
  }
}
