import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import {
  type AdminRuleCondition,
  type AdminRuleDetail,
  type AdminRuleDetailCondition,
  type AdminRuleQuestionSearchItem,
  type AdminRuleQuestionSearchQuery,
  type AdminRuleQuestionSearchResponse,
  adminRuleQuestionSearchResponseSchema,
  adminRuleDetailSchema,
  type AdminRulesResponse,
  adminRulesResponseSchema,
  type AdminRuleTableRow,
  type CreateAdminRuleBody,
  type CreateAdminRuleResponse,
  createAdminRuleResponseSchema,
  type DeleteAdminRuleResponse,
  deleteAdminRuleResponseSchema,
  type UpdateAdminRuleBody,
  type UpdateAdminRuleResponse,
  updateAdminRuleResponseSchema,
  type UpdateAdminRuleSortOrderBody,
  type UpdateAdminRuleSortOrderResponse,
  updateAdminRuleSortOrderResponseSchema,
  type UpdateAdminRuleStatusBody,
  type UpdateAdminRuleStatusResponse,
  updateAdminRuleStatusResponseSchema,
} from '@skincare-decision/shared/schemas';
import {
  type AdminRuleConditionRecord,
  type AdminRuleRecord,
  type AdminRuleQuestionSearchRecord,
  AdminRulesRepository,
  InvalidAdminRuleConditionError,
  InvalidAdminRuleSortOrderError,
  type SaveAdminRuleInput,
  type AdminRuleTableRecord,
} from './admin-rules.repository';

@Injectable()
export class AdminRulesService {
  constructor(private readonly repository: AdminRulesRepository) {}

  async findRules(): Promise<AdminRulesResponse> {
    const records = await this.repository.findRules();

    return adminRulesResponseSchema.parse({
      items: records.map((record) => this.toTableRow(record)),
    });
  }

  async findRule(ruleId: string): Promise<AdminRuleDetail> {
    const record = await this.repository.findRuleById(ruleId);

    if (!record) {
      throw this.createNotFoundException();
    }

    return adminRuleDetailSchema.parse(this.toDetail(record));
  }

  async searchQuestions(
    query: AdminRuleQuestionSearchQuery,
  ): Promise<AdminRuleQuestionSearchResponse> {
    const records = await this.repository.searchQuestions(query);

    return adminRuleQuestionSearchResponseSchema.parse({
      items: records.map((record) => this.toQuestionSearchItem(record)),
    });
  }

  async createRule(body: CreateAdminRuleBody): Promise<CreateAdminRuleResponse> {
    try {
      const record = await this.repository.createRule(this.toSaveRuleInput(body));

      return createAdminRuleResponseSchema.parse(this.toDetail(record));
    } catch (error) {
      this.throwRuleMutationError(error);
    }
  }

  async updateRule(ruleId: string, body: UpdateAdminRuleBody): Promise<UpdateAdminRuleResponse> {
    try {
      const record = await this.repository.updateRule(ruleId, this.toSaveRuleInput(body));

      if (!record) {
        throw this.createNotFoundException();
      }

      return updateAdminRuleResponseSchema.parse(this.toDetail(record));
    } catch (error) {
      this.throwRuleMutationError(error);
    }
  }

  async deleteRule(ruleId: string): Promise<DeleteAdminRuleResponse> {
    const deleted = await this.repository.deleteRule(ruleId);

    if (!deleted) {
      throw this.createNotFoundException();
    }

    return deleteAdminRuleResponseSchema.parse({
      id: ruleId,
      deleted: true,
    });
  }

  async updateStatus(
    ruleId: string,
    body: UpdateAdminRuleStatusBody,
  ): Promise<UpdateAdminRuleStatusResponse> {
    const record = await this.repository.updateRuleStatus(ruleId, body.status === 'active');

    if (!record) {
      throw new NotFoundException({
        code: 'ADMIN_RULE_NOT_FOUND',
        message: 'Admin rule was not found',
      });
    }

    return updateAdminRuleStatusResponseSchema.parse(this.toTableRow(record));
  }

