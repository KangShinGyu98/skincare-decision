import { Injectable, NotFoundException } from '@nestjs/common';
import {
  adminRulesResponseSchema,
  updateAdminRuleStatusResponseSchema,
  type AdminRulesQuery,
  type AdminRulesResponse,
  type AdminRuleTableRow,
  type UpdateAdminRuleStatusBody,
  type UpdateAdminRuleStatusResponse,
} from '@skincare-decision/shared/schemas';
import { ConditionState, QuestionAnswerType } from '../../generated/prisma/enums';
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

  private toTableRow(record: AdminRuleRecord): AdminRuleTableRow {
    const questions = this.unique(record.conditions.map((condition) => condition.question.key));

    return {
      id: record.id,
      ruleName: record.name,
      questions,
      conditionText: this.formatConditions(record.conditions),
      conclusion: record.resultTitle,
      resultType: record.resultType,
      status: record.isActive ? 'active' : 'inactive',
      memo: null,
    };
  }

  private formatConditions(conditions: AdminRuleConditionRecord[]): string {
    if (conditions.length === 0) {
      return 'fallback';
    }

    return conditions
      .map((condition) => {
        const expression = `${condition.question.key} ${condition.operator} ${this.formatValue(
          condition,
        )}`;

        if (condition.state === ConditionState.EXCLUDED) {
          return `NOT (${expression})`;
        }

        return expression;
      })
      .join(' AND ');
  }

  private formatValue(condition: AdminRuleConditionRecord): string {
    const values = condition.value.map((value) =>
      condition.question.answerType === QuestionAnswerType.BOOLEAN
        ? this.formatBooleanValue(value)
        : String(value),
    );

    if (values.length === 1 && condition.operator !== 'IN') {
      return values[0]!;
    }

    return `[${values.join(', ')}]`;
  }

  private formatBooleanValue(value: number): string {
    if (value === 1) {
      return 'true';
    }

    if (value === 0) {
      return 'false';
    }

    return String(value);
  }

  private unique(values: string[]): string[] {
    return [...new Set(values)];
  }
}
