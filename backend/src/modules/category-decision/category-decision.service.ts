import { Injectable, NotFoundException } from '@nestjs/common';
import {
  categoryDecisionResponseSchema,
  categoryDecisionUiSectionSchema,
  questionAnswerTypeSchema,
  type CategoryDecisionQuestion,
  type CategoryDecisionResponse,
  type CategoryDecisionSection,
  type CategoryDecisionUiSection,
  type ProductCategoryItemDto,
  type QuestionAnswerDto,
  type UpsertCategoryDecisionResponseRequest,
  type UpsertCategoryDecisionResponseResponse,
  upsertCategoryDecisionResponseResponseSchema,
} from '@skincare-decision/shared/schemas';
import { UserResponseSource } from '../../generated/prisma/enums';
import { UserResponsesService } from '../user-responses/user-responses.service';
import {
  CategoryDecisionRepository,
  type CategoryDecisionCurrentResponseRecord,
  type CategoryDecisionProductCategoryRecord,
  type CategoryDecisionQuestionRecord,
} from './category-decision.repository';

const CATEGORY_VALUE_BY_KEY: ReadonlyMap<string, number> = new Map([
  ['toner', 1],
  ['sunscreen', 2],
  ['serum', 3],
  ['lipcare', 4],
  ['moisturizer', 5],
  ['cleanser', 6],
]);

const CATEGORY_KEY_BY_VALUE: ReadonlyMap<number, string> = new Map(
  Array.from(CATEGORY_VALUE_BY_KEY, ([key, value]) => [value, key]),
);

type GetInput = {
  deviceId: string;
  userId?: string;
  category?: string;
};

type PostInput = {
  deviceId: string;
  userId?: string;
  body: UpsertCategoryDecisionResponseRequest;
};

type CalculatePreviewResultInput = {
  deviceId: string;
  userId?: string;
  responseOverride?: {
    questionId: string;
    value: number[];
  };
};

type PreviewResult = UpsertCategoryDecisionResponseResponse['previewResult'];

@Injectable()
export class CategoryDecisionService {
  constructor(
    private readonly repository: CategoryDecisionRepository,
    private readonly userResponsesService: UserResponsesService,
  ) {}

  async getCategoryDecision(input: GetInput): Promise<CategoryDecisionResponse> {
    const selectedCategoryFromQuery = await this.saveSelectedCategoryFromQuery(input);
    const questions = await this.repository.findCategoryDecisionQuestions();
    const questionIds = questions.map((question) => question.questionId);
    const responseRecords = await this.repository.findCurrentResponses(
      input.deviceId,
      questionIds,
      input.userId,
    );
    const responseMap = this.toResponseMap(responseRecords);
    const selectedCategory =
      selectedCategoryFromQuery ?? (await this.findSelectedCategory(questions, responseMap));

    const questionsWithResponses = this.combineQuestionsWithResponses(questions, responseRecords);
    const sections = this.groupQuestionsBySections(questionsWithResponses);

    return categoryDecisionResponseSchema.parse({
      selectedCategory,
      sections,
    });
  }

  async getResponseReaction(input: PostInput): Promise<UpsertCategoryDecisionResponseResponse> {
    await this.userResponsesService.upsertCurrentResponse({
      deviceId: input.deviceId,
      ...(input.userId ? { userId: input.userId } : {}),
      questionId: input.body.questionId,
      value: input.body.value,
      source: UserResponseSource.context,
    });

    const previewResult = await this.calculatePreviewResult({
      deviceId: input.deviceId,
      ...(input.userId ? { userId: input.userId } : {}),
      responseOverride: {
        questionId: input.body.questionId,
        value: input.body.value,
      },
    });

    return upsertCategoryDecisionResponseResponseSchema.parse({
      response: input.body,
      previewResult,
    });
  }

  private async saveSelectedCategoryFromQuery(
    input: GetInput,
  ): Promise<ProductCategoryItemDto | null> {
    if (!input.category) {
      return null;
    }

    const category = await this.repository.findProductCategoryByKey(input.category);

    if (!category) {
      throw new NotFoundException('Product category not found');
    }

    const value = CATEGORY_VALUE_BY_KEY.get(category.key);

    if (!value) {
      throw new NotFoundException('Product category is not supported');
    }

    const question = await this.repository.findQuestionByKey('category.selected');

    if (!question) {
      throw new Error('Missing category.selected question');
    }

    await this.userResponsesService.upsertCurrentResponse({
      deviceId: input.deviceId,
      ...(input.userId ? { userId: input.userId } : {}),
      questionId: question.id,
      value: [value],
      source: UserResponseSource.context,
    });

    return this.toProductCategoryItem(category);
  }

  private combineQuestionsWithResponses(
    questions: CategoryDecisionQuestionRecord[],
    responses: CategoryDecisionCurrentResponseRecord[],
  ): CategoryDecisionQuestion[] {
    const responseMap = this.toResponseMap(responses);

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

  private async calculatePreviewResult(input: CalculatePreviewResultInput): Promise<PreviewResult> {
    const questions = await this.repository.findCategoryDecisionQuestions();
    const questionIds = questions.map((question) => question.questionId);
    const responseRecords = await this.repository.findCurrentResponses(
      input.deviceId,
      questionIds,
      input.userId,
    );
    const responseMap = this.toResponseMap(responseRecords);

    if (input.responseOverride) {
      responseMap.set(input.responseOverride.questionId, input.responseOverride.value);
    }

    const selectedCategory = await this.findSelectedCategory(questions, responseMap);
    const answeredQuestionCount = questionIds.filter((questionId) => {
      const response = responseMap.get(questionId);

      return response !== undefined && response.length > 0;
    }).length;

    return this.createPreviewResult({
      selectedCategory,
      answeredQuestionCount,
      totalQuestionCount: questionIds.length,
    });
  }

  private async findSelectedCategory(
    questions: CategoryDecisionQuestionRecord[],
    responseMap: Map<string, number[]>,
  ): Promise<ProductCategoryItemDto | null> {
    const categoryQuestion = questions.find(
      (question) => question.question.key === 'category.selected',
    );

    if (!categoryQuestion) {
      return null;
    }

    const selectedValue = responseMap.get(categoryQuestion.questionId)?.[0];

    if (selectedValue === undefined) {
      return null;
    }

    const categoryKey = CATEGORY_KEY_BY_VALUE.get(selectedValue);

    if (!categoryKey) {
      return null;
    }

    const category = await this.repository.findProductCategoryByKey(categoryKey);

    return category ? this.toProductCategoryItem(category) : null;
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
    };
  }
}
