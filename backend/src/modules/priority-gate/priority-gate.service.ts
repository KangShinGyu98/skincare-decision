import { Injectable } from '@nestjs/common';
import {
  createPriorityGateSnapshotResponseSchema,
  priorityGateResponseSchema,
  questionAnswerTypeSchema,
  questionUiSectionSchema,
  type CreatePriorityGateSnapshotResponse,
  type ProductCategoryItemDto,
  type PriorityGateResponseDto,
  type QuestionAnswerDto,
  type QuestionDto,
  type QuestionSectionDto,
  type QuestionUiSectionDto,
  type ResetPriorityGateResponsesResponse,
  type UpsertPriorityGateResponsesRequest,
  type UpsertPriorityGateResponsesResponse,
  resetPriorityGateResponsesResponseSchema,
  upsertPriorityGateResponsesResponseSchema,
} from '@skincare-decision/shared/schemas';
import {
  ComparisonOperator,
  ConditionState,
  UserResponseSource,
} from '../../generated/prisma/enums';
import { UserResponsesService } from '../user-responses/user-responses.service';
import {
  type CurrentResponseRecord,
  type PriorityRuleConditionRecord,
  type PriorityRuleRecord,
  type ProductCategoryRecord,
  type QuestionRecord,
  PriorityGateRepository,
} from './priority-gate.repository';

type GetInput = {
  deviceId: string;
  userId?: string;
};
type PostInput = {
  deviceId: string;
  userId?: string;
  body: UpsertPriorityGateResponsesRequest;
};
type ResetResponsesInput = {
  deviceId: string;
  userId?: string;
  uiSection: QuestionUiSectionDto;
};
type SnapshotInput = {
  deviceId: string;
  sessionId: string;
  userId?: string;
};
type CalculatePreviewResultInput = {
  deviceId: string;
  userId?: string;
};
type PreviewResult = UpsertPriorityGateResponsesResponse['previewResults'][number];
type CategoryRef = {
  key?: string;
  id?: string;
};

@Injectable()
export class PriorityGateService {
  constructor(
    private readonly repository: PriorityGateRepository,
    private readonly userResponsesService: UserResponsesService,
  ) {}

  async getPriorityGate(input: GetInput): Promise<PriorityGateResponseDto> {
    const questions = await this.repository.findPriorityGateQuestions();
    const questionIds = questions.map((question) => question.questionId);

    const responseRecords = await this.repository.findCurrentResponses(
      input.deviceId,
      questionIds,
      input.userId,
    );

    const questionsWithResponses = this.combineQuestionsWithResponses(questions, responseRecords);
    const sections = this.groupQuestionsBySections(questionsWithResponses);
    const previewResults = this.hasCurrentResponses(responseRecords)
      ? await this.calculatePreviewResults({
          deviceId: input.deviceId,
          ...(input.userId ? { userId: input.userId } : {}),
        })
      : [];
    //TODO: questionsFilter DB Schema에 sourceQuestions 추가하고, 해당 필터 로직 적용하기

    return priorityGateResponseSchema.parse({
      sections,
      previewResults,
    });
  }

  async getResponseReaction(input: PostInput): Promise<UpsertPriorityGateResponsesResponse> {
    const responses = Object.values(input.body.responses);

    await this.userResponsesService.upsertCurrentResponses(
      responses.map((response) => ({
        deviceId: input.deviceId,
        ...(input.userId ? { userId: input.userId } : {}),
        questionId: response.questionId,
        value: response.value,
        source: UserResponseSource.priority_gate,
      })),
    );

    const previewResults = await this.calculatePreviewResults({
      deviceId: input.deviceId,
      ...(input.userId ? { userId: input.userId } : {}),
    });

    return upsertPriorityGateResponsesResponseSchema.parse({
      responses: input.body.responses,
      previewResults,
    });
  }

  async resetResponses(input: ResetResponsesInput): Promise<ResetPriorityGateResponsesResponse> {
    const questions = await this.repository.findPriorityGateQuestions();
    const questionIds = questions
      .filter((question) => questionUiSectionSchema.parse(question.uiSection) === input.uiSection)
      .map((question) => question.questionId);

    const deletedCount = await this.userResponsesService.deleteCurrentResponses({
      deviceId: input.deviceId,
      ...(input.userId ? { userId: input.userId } : {}),
      questionIds,
    });

    return resetPriorityGateResponsesResponseSchema.parse({
      deletedCount,
    });
  }

