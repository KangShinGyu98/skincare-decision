import { Controller, Delete, Get, Patch, Post, Put } from '@nestjs/common';
import {
  type AdminRuleDetail,
  type AdminRuleParam,
  adminRuleParamSchema,
  type AdminRuleQuestionSearchQuery,
  adminRuleQuestionSearchQuerySchema,
  type AdminRuleQuestionSearchResponse,
  type AdminRulesResponse,
  type CreateAdminRuleBody,
  createAdminRuleBodySchema,
  type CreateAdminRuleResponse,
  type DeleteAdminRuleResponse,
  type UpdateAdminRuleBody,
  updateAdminRuleBodySchema,
  type UpdateAdminRuleResponse,
  type UpdateAdminRuleSortOrderBody,
  updateAdminRuleSortOrderBodySchema,
  type UpdateAdminRuleSortOrderResponse,
  type UpdateAdminRuleStatusBody,
  updateAdminRuleStatusBodySchema,
  type UpdateAdminRuleStatusResponse,
} from '@skincare-decision/shared/schemas';
import { ZodBody, ZodParam, ZodQuery } from '../../common/decorators/zod-body.decorator';
import { AdminRulesService } from './admin-rules.service';

@Controller('/admin/rules')
export class AdminRulesController {
  constructor(private readonly service: AdminRulesService) {}

  @Get()
  findRules(): Promise<AdminRulesResponse> {
    return this.service.findRules();
  }

  @Get('questions')
  searchQuestions(
    @ZodQuery(adminRuleQuestionSearchQuerySchema) query: AdminRuleQuestionSearchQuery,
  ): Promise<AdminRuleQuestionSearchResponse> {
    return this.service.searchQuestions(query);
  }

  @Post()
  createRule(
    @ZodBody(createAdminRuleBodySchema) body: CreateAdminRuleBody,
  ): Promise<CreateAdminRuleResponse> {
    return this.service.createRule(body);
  }

  @Get(':ruleId')
  findRule(@ZodParam(adminRuleParamSchema) params: AdminRuleParam): Promise<AdminRuleDetail> {
    return this.service.findRule(params.ruleId);
  }

  @Patch('sort_order')
  updateSortOrder(
    @ZodBody(updateAdminRuleSortOrderBodySchema) body: UpdateAdminRuleSortOrderBody,
  ): Promise<UpdateAdminRuleSortOrderResponse> {
    return this.service.updateSortOrder(body);
  }

  @Patch(':ruleId/status')
  updateStatus(
    @ZodParam(adminRuleParamSchema) params: AdminRuleParam,
    @ZodBody(updateAdminRuleStatusBodySchema) body: UpdateAdminRuleStatusBody,
  ): Promise<UpdateAdminRuleStatusResponse> {
    return this.service.updateStatus(params.ruleId, body);
  }

  @Put(':ruleId')
  updateRule(
    @ZodParam(adminRuleParamSchema) params: AdminRuleParam,
    @ZodBody(updateAdminRuleBodySchema) body: UpdateAdminRuleBody,
  ): Promise<UpdateAdminRuleResponse> {
    return this.service.updateRule(params.ruleId, body);
  }

  @Delete(':ruleId')
  deleteRule(
    @ZodParam(adminRuleParamSchema) params: AdminRuleParam,
  ): Promise<DeleteAdminRuleResponse> {
    return this.service.deleteRule(params.ruleId);
  }
}
