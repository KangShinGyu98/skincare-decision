import { Injectable, NotFoundException } from '@nestjs/common';
import {
  adminQuestionsResponseSchema,
  updateAdminQuestionStatusResponseSchema,
  type AdminQuestionCategory,
  type AdminQuestionsQuery,
  type AdminQuestionsResponse,
  type AdminQuestionTableRow,
  type QuestionAnswerDto,
  type UpdateAdminQuestionStatusBody,
  type UpdateAdminQuestionStatusResponse,
} from '@skincare-decision/shared/schemas';
import { ConditionState } from '../../generated/prisma/enums';
import {
  AdminQuestionsRepository,
  type AdminQuestionRecord,
  type AdminQuestionVisibilityConditionRecord,
  type FindAdminQuestionsInput,
} from './admin-questions.repository';

const CATEGORY_SELECTED_VALUES = {
  toner: 1,
  sunscreen: 2,
  serum: 3,
  lipcare: 4,
  moisturizer: 5,
  cleanser: 6,
} as const satisfies Record<AdminQuestionCategory, number>;

@Injectable()
export class AdminQuestionsService {
  constructor(private readonly repository: AdminQuestionsRepository) {}

  async findQuestions(query: AdminQuestionsQuery): Promise<AdminQuestionsResponse> {
    const filters: FindAdminQuestionsInput = {};

    if (query.screen) {
      filters.screen = query.screen;
    }

    if (query.uiSection) {
      filters.uiSection = query.uiSection;
    }

    if (query.status) {
      filters.status = query.status;
    }

    const records = await this.repository.findQuestions(filters);
    const filteredRecords = query.category
      ? records.filter((record) => this.matchesCategoryFilter(record, query.category!))
      : records;

    return adminQuestionsResponseSchema.parse({
      items: filteredRecords.map((record) => this.toTableRow(record)),
    });
  }

  async updateStatus(
    questionVariantId: string,
    body: UpdateAdminQuestionStatusBody,
  ): Promise<UpdateAdminQuestionStatusResponse> {
    const record = await this.repository.updateQuestionStatus(
      questionVariantId,
      body.status === 'active',
    );

    if (!record) {
      throw new NotFoundException({
        code: 'ADMIN_QUESTION_NOT_FOUND',
        message: 'Admin question variant was not found',
      });
    }

    return updateAdminQuestionStatusResponseSchema.parse(this.toTableRow(record));
  }

  private toTableRow(record: AdminQuestionRecord): AdminQuestionTableRow {
    return {
      id: record.id,
      questionId: record.questionId,
      question: record.question.key,
      questionVariant: record.title,
      answerType: record.question.answerType,
      userOptions: this.toUserOptions(record),
      visibilityConditionText: this.formatVisibilityConditions(record),
      screen: record.screen,
      uiSection: record.uiSection,
      status: record.isActive ? 'active' : 'inactive',
      memo: null,
    };
  }

  private toUserOptions(record: AdminQuestionRecord): QuestionAnswerDto[] {
    if (record.answers.length !== record.question.answerValues.length) {
      throw new Error(`Question answer count mismatch: ${record.question.key}`);
    }

    return record.question.answerValues.map((value, index) => {
      const label = record.answers[index];

      if (label === undefined) {
        throw new Error(`Missing answer label: ${record.question.key}`);
      }

      return {
        label,
        value,
      };
    });
  }

  private formatVisibilityConditions(record: AdminQuestionRecord): string {
    const baseConditions = [`screen EQ ${record.screen}`, `ui_section EQ ${record.uiSection}`];

    if (record.visibilityConditions.length === 0) {
      return baseConditions.join(' AND ');
    }

    return [
      ...baseConditions,
      ...record.visibilityConditions.map((condition) => this.formatVisibilityCondition(condition)),
    ].join(' AND ');
  }

  private formatVisibilityCondition(condition: AdminQuestionVisibilityConditionRecord): string {
    const expression = `visibility_condition ${condition.operator} ${this.formatVisibilityValue(
      condition,
    )}`;

    if (condition.state === ConditionState.EXCLUDED) {
      return `NOT (${expression})`;
    }

    return expression;
  }

  private formatVisibilityValue(condition: AdminQuestionVisibilityConditionRecord): string {
    if (condition.operator === 'IN') {
      return `[${condition.value}]`;
    }

    return String(condition.value);
  }

  private matchesCategoryFilter(
    record: AdminQuestionRecord,
    category: AdminQuestionCategory,
  ): boolean {
    if (record.visibilityConditions.length === 0) {
      return true;
    }

    const categoryValue = CATEGORY_SELECTED_VALUES[category];
    const excludedConditions = record.visibilityConditions.filter(
      (condition) => condition.state === ConditionState.EXCLUDED,
    );

    if (
      excludedConditions.some((condition) =>
        this.matchesCategoryCondition(condition, categoryValue),
      )
    ) {
      return false;
    }

    const requiredConditions = record.visibilityConditions.filter(
      (condition) => condition.state === ConditionState.REQUIRED,
    );

    if (requiredConditions.length === 0) {
      return true;
    }

    return requiredConditions.some((condition) =>
      this.matchesCategoryCondition(condition, categoryValue),
    );
  }

  private matchesCategoryCondition(
    condition: AdminQuestionVisibilityConditionRecord,
    categoryValue: number,
  ): boolean {
    switch (condition.operator) {
      case 'EQ':
      case 'IN':
      case 'CONTAINS':
        return condition.value === categoryValue;
      case 'NEQ':
        return condition.value !== categoryValue;
      case 'GTE':
        return categoryValue >= condition.value;
      case 'LTE':
        return categoryValue <= condition.value;
      default:
        return false;
    }
  }
}
