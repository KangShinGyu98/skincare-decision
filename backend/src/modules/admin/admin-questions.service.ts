import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import {
  adminQuestionDetailSchema,
  adminQuestionsResponseSchema,
  type AdminQuestionCategory,
  type AdminQuestionDetail,
  type AdminQuestionVariantDetail,
  type AdminQuestionVisibilityCondition,
  adminQuestionCategorySchema,
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
  type UpdateAdminQuestionSortOrderBody,
  type UpdateAdminQuestionSortOrderResponse,
  updateAdminQuestionSortOrderResponseSchema,
  type UpdateAdminQuestionStatusBody,
  type UpdateAdminQuestionStatusResponse,
  updateAdminQuestionStatusResponseSchema,
} from '@skincare-decision/shared/schemas';
import {
  type AdminQuestionDetailRecord,
  AdminQuestionsRepository,
  type AdminQuestionRecord,
  type AdminQuestionVariantRecord,
  type AdminQuestionVisibilityConditionRecord,
  InvalidAdminQuestionSortOrderError,
  InvalidAdminQuestionVariantError,
  type SaveAdminQuestionInput,
} from './admin-questions.repository';

@Injectable()
export class AdminQuestionsService {
  constructor(private readonly repository: AdminQuestionsRepository) {}

  async findQuestions(query: AdminQuestionsQuery): Promise<AdminQuestionsResponse> {
    const records = await this.repository.findQuestions({
      uiSection: query.uiSection,
    });

    return adminQuestionsResponseSchema.parse({
      items: records.map((record) => this.toTableRow(record)),
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

  async updateStatus(
    questionVariantId: string,
    body: UpdateAdminQuestionStatusBody,
  ): Promise<UpdateAdminQuestionStatusResponse> {
    const record = await this.repository.updateQuestionVariantStatus(
      questionVariantId,
      body.status === 'active',
    );

    if (!record) {
      throw new NotFoundException({
        code: 'ADMIN_QUESTION_VARIANT_NOT_FOUND',
        message: 'Admin question variant was not found',
      });
    }

    return updateAdminQuestionStatusResponseSchema.parse(this.toTableRow(record));
  }

  async updateSortOrder(
    body: UpdateAdminQuestionSortOrderBody,
  ): Promise<UpdateAdminQuestionSortOrderResponse> {
    try {
      const records = await this.repository.updateQuestionVariantSortOrder(body.questionVariantIds);

      return updateAdminQuestionSortOrderResponseSchema.parse({
        items: records.map((record) => this.toTableRow(record)),
      });
    } catch (error) {
      if (error instanceof InvalidAdminQuestionSortOrderError) {
        throw new BadRequestException({
          code: 'ADMIN_QUESTION_SORT_ORDER_INVALID',
          message: error.message,
        });
      }

      throw error;
    }
  }

  private toTableRow(record: AdminQuestionRecord): AdminQuestionTableRow {
    return {
      id: record.id,
      questionId: record.questionId,
      questionVariantId: record.id,
      sort_order: record.sortOrder,
      question: record.question.key,
      questionVariant: record.title,
      answerType: record.question.answerType,
      userOptions: this.toUserOptions(
        record.question.answerValues,
        record.answers,
        record.question.key,
      ),
      visibilityConditions: record.visibilityConditions.map((condition) =>
        this.toVisibilityCondition(condition),
      ),
      screen: record.screen,
      uiSection: record.uiSection,
      category: this.toCategory(record.category),
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
      visibilityConditions: variant.visibilityConditions.map((condition) =>
        this.toVisibilityCondition(condition),
      ),
      category: this.toCategory(variant.category),
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

  private toVisibilityCondition(
    condition: AdminQuestionVisibilityConditionRecord,
  ): AdminQuestionVisibilityCondition {
    return {
      questionId: condition.conditionQuestion.id,
      questionKey: condition.conditionQuestion.key,
      operator: condition.operator,
      value: condition.value,
      state: condition.state,
    };
  }

  private toCategory(category: string | null): AdminQuestionCategory | null {
    return adminQuestionCategorySchema.nullable().parse(category);
  }

  private toSaveQuestionInput(
    body: CreateAdminQuestionBody | UpdateAdminQuestionBody,
  ): SaveAdminQuestionInput {
    for (const [variantIndex, variant] of body.variants.entries()) {
      if (variant.answers.length !== body.answerCount) {
        throw new BadRequestException({
          code: 'ADMIN_QUESTION_ANSWER_COUNT_MISMATCH',
          message: 'answers length must match answerCount',
          path: ['variants', variantIndex, 'answers'],
        });
      }
    }

    return {
      key: body.question,
      answerType: body.answerType,
      answerValues: Array.from({ length: body.answerCount }, (_, index) => index),
      isActive: body.status === 'active',
      variants: body.variants.map((variant) => ({
        id: variant.id,
        title: variant.title,
        answers: variant.answers,
        screen: variant.screen,
        uiSection: variant.uiSection,
        category: variant.category,
        sortOrder: variant.sort_order,
        sortAfterQuestionVariantId: variant.sortAfterQuestionVariantId,
        isActive: variant.status === 'active',
        visibilityConditions: variant.visibilityConditions,
      })),
    };
  }
}
