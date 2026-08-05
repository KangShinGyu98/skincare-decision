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
        decision_runs,
        session_events,
        user_responses,
        user_sessions,
        devices,
        priority_rule_conditions,
        priority_rules,
        product_categories,
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
      answerType: QuestionAnswerType.SINGLE_CHOICE,
      answerValues: [0, 1, 2],
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
      answerType: QuestionAnswerType.SINGLE_CHOICE,
      answerValues: [0, 1, 2],
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

  it('createDecisionRun은 priority gate snapshot을 저장한다', async () => {
    const deviceId = randomUUID();
    const sessionId = randomUUID();

    await prisma.device.create({
      data: {
        id: deviceId,
      },
    });
    await prisma.userSession.create({
      data: {
        id: sessionId,
        deviceId,
        entryPath: '/priority-gate',
      },
    });

    const decisionRun = await repository.createDecisionRun({
      deviceId,
      sessionId,
      decisionType: 'PRIORITY_GATE',
      sourceScreen: 'priority_gate',
      resultType: 'PASS',
      resultTitle: '현재 답변에서는 우선 확인할 신호가 없습니다',
      resultDescription:
        '지금까지 선택한 내용만으로는 새 제품 선택을 멈추거나 특정 제품군을 먼저 볼 조건이 발견되지 않았습니다.',
      ctaLabel: '제품군 고르기',
      ctaTarget: '/category-decision',
      inputSnapshot: {
        responses: [],
      },
      appliedFiltersSnapshot: {},
      resultSnapshot: {
        resultType: 'PASS',
      },
    });

    const saved = await prisma.decisionRun.findUniqueOrThrow({
      where: {
        id: decisionRun.id,
      },
      select: {
        deviceId: true,
        sessionId: true,
        decisionType: true,
        sourceScreen: true,
        resultType: true,
        resultTitle: true,
        ctaTarget: true,
        inputSnapshot: true,
        appliedFiltersSnapshot: true,
        resultSnapshot: true,
      },
    });

    expect(saved).toEqual({
      deviceId,
      sessionId,
      decisionType: 'PRIORITY_GATE',
      sourceScreen: 'priority_gate',
      resultType: 'PASS',
      resultTitle: '현재 답변에서는 우선 확인할 신호가 없습니다',
      ctaTarget: '/category-decision',
      inputSnapshot: {
        responses: [],
      },
      appliedFiltersSnapshot: {},
      resultSnapshot: {
        resultType: 'PASS',
      },
    });
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
        answerType: input.answerType ?? QuestionAnswerType.SINGLE_CHOICE,
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
