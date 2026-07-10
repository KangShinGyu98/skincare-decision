import { randomUUID } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import type {
  AdminQuestionCategory,
  AdminQuestionCategoryFilter,
  AdminQuestionScreen,
  AdminQuestionStatus,
  AdminQuestionUiSection,
} from '@skincare-decision/shared/schemas';
import {
  type ComparisonOperator,
  type ConditionState,
  type QuestionAnswerType,
  type Screen,
  type UiSection,
} from '../../generated/prisma/enums';
import { Prisma } from '../../generated/prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

const ADMIN_QUESTION_SELECT = {
  id: true,
  questionId: true,
  title: true,
  answers: true,
  screen: true,
  uiSection: true,
  category: true,
  sortOrder: true,
  isActive: true,
  question: {
    select: {
      key: true,
      answerType: true,
      answerValues: true,
    },
  },
  visibilityConditions: {
    select: {
      operator: true,
      value: true,
      state: true,
    },
    orderBy: [{ createdAt: 'asc' }],
  },
} satisfies Prisma.QuestionVariantSelect;

const ADMIN_QUESTION_DETAIL_SELECT = {
  id: true,
  key: true,
  answerType: true,
  answerValues: true,
  isActive: true,
  variants: {
    where: {
      deletedAt: null,
    },
    select: {
      id: true,
      title: true,
      answers: true,
      screen: true,
      uiSection: true,
      category: true,
      sortOrder: true,
      isActive: true,
      visibilityConditions: {
        select: {
          operator: true,
          value: true,
          state: true,
        },
        orderBy: [{ createdAt: 'asc' }],
      },
    },
    orderBy: [{ screen: 'asc' }, { uiSection: 'asc' }, { sortOrder: 'asc' }, { createdAt: 'asc' }],
  },
} satisfies Prisma.QuestionSelect;

export type FindAdminQuestionsInput = {
  screen?: AdminQuestionScreen;
  uiSection?: AdminQuestionUiSection;
  category?: AdminQuestionCategoryFilter;
  status?: AdminQuestionStatus;
};

export type AdminQuestionVisibilityConditionRecord = {
  operator: ComparisonOperator;
  value: number;
  state: ConditionState;
};

export type AdminQuestionRecord = {
  id: string;
  questionId: string;
  title: string;
  answers: string[];
  screen: Screen;
  uiSection: UiSection;
  category: string | null;
  sortOrder: number;
  isActive: boolean;
  question: {
    key: string;
    answerType: QuestionAnswerType;
    answerValues: number[];
  };
  visibilityConditions: AdminQuestionVisibilityConditionRecord[];
};

export type AdminQuestionVariantRecord = {
  id: string;
  title: string;
  answers: string[];
  screen: Screen;
  uiSection: UiSection;
  category: string | null;
  sortOrder: number;
  isActive: boolean;
  visibilityConditions: AdminQuestionVisibilityConditionRecord[];
};

export type AdminQuestionDetailRecord = {
  id: string;
  key: string;
  answerType: QuestionAnswerType;
  answerValues: number[];
  isActive: boolean;
  variants: AdminQuestionVariantRecord[];
};

export type SaveAdminQuestionVisibilityConditionInput = {
  operator: ComparisonOperator;
  value: number;
  state: ConditionState;
};

export type SaveAdminQuestionVariantInput = {
  id?: string | undefined;
  title: string;
  answers: string[];
  screen: Screen;
  uiSection: UiSection;
  category: AdminQuestionCategory | null;
  sortOrder: number;
  isActive: boolean;
  visibilityConditions: SaveAdminQuestionVisibilityConditionInput[];
};

export type SaveAdminQuestionInput = {
  key: string;
  answerType: QuestionAnswerType;
  answerValues: number[];
  isActive: boolean;
  variants: SaveAdminQuestionVariantInput[];
};

export class InvalidAdminQuestionVariantError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidAdminQuestionVariantError';
  }
}

