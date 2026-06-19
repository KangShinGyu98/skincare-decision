import { ConfigModule } from '@nestjs/config';
import { Test, type TestingModule } from '@nestjs/testing';
import { getEnvFilePath } from '../../config/env-file-path';
import { validateEnv } from '../../config/env.validation';
import { QuestionAnswerType } from '../../generated/prisma/enums';
import { PrismaService } from '../../prisma/prisma.service';
import { LandingConcernSelectionsRepository } from './landing-concern-selections.repository';

/**
 * LandingConcernSelectionsRepository 통합 테스트입니다.
 *
 * 실제 테스트 DB의 questions row를 조회해서
 * landing concern preset 저장에 필요한 question key -> id 매핑을 검증합니다.
 *
 * 검증 범위:
 * - 요청한 question key의 id를 Map 형태로 반환해야 한다.
 * - soft delete된 question은 반환하지 않아야 한다.
 */
describe('LandingConcernSelectionsRepository', () => {
  let testingModule: TestingModule;
  let prisma: PrismaService;
  let repository: LandingConcernSelectionsRepository;

  beforeAll(async () => {
    process.env['NODE_ENV'] = 'test';

    testingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          envFilePath: getEnvFilePath(),
          validate: validateEnv,
        }),
      ],
      providers: [PrismaService, LandingConcernSelectionsRepository],
    }).compile();

    prisma = testingModule.get(PrismaService);
    repository = testingModule.get(LandingConcernSelectionsRepository);
  });

  beforeEach(async () => {
    await prisma.$executeRawUnsafe(`
      TRUNCATE TABLE
        session_events,
        user_responses,
        user_sessions,
        devices,
        questions
      RESTART IDENTITY CASCADE
    `);
  });

  afterAll(async () => {
    await prisma?.$disconnect();
    await testingModule?.close();
  });

  it('요청한 question key의 id를 Map 형태로 반환해야 한다', async () => {
    await prisma.question.createMany({
      data: [
        {
          id: '01935b8f-0000-7000-8000-000000000101',
          key: 'flow.concern',
          answerType: QuestionAnswerType.MULTI_CHOICE,
          answerValues: [1, 2, 3],
        },
        {
          id: '01935b8f-0000-7000-8000-000000000102',
          key: 'life.recent_irritation',
          answerType: QuestionAnswerType.BOOLEAN,
          answerValues: [0, 1],
        },
      ],
    });

    const result = await repository.findQuestionIdsByKeys([
      'flow.concern',
      'life.recent_irritation',
    ]);

    expect(result).toEqual(
      new Map([
        ['flow.concern', '01935b8f-0000-7000-8000-000000000101'],
        ['life.recent_irritation', '01935b8f-0000-7000-8000-000000000102'],
      ]),
    );
  });

  it('soft delete된 question은 반환하지 않아야 한다', async () => {
    await prisma.question.createMany({
      data: [
        {
          id: '01935b8f-0000-7000-8000-000000000101',
          key: 'flow.concern',
          answerType: QuestionAnswerType.MULTI_CHOICE,
          answerValues: [1, 2, 3],
        },
        {
          id: '01935b8f-0000-7000-8000-000000000102',
          key: 'life.recent_irritation',
          answerType: QuestionAnswerType.BOOLEAN,
          answerValues: [0, 1],
          deletedAt: new Date('2026-06-19T00:00:00.000Z'),
        },
      ],
    });

    const result = await repository.findQuestionIdsByKeys([
      'flow.concern',
      'life.recent_irritation',
    ]);

    expect(result).toEqual(new Map([['flow.concern', '01935b8f-0000-7000-8000-000000000101']]));
  });
});
