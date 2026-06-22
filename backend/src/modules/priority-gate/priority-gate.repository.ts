import { Screen, UiSection, type QuestionAnswerType } from '../../generated/prisma/enums';
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
}
