import { Injectable, NotFoundException } from '@nestjs/common';
import {
  categoryDecisionResponseSchema,
  categoryDecisionUiSectionSchema,
  questionAnswerTypeSchema,
  type CategoryDecisionPreviewResult,
  type CategoryDecisionQuestion,
  type CategoryDecisionResponse,
  type CategoryDecisionSection,
  type CategoryDecisionUiSection,
  type ProductCategoryItemDto,
  type QuestionAnswerDto,
  type ResetCategoryDecisionResponsesResponse,
  type UpsertCategoryDecisionResponsesRequest,
  type UpsertCategoryDecisionResponsesResponse,
  resetCategoryDecisionResponsesResponseSchema,
  upsertCategoryDecisionResponsesResponseSchema,
} from '@skincare-decision/shared/schemas';
import { UserResponseSource } from '../../generated/prisma/enums';
import { UserResponsesService } from '../user-responses/user-responses.service';
import {
  CategoryDecisionRepository,
  type CategoryDecisionCurrentResponseRecord,
  type CategoryDecisionProductCategoryRecord,
  type CategoryDecisionQuestionRecord,
} from './category-decision.repository';

type GetInput = {
  deviceId: string;
  userId?: string;
  category?: string;
};

type PostInput = {
  deviceId: string;
  userId?: string;
  body: UpsertCategoryDecisionResponsesRequest;
};

type ResetResponsesInput = {
  deviceId: string;
  userId?: string;
  uiSection: CategoryDecisionUiSection;
};

type CalculatePreviewResultsInput = {
  deviceId: string;
  userId?: string;
  category: string;
};

type PreviewResult = CategoryDecisionPreviewResult;

@Injectable()
export class CategoryDecisionService {
  constructor(
    private readonly repository: CategoryDecisionRepository,
    private readonly userResponsesService: UserResponsesService,
  ) {}

  async getCategoryDecision(input: GetInput): Promise<CategoryDecisionResponse> {
    const selectedCategory = await this.resolveCategory(input.category);
    const questions = await this.repository.findCategoryDecisionQuestions();
    const questionIds = questions.map((question) => question.questionId);
    const responseRecords = await this.repository.findCurrentResponses(
      input.deviceId,
      questionIds,
      input.userId,
    );
    const responseMap = this.toResponseMap(responseRecords);

    const visibleQuestions = this.filterQuestionsByCategory(questions, selectedCategory?.key);
    const visibleQuestionIds = visibleQuestions.map((question) => question.questionId);
    const questionsWithResponses = this.combineQuestionsWithResponses(
      visibleQuestions,
      responseMap,
    );
    const sections = this.groupQuestionsBySections(questionsWithResponses);
    const previewResults = this.createPreviewResults({
      selectedCategory,
      answeredQuestionCount: this.countAnsweredQuestions(visibleQuestionIds, responseMap),
      totalQuestionCount: visibleQuestionIds.length,
    });

    return categoryDecisionResponseSchema.parse({
      selectedCategory,
      sections,
      previewResults,
    });
  }

  async getResponseReaction(input: PostInput): Promise<UpsertCategoryDecisionResponsesResponse> {
    const responses = Object.values(input.body.responses);

    await this.userResponsesService.upsertCurrentResponses(
      responses.map((response) => ({
        deviceId: input.deviceId,
        ...(input.userId ? { userId: input.userId } : {}),
        questionId: response.questionId,
        value: response.value,
        source: UserResponseSource.context,
      })),
    );

    const previewResults = await this.calculatePreviewResults({
      deviceId: input.deviceId,
      ...(input.userId ? { userId: input.userId } : {}),
      category: input.body.category,
    });

    return upsertCategoryDecisionResponsesResponseSchema.parse({
      responses: input.body.responses,
      previewResults,
    });
  }

  async resetResponses(
    input: ResetResponsesInput,
  ): Promise<ResetCategoryDecisionResponsesResponse> {
    const questions = await this.repository.findCategoryDecisionQuestions();
    const questionIds = questions
      .filter(
        (question) => categoryDecisionUiSectionSchema.parse(question.uiSection) === input.uiSection,
      )
      .map((question) => question.questionId);

    const deletedCount = await this.userResponsesService.deleteCurrentResponses({
      deviceId: input.deviceId,
      ...(input.userId ? { userId: input.userId } : {}),
      questionIds,
    });

    return resetCategoryDecisionResponsesResponseSchema.parse({
      deletedCount,
    });
  }

  private async resolveCategory(categoryKey?: string): Promise<ProductCategoryItemDto | null> {
    if (!categoryKey) {
      return null;
    }

    const category = await this.repository.findProductCategoryByKey(categoryKey);

    if (!category) {
      throw new NotFoundException('Product category not found');
    }

    return this.toProductCategoryItem(category);
  }

