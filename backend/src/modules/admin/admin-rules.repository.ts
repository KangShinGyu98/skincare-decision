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
  isActive: true,
  resultType: true,
  resultTitle: true,
  conditions: {
    select: {
      operator: true,
      value: true,
      state: true,
      question: {
        select: {
          key: true,
          answerType: true,
          answerValues: true,
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
  operator: ComparisonOperator;
  value: number[];
  state: ConditionState;
  question: {
    key: string;
    answerType: QuestionAnswerType;
    answerValues: number[];
  };
};

export type AdminRuleRecord = {
  id: string;
  name: string;
  isActive: boolean;
  resultType: PriorityRuleResultType;
  resultTitle: string;
  conditions: AdminRuleConditionRecord[];
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

  private async findRuleById(ruleId: string): Promise<AdminRuleRecord | null> {
    return this.prisma.priorityRule.findFirst({
      where: {
        id: ruleId,
        deletedAt: null,
      },
      select: ADMIN_RULE_SELECT,
    });
  }
}
