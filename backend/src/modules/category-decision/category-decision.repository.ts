import { Injectable } from '@nestjs/common';
import { type QuestionAnswerType, Screen, UiSection } from '../../generated/prisma/enums';
import { PrismaService } from '../../prisma/prisma.service';

export type CategoryDecisionQuestionRecord = {
  id: string;
  questionId: string;
  title: string;
  answers: string[];
  uiSection: UiSection;
  category: string | null;
  sortOrder: number;
  question: {
    key: string;
    answerType: QuestionAnswerType;
    answerValues: number[];
  };
};

export type CategoryDecisionCurrentResponseRecord = {
  questionId: string;
  value: number[];
};

export type CategoryDecisionProductCategoryRecord = {
  id: string;
  key: string;
  name: string;
  description: string | null;
  sortOrder: number;
};

@Injectable()
export class CategoryDecisionRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findCategoryDecisionQuestions(): Promise<CategoryDecisionQuestionRecord[]> {
    return this.prisma.questionVariant.findMany({
      where: {
        screen: Screen.context,
        uiSection: {
          in: [UiSection.category, UiSection.basic],
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
        category: true,
        sortOrder: true,
        question: {
          select: {
            key: true,
            answerType: true,
            answerValues: true,
          },
        },
      },
      orderBy: [{ sortOrder: 'asc' }, { uiSection: 'asc' }],
    });
  }

  async findCurrentResponses(
    deviceId: string,
    questionIds: readonly string[],
    userId?: string,
  ): Promise<CategoryDecisionCurrentResponseRecord[]> {
    if (questionIds.length === 0) {
      return [];
    }

    return this.prisma.userResponse.findMany({
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
  }

  async findProductCategoryByKey(
    key: string,
  ): Promise<CategoryDecisionProductCategoryRecord | null> {
    return this.prisma.productCategory.findFirst({
      where: {
        key,
        deletedAt: null,
      },
      select: {
        id: true,
        key: true,
        name: true,
        description: true,
        sortOrder: true,
      },
    });
  }
}
