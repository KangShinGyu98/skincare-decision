import { randomUUID } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import type {
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
        ...(input.status ? { isActive: input.status === 'active' } : {}),
      },
      select: ADMIN_QUESTION_SELECT,
      orderBy: [
        { screen: 'asc' },
        { uiSection: 'asc' },
        { sortOrder: 'asc' },
        { createdAt: 'asc' },
      ],
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
}
