import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';
import {
  ComparisonOperator,
  ConditionState,
  QuestionAnswerType,
  Screen,
  UiSection,
} from '../../generated/prisma/enums';
import {
  type AdminQuestionDetailRecord,
  AdminQuestionsRepository,
  InvalidAdminQuestionVariantError,
  type AdminQuestionRecord,
} from './admin-questions.repository';
import { AdminQuestionsService } from './admin-questions.service';

describe('AdminQuestionsService', () => {
  let service: AdminQuestionsService;
  let repositoryMock: jest.Mocked<
    Pick<
      AdminQuestionsRepository,
      'findQuestions' | 'findQuestionById' | 'createQuestion' | 'updateQuestion' | 'deleteQuestion'
    >
  >;

  beforeEach(async () => {
    repositoryMock = {
      findQuestions: jest.fn(),
      findQuestionById: jest.fn(),
      createQuestion: jest.fn(),
      updateQuestion: jest.fn(),
      deleteQuestion: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdminQuestionsService,
        {
          provide: AdminQuestionsRepository,
          useValue: repositoryMock,
        },
      ],
    }).compile();

    service = module.get(AdminQuestionsService);
  });

  it('findQuestions는 question variant record를 Question Check table row로 변환한다', async () => {
    repositoryMock.findQuestions.mockResolvedValue([
      createQuestionRecord({
        category: 'sunscreen',
        visibilityConditions: [
          {
            operator: ComparisonOperator.EQ,
            value: 2,
            state: ConditionState.REQUIRED,
          },
        ],
      }),
    ]);

    const result = await service.findQuestions({
      screen: 'context',
      uiSection: 'category',
      category: 'sunscreen',
      status: 'active',
    });

    expect(repositoryMock.findQuestions).toHaveBeenCalledWith({
      screen: 'context',
      uiSection: 'category',
      category: 'sunscreen',
      status: 'active',
    });
    expect(result.items).toEqual([
      {
        id: '01935b8f-0000-7000-8000-000000000301',
        questionId: '01935b8f-0000-7000-8000-000000000301',
        questionVariantId: '01935b8f-0000-7000-8000-000000000201',
        question: 'category.selected',
        questionVariant: '추천받을 제품군을 선택해 주세요.',
        answerType: 'SINGLE_CHOICE',
        userOptions: [
          { label: '토너', value: 1 },
          { label: '선크림', value: 2 },
          { label: '세럼', value: 3 },
          { label: '립케어', value: 4 },
          { label: '로션/크림', value: 5 },
          { label: '클렌저', value: 6 },
        ],
        visibilityConditionText:
          'screen EQ context AND ui_section EQ category AND category EQ sunscreen AND visibility_condition EQ 2',
        screen: 'context',
        uiSection: 'category',
        category: 'sunscreen',
        status: 'active',
        memo: null,
      },
    ]);
  });

  it('findQuestions는 category 필터를 repository로 전달한다', async () => {
    repositoryMock.findQuestions.mockResolvedValue([
      createQuestionRecord({
        id: '01935b8f-0000-7000-8000-000000000201',
        category: null,
      }),
    ]);

    const result = await service.findQuestions({ category: 'sunscreen' });

    expect(repositoryMock.findQuestions).toHaveBeenCalledWith({
      category: 'sunscreen',
    });
    expect(result.items[0]?.category).toBeNull();
  });

  it('findQuestion은 questionId 기준 detail과 variants를 반환한다', async () => {
    repositoryMock.findQuestionById.mockResolvedValue(createQuestionDetailRecord());

    const result = await service.findQuestion('01935b8f-0000-7000-8000-000000000301');

    expect(repositoryMock.findQuestionById).toHaveBeenCalledWith(
      '01935b8f-0000-7000-8000-000000000301',
    );
    expect(result).toEqual(
      expect.objectContaining({
        id: '01935b8f-0000-7000-8000-000000000301',
        question: 'category.selected',
        answerType: 'SINGLE_CHOICE',
        status: 'active',
      }),
    );
    expect(result.variants[0]).toEqual(
      expect.objectContaining({
        id: '01935b8f-0000-7000-8000-000000000201',
        title: '추천받을 제품군을 선택해 주세요.',
        sort_order: 10,
        category: 'sunscreen',
      }),
    );
  });

  it('createQuestion은 canonical question과 variants 입력을 저장한다', async () => {
    repositoryMock.createQuestion.mockResolvedValue(createQuestionDetailRecord());

    const result = await service.createQuestion(createQuestionMutationBody());

    expect(repositoryMock.createQuestion).toHaveBeenCalledWith(
      expect.objectContaining({
        key: 'category.selected',
        answerType: 'SINGLE_CHOICE',
        answerValues: [1, 2, 3, 4, 5, 6],
        isActive: true,
        variants: [
          expect.objectContaining({
            title: '추천받을 제품군을 선택해 주세요.',
            sortOrder: 10,
            isActive: true,
          }),
        ],
      }),
    );
    expect(result.questionId).toBe('01935b8f-0000-7000-8000-000000000301');
  });

  it('createQuestion은 answerValues와 variant answers 개수가 다르면 BadRequestException을 던진다', async () => {
    const body = createQuestionMutationBody();
    body.variants[0]!.answers = ['토너'];

    await expect(service.createQuestion(body)).rejects.toBeInstanceOf(BadRequestException);
    expect(repositoryMock.createQuestion).not.toHaveBeenCalled();
  });

  it('updateQuestion은 대상 question이 없으면 NotFoundException을 던진다', async () => {
    repositoryMock.updateQuestion.mockResolvedValue(null);

    await expect(
      service.updateQuestion('01935b8f-0000-7000-8000-000000000999', createQuestionMutationBody()),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('updateQuestion은 unknown variant를 BadRequestException으로 변환한다', async () => {
    repositoryMock.updateQuestion.mockRejectedValue(
      new InvalidAdminQuestionVariantError('Unknown question variant id'),
    );

    await expect(
      service.updateQuestion('01935b8f-0000-7000-8000-000000000301', createQuestionMutationBody()),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('deleteQuestion은 questionId 기준 soft delete 응답을 반환한다', async () => {
    repositoryMock.deleteQuestion.mockResolvedValue(true);

    const result = await service.deleteQuestion('01935b8f-0000-7000-8000-000000000301');

    expect(repositoryMock.deleteQuestion).toHaveBeenCalledWith(
      '01935b8f-0000-7000-8000-000000000301',
    );
    expect(result).toEqual({
      id: '01935b8f-0000-7000-8000-000000000301',
      deleted: true,
    });
  });
});

function createQuestionRecord(overrides: Partial<AdminQuestionRecord> = {}): AdminQuestionRecord {
  return {
    id: '01935b8f-0000-7000-8000-000000000201',
    questionId: '01935b8f-0000-7000-8000-000000000301',
    title: '추천받을 제품군을 선택해 주세요.',
    answers: ['토너', '선크림', '세럼', '립케어', '로션/크림', '클렌저'],
    screen: Screen.context,
    uiSection: UiSection.category,
    category: null,
    sortOrder: 10,
    isActive: true,
    question: {
      key: 'category.selected',
      answerType: QuestionAnswerType.SINGLE_CHOICE,
      answerValues: [1, 2, 3, 4, 5, 6],
    },
    visibilityConditions: [],
    ...overrides,
  };
}

function createQuestionDetailRecord(
  overrides: Partial<AdminQuestionDetailRecord> = {},
): AdminQuestionDetailRecord {
  return {
    id: '01935b8f-0000-7000-8000-000000000301',
    key: 'category.selected',
    answerType: QuestionAnswerType.SINGLE_CHOICE,
    answerValues: [1, 2, 3, 4, 5, 6],
    isActive: true,
    variants: [
      {
        id: '01935b8f-0000-7000-8000-000000000201',
        title: '추천받을 제품군을 선택해 주세요.',
        answers: ['토너', '선크림', '세럼', '립케어', '로션/크림', '클렌저'],
        screen: Screen.context,
        uiSection: UiSection.category,
        category: 'sunscreen',
        sortOrder: 10,
        isActive: true,
        visibilityConditions: [
          {
            operator: ComparisonOperator.EQ,
            value: 2,
            state: ConditionState.REQUIRED,
          },
        ],
      },
    ],
    ...overrides,
  };
}

function createQuestionMutationBody() {
  return {
    question: 'category.selected',
    answerType: 'SINGLE_CHOICE' as const,
    answerValues: [1, 2, 3, 4, 5, 6],
    status: 'active' as const,
    variants: [
      {
        id: '01935b8f-0000-7000-8000-000000000201',
        title: '추천받을 제품군을 선택해 주세요.',
        answers: ['토너', '선크림', '세럼', '립케어', '로션/크림', '클렌저'],
        screen: 'context' as const,
        uiSection: 'category' as const,
        category: 'sunscreen' as const,
        sort_order: 10,
        status: 'active' as const,
        visibilityConditions: [
          {
            operator: 'EQ' as const,
            value: 2,
            state: 'REQUIRED' as const,
          },
        ],
      },
    ],
  };
}
