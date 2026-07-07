import { randomUUID } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import {
  type ComparisonOperator,
  type ConditionState,
  type PriorityRuleResultType,
  type QuestionAnswerType,
} from '../../generated/prisma/enums';
import { Prisma } from '../../generated/prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

const ADMIN_RULE_TABLE_SELECT = {
  id: true,
  name: true,
  sortOrder: true,
  isActive: true,
  resultType: true,
  resultTitle: true,
  adminNote: true,
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
              id: true,
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

const ADMIN_RULE_DETAIL_SELECT = {
  ...ADMIN_RULE_TABLE_SELECT,
  resultDescription: true,
  ctaLabel: true,
  ctaTarget: true,
} satisfies Prisma.PriorityRuleSelect;

const ADMIN_RULE_QUESTION_SEARCH_SELECT = {
  id: true,
  key: true,
  answerType: true,
  answerValues: true,
  variants: {
    where: {
      deletedAt: null,
    },
    select: {
      id: true,
      title: true,
      answers: true,
    },
    orderBy: [{ isActive: 'desc' }, { sortOrder: 'asc' }, { createdAt: 'asc' }],
    take: 1,
  },
} satisfies Prisma.QuestionSelect;

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
      id: string;
      title: string;
      answers: string[];
    }[];
  };
};

export type AdminRuleRecord = {
  id: string;
  name: string;
  sortOrder: number;
  isActive: boolean;
  resultType: PriorityRuleResultType;
  resultTitle: string;
  resultDescription: string;
  adminNote: string | null;
  ctaLabel: string | null;
  ctaTarget: string | null;
  conditions: AdminRuleConditionRecord[];
};

export type AdminRuleTableRecord = Omit<
  AdminRuleRecord,
  'resultDescription' | 'ctaLabel' | 'ctaTarget'
>;

export type SaveAdminRuleConditionInput = {
  questionId: string;
  operator: ComparisonOperator;
  value: number[];
  state: ConditionState;
};

export type SaveAdminRuleInput = {
  name: string;
  isActive: boolean;
  resultType: PriorityRuleResultType;
  resultTitle: string;
  resultDescription: string;
  ctaLabel: string | null;
  ctaTarget: string | null;
  conditions: SaveAdminRuleConditionInput[];
};

export type SearchAdminRuleQuestionsInput = {
  q?: string | undefined;
  limit: number;
};

export type AdminRuleQuestionSearchRecord = {
  id: string;
  key: string;
  answerType: QuestionAnswerType;
  answerValues: number[];
  variants: {
    id: string;
    title: string;
    answers: string[];
  }[];
};

export class InvalidAdminRuleSortOrderError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidAdminRuleSortOrderError';
  }
}

export class InvalidAdminRuleConditionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidAdminRuleConditionError';
  }
}

type AdminRuleIdRow = {
  id: string;
};

function isRecordNotFoundError(error: unknown): boolean {
  return typeof error === 'object' && error !== null && 'code' in error && error.code === 'P2025';
}

