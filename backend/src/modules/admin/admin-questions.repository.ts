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
  isActive: boolean;
  question: {
    key: string;
    answerType: QuestionAnswerType;
    answerValues: number[];
  };
  visibilityConditions: AdminQuestionVisibilityConditionRecord[];
};

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

  async updateQuestionStatus(
    questionVariantId: string,
    isActive: boolean,
  ): Promise<AdminQuestionRecord | null> {
    const result = await this.prisma.questionVariant.updateMany({
      where: {
        id: questionVariantId,
        deletedAt: null,
      },
      data: {
        isActive,
      },
    });

    if (result.count === 0) {
      return null;
    }

    return this.findQuestionById(questionVariantId);
  }

  private async findQuestionById(questionVariantId: string): Promise<AdminQuestionRecord | null> {
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
