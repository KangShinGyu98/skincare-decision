import { Controller, Get, Patch } from '@nestjs/common';
import {
  adminRuleParamSchema,
  adminRulesQuerySchema,
  updateAdminRuleStatusBodySchema,
  type AdminRuleParam,
  type AdminRulesQuery,
  type AdminRulesResponse,
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

  @Patch(':ruleId/status')
  updateStatus(
    @ZodParam(adminRuleParamSchema) params: AdminRuleParam,
    @ZodBody(updateAdminRuleStatusBodySchema) body: UpdateAdminRuleStatusBody,
  ): Promise<UpdateAdminRuleStatusResponse> {
    return this.service.updateStatus(params.ruleId, body);
  }
}