@Injectable()
export class AdminRulesRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findRules(): Promise<AdminRuleTableRecord[]> {
    return this.prisma.priorityRule.findMany({
      where: {
        deletedAt: null,
      },
      select: ADMIN_RULE_TABLE_SELECT,
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
    });
  }

  async findRuleById(ruleId: string): Promise<AdminRuleRecord | null> {
    return this.prisma.priorityRule.findFirst({
      where: {
        id: ruleId,
        deletedAt: null,
      },
      select: ADMIN_RULE_DETAIL_SELECT,
    });
  }

  async searchQuestions(
    input: SearchAdminRuleQuestionsInput,
  ): Promise<AdminRuleQuestionSearchRecord[]> {
    return this.prisma.question.findMany({
      where: {
        deletedAt: null,
        ...(input.q
          ? {
              OR: [
                {
                  key: {
                    contains: input.q,
                    mode: 'insensitive',
                  },
                },
                {
                  variants: {
                    some: {
                      deletedAt: null,
                      title: {
                        contains: input.q,
                        mode: 'insensitive',
                      },
                    },
                  },
                },
              ],
            }
          : {}),
      },
      select: ADMIN_RULE_QUESTION_SEARCH_SELECT,
      orderBy: [{ key: 'asc' }],
      take: input.limit,
    });
  }

  async createRule(input: SaveAdminRuleInput): Promise<AdminRuleRecord> {
    const ruleId = await this.prisma.$transaction(async (transaction) => {
      await this.validateConditionQuestions(transaction, input.conditions);

      const nextSortOrder = await this.findNextSortOrder(transaction);
      const rule = await transaction.priorityRule.create({
        data: {
          id: randomUUID(),
          name: input.name,
          sortOrder: nextSortOrder,
          isActive: input.isActive,
          resultType: input.resultType,
          resultTitle: input.resultTitle,
          resultDescription: input.resultDescription,
          ctaLabel: input.ctaLabel,
          ctaTarget: input.ctaTarget,
        },
        select: {
          id: true,
        },
      });

      await this.createRuleConditions(transaction, rule.id, input.conditions);

      return rule.id;
    });

    const record = await this.findRuleById(ruleId);

    if (!record) {
      throw new Error(`Created admin rule was not found: ${ruleId}`);
    }

    return record;
  }

  async updateRule(ruleId: string, input: SaveAdminRuleInput): Promise<AdminRuleRecord | null> {
    const updatedRuleId = await this.prisma.$transaction(async (transaction) => {
      const existingRule = await transaction.priorityRule.findFirst({
        where: {
          id: ruleId,
          deletedAt: null,
        },
        select: {
          id: true,
        },
      });

      if (!existingRule) {
        return null;
      }

      await this.validateConditionQuestions(transaction, input.conditions);

      await transaction.priorityRule.update({
        where: {
          id: ruleId,
        },
        data: {
          name: input.name,
          isActive: input.isActive,
          resultType: input.resultType,
          resultTitle: input.resultTitle,
          resultDescription: input.resultDescription,
          ctaLabel: input.ctaLabel,
          ctaTarget: input.ctaTarget,
        },
        select: {
          id: true,
        },
      });

      await transaction.priorityRuleCondition.deleteMany({
        where: {
          ruleId,
        },
      });
      await this.createRuleConditions(transaction, ruleId, input.conditions);

      return ruleId;
    });

    if (!updatedRuleId) {
      return null;
    }

    return this.findRuleById(updatedRuleId);
  }

  async deleteRule(ruleId: string): Promise<boolean> {
    const result = await this.prisma.priorityRule.updateMany({
      where: {
        id: ruleId,
        deletedAt: null,
      },
      data: {
        isActive: false,
        deletedAt: new Date(),
      },
    });

    return result.count > 0;
  }

  async updateRuleStatus(ruleId: string, isActive: boolean): Promise<AdminRuleTableRecord | null> {
    try {
      await this.prisma.priorityRule.update({
        where: {
          id: ruleId,
          deletedAt: null,
        },
        data: {
          isActive,
        },
        select: {
          id: true,
        },
      });
    } catch (error) {
      if (isRecordNotFoundError(error)) {
        return null;
      }

      throw error;
    }

    return this.findRuleTableRowById(ruleId);
  }

  async updateRuleSortOrder(ruleIds: string[]): Promise<AdminRuleTableRecord[]> {
    return this.prisma.$transaction(async (transaction) => {
      const existingRules = await transaction.$queryRaw<AdminRuleIdRow[]>`
        SELECT id::text AS id
        FROM priority_rules
        WHERE deleted_at IS NULL
        FOR UPDATE
      `;

      this.validateRuleSortOrder(ruleIds, existingRules);

      const sortOrderRows = ruleIds.map(
        (ruleId, index) => Prisma.sql`(${ruleId}::uuid, ${index + 1}::integer)`,
      );

      await transaction.$executeRaw`
        UPDATE priority_rules AS target_rule
        SET sort_order = sorted_rules.sort_order
        FROM (VALUES ${Prisma.join(sortOrderRows)}) AS sorted_rules(id, sort_order)
        WHERE target_rule.id = sorted_rules.id
          AND target_rule.deleted_at IS NULL
      `;

      return transaction.priorityRule.findMany({
        where: {
          deletedAt: null,
        },
        select: ADMIN_RULE_TABLE_SELECT,
        orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
      });
    });
  }

  private validateRuleSortOrder(ruleIds: string[], existingRules: AdminRuleIdRow[]): void {
    if (ruleIds.length !== existingRules.length) {
      throw new InvalidAdminRuleSortOrderError('Invalid sort_order list');
    }

    const backendRuleIds = new Set(existingRules.map((rule) => rule.id));
    const frontendRuleIds = new Set(ruleIds);

    if (frontendRuleIds.size !== ruleIds.length) {
      throw new InvalidAdminRuleSortOrderError('Duplicated rule id');
    }

    for (const ruleId of ruleIds) {
      if (!backendRuleIds.has(ruleId)) {
        throw new InvalidAdminRuleSortOrderError(`Unknown rule id: ${ruleId}`);
      }
    }

    for (const rule of existingRules) {
      if (!frontendRuleIds.has(rule.id)) {
        throw new InvalidAdminRuleSortOrderError(`Missing rule id: ${rule.id}`);
      }
    }
  }

  private async validateConditionQuestions(
    transaction: Prisma.TransactionClient,
    conditions: SaveAdminRuleConditionInput[],
  ): Promise<void> {
    const questionIds = [...new Set(conditions.map((condition) => condition.questionId))];

    if (questionIds.length === 0) {
      return;
    }

    const questions = await transaction.question.findMany({
      where: {
        id: {
          in: questionIds,
        },
        deletedAt: null,
      },
      select: {
        id: true,
        answerValues: true,
      },
    });
    const questionMap = new Map(questions.map((question) => [question.id, question]));

    for (const questionId of questionIds) {
      if (!questionMap.has(questionId)) {
        throw new InvalidAdminRuleConditionError(`Unknown question id: ${questionId}`);
      }
    }

    for (const condition of conditions) {
      const question = questionMap.get(condition.questionId);

      if (!question) {
        continue;
      }

      const answerValues = new Set(question.answerValues);

      for (const value of condition.value) {
        if (!answerValues.has(value)) {
          throw new InvalidAdminRuleConditionError(
            `Invalid condition value ${value} for question id: ${condition.questionId}`,
          );
        }
      }
    }
  }

  private async findNextSortOrder(transaction: Prisma.TransactionClient): Promise<number> {
    const aggregate = await transaction.priorityRule.aggregate({
      where: {
        deletedAt: null,
      },
      _max: {
        sortOrder: true,
      },
    });

    return (aggregate._max.sortOrder ?? 0) + 1;
  }

  private async createRuleConditions(
    transaction: Prisma.TransactionClient,
    ruleId: string,
    conditions: SaveAdminRuleConditionInput[],
  ): Promise<void> {
    if (conditions.length === 0) {
      return;
    }

    await transaction.priorityRuleCondition.createMany({
      data: conditions.map((condition) => ({
        id: randomUUID(),
        ruleId,
        questionId: condition.questionId,
        operator: condition.operator,
        value: condition.value,
        state: condition.state,
      })),
    });
  }

  private findRuleTableRowById(ruleId: string): Promise<AdminRuleTableRecord | null> {
    return this.prisma.priorityRule.findFirst({
      where: {
        id: ruleId,
        deletedAt: null,
      },
      select: ADMIN_RULE_TABLE_SELECT,
    });
  }
}
