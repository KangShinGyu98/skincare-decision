import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class LandingConcernSelectionsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findQuestionIdsByKeys(questionKeys: readonly string[]): Promise<Map<string, string>> {
    const questions = await this.prisma.question.findMany({
      where: {
        key: {
          in: [...questionKeys],
        },
        deletedAt: null,
      },
      select: {
        id: true,
        key: true,
      },
    });

    return new Map(questions.map((question) => [question.key, question.id]));
  }
}
