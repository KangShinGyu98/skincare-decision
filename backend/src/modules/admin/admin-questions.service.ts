import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import {
  adminQuestionDetailSchema,
  adminQuestionsResponseSchema,
  type AdminQuestionCategory,
  type AdminQuestionDetail,
  type AdminQuestionVariantDetail,
  type CreateAdminQuestionBody,
  type CreateAdminQuestionResponse,
  createAdminQuestionResponseSchema,
  type DeleteAdminQuestionResponse,
  deleteAdminQuestionResponseSchema,
  type AdminQuestionsQuery,
  type AdminQuestionsResponse,
  type AdminQuestionTableRow,
  type QuestionAnswerDto,
  type UpdateAdminQuestionBody,
  type UpdateAdminQuestionResponse,
  updateAdminQuestionResponseSchema,
} from '@skincare-decision/shared/schemas';
import { ConditionState } from '../../generated/prisma/enums';
import {
  type AdminQuestionDetailRecord,
  AdminQuestionsRepository,
  type AdminQuestionRecord,
  type AdminQuestionVariantRecord,
  type AdminQuestionVisibilityConditionRecord,
  type FindAdminQuestionsInput,
  InvalidAdminQuestionVariantError,
  type SaveAdminQuestionInput,
} from './admin-questions.repository';

const CATEGORY_SELECTED_VALUES = {
  toner: 1,
  sunscreen: 2,
  serum: 3,
  lipcare: 4,
  moisturizer: 5,
  cleanser: 6,
} as const satisfies Record<AdminQuestionCategory, number>;

const CATEGORY_BY_SELECTED_VALUE = new Map<number, AdminQuestionCategory>(
  Object.entries(CATEGORY_SELECTED_VALUES).map(([category, value]) => [
    value,
    category as AdminQuestionCategory,
  ]),
);

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

  async findQuestion(questionId: string): Promise<AdminQuestionDetail> {
    const record = await this.repository.findQuestionById(questionId);

    if (!record) {
      throw new NotFoundException({
        code: 'ADMIN_QUESTION_NOT_FOUND',
        message: 'Admin question was not found',
      });
    }

    return adminQuestionDetailSchema.parse(this.toDetail(record));
  }

  async createQuestion(body: CreateAdminQuestionBody): Promise<CreateAdminQuestionResponse> {
    try {
      const record = await this.repository.createQuestion(this.toSaveQuestionInput(body));

      return createAdminQuestionResponseSchema.parse(this.toDetail(record));
    } catch (error) {
      if (error instanceof InvalidAdminQuestionVariantError) {
        throw new BadRequestException({
          code: 'ADMIN_QUESTION_VARIANT_INVALID',
          message: error.message,
        });
      }

      throw error;
    }
  }

  async updateQuestion(
    questionId: string,
    body: UpdateAdminQuestionBody,
  ): Promise<UpdateAdminQuestionResponse> {
    try {
      const record = await this.repository.updateQuestion(
        questionId,
        this.toSaveQuestionInput(body),
      );

      if (!record) {
        throw new NotFoundException({
          code: 'ADMIN_QUESTION_NOT_FOUND',
          message: 'Admin question was not found',
        });
      }

      return updateAdminQuestionResponseSchema.parse(this.toDetail(record));
    } catch (error) {
      if (error instanceof InvalidAdminQuestionVariantError) {
        throw new BadRequestException({
          code: 'ADMIN_QUESTION_VARIANT_INVALID',
          message: error.message,
        });
      }

      throw error;
    }
  }

  async deleteQuestion(questionId: string): Promise<DeleteAdminQuestionResponse> {
    const deleted = await this.repository.deleteQuestion(questionId);

    if (!deleted) {
      throw new NotFoundException({
        code: 'ADMIN_QUESTION_NOT_FOUND',
        message: 'Admin question was not found',
      });
    }

    return deleteAdminQuestionResponseSchema.parse({
      id: questionId,
      deleted: true,
    });
  }

  private toTableRow(record: AdminQuestionRecord): AdminQuestionTableRow {
    return {
      id: record.questionId,
      questionId: record.questionId,
      questionVariantId: record.id,
      question: record.question.key,
      questionVariant: record.title,
      answerType: record.question.answerType,
      userOptions: this.toUserOptions(
        record.question.answerValues,
        record.answers,
        record.question.key,
      ),
      visibilityConditionText: this.formatVisibilityConditions(record),
      screen: record.screen,
      uiSection: record.uiSection,
      category: this.toCategories(record.visibilityConditions),
      status: record.isActive ? 'active' : 'inactive',
      memo: null,
    };
  }

  private toDetail(record: AdminQuestionDetailRecord): AdminQuestionDetail {
    return {
      id: record.id,
      questionId: record.id,
      question: record.key,
      answerType: record.answerType,
      answerValues: record.answerValues,
      status: record.isActive ? 'active' : 'inactive',
      variants: record.variants.map((variant) => this.toVariantDetail(variant)),
    };
  }

  private toVariantDetail(variant: AdminQuestionVariantRecord): AdminQuestionVariantDetail {
    return {
      id: variant.id,
      title: variant.title,
      answers: variant.answers,
      screen: variant.screen,
      uiSection: variant.uiSection,
      sort_order: variant.sortOrder,
      status: variant.isActive ? 'active' : 'inactive',
      visibilityConditionText: this.formatVisibilityConditions(variant),
      visibilityConditions: variant.visibilityConditions,
      category: this.toCategories(variant.visibilityConditions),
    };
  }

  private toUserOptions(
    answerValues: number[],
    answers: string[],
    questionKey: string,
  ): QuestionAnswerDto[] {
    if (answers.length !== answerValues.length) {
      throw new Error(`Question answer count mismatch: ${questionKey}`);
    }

    return answerValues.map((value, index) => {
      const label = answers[index];

      if (label === undefined) {
        throw new Error(`Missing answer label: ${questionKey}`);
      }

      return {
        label,
        value,
      };
    });
  }

  private formatVisibilityConditions(
    record: Pick<
      AdminQuestionRecord | AdminQuestionVariantRecord,
      'screen' | 'uiSection' | 'visibilityConditions'
    >,
  ): string {
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

  private toCategories(
    visibilityConditions: AdminQuestionVisibilityConditionRecord[],
  ): AdminQuestionCategory[] {
    const categories = new Set<AdminQuestionCategory>();

    for (const condition of visibilityConditions) {
      const category = CATEGORY_BY_SELECTED_VALUE.get(condition.value);

      if (category) {
        categories.add(category);
      }
    }

    return [...categories];
  }

  private toSaveQuestionInput(
    body: CreateAdminQuestionBody | UpdateAdminQuestionBody,
  ): SaveAdminQuestionInput {
    for (const [variantIndex, variant] of body.variants.entries()) {
      if (variant.answers.length !== body.answerValues.length) {
        throw new BadRequestException({
          code: 'ADMIN_QUESTION_ANSWER_COUNT_MISMATCH',
          message: 'answers length must match answerValues length',
          path: ['variants', variantIndex, 'answers'],
        });
      }
    }

    return {
      key: body.question,
      answerType: body.answerType,
      answerValues: body.answerValues,
      isActive: body.status === 'active',
      variants: body.variants.map((variant) => ({
        id: variant.id,
        title: variant.title,
        answers: variant.answers,
        screen: variant.screen,
        uiSection: variant.uiSection,
        sortOrder: variant.sort_order,
        isActive: variant.status === 'active',
        visibilityConditions: variant.visibilityConditions,
      })),
    };
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
