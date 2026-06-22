import { ConfigModule } from '@nestjs/config';
import { Test, type TestingModule } from '@nestjs/testing';
import { randomUUID } from 'node:crypto';
import { getEnvFilePath } from '../../config/env-file-path';
import { validateEnv } from '../../config/env.validation';
import {
  QuestionAnswerType,
  Screen,
  UiSection,
  UserResponseSource,
  UserRole,
} from '../../generated/prisma/enums';
import { PrismaService } from '../../prisma/prisma.service';
import { PriorityGateRepository } from './priority-gate.repository';

describe('PriorityGateRepository', () => {
  let testingModule: TestingModule;
  let prisma: PrismaService;
  let repository: PriorityGateRepository;

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
      providers: [PrismaService, PriorityGateRepository],
    }).compile();

    prisma = testingModule.get(PrismaService);
    repository = testingModule.get(PriorityGateRepository);
  });

  beforeEach(async () => {
    await prisma.$executeRawUnsafe(`
      TRUNCATE TABLE
        session_events,
        user_responses,
        user_sessions,
        devices,
        question_visibility_conditions,
        question_variants,
        questions
      RESTART IDENTITY CASCADE
    `);
  });

  afterAll(async () => {
    await prisma?.$disconnect();
    await testingModule?.close();
  });

  it('findPriorityGateQuestions는 active priority_gate variants를 uiSection, sortOrder 순서로 반환한다', async () => {
    await createQuestionVariant({
      questionKey: 'product.owned_categories',
      title: 'owned sort 10',
      screen: Screen.priority_gate,
      uiSection: UiSection.owned_products,
      sortOrder: 10,
    });
    await createQuestionVariant({
      questionKey: 'life.recent_irritation',
      title: 'life sort 20',
      screen: Screen.priority_gate,
      uiSection: UiSection.life_routine,
      sortOrder: 20,
    });
    await createQuestionVariant({
      questionKey: 'routine.cleansing_stable',
      title: 'life sort 10',
      screen: Screen.priority_gate,
      uiSection: UiSection.life_routine,
      sortOrder: 10,
    });
    await createQuestionVariant({
      questionKey: 'context.skin_type',
      title: 'context question',
      screen: Screen.context,
      uiSection: UiSection.basic,
      sortOrder: 10,
    });

    const result = await repository.findPriorityGateQuestions();

    expect(result.map((question) => question.title)).toEqual([
      'life sort 10',
      'life sort 20',
      'owned sort 10',
    ]);
  });

  it('findPriorityGateQuestions는 question_variants.answers와 questions.answerValues를 함께 조회한다', async () => {
    await createQuestionVariant({
      questionKey: 'life.outdoor_activity',
      title: 'Outdoor activity time',
      answerType: QuestionAnswerType.THREE_CHOICE,
      answerValues: [1, 2, 3],
      answers: ['Under 1 hour', '1-3 hours', 'Over 3 hours'],
      screen: Screen.priority_gate,
      uiSection: UiSection.life_routine,
      sortOrder: 10,
    });

    const [question] = await repository.findPriorityGateQuestions();

    if (!question) {
      throw new Error('Expected one priority gate question');
    }

    expect(question.title).toBe('Outdoor activity time');
    expect(question.answers).toEqual(['Under 1 hour', '1-3 hours', 'Over 3 hours']);

    expect(question.question).toEqual({
      key: 'life.outdoor_activity',
      answerType: QuestionAnswerType.THREE_CHOICE,
      answerValues: [1, 2, 3],
    });
  });

  it('findCurrentResponses는 device/user 기준 current responses를 반환한다', async () => {
    const deviceId = randomUUID();
    const userId = randomUUID();
    const { questionId } = await createQuestionVariant({
      questionKey: 'life.recent_irritation',
      title: 'Recent irritation',
      screen: Screen.priority_gate,
      uiSection: UiSection.life_routine,
      sortOrder: 10,
    });

    await prisma.user.create({
      data: {
        id: userId,
        email: `${userId}@example.com`,
        name: 'Test User',
        role: UserRole.USER,
      },
    });
    await prisma.device.create({
      data: {
        id: deviceId,
      },
    });
    await prisma.userResponse.create({
      data: {
        id: randomUUID(),
        deviceId,
        questionId,
        value: [0],
        source: UserResponseSource.priority_gate,
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
        updatedAt: new Date('2026-01-01T00:00:00.000Z'),
      },
    });
    await prisma.userResponse.create({
      data: {
        id: randomUUID(),
        deviceId,
        userId,
        questionId,
        value: [1],
        source: UserResponseSource.priority_gate,
        createdAt: new Date('2026-01-02T00:00:00.000Z'),
        updatedAt: new Date('2026-01-02T00:00:00.000Z'),
      },
    });

    const signedInResponses = await repository.findCurrentResponses(deviceId, [questionId], userId);
    const anonymousResponses = await repository.findCurrentResponses(deviceId, [questionId]);

    expect(signedInResponses.map((response) => response.value)).toEqual([[1], [0]]);
    expect(anonymousResponses.map((response) => response.value)).toEqual([[0]]);
  });

  async function createQuestionVariant(input: {
    questionKey: string;
    title: string;
    screen: Screen;
    uiSection: UiSection;
    sortOrder: number;
    answerType?: QuestionAnswerType;
    answerValues?: number[];
    answers?: string[];
  }): Promise<{ questionId: string; variantId: string }> {
    const questionId = randomUUID();
    const variantId = randomUUID();

    await prisma.question.create({
      data: {
        id: questionId,
        key: input.questionKey,
        answerType: input.answerType ?? QuestionAnswerType.BOOLEAN,
        answerValues: input.answerValues ?? [0, 1],
      },
    });
    await prisma.questionVariant.create({
      data: {
        id: variantId,
        questionId,
        title: input.title,
        answers: input.answers ?? ['No', 'Yes'],
        screen: input.screen,
        uiSection: input.uiSection,
        sortOrder: input.sortOrder,
      },
    });

    return { questionId, variantId };
  }
});
