import { Test, type TestingModule } from '@nestjs/testing';
import { QuestionAnswerType, UiSection, UserResponseSource } from '../../generated/prisma/enums';
import { UserResponsesService } from '../user-responses/user-responses.service';
import {
  CategoryDecisionRepository,
  type CategoryDecisionQuestionRecord,
} from './category-decision.repository';
import { CategoryDecisionService } from './category-decision.service';

describe('CategoryDecisionService', () => {
  let service: CategoryDecisionService;
  let repositoryMock: jest.Mocked<
    Pick<
      CategoryDecisionRepository,
      'findCategoryDecisionQuestions' | 'findCurrentResponses' | 'findProductCategoryByKey'
    >
  >;
  let userResponsesServiceMock: jest.Mocked<
    Pick<UserResponsesService, 'upsertCurrentResponses' | 'deleteCurrentResponses'>
  >;

  beforeEach(async () => {
    repositoryMock = {
      findCategoryDecisionQuestions: jest.fn(),
      findCurrentResponses: jest.fn(),
      findProductCategoryByKey: jest.fn(),
    };
    userResponsesServiceMock = {
      upsertCurrentResponses: jest.fn(),
      deleteCurrentResponses: jest.fn(),
    };

    const testingModule: TestingModule = await Test.createTestingModule({
      providers: [
        CategoryDecisionService,
        {
          provide: CategoryDecisionRepository,
          useValue: repositoryMock,
        },
        {
          provide: UserResponsesService,
          useValue: userResponsesServiceMock,
        },
      ],
    }).compile();

    service = testingModule.get(CategoryDecisionService);
  });

  it('getCategoryDecision resolves the selected category from the query param without persisting it', async () => {
    const dailyUseQuestion = createQuestionRecord({
      id: '018f0000-0000-7000-8000-000000000101',
      questionId: '018f0000-0000-7000-8000-000000000201',
      key: 'context.daily_use',
      title: 'Looking for a daily product?',
      uiSection: UiSection.basic,
      sortOrder: 10,
    });
    const category = {
      id: '018f0000-0000-7000-8000-000000000301',
      key: 'sunscreen',
      name: 'Sunscreen',
      description: null,
      sortOrder: 20,
    };

    repositoryMock.findProductCategoryByKey.mockResolvedValue(category);
    repositoryMock.findCategoryDecisionQuestions.mockResolvedValue([dailyUseQuestion]);
    repositoryMock.findCurrentResponses.mockResolvedValue([
      {
        questionId: dailyUseQuestion.questionId,
        value: [1],
      },
    ]);

    const result = await service.getCategoryDecision({
      deviceId: '018f0000-0000-7000-8000-000000000001',
      userId: '018f0000-0000-7000-8000-000000000002',
      category: 'sunscreen',
    });

    expect(repositoryMock.findProductCategoryByKey).toHaveBeenCalledWith('sunscreen');
    expect(userResponsesServiceMock.upsertCurrentResponses).not.toHaveBeenCalled();
    expect(result.selectedCategory).toEqual(category);
    expect(result.sections).toEqual([
      {
        key: 'basic',
        questions: [
          expect.objectContaining({
            key: 'context.daily_use',
            currentResponse: [1],
          }),
        ],
      },
    ]);
    expect(result.previewResults).toEqual([
      {
        title: 'Ready to narrow Sunscreen',
        description:
          'The saved answers will be used to prepare the initial product matrix filters.',
        cta: {
          label: 'View product matrix',
          target: '/product-matrix?category=sunscreen&source=CATEGORY_DECISION_CTA',
        },
        selectedCategory: category,
        answeredQuestionCount: 1,
        totalQuestionCount: 1,
      },
    ]);
  });

  it('resetResponses deletes current answers for the selected ui section', async () => {
    const categoryQuestion = createQuestionRecord({
      id: '018f0000-0000-7000-8000-000000000101',
      questionId: '018f0000-0000-7000-8000-000000000201',
      key: 'product.sunscreen_type',
      uiSection: UiSection.category,
      category: 'sunscreen',
    });
    const skinQuestion = createQuestionRecord({
      id: '018f0000-0000-7000-8000-000000000102',
      questionId: '018f0000-0000-7000-8000-000000000202',
      key: 'context.skin_type',
      uiSection: UiSection.basic,
    });

    repositoryMock.findCategoryDecisionQuestions.mockResolvedValue([
      categoryQuestion,
      skinQuestion,
    ]);
    userResponsesServiceMock.deleteCurrentResponses.mockResolvedValue(1);

    const result = await service.resetResponses({
      deviceId: '018f0000-0000-7000-8000-000000000001',
      userId: '018f0000-0000-7000-8000-000000000002',
      uiSection: 'basic',
    });

    expect(userResponsesServiceMock.deleteCurrentResponses).toHaveBeenCalledWith({
      deviceId: '018f0000-0000-7000-8000-000000000001',
      userId: '018f0000-0000-7000-8000-000000000002',
      questionIds: [skinQuestion.questionId],
    });
    expect(result).toEqual({
      deletedCount: 1,
    });
  });

  it('getCategoryDecision returns common questions and selected category questions only', async () => {
    const dailyUseQuestion = createQuestionRecord({
      questionId: '018f0000-0000-7000-8000-000000000201',
      key: 'context.daily_use',
      uiSection: UiSection.basic,
      sortOrder: 10,
      category: null,
    });
    const sunscreenQuestion = createQuestionRecord({
      id: '018f0000-0000-7000-8000-000000000102',
      questionId: '018f0000-0000-7000-8000-000000000202',
      key: 'context.eye_sting',
      title: 'Eye sting',
      uiSection: UiSection.category,
      category: 'sunscreen',
      sortOrder: 20,
    });
    const lipcareQuestion = createQuestionRecord({
      id: '018f0000-0000-7000-8000-000000000103',
      questionId: '018f0000-0000-7000-8000-000000000203',
      key: 'preference.menthol_sensitive',
      title: 'Menthol sensitive',
      uiSection: UiSection.category,
      category: 'lipcare',
      sortOrder: 30,
    });
    const category = {
      id: '018f0000-0000-7000-8000-000000000301',
      key: 'sunscreen',
      name: 'Sunscreen',
      description: null,
      sortOrder: 20,
    };

    repositoryMock.findProductCategoryByKey.mockResolvedValue(category);
    repositoryMock.findCategoryDecisionQuestions.mockResolvedValue([
      dailyUseQuestion,
      sunscreenQuestion,
      lipcareQuestion,
    ]);
    repositoryMock.findCurrentResponses.mockResolvedValue([
      {
        questionId: dailyUseQuestion.questionId,
        value: [1],
      },
    ]);

    const result = await service.getCategoryDecision({
      deviceId: '018f0000-0000-7000-8000-000000000001',
      category: 'sunscreen',
    });

    expect(
      result.sections.flatMap((section) => section.questions.map((question) => question.key)),
    ).toEqual(['context.daily_use', 'context.eye_sting']);
    expect(result.previewResults[0]).toEqual(
      expect.objectContaining({
        answeredQuestionCount: 1,
        totalQuestionCount: 2,
      }),
    );
  });

  it('getCategoryDecision returns null selected category and empty previewResults when category is omitted', async () => {
    const skinQuestion = createQuestionRecord({
      id: '018f0000-0000-7000-8000-000000000102',
      questionId: '018f0000-0000-7000-8000-000000000202',
      key: 'context.skin_type',
      uiSection: UiSection.basic,
    });

    repositoryMock.findCategoryDecisionQuestions.mockResolvedValue([skinQuestion]);
    repositoryMock.findCurrentResponses.mockResolvedValue([]);

    const result = await service.getCategoryDecision({
      deviceId: '018f0000-0000-7000-8000-000000000001',
    });

    expect(repositoryMock.findProductCategoryByKey).not.toHaveBeenCalled();
    expect(result.selectedCategory).toBeNull();
    expect(result.previewResults).toEqual([]);
  });

  it('getResponseReaction saves answers and returns product matrix CTA for the requested category', async () => {
    const skinQuestion = createQuestionRecord({
      questionId: '018f0000-0000-7000-8000-000000000202',
      key: 'context.skin_type',
      uiSection: UiSection.basic,
    });
    const body = {
      category: 'sunscreen',
      responses: {
        [skinQuestion.id]: {
          questionId: skinQuestion.questionId,
          value: [1],
        },
      },
    };

    repositoryMock.findCategoryDecisionQuestions.mockResolvedValue([skinQuestion]);
    repositoryMock.findCurrentResponses.mockResolvedValue([
      {
        questionId: skinQuestion.questionId,
        value: [1],
      },
    ]);
    repositoryMock.findProductCategoryByKey.mockResolvedValue({
      id: '018f0000-0000-7000-8000-000000000301',
      key: 'sunscreen',
      name: 'Sunscreen',
      description: null,
      sortOrder: 20,
    });

    const result = await service.getResponseReaction({
      deviceId: '018f0000-0000-7000-8000-000000000001',
      body,
    });

    expect(userResponsesServiceMock.upsertCurrentResponses).toHaveBeenCalledWith([
      {
        deviceId: '018f0000-0000-7000-8000-000000000001',
        questionId: skinQuestion.questionId,
        value: [1],
        source: UserResponseSource.context,
      },
    ]);
    expect(repositoryMock.findProductCategoryByKey).toHaveBeenCalledWith('sunscreen');
    expect(result.responses).toEqual(body.responses);
    expect(result.previewResults).toEqual([
      {
        title: 'Ready to narrow Sunscreen',
        description:
          'The saved answers will be used to prepare the initial product matrix filters.',
        cta: {
          label: 'View product matrix',
          target: '/product-matrix?category=sunscreen&source=CATEGORY_DECISION_CTA',
        },
        selectedCategory: {
          id: '018f0000-0000-7000-8000-000000000301',
          key: 'sunscreen',
          name: 'Sunscreen',
          description: null,
          sortOrder: 20,
        },
        answeredQuestionCount: 1,
        totalQuestionCount: 1,
      },
    ]);
  });
});

function createQuestionRecord(
  overrides: Partial<{
    id: string;
    questionId: string;
    key: string;
    title: string;
    answerType: QuestionAnswerType;
    answers: string[];
    answerValues: number[];
    uiSection: UiSection;
    category: string | null;
    sortOrder: number;
  }> = {},
): CategoryDecisionQuestionRecord {
  return {
    id: overrides.id ?? '018f0000-0000-7000-8000-000000000101',
    questionId: overrides.questionId ?? '018f0000-0000-7000-8000-000000000201',
    title: overrides.title ?? 'Question',
    answers: overrides.answers ?? ['No', 'Yes'],
    uiSection: overrides.uiSection ?? UiSection.basic,
    category: overrides.category ?? null,
    sortOrder: overrides.sortOrder ?? 10,
    question: {
      key: overrides.key ?? 'context.skin_type',
      answerType: overrides.answerType ?? QuestionAnswerType.SINGLE_CHOICE,
      answerValues: overrides.answerValues ?? [0, 1],
    },
  };
}
