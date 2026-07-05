import { Injectable, NotFoundException } from '@nestjs/common';
import {
  adminRuleDetailSchema,
  adminRulesResponseSchema,
  updateAdminRuleAdminNoteResponseSchema,
  updateAdminRulePrioritiesResponseSchema,
  updateAdminRuleStatusResponseSchema,
  type AdminRuleCondition,
  type AdminRuleDetail,
  type AdminRulesQuery,
  type AdminRulesResponse,
  type AdminRuleTableRow,
  type UpdateAdminRuleAdminNoteBody,
  type UpdateAdminRuleAdminNoteResponse,
  type UpdateAdminRulePrioritiesBody,
  type UpdateAdminRulePrioritiesResponse,
  type UpdateAdminRuleStatusBody,
  type UpdateAdminRuleStatusResponse,
} from '@skincare-decision/shared/schemas';
import {
  AdminRulesRepository,
  type AdminRuleConditionRecord,
  type AdminRuleRecord,
  type FindAdminRulesInput,
} from './admin-rules.repository';

@Injectable()
export class AdminRulesService {
  constructor(private readonly repository: AdminRulesRepository) {}

  async findRules(query: AdminRulesQuery): Promise<AdminRulesResponse> {
    const filters: FindAdminRulesInput = {};

    if (query.resultType) {
      filters.resultType = query.resultType;
    }

    if (query.status) {
      filters.status = query.status;
    }

    const records = await this.repository.findRules(filters);

    return adminRulesResponseSchema.parse({
      items: records.map((record) => this.toTableRow(record)),
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

  async findRule(ruleId: string): Promise<AdminRuleDetail> {
    const record = await this.repository.findRuleById(ruleId);

    if (!record) {
      throw this.createNotFoundException();
    }

    return adminRuleDetailSchema.parse(this.toDetail(record));
  }

  async updateAdminNote(
    ruleId: string,
    body: UpdateAdminRuleAdminNoteBody,
  ): Promise<UpdateAdminRuleAdminNoteResponse> {
    const record = await this.repository.updateRuleAdminNote(
      ruleId,
      this.normalizeAdminNote(body.adminNote),
    );

    if (!record) {
      throw this.createNotFoundException();
    }

    return updateAdminRuleAdminNoteResponseSchema.parse(this.toTableRow(record));
  }

  async updatePriorities(
    body: UpdateAdminRulePrioritiesBody,
  ): Promise<UpdateAdminRulePrioritiesResponse> {
    const records = await this.repository.updateRulePriorities(body.items);

    if (!records) {
      throw this.createNotFoundException();
    }

    return updateAdminRulePrioritiesResponseSchema.parse({
      items: records.map((record) => this.toTableRow(record)),
    });
  }

  private toTableRow(record: AdminRuleRecord): AdminRuleTableRow {
    return {
      id: record.id,
      priority: record.priority,
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
      resultDescription: record.resultDescription,
      ctaLabel: record.ctaLabel,
      ctaTarget: record.ctaTarget,
      recommendCategory: record.recommendCategory,
    };
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
      questionTitle: variant?.title ?? condition.question.key,
      operator: condition.operator,
      decisionValues,
      decisionValueText:
        decisionValues.length > 0
          ? decisionValues.map((decisionValue) => decisionValue.label).join(', ')
          : '-',
      state: condition.state,
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

  private normalizeAdminNote(adminNote: string | null): string | null {
    if (adminNote === null) {
      return null;
    }

    const trimmedNote = adminNote.trim();

    return trimmedNote.length > 0 ? trimmedNote : null;
  }

  private createNotFoundException(): NotFoundException {
    return new NotFoundException({
      code: 'ADMIN_RULE_NOT_FOUND',
      message: 'Admin rule was not found',
    });
  }
}