export class InvalidAdminQuestionSortOrderError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidAdminQuestionSortOrderError';
  }
}

type AdminQuestionVariantSortOrderRow = {
  id: string;
  uiSection: UiSection;
};

function isRecordNotFoundError(error: unknown): boolean {
  return typeof error === 'object' && error !== null && 'code' in error && error.code === 'P2025';
}

@Injectable()
export class AdminQuestionsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findQuestions(input: FindAdminQuestionsInput = {}): Promise<AdminQuestionRecord[]> {
    return this.prisma.questionVariant.findMany({
      where: {
        deletedAt: null,
        question: {
          deletedAt: null,
        },
        ...(input.screen ? { screen: input.screen } : {}),
        ...(input.uiSection ? { uiSection: input.uiSection } : {}),
        ...(input.category === 'common'
          ? { category: null }
          : input.category
            ? { category: input.category }
            : {}),
        ...(input.status ? { isActive: input.status === 'active' } : {}),
      },
      select: ADMIN_QUESTION_SELECT,
      orderBy: [{ uiSection: 'asc' }, { sortOrder: 'asc' }, { createdAt: 'asc' }],
    });
  }

  async findQuestionById(questionId: string): Promise<AdminQuestionDetailRecord | null> {
    return this.prisma.question.findFirst({
      where: {
        id: questionId,
        deletedAt: null,
      },
      select: ADMIN_QUESTION_DETAIL_SELECT,
    });
  }

  async createQuestion(input: SaveAdminQuestionInput): Promise<AdminQuestionDetailRecord> {
    const questionId = await this.prisma.$transaction(async (transaction) => {
      const question = await transaction.question.create({
        data: {
          id: randomUUID(),
          key: input.key,
          answerType: input.answerType,
          answerValues: input.answerValues,
          isActive: input.isActive,
        },
        select: {
          id: true,
        },
      });

      await this.createQuestionVariants(transaction, question.id, input.variants);

      return question.id;
    });

    const record = await this.findQuestionById(questionId);

    if (!record) {
      throw new Error(`Created admin question was not found: ${questionId}`);
    }

    return record;
  }

  async updateQuestion(
    questionId: string,
    input: SaveAdminQuestionInput,
  ): Promise<AdminQuestionDetailRecord | null> {
    const updatedQuestionId = await this.prisma.$transaction(async (transaction) => {
      const existingQuestion = await transaction.question.findFirst({
        where: {
          id: questionId,
          deletedAt: null,
        },
        select: {
          id: true,
          variants: {
            where: {
              deletedAt: null,
            },
            select: {
              id: true,
            },
          },
        },
      });

      if (!existingQuestion) {
        return null;
      }

      this.validateVariantIds(
        input.variants,
        existingQuestion.variants.map((variant) => variant.id),
      );

      await transaction.question.update({
        where: {
          id: questionId,
        },
        data: {
          key: input.key,
          answerType: input.answerType,
          answerValues: input.answerValues,
          isActive: input.isActive,
        },
        select: {
          id: true,
        },
      });

      const retainedVariantIds = new Set(
        input.variants.flatMap((variant) => (variant.id ? [variant.id] : [])),
      );
      const deletedVariantIds = existingQuestion.variants
        .map((variant) => variant.id)
        .filter((variantId) => !retainedVariantIds.has(variantId));

      if (deletedVariantIds.length > 0) {
        await transaction.questionVariant.updateMany({
          where: {
            id: {
              in: deletedVariantIds,
            },
            questionId,
          },
          data: {
            isActive: false,
            deletedAt: new Date(),
          },
        });
      }

      await this.upsertQuestionVariants(transaction, questionId, input.variants);

      return questionId;
    });

    if (!updatedQuestionId) {
      return null;
    }

    return this.findQuestionById(updatedQuestionId);
  }

  async deleteQuestion(questionId: string): Promise<boolean> {
    const deleted = await this.prisma.$transaction(async (transaction) => {
      const result = await transaction.question.updateMany({
        where: {
          id: questionId,
          deletedAt: null,
        },
        data: {
          isActive: false,
          deletedAt: new Date(),
        },
      });

      if (result.count === 0) {
        return false;
      }

      await transaction.questionVariant.updateMany({
        where: {
          questionId,
          deletedAt: null,
        },
        data: {
          isActive: false,
          deletedAt: new Date(),
        },
      });

      return true;
    });

    return deleted;
  }

  async updateQuestionVariantStatus(
    questionVariantId: string,
    isActive: boolean,
  ): Promise<AdminQuestionRecord | null> {
    try {
      await this.prisma.questionVariant.update({
        where: {
          id: questionVariantId,
          deletedAt: null,
          question: {
            deletedAt: null,
          },
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

    return this.findQuestionVariantById(questionVariantId);
  }

  async updateQuestionVariantSortOrder(
    questionVariantIds: string[],
  ): Promise<AdminQuestionRecord[]> {
    return this.prisma.$transaction(async (transaction) => {
      const existingVariants = await transaction.$queryRaw<AdminQuestionVariantSortOrderRow[]>`
        SELECT
          question_variant.id::text AS id,
          question_variant.ui_section::text AS "uiSection"
        FROM question_variants AS question_variant
        INNER JOIN questions AS question
          ON question.id = question_variant.question_id
        WHERE question_variant.deleted_at IS NULL
          AND question.deleted_at IS NULL
        FOR UPDATE OF question_variant
      `;

      this.validateQuestionVariantSortOrder(questionVariantIds, existingVariants);

      const sortOrderRows = questionVariantIds.map(
        (questionVariantId, index) =>
          Prisma.sql`(${questionVariantId}::uuid, ${index + 1}::integer)`,
      );

      await transaction.$executeRaw`
        UPDATE question_variants AS target_variant
        SET sort_order = sorted_variants.sort_order
        FROM (VALUES ${Prisma.join(sortOrderRows)}) AS sorted_variants(id, sort_order)
        WHERE target_variant.id = sorted_variants.id
          AND target_variant.deleted_at IS NULL
      `;

      return transaction.questionVariant.findMany({
        where: {
          deletedAt: null,
          question: {
            deletedAt: null,
          },
        },
        select: ADMIN_QUESTION_SELECT,
        orderBy: [{ uiSection: 'asc' }, { sortOrder: 'asc' }, { createdAt: 'asc' }],
      });
    });
  }

  private validateQuestionVariantSortOrder(
    questionVariantIds: string[],
    existingVariants: AdminQuestionVariantSortOrderRow[],
  ): void {
    const inputVariantIds = new Set(questionVariantIds);

    if (inputVariantIds.size !== questionVariantIds.length) {
      throw new InvalidAdminQuestionSortOrderError('Duplicated question variant id');
    }

    const existingVariantMap = new Map(existingVariants.map((variant) => [variant.id, variant]));
    const sortedVariants = questionVariantIds.map((questionVariantId) => {
      const variant = existingVariantMap.get(questionVariantId);

      if (!variant) {
        throw new InvalidAdminQuestionSortOrderError(
          `Unknown question variant id: ${questionVariantId}`,
        );
      }

      return variant;
    });

    const firstVariant = sortedVariants[0];

    if (!firstVariant) {
      throw new InvalidAdminQuestionSortOrderError('Invalid sort_order list');
    }

    const hasSameSortGroup = (variant: AdminQuestionVariantSortOrderRow) =>
      variant.uiSection === firstVariant.uiSection;

    for (const variant of sortedVariants) {
      if (!hasSameSortGroup(variant)) {
        throw new InvalidAdminQuestionSortOrderError('Question variants must have same ui_section');
      }
    }

    const backendGroupVariants = existingVariants.filter(hasSameSortGroup);

    if (backendGroupVariants.length !== questionVariantIds.length) {
      throw new InvalidAdminQuestionSortOrderError('Invalid sort_order list');
    }

    for (const variant of backendGroupVariants) {
      if (!inputVariantIds.has(variant.id)) {
        throw new InvalidAdminQuestionSortOrderError(`Missing question variant id: ${variant.id}`);
      }
    }
  }

  private validateVariantIds(
    variants: SaveAdminQuestionVariantInput[],
    existingVariantIds: string[],
  ): void {
    const existingVariantIdSet = new Set(existingVariantIds);
    const inputVariantIds = variants.flatMap((variant) => (variant.id ? [variant.id] : []));
    const inputVariantIdSet = new Set(inputVariantIds);

    if (inputVariantIdSet.size !== inputVariantIds.length) {
      throw new InvalidAdminQuestionVariantError('Duplicated question variant id');
    }

    for (const variantId of inputVariantIds) {
      if (!existingVariantIdSet.has(variantId)) {
        throw new InvalidAdminQuestionVariantError(`Unknown question variant id: ${variantId}`);
      }
    }
  }

  private async createQuestionVariants(
    transaction: Prisma.TransactionClient,
    questionId: string,
    variants: SaveAdminQuestionVariantInput[],
  ): Promise<void> {
    for (const variant of variants) {
      const variantId = randomUUID();

      await transaction.questionVariant.create({
        data: {
          id: variantId,
          questionId,
          title: variant.title,
          answers: variant.answers,
          screen: variant.screen,
          uiSection: variant.uiSection,
          category: variant.category,
          sortOrder: variant.sortOrder,
          isActive: variant.isActive,
        },
        select: {
          id: true,
        },
      });
      await this.replaceVisibilityConditions(transaction, variantId, variant.visibilityConditions);
    }
  }

  private async upsertQuestionVariants(
    transaction: Prisma.TransactionClient,
    questionId: string,
    variants: SaveAdminQuestionVariantInput[],
  ): Promise<void> {
    for (const variant of variants) {
      const variantId = variant.id ?? randomUUID();

      if (variant.id) {
        await transaction.questionVariant.update({
          where: {
            id: variant.id,
          },
          data: {
            title: variant.title,
            answers: variant.answers,
            screen: variant.screen,
            uiSection: variant.uiSection,
            category: variant.category,
            sortOrder: variant.sortOrder,
            isActive: variant.isActive,
          },
          select: {
            id: true,
          },
        });
      } else {
        await transaction.questionVariant.create({
          data: {
            id: variantId,
            questionId,
            title: variant.title,
            answers: variant.answers,
            screen: variant.screen,
            uiSection: variant.uiSection,
            category: variant.category,
            sortOrder: variant.sortOrder,
            isActive: variant.isActive,
          },
          select: {
            id: true,
          },
        });
      }

      await this.replaceVisibilityConditions(transaction, variantId, variant.visibilityConditions);
    }
  }

  private async replaceVisibilityConditions(
    transaction: Prisma.TransactionClient,
    questionVariantId: string,
    visibilityConditions: SaveAdminQuestionVisibilityConditionInput[],
  ): Promise<void> {
    await transaction.questionVisibilityCondition.deleteMany({
      where: {
        questionVariantId,
      },
    });

    if (visibilityConditions.length === 0) {
      return;
    }

    await transaction.questionVisibilityCondition.createMany({
      data: visibilityConditions.map((condition) => ({
        id: randomUUID(),
        questionVariantId,
        operator: condition.operator,
        value: condition.value,
        state: condition.state,
      })),
    });
  }

  private findQuestionVariantById(questionVariantId: string): Promise<AdminQuestionRecord | null> {
    return this.prisma.questionVariant.findFirst({
      where: {
        id: questionVariantId,
        deletedAt: null,
        question: {
          deletedAt: null,
        },
      },
      select: ADMIN_QUESTION_SELECT,
    });
  }
}
