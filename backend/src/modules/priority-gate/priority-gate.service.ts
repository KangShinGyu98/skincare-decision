import { Injectable } from '@nestjs/common';
import {
  priorityGateResponseSchema,
  questionAnswerTypeSchema,
  questionUiSectionSchema,
  type ProductCategoryItemDto,
  type PriorityGateResponseDto,
  type QuestionAnswerDto,
  type QuestionDto,
  type QuestionSectionDto,
  type QuestionUiSectionDto,
  type UpsertPriorityGateResponseRequest,
  type UpsertPriorityGateResponseResponse,
  upsertPriorityGateResponseResponseSchema,
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
  body: UpsertPriorityGateResponseRequest;
};
type PreviewResult = UpsertPriorityGateResponseResponse['previewResult'];
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
    const questionsBySections = this.groupQuestionsBySections(questionsWithResponses);
    //TODO: questionsFilter DB Schema에 sourceQuestions 추가하고, 해당 필터 로직 적용하기

    return priorityGateResponseSchema.parse(questionsBySections);
  }

  async getResponseReaction(input: PostInput): Promise<UpsertPriorityGateResponseResponse> {
    await this.userResponsesService.upsertCurrentResponse({
      deviceId: input.deviceId,
      ...(input.userId ? { userId: input.userId } : {}),
      questionId: input.body.questionId,
      value: input.body.value,
      source: UserResponseSource.priority_gate,
    });

    const previewResult = await this.calculatePreviewResult(input);

    return upsertPriorityGateResponseResponseSchema.parse({
      response: input.body,
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

  private groupQuestionsBySections(questions: QuestionDto[]): PriorityGateResponseDto {
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

    return { sections };
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

  private async calculatePreviewResult(input: PostInput): Promise<PreviewResult> {
    const rules = await this.repository.findPriorityRules();
    //rules 에서 필요한 questionsId 추출
    const conditionQuestionIds = this.collectConditionQuestionIds(rules);
    const responseRecords = await this.repository.findCurrentResponses(
      input.deviceId,
      conditionQuestionIds,
      input.userId,
    );
    const responseMap = this.toResponseMap(responseRecords);

    responseMap.set(input.body.questionId, input.body.value);

    const matchedRule = rules.find((rule) => this.isRuleMatched(rule, responseMap));

    if (!matchedRule) {
      return this.createFallbackPassResult();
    }

    return this.toPreviewResult(matchedRule);
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
    return {
      resultType: rule.resultType,
      title: rule.resultTitle,
      description: rule.resultDescription,
      cta:
        rule.ctaLabel && rule.ctaTarget
          ? {
              label: rule.ctaLabel,
              target: rule.ctaTarget,
            }
          : null,
      recommendCategory: rule.recommendCategory
        ? this.toProductCategoryItem(rule.recommendCategory)
        : null,
      holdCategories: await this.toHoldCategories(rule.holdCategories),
    };
  }

  private createFallbackPassResult(): PreviewResult {
    return {
      resultType: 'PASS',
      title: '현재 답변에서는 우선 확인할 신호가 없습니다',
      description:
        '지금까지 선택한 내용만으로는 새 제품 선택을 멈추거나 특정 제품군을 먼저 볼 조건이 발견되지 않았습니다.',
      cta: {
        label: '제품군 고르기',
        target: '/category-decision',
      },
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
    };
  }
}
