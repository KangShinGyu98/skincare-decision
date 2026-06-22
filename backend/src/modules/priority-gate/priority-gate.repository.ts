import { Prisma } from '../../generated/prisma/client';
import {
  type ComparisonOperator,
  type ConditionState,
  type PriorityRuleResultType,
  Screen,
  UiSection,
  type QuestionAnswerType,
} from '../../generated/prisma/enums';
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

export type QuestionRecord = {
  id: string;
  questionId: string;
  title: string;
  answers: string[];
  uiSection: UiSection;
  sortOrder: number;
  question: {
    key: string;
    answerType: QuestionAnswerType;
    answerValues: number[];
  };
};

export type CurrentResponseRecord = {
  questionId: string;
  value: number[];
};

export type ProductCategoryRecord = {
  id: string;
  key: string;
  name: string;
  description: string | null;
};

export type PriorityRuleConditionRecord = {
  questionId: string;
  operator: ComparisonOperator;
  value: number[];
  state: ConditionState;
};

export type PriorityRuleRecord = {
  id: string;
  priority: number;
  resultType: PriorityRuleResultType;
  resultTitle: string;
  resultDescription: string;
  holdCategories: Prisma.JsonValue | null;
  ctaLabel: string | null;
  ctaTarget: string | null;
  recommendCategory: ProductCategoryRecord | null;
  conditions: PriorityRuleConditionRecord[];
};

export type CreateDecisionRunInput = {
  deviceId: string;
  sessionId: string;
  userId?: string;
  decisionType: string;
  sourceScreen: string;
  categoryId?: string;
  resultType?: string;
  resultTitle?: string;
  resultDescription?: string;
  ctaLabel?: string;
  ctaTarget?: string;
  inputSnapshot: Prisma.InputJsonValue;
  appliedFiltersSnapshot: Prisma.InputJsonValue;
  resultSnapshot: Prisma.InputJsonValue;
};

export type DecisionRunRecord = {
  id: bigint;
};

@Injectable()
export class PriorityGateRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findPriorityGateQuestions(): Promise<QuestionRecord[]> {
    return this.prisma.questionVariant.findMany({
      where: {
        screen: Screen.priority_gate,
        uiSection: {
          in: [UiSection.life_routine, UiSection.owned_products],
        },
        isActive: true,
        deletedAt: null,
        question: {
          isActive: true,
          deletedAt: null,
        },
      },
      select: {
        id: true,
        questionId: true,
        title: true,
        answers: true,
        uiSection: true,
        sortOrder: true,
        question: {
          select: {
            key: true,
            answerType: true,
            answerValues: true,
          },
        },
      },
      orderBy: [{ uiSection: 'asc' }, { sortOrder: 'asc' }],
    });
  }

  async findCurrentResponses(
    deviceId: string,
    questionIds: readonly string[],
    userId?: string,
  ): Promise<CurrentResponseRecord[]> {
    if (questionIds.length === 0) {
      return [];
    }

    const records = await this.prisma.userResponse.findMany({
      where: {
        questionId: {
          in: [...questionIds],
        },
        OR: userId ? [{ userId }, { deviceId, userId: null }] : [{ deviceId, userId: null }],
      },
      select: {
        questionId: true,
        value: true,
        userId: true,
        updatedAt: true,
        createdAt: true,
      },
      orderBy: [{ questionId: 'asc' }, { updatedAt: 'desc' }, { createdAt: 'desc' }],
    });
    return records;
  }

  async findPriorityRules(): Promise<PriorityRuleRecord[]> {
    return this.prisma.priorityRule.findMany({
      where: {
        isActive: true,
        deletedAt: null,
      },
      select: {
        id: true,
        priority: true,
        resultType: true,
        resultTitle: true,
        resultDescription: true,
        holdCategories: true,
        ctaLabel: true,
        ctaTarget: true,
        recommendCategory: {
          select: {
            id: true,
            key: true,
            name: true,
            description: true,
          },
        },
        conditions: {
          select: {
            questionId: true,
            operator: true,
            value: true,
            state: true,
          },
        },
      },
      orderBy: [{ priority: 'asc' }, { createdAt: 'asc' }],
    });
  }

  async findProductCategoriesByKeysOrIds(
    keys: readonly string[],
    ids: readonly string[],
  ): Promise<ProductCategoryRecord[]> {
    const or = [
      ...(keys.length > 0 ? [{ key: { in: [...keys] } }] : []),
      ...(ids.length > 0 ? [{ id: { in: [...ids] } }] : []),
    ];

    if (or.length === 0) {
      return [];
    }

    return this.prisma.productCategory.findMany({
      where: {
        deletedAt: null,
        OR: or,
      },
      select: {
        id: true,
        key: true,
        name: true,
        description: true,
      },
    });
  }

  async createDecisionRun(input: CreateDecisionRunInput): Promise<DecisionRunRecord> {
    return this.prisma.decisionRun.create({
      data: {
        deviceId: input.deviceId,
        sessionId: input.sessionId,
        ...(input.userId ? { userId: input.userId } : {}),
        decisionType: input.decisionType,
        sourceScreen: input.sourceScreen,
        categoryId: input.categoryId ?? null,
        filterStateId: null,
        resultType: input.resultType ?? null,
        resultTitle: input.resultTitle ?? null,
        resultDescription: input.resultDescription ?? null,
        ctaLabel: input.ctaLabel ?? null,
        ctaTarget: input.ctaTarget ?? null,
        inputSnapshot: input.inputSnapshot,
        appliedFiltersSnapshot: input.appliedFiltersSnapshot,
        resultSnapshot: input.resultSnapshot,
      },
      select: {
        id: true,
      },
    });
  }
}
