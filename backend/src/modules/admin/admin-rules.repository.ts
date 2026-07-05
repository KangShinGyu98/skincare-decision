import { Injectable } from '@nestjs/common';
import {
  type ComparisonOperator,
  type ConditionState,
  type PriorityRuleResultType,
  type QuestionAnswerType,
} from '../../generated/prisma/enums';
import { Prisma } from '../../generated/prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import type { AdminRuleStatus } from '@skincare-decision/shared/schemas';

const ADMIN_RULE_SELECT = {
  id: true,
  name: true,
  priority: true,
  isActive: true,
  resultType: true,
  resultTitle: true,
  resultDescription: true,
  adminNote: true,
  ctaLabel: true,
  ctaTarget: true,
  recommendCategory: {
    select: {
      id: true,
      key: true,
      name: true,
    },
  },
  conditions: {
    select: {
      id: true,
      operator: true,
      value: true,
      state: true,
      question: {
        select: {
          id: true,
          key: true,
          answerType: true,
          answerValues: true,
          variants: {
            where: {
              deletedAt: null,
            },
            select: {
              title: true,
              answers: true,
            },
            orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
            take: 1,
          },
        },
      },
    },
    orderBy: [{ createdAt: 'asc' }],
  },
} satisfies Prisma.PriorityRuleSelect;

export type FindAdminRulesInput = {
  resultType?: PriorityRuleResultType;
  status?: AdminRuleStatus;
};

export type AdminRuleConditionRecord = {
  id: string;
  operator: ComparisonOperator;
  value: number[];
  state: ConditionState;
  question: {
    id: string;
    key: string;
    answerType: QuestionAnswerType;
    answerValues: number[];
    variants: {
      title: string;
      answers: string[];
    }[];
  };
};

export type AdminRuleRecommendCategoryRecord = {
  id: string;
  key: string;
  name: string;
};

export type AdminRuleRecord = {
  id: string;
  name: string;
  priority: number;
  isActive: boolean;
  resultType: PriorityRuleResultType;
  resultTitle: string;
  resultDescription: string;
  adminNote: string | null;
  ctaLabel: string | null;
  ctaTarget: string | null;
  recommendCategory: AdminRuleRecommendCategoryRecord | null;
  conditions: AdminRuleConditionRecord[];
};

export type UpdateAdminRulePriorityInput = {
  ruleId: string;
  priority: number;
};

@Injectable()
export class AdminRulesRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findRules(input: FindAdminRulesInput = {}): Promise<AdminRuleRecord[]> {
    return this.prisma.priorityRule.findMany({
      where: {
        deletedAt: null,
        ...(input.resultType ? { resultType: input.resultType } : {}),
        ...(input.status ? { isActive: input.status === 'active' } : {}),
      },
      select: ADMIN_RULE_SELECT,
      orderBy: [{ priority: 'asc' }, { createdAt: 'asc' }],
    });
  }

  async findRuleById(ruleId: string): Promise<AdminRuleRecord | null> {
    return this.prisma.priorityRule.findFirst({
      where: {
        id: ruleId,
        deletedAt: null,
      },
      select: ADMIN_RULE_SELECT,
    });
  }

  async updateRuleStatus(ruleId: string, isActive: boolean): Promise<AdminRuleRecord | null> {
    const result = await this.prisma.priorityRule.updateMany({
      where: {
        id: ruleId,
        deletedAt: null,
      },
      data: {
        isActive,
      },
    });

    if (result.count === 0) {
      return null;
    }

    return this.findRuleById(ruleId);
  }

  async updateRuleAdminNote(
    ruleId: string,
    adminNote: string | null,
  ): Promise<AdminRuleRecord | null> {
    const result = await this.prisma.priorityRule.updateMany({
      where: {
        id: ruleId,
        deletedAt: null,
      },
      data: {
        adminNote,
      },
    });

    if (result.count === 0) {
      return null;
    }

    return this.findRuleById(ruleId);
  }

  async updateRulePriorities(
    items: UpdateAdminRulePriorityInput[],
  ): Promise<AdminRuleRecord[] | null> {
    const ruleIds = [...new Set(items.map((item) => item.ruleId))];

    return this.prisma.$transaction(async (transaction) => {
      const existingRules = await transaction.priorityRule.findMany({
        where: {
          id: {
            in: ruleIds,
          },
          deletedAt: null,
        },
        select: {
          id: true,
        },
      });

      if (existingRules.length !== ruleIds.length) {
        return null;
      }

      for (const item of items) {
        await transaction.priorityRule.update({
          where: {
            id: item.ruleId,
          },
          data: {
            priority: item.priority,
          },
        });
      }

      return transaction.priorityRule.findMany({
        where: {
          id: {
            in: ruleIds,
          },
          deletedAt: null,
        },
        select: ADMIN_RULE_SELECT,
        orderBy: [{ priority: 'asc' }, { createdAt: 'asc' }],
      });
    });
  }
}