  private combineQuestionsWithResponses(
    questions: CategoryDecisionQuestionRecord[],
    responseMap: Map<string, number[]>,
  ): CategoryDecisionQuestion[] {
    return questions.map((question) => {
      const uiSection = categoryDecisionUiSectionSchema.parse(question.uiSection);
      const responseValue = responseMap.get(question.questionId);

      return {
        questionId: question.questionId,
        questionVariantId: question.id,
        key: question.question.key,
        title: question.title,
        answerType: questionAnswerTypeSchema.parse(question.question.answerType),
        uiSection,
        sortOrder: question.sortOrder,
        answers: this.toAnswers(question),
        currentResponse: responseValue ?? null,
      };
    });
  }

  private groupQuestionsBySections(
    questions: CategoryDecisionQuestion[],
  ): CategoryDecisionSection[] {
    const sectionMap = new Map<CategoryDecisionUiSection, CategoryDecisionQuestion[]>();

    for (const question of questions) {
      const sectionQuestions = sectionMap.get(question.uiSection) ?? [];

      sectionQuestions.push(question);
      sectionMap.set(question.uiSection, sectionQuestions);
    }

    return categoryDecisionUiSectionSchema.options
      .map((key) => {
        const sectionQuestions = sectionMap.get(key);

        if (!sectionQuestions) {
          return null;
        }

        return {
          key,
          questions: sectionQuestions,
        };
      })
      .filter((section): section is CategoryDecisionSection => section !== null);
  }

  private toAnswers(question: CategoryDecisionQuestionRecord): QuestionAnswerDto[] {
    if (question.answers.length !== question.question.answerValues.length) {
      throw new Error(`Question answer count mismatch: ${question.question.key}`);
    }

    return question.question.answerValues.map((value, index) => {
      const label = question.answers[index];

      if (label === undefined) {
        throw new Error(`Missing answer label: ${question.question.key}`);
      }

      return {
        label,
        value,
      };
    });
  }

  private async calculatePreviewResults(
    input: CalculatePreviewResultsInput,
  ): Promise<PreviewResult[]> {
    const questions = await this.repository.findCategoryDecisionQuestions();
    const questionIds = questions.map((question) => question.questionId);
    const responseRecords = await this.repository.findCurrentResponses(
      input.deviceId,
      questionIds,
      input.userId,
    );
    const responseMap = this.toResponseMap(responseRecords);

    const selectedCategory = await this.resolveCategory(input.category);
    const visibleQuestions = this.filterQuestionsByCategory(questions, selectedCategory?.key);
    const visibleQuestionIds = visibleQuestions.map((question) => question.questionId);

    return this.createPreviewResults({
      selectedCategory,
      answeredQuestionCount: this.countAnsweredQuestions(visibleQuestionIds, responseMap),
      totalQuestionCount: visibleQuestionIds.length,
    });
  }

  private filterQuestionsByCategory(
    questions: CategoryDecisionQuestionRecord[],
    categoryKey: string | undefined,
  ): CategoryDecisionQuestionRecord[] {
    return questions.filter((question) => {
      if (!question.category) {
        return true;
      }

      return question.category === categoryKey;
    });
  }

  private createPreviewResults(input: {
    selectedCategory: ProductCategoryItemDto | null;
    answeredQuestionCount: number;
    totalQuestionCount: number;
  }): PreviewResult[] {
    if (input.answeredQuestionCount === 0) {
      return [];
    }

    return [this.createPreviewResult(input)];
  }

  private createPreviewResult(input: {
    selectedCategory: ProductCategoryItemDto | null;
    answeredQuestionCount: number;
    totalQuestionCount: number;
  }): PreviewResult {
    if (!input.selectedCategory) {
      return {
        title: 'Choose a product category first',
        description: 'The answer was saved. Select a category to prepare product filters.',
        cta: null,
        selectedCategory: null,
        answeredQuestionCount: input.answeredQuestionCount,
        totalQuestionCount: input.totalQuestionCount,
      };
    }

    return {
      title: `Ready to narrow ${input.selectedCategory.name}`,
      description: 'The saved answers will be used to prepare the initial product matrix filters.',
      cta: {
        label: 'View product matrix',
        target: `/product-matrix?category=${input.selectedCategory.key}&source=CATEGORY_DECISION_CTA`,
      },
      selectedCategory: input.selectedCategory,
      answeredQuestionCount: input.answeredQuestionCount,
      totalQuestionCount: input.totalQuestionCount,
    };
  }

  private countAnsweredQuestions(
    questionIds: readonly string[],
    responseMap: Map<string, number[]>,
  ): number {
    return questionIds.filter((questionId) => {
      const response = responseMap.get(questionId);

      return response !== undefined && response.length > 0;
    }).length;
  }

  private toResponseMap(responses: CategoryDecisionCurrentResponseRecord[]): Map<string, number[]> {
    const responseMap = new Map<string, number[]>();

    for (const response of responses) {
      if (!responseMap.has(response.questionId)) {
        responseMap.set(response.questionId, response.value);
      }
    }

    return responseMap;
  }

  private toProductCategoryItem(
    category: CategoryDecisionProductCategoryRecord,
  ): ProductCategoryItemDto {
    return {
      id: category.id,
      key: category.key,
      name: category.name,
      description: category.description,
      sortOrder: category.sortOrder,
    };
  }
}
