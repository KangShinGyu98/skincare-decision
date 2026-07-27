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
import { PriorityGateService } from '../priority-gate/priority-gate.service';
import { UserResponsesService } from '../user-responses/user-responses.service';
import {
  CategoryDecisionRepository,
  type CategoryDecisionCurrentResponseRecord,
  type CategoryDecisionProductCategoryRecord,
  type CategoryDecisionQuestionRecord,
} from './category-decision.repository';

// 카테고리별 노출 룰(sortOrder) — docs/ContentSpec/purchase_checklist_v1.md §1이 원본.
// priority gate 룰을 가공 없이 부분집합만 재사용한다. 10·20은 공통 게이트(의료·치료).
export const CHECKLIST_RULE_SORT_ORDERS: ReadonlyMap<string, readonly number[]> = new Map([
  ['cleanser', [10, 20, 130, 190, 210, 220, 230, 260, 270, 290]],
  ['toner', [10, 20, 120, 510, 520, 540]],
  ['serum', [10, 20, 110, 170, 180, 530, 540, 550, 610, 620, 630, 640, 650, 660, 670, 680, 690]],
  ['moisturizer', [10, 20, 310, 320, 330]],
  ['sunscreen', [10, 20, 160, 280, 410, 420, 430, 440, 450, 460, 470, 480, 610]],
]);

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
  categoryKey: string | undefined;
};

type PreviewResult = CategoryDecisionPreviewResult;

@Injectable()
export class CategoryDecisionService {
  constructor(
    private readonly repository: CategoryDecisionRepository,
    private readonly userResponsesService: UserResponsesService,
    private readonly priorityGateService: PriorityGateService,
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
    const questionsWithResponses = this.combineQuestionsWithResponses(
      visibleQuestions,
      responseMap,
    );
    const sections = this.groupQuestionsBySections(questionsWithResponses);
    const previewResults = await this.calculatePreviewResults({
      deviceId: input.deviceId,
      ...(input.userId ? { userId: input.userId } : {}),
      categoryKey: selectedCategory?.key,
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
      categoryKey: input.body.category,
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

    if (!CHECKLIST_RULE_SORT_ORDERS.has(category.key)) {
      throw new NotFoundException('Product category is not supported');
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

  // 결론 카드 = 해당 카테고리에 매핑된 priority gate 룰의 평가 결과 그대로.
  // 미지원 카테고리이거나 매칭 룰이 없으면 빈 배열(별도 fallback 카드 없음).
  private async calculatePreviewResults(
    input: CalculatePreviewResultsInput,
  ): Promise<PreviewResult[]> {
    const ruleSortOrders = input.categoryKey
      ? CHECKLIST_RULE_SORT_ORDERS.get(input.categoryKey)
      : undefined;

    if (!ruleSortOrders) {
      return [];
    }

    return this.priorityGateService.calculatePreviewResultsForRules({
      deviceId: input.deviceId,
      ...(input.userId ? { userId: input.userId } : {}),
      ruleSortOrders,
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