  async updateSortOrder(
    body: UpdateAdminRuleSortOrderBody,
  ): Promise<UpdateAdminRuleSortOrderResponse> {
    try {
      const records = await this.repository.updateRuleSortOrder(body.ruleIds);

      return updateAdminRuleSortOrderResponseSchema.parse({
        items: records.map((record) => this.toTableRow(record)),
      });
    } catch (error) {
      if (error instanceof InvalidAdminRuleSortOrderError) {
        throw new BadRequestException({
          code: 'ADMIN_RULE_SORT_ORDER_INVALID',
          message: error.message,
        });
      }

      throw error;
    }
  }

  private toTableRow(record: AdminRuleTableRecord): AdminRuleTableRow {
    return {
      id: record.id,
      sort_order: record.sortOrder,
      ruleName: record.name,
      conditions: record.conditions.map((condition) => this.toCondition(condition)),
      conclusion: record.resultTitle,
      resultType: record.resultType,
      status: record.isActive ? 'active' : 'inactive',
      adminNote: record.adminNote,
    };
  }

  private toDetail(record: AdminRuleRecord): AdminRuleDetail {
    return {
      ...this.toTableRow(record),
      name: record.name,
      resultTitle: record.resultTitle,
      conditions: record.conditions.map((condition) => this.toDetailCondition(condition)),
      resultDescription: record.resultDescription,
      ctaLabel: record.ctaLabel,
      ctaTarget: record.ctaTarget,
      cta:
        record.ctaLabel && record.ctaTarget
          ? {
              label: record.ctaLabel,
              target: record.ctaTarget,
            }
          : null,
    };
  }

  private toQuestionSearchItem(record: AdminRuleQuestionSearchRecord): AdminRuleQuestionSearchItem {
    const variant = record.variants[0];

    return {
      questionId: record.id,
      questionKey: record.key,
      answerType: record.answerType,
      answerValues: record.answerValues,
      questionVariant: variant
        ? {
            id: variant.id,
            title: variant.title,
            answers: variant.answers,
          }
        : null,
    };
  }

  private toSaveRuleInput(body: CreateAdminRuleBody | UpdateAdminRuleBody): SaveAdminRuleInput {
    return {
      name: body.name,
      isActive: body.status === 'active',
      resultType: body.resultType,
      resultTitle: body.resultTitle,
      resultDescription: body.resultDescription,
      ctaLabel: this.toNullableText(body.ctaLabel),
      ctaTarget: this.toNullableText(body.ctaTarget),
      adminNote: this.toNullableText(body.adminNote),
      conditions: body.conditions,
    };
  }

  private toNullableText(value: string | null): string | null {
    if (value === null) {
      return null;
    }

    const trimmedValue = value.trim();

    return trimmedValue.length > 0 ? trimmedValue : null;
  }

  private toCondition(condition: AdminRuleConditionRecord): AdminRuleCondition {
    const variant = condition.question.variants[0];
    const decisionValues = condition.value.map((value) => ({
      label: this.resolveDecisionLabel(condition, value),
      value,
    }));

    return {
      id: condition.id,
      questionId: condition.question.id,
      questionTitle: variant?.title ?? '',
      operator: condition.operator,
      decisionValues,
      decisionValueText:
        decisionValues.length > 0
          ? decisionValues.map((decisionValue) => decisionValue.label).join(', ')
          : '-',
      state: condition.state,
    };
  }

  private toDetailCondition(condition: AdminRuleConditionRecord): AdminRuleDetailCondition {
    const variant = condition.question.variants[0];

    return {
      ...this.toCondition(condition),
      questionKey: condition.question.key,
      questionVariant: variant
        ? {
            id: variant.id,
            title: variant.title,
            answers: variant.answers,
          }
        : null,
      value: condition.value,
    };
  }

  private resolveDecisionLabel(condition: AdminRuleConditionRecord, value: number): string {
    const variant = condition.question.variants[0];
    const answerValueIndex = condition.question.answerValues.findIndex(
      (answerValue) => answerValue === value,
    );

    if (variant && answerValueIndex >= 0) {
      const label = variant.answers[answerValueIndex];

      if (label) {
        return label;
      }
    }

    return String(value);
  }

  private createNotFoundException(): NotFoundException {
    return new NotFoundException({
      code: 'ADMIN_RULE_NOT_FOUND',
      message: 'Admin rule was not found',
    });
  }

  private throwRuleMutationError(error: unknown): never {
    if (error instanceof InvalidAdminRuleConditionError) {
      throw new BadRequestException({
        code: 'ADMIN_RULE_CONDITION_INVALID',
        message: error.message,
      });
    }

    throw error;
  }
}
