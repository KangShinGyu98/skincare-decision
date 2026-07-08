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
} from '../../generated/prisma/enums';
import { PrismaService } from '../../prisma/prisma.service';
import { CategoryDecisionRepository } from './category-decision.repository';

describe('CategoryDecisionRepository', () => {
  let testingModule: TestingModule;
  let prisma: PrismaService;
  let repository: CategoryDecisionRepository;

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
      providers: [PrismaService, CategoryDecisionRepository],
    }).compile();

    prisma = testingModule.get(PrismaService);
    repository = testingModule.get(CategoryDecisionRepository);
  });

  beforeEach(async () => {
    await prisma.$executeRawUnsafe(`
      TRUNCATE TABLE
        session_events,
        user_responses,
        user_sessions,
        devices,
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

  it('findCategoryDecisionQuestions returns active context questions only', async () => {
    await createQuestionVariant({
      questionKey: 'category.selected',
      title: 'Choose category',
      answerType: QuestionAnswerType.SINGLE_CHOICE,
      answerValues: [1, 2],
      answers: ['Toner', 'Sunscreen'],
      screen: Screen.context,
      uiSection: UiSection.category,
      sortOrder: 10,
    });
    await createQuestionVariant({
      questionKey: 'context.skin_type',
      title: 'Skin type',
      screen: Screen.context,
      uiSection: UiSection.basic,
      sortOrder: 20,
    });
    await createQuestionVariant({
      questionKey: 'life.recent_irritation',
      title: 'Priority gate question',
      screen: Screen.priority_gate,
      uiSection: UiSection.life_routine,
      sortOrder: 10,
    });

    const result = await repository.findCategoryDecisionQuestions();

    expect(result.map((question) => question.question.key)).toEqual([
      'category.selected',
      'context.skin_type',
    ]);
  });

  it('findCurrentResponses returns anonymous and signed-in current answers in newest order', async () => {
    const deviceId = randomUUID();
    const userId = randomUUID();
    const { questionId } = await createQuestionVariant({
      questionKey: 'context.skin_type',
      title: 'Skin type',
      screen: Screen.context,
      uiSection: UiSection.basic,
      sortOrder: 20,
    });

    await prisma.user.create({
      data: {
        id: userId,
        email: `${userId}@example.com`,
        name: 'Test User',
        role: 'USER',
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
        value: [1],
        source: UserResponseSource.context,
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
        value: [2],
        source: UserResponseSource.context,
        createdAt: new Date('2026-01-02T00:00:00.000Z'),
        updatedAt: new Date('2026-01-02T00:00:00.000Z'),
      },
    });

    const result = await repository.findCurrentResponses(deviceId, [questionId], userId);

    expect(result.map((response) => response.value)).toEqual([[2], [1]]);
  });

  it('findProductCategoryByKey and findQuestionByKey return active records', async () => {
    await prisma.productCategory.create({
      data: {
        id: '018f0000-0000-7000-8000-000000000301',
        key: 'sunscreen',
        name: 'Sunscreen',
        description: null,
      },
    });
    await prisma.question.create({
      data: {
        id: '018f0000-0000-7000-8000-000000000201',
        key: 'category.selected',
        answerType: QuestionAnswerType.SINGLE_CHOICE,
        answerValues: [1, 2],
      },
    });

    await expect(repository.findProductCategoryByKey('sunscreen')).resolves.toEqual({
      id: '018f0000-0000-7000-8000-000000000301',
      key: 'sunscreen',
      name: 'Sunscreen',
      description: null,
      sortOrder: 0,
    });
    await expect(repository.findQuestionByKey('category.selected')).resolves.toEqual({
      id: '018f0000-0000-7000-8000-000000000201',
    });
  });

  async function createQuestionVariant(input: {
    questionKey: string;
    title: string;
    screen: Screen;
    uiSection: UiSection;
    category?: string | null;
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
        category: input.category ?? null,
        sortOrder: input.sortOrder,
      },
    });

    return { questionId, variantId };
  }
});
