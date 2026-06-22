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
      | 'findCategoryDecisionQuestions'
      | 'findCurrentResponses'
      | 'findProductCategoryByKey'
      | 'findQuestionByKey'
    >
  >;
  let userResponsesServiceMock: jest.Mocked<Pick<UserResponsesService, 'upsertCurrentResponse'>>;

  beforeEach(async () => {
    repositoryMock = {
      findCategoryDecisionQuestions: jest.fn(),
      findCurrentResponses: jest.fn(),
      findProductCategoryByKey: jest.fn(),
      findQuestionByKey: jest.fn(),
    };
    userResponsesServiceMock = {
      upsertCurrentResponse: jest.fn(),
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

  it('getCategoryDecision saves category query as category.selected response', async () => {
    const categoryQuestion = createQuestionRecord({
      id: '018f0000-0000-7000-8000-000000000101',
      questionId: '018f0000-0000-7000-8000-000000000201',
      key: 'category.selected',
      title: 'Choose category',
      answerType: QuestionAnswerType.SINGLE_CHOICE,
      answers: ['Toner', 'Sunscreen', 'Serum', 'Lipcare', 'Moisturizer', 'Cleanser'],
      answerValues: [1, 2, 3, 4, 5, 6],
      uiSection: UiSection.category,
      sortOrder: 10,
    });
    const skinQuestion = createQuestionRecord({
      id: '018f0000-0000-7000-8000-000000000102',
      questionId: '018f0000-0000-7000-8000-000000000202',
      key: 'context.skin_type',
      title: 'Skin type',
      uiSection: UiSection.basic,
      sortOrder: 20,
    });
    const category = {
      id: '018f0000-0000-7000-8000-000000000301',
      key: 'sunscreen',
      name: 'Sunscreen',
      description: null,
    };

    repositoryMock.findProductCategoryByKey.mockResolvedValue(category);
    repositoryMock.findQuestionByKey.mockResolvedValue({ id: categoryQuestion.questionId });
    repositoryMock.findCategoryDecisionQuestions.mockResolvedValue([
      categoryQuestion,
      skinQuestion,
    ]);
    repositoryMock.findCurrentResponses.mockResolvedValue([
      {
        questionId: categoryQuestion.questionId,
        value: [2],
      },
    ]);

    const result = await service.getCategoryDecision({
      deviceId: '018f0000-0000-7000-8000-000000000001',
      userId: '018f0000-0000-7000-8000-000000000002',
      category: 'sunscreen',
    });

    expect(userResponsesServiceMock.upsertCurrentResponse).toHaveBeenCalledWith({
      deviceId: '018f0000-0000-7000-8000-000000000001',
      userId: '018f0000-0000-7000-8000-000000000002',
      questionId: categoryQuestion.questionId,
      value: [2],
      source: UserResponseSource.context,
    });
    expect(result.selectedCategory).toEqual(category);
    expect(result.sections).toEqual([
      {
        key: 'category',
        questions: [
          expect.objectContaining({
            key: 'category.selected',
            currentResponse: [2],
          }),
        ],
      },
      {
        key: 'basic',
        questions: [
          expect.objectContaining({
            key: 'context.skin_type',
            currentResponse: null,
          }),
        ],
      },
    ]);
  });

  it('getResponseReaction saves context answer and returns product matrix CTA when category is selected', async () => {
    const categoryQuestion = createQuestionRecord({
      questionId: '018f0000-0000-7000-8000-000000000201',
      key: 'category.selected',
      answerType: QuestionAnswerType.SINGLE_CHOICE,
      answers: ['Toner', 'Sunscreen', 'Serum', 'Lipcare', 'Moisturizer', 'Cleanser'],
      answerValues: [1, 2, 3, 4, 5, 6],
      uiSection: UiSection.category,
    });
    const skinQuestion = createQuestionRecord({
      id: '018f0000-0000-7000-8000-000000000102',
      questionId: '018f0000-0000-7000-8000-000000000202',
      key: 'context.skin_type',
      uiSection: UiSection.basic,
    });
    const body = {
      questionId: categoryQuestion.questionId,
      questionVariantId: categoryQuestion.id,
      value: [2],
    };

    repositoryMock.findCategoryDecisionQuestions.mockResolvedValue([
      categoryQuestion,
      skinQuestion,
    ]);
    repositoryMock.findCurrentResponses.mockResolvedValue([]);
    repositoryMock.findProductCategoryByKey.mockResolvedValue({
      id: '018f0000-0000-7000-8000-000000000301',
      key: 'sunscreen',
      name: 'Sunscreen',
      description: null,
    });

    const result = await service.getResponseReaction({
      deviceId: '018f0000-0000-7000-8000-000000000001',
      body,
    });

    expect(userResponsesServiceMock.upsertCurrentResponse).toHaveBeenCalledWith({
      deviceId: '018f0000-0000-7000-8000-000000000001',
      questionId: body.questionId,
      value: [2],
      source: UserResponseSource.context,
    });
    expect(result.response).toEqual(body);
    expect(result.previewResult).toEqual({
      title: 'Ready to narrow Sunscreen',
      description: 'The saved answers will be used to prepare the initial product matrix filters.',
      cta: {
        label: 'View product matrix',
        target: '/product-matrix?category=sunscreen&source=CATEGORY_DECISION_CTA',
      },
      selectedCategory: {
        id: '018f0000-0000-7000-8000-000000000301',
        key: 'sunscreen',
        name: 'Sunscreen',
        description: null,
      },
      answeredQuestionCount: 1,
      totalQuestionCount: 2,
    });
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
    sortOrder: number;
  }> = {},
): CategoryDecisionQuestionRecord {
  return {
    id: overrides.id ?? '018f0000-0000-7000-8000-000000000101',
    questionId: overrides.questionId ?? '018f0000-0000-7000-8000-000000000201',
    title: overrides.title ?? 'Question',
    answers: overrides.answers ?? ['No', 'Yes'],
    uiSection: overrides.uiSection ?? UiSection.basic,
    sortOrder: overrides.sortOrder ?? 10,
    question: {
      key: overrides.key ?? 'context.skin_type',
      answerType: overrides.answerType ?? QuestionAnswerType.BOOLEAN,
      answerValues: overrides.answerValues ?? [0, 1],
    },
  };
}
