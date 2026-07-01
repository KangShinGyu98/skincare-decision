import { Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { Prisma } from '../../generated/prisma/client';
import { UserResponseSource } from '../../generated/prisma/enums';
import { PrismaService } from '../../prisma/prisma.service';

export type UpsertUserResponseInput = {
  deviceId: string;
  userId?: string;
  questionId: string;
  value: number[];
  source: UserResponseSource;
};

export type DeleteUserResponsesInput = {
  deviceId: string;
  userId?: string;
  questionIds: string[];
};

@Injectable()
export class UserResponsesService {
  constructor(private readonly prisma: PrismaService) {}

  async upsertCurrentResponse(input: UpsertUserResponseInput): Promise<void> {
    if (input.userId) {
      await this.createUserCurrentResponseUpsert(input);
      return;
    }

    await this.createAnonymousCurrentResponseUpsert(input);
  }

  async upsertCurrentResponses(inputs: UpsertUserResponseInput[]): Promise<void> {
    if (inputs.length === 0) {
      return;
    }

    await this.prisma.$transaction(
      inputs.map((input) =>
        input.userId
          ? this.createUserCurrentResponseUpsert(input)
          : this.createAnonymousCurrentResponseUpsert(input),
      ),
    );
  }

  async deleteCurrentResponses(input: DeleteUserResponsesInput): Promise<number> {
    const questionIds = [...new Set(input.questionIds)];

    if (questionIds.length === 0) {
      return 0;
    }

    const questionIdList = this.toUuidListSql(questionIds);

    if (input.userId) {
      return this.prisma.$executeRaw`
        DELETE FROM user_responses
        WHERE user_id = ${input.userId}::uuid
          AND question_id IN (${questionIdList})
      `;
    }

    return this.prisma.$executeRaw`
      DELETE FROM user_responses
      WHERE device_id = ${input.deviceId}::uuid
        AND user_id IS NULL
        AND question_id IN (${questionIdList})
    `;
  }

  private createUserCurrentResponseUpsert(input: UpsertUserResponseInput) {
    return this.prisma.$executeRaw`
      INSERT INTO user_responses (
        id,
        device_id,
        user_id,
        question_id,
        value,
        source
      )
      VALUES (
        ${randomUUID()}::uuid,
        ${input.deviceId}::uuid,
        ${input.userId}::uuid,
        ${input.questionId}::uuid,
        ${this.toIntegerArraySql(input.value)},
        ${input.source}::user_responses_source_enum
      )
      ON CONFLICT (user_id, question_id)
      WHERE user_id IS NOT NULL
      DO UPDATE SET
        value = EXCLUDED.value,
        source = EXCLUDED.source,
        updated_at = now()
    `;
  }

  private createAnonymousCurrentResponseUpsert(input: UpsertUserResponseInput) {
    return this.prisma.$executeRaw`
      INSERT INTO user_responses (
        id,
        device_id,
        user_id,
        question_id,
        value,
        source
      )
      VALUES (
        ${randomUUID()}::uuid,
        ${input.deviceId}::uuid,
        NULL,
        ${input.questionId}::uuid,
        ${this.toIntegerArraySql(input.value)},
        ${input.source}::user_responses_source_enum
      )
      ON CONFLICT (device_id, question_id)
      WHERE user_id IS NULL
      DO UPDATE SET
        value = EXCLUDED.value,
        source = EXCLUDED.source,
        updated_at = now()
    `;
  }

  private toIntegerArraySql(value: number[]): Prisma.Sql {
    if (value.length === 0) {
      return Prisma.sql`ARRAY[]::integer[]`;
    }

    return Prisma.sql`ARRAY[${Prisma.join(value)}]::integer[]`;
  }

  private toUuidListSql(value: string[]): Prisma.Sql {
    return Prisma.join(value.map((id) => Prisma.sql`${id}::uuid`));
  }
}