  async createSnapshot(input: SnapshotInput): Promise<CreatePriorityGateSnapshotResponse> {
    const previewResult = await this.calculatePreviewResult(input);
    const inputSnapshot = await this.createInputSnapshot(input);
    const decisionRun = await this.repository.createDecisionRun({
      deviceId: input.deviceId,
      sessionId: input.sessionId,
      ...(input.userId ? { userId: input.userId } : {}),
      decisionType: 'PRIORITY_GATE',
      sourceScreen: 'priority_gate',
      ...(previewResult.recommendCategory
        ? { categoryId: previewResult.recommendCategory.id }
        : {}),
      resultType: previewResult.resultType,
      resultTitle: previewResult.title,
      resultDescription: previewResult.description,
      ...(previewResult.cta
        ? {
            ctaLabel: previewResult.cta.label,
            ctaTarget: previewResult.cta.target,
          }
        : {}),
      inputSnapshot,
      appliedFiltersSnapshot: {},
      resultSnapshot: previewResult,
    });

    return createPriorityGateSnapshotResponseSchema.parse({
      decisionRunId: decisionRun.id.toString(),
      previewResult,
    });
  }

  private combineQuestionsWithResponses(
    questions: QuestionRecord[],
    responses: CurrentResponseRecord[],
  ): QuestionDto[] {
    const responseMap = new Map<string, number[]>();

    for (const response of responses) {
      if (!responseMap.has(response.questionId)) {
        responseMap.set(response.questionId, response.value);
      }
    }

    const questionsWithResponses = questions.map((question) => {
      const uiSection = questionUiSectionSchema.parse(question.uiSection);
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

    return questionsWithResponses;
  }

  private groupQuestionsBySections(questions: QuestionDto[]): QuestionSectionDto[] {
    const sectionMap = new Map<QuestionUiSectionDto, QuestionDto[]>();

    for (const question of questions) {
      const sectionQuestions = sectionMap.get(question.uiSection) ?? [];

      sectionQuestions.push(question);
      sectionMap.set(question.uiSection, sectionQuestions);
    }

    const sections: QuestionSectionDto[] = questionUiSectionSchema.options
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
      .filter((section): section is QuestionSectionDto => section !== null);

    return sections;
  }

  private toAnswers(question: QuestionRecord): QuestionAnswerDto[] {
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

  private hasCurrentResponses(responses: CurrentResponseRecord[]): boolean {
    return responses.some((response) => response.value.length > 0);
  }

  private async calculatePreviewResult(input: CalculatePreviewResultInput): Promise<PreviewResult> {
    const [previewResult] = await this.calculatePreviewResults(input);

    return previewResult ?? this.createFallbackPassResult();
  }

  private async calculatePreviewResults(
    input: CalculatePreviewResultInput,
  ): Promise<PreviewResult[]> {
    const rules = await this.repository.findPriorityRules();
    //rules 에서 필요한 questionsId 추출
    const conditionQuestionIds = this.collectConditionQuestionIds(rules);
    const responseRecords = await this.repository.findCurrentResponses(
      input.deviceId,
      conditionQuestionIds,
      input.userId,
    );
    const responseMap = this.toResponseMap(responseRecords);
    const previewResults: PreviewResult[] = [];

    for (const rule of rules) {
      if (!this.isRuleMatched(rule, responseMap)) {
        continue;
      }

      previewResults.push(await this.toPreviewResult(rule));
    }

    if (previewResults.length === 0) {
      return [this.createFallbackPassResult()];
    }

    return previewResults;
  }

  private async createInputSnapshot(input: SnapshotInput): Promise<{
    responses: Array<{
      questionId: string;
      key: string;
      value: number[];
    }>;
  }> {
    const questions = await this.repository.findPriorityGateQuestions();
    const questionIds = questions.map((question) => question.questionId);
    const responseRecords = await this.repository.findCurrentResponses(
      input.deviceId,
      questionIds,
      input.userId,
    );
    const responseMap = this.toResponseMap(responseRecords);

    return {
      responses: questions.flatMap((question) => {
        const value = responseMap.get(question.questionId);

        if (!value) {
          return [];
        }

        return [
          {
            questionId: question.questionId,
            key: question.question.key,
            value,
          },
        ];
      }),
    };
  }

  private collectConditionQuestionIds(rules: PriorityRuleRecord[]): string[] {
    return [
      ...new Set(rules.flatMap((rule) => rule.conditions.map((condition) => condition.questionId))),
    ];
  }

  private toResponseMap(responses: CurrentResponseRecord[]): Map<string, number[]> {
    const responseMap = new Map<string, number[]>();

    for (const response of responses) {
      if (!responseMap.has(response.questionId)) {
        responseMap.set(response.questionId, response.value);
      }
    }

    return responseMap;
  }

  private isRuleMatched(rule: PriorityRuleRecord, responseMap: Map<string, number[]>): boolean {
    const hasExcludedMatch = rule.conditions.some(
      (condition) =>
        condition.state === ConditionState.EXCLUDED &&
        this.isConditionMatched(condition, responseMap),
    );

    if (hasExcludedMatch) {
      return false;
    }

    const requiredConditions = rule.conditions.filter(
      (condition) => condition.state === ConditionState.REQUIRED,
    );

    if (requiredConditions.length === 0) {
      return rule.resultType === 'PASS';
    }

    return requiredConditions.every((condition) => this.isConditionMatched(condition, responseMap));
  }

  private isConditionMatched(
    condition: PriorityRuleConditionRecord,
    responseMap: Map<string, number[]>,
  ): boolean {
    const responseValue = responseMap.get(condition.questionId);

    if (!responseValue || responseValue.length === 0) {
      return false;
    }

    switch (condition.operator) {
      case ComparisonOperator.EQ:
        return this.hasSameNumbers(responseValue, condition.value);
      case ComparisonOperator.NEQ:
        return !this.hasSameNumbers(responseValue, condition.value);
      case ComparisonOperator.IN:
        return responseValue.some((value) => condition.value.includes(value));
      case ComparisonOperator.CONTAINS:
        return condition.value.every((value) => responseValue.includes(value));
      case ComparisonOperator.GTE:
        return responseValue[0] !== undefined && responseValue[0] >= condition.value[0]!;
      case ComparisonOperator.LTE:
        return responseValue[0] !== undefined && responseValue[0] <= condition.value[0]!;
      default:
        return false;
    }
  }

  private hasSameNumbers(left: number[], right: number[]): boolean {
    if (left.length !== right.length) {
      return false;
    }

    const leftSet = new Set(left);

    return right.every((value) => leftSet.has(value));
  }

  private async toPreviewResult(rule: PriorityRuleRecord): Promise<PreviewResult> {
    const recommendCategory = rule.recommendCategory
      ? this.toProductCategoryItem(rule.recommendCategory)
      : null;

    return {
      resultType: rule.resultType,
      title: rule.resultTitle,
      description: rule.resultDescription,
      cta:
        rule.ctaLabel && rule.ctaTarget
          ? {
              label: rule.ctaLabel,
              target: this.createCtaTarget(rule.ctaTarget, recommendCategory),
            }
          : null,
      recommendCategory,
      holdCategories: await this.toHoldCategories(rule.holdCategories),
    };
  }

  private createFallbackPassResult(): PreviewResult {
    return {
      resultType: 'PASS',
      title: '현재 답변에서는 우선 확인할 신호가 없습니다',
      description:
        '지금까지 선택한 내용만으로는 새 제품 선택을 멈추거나 특정 제품군을 먼저 볼 조건이 발견되지 않았습니다.',
      cta: null,
      recommendCategory: null,
      holdCategories: [],
    };
  }

  private async toHoldCategories(value: unknown): Promise<PreviewResult['holdCategories']> {
    const refs = this.parseCategoryRefs(value);
    const keys = refs.flatMap((ref) => (ref.key ? [ref.key] : []));
    const ids = refs.flatMap((ref) => (ref.id ? [ref.id] : []));
    const categories = await this.repository.findProductCategoriesByKeysOrIds(keys, ids);
    const categoriesByKey = new Map(categories.map((category) => [category.key, category]));
    const categoriesById = new Map(categories.map((category) => [category.id, category]));

    return refs.flatMap((ref) => {
      const category = ref.key
        ? categoriesByKey.get(ref.key)
        : ref.id
          ? categoriesById.get(ref.id)
          : undefined;

      if (!category) {
        return [];
      }

      return [this.toProductCategoryItem(category)];
    });
  }

  private parseCategoryRefs(value: unknown): CategoryRef[] {
    if (!Array.isArray(value)) {
      return [];
    }

    return value.flatMap((item): CategoryRef[] => {
      if (typeof item === 'string') {
        return [
          {
            key: item,
          },
        ];
      }

      if (!item || typeof item !== 'object' || Array.isArray(item)) {
        return [];
      }

      const record = item as Record<string, unknown>;
      const key = typeof record['key'] === 'string' ? record['key'] : undefined;
      const idValue = record['categoryId'] ?? record['category_id'] ?? record['id'];
      const id = typeof idValue === 'string' ? idValue : undefined;

      if (!key && !id) {
        return [];
      }

      return [
        {
          ...(key ? { key } : {}),
          ...(id ? { id } : {}),
        },
      ];
    });
  }

  private toProductCategoryItem(category: ProductCategoryRecord): ProductCategoryItemDto {
    return {
      id: category.id,
      key: category.key,
      name: category.name,
      description: category.description,
      sortOrder: category.sortOrder,
    };
  }

  private createCtaTarget(
    ctaTarget: string,
    recommendCategory: ProductCategoryItemDto | null,
  ): string {
    if (recommendCategory) {
      return this.createCategoryDecisionTarget(recommendCategory.key);
    }

    const productCategoryTarget = ctaTarget.match(/^\/products\/([^/?#]+)(?:[?#].*)?$/);

    if (productCategoryTarget?.[1]) {
      return this.createCategoryDecisionTarget(productCategoryTarget[1]);
    }

    return ctaTarget;
  }

  private createCategoryDecisionTarget(categoryKey: string): string {
    return `/category-decision?category=${encodeURIComponent(categoryKey)}`;
  }
}
