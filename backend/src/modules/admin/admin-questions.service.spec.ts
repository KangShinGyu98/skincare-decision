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
  InvalidAdminQuestionSortOrderError,
  InvalidAdminQuestionVariantError,
  type AdminQuestionRecord,
} from './admin-questions.repository';
import { AdminQuestionsService } from './admin-questions.service';

describe('AdminQuestionsService', () => {
  let service: AdminQuestionsService;
  let repositoryMock: jest.Mocked<
    Pick<
      AdminQuestionsRepository,
      | 'findQuestions'
      | 'findQuestionById'
      | 'createQuestion'
      | 'updateQuestion'
      | 'deleteQuestion'
      | 'updateQuestionVariantStatus'
      | 'updateQuestionVariantSortOrder'
    >
  >;

  beforeEach(async () => {
    repositoryMock = {
      findQuestions: jest.fn(),
      findQuestionById: jest.fn(),
      createQuestion: jest.fn(),
      updateQuestion: jest.fn(),
      deleteQuestion: jest.fn(),
      updateQuestionVariantStatus: jest.fn(),
      updateQuestionVariantSortOrder: jest.fn(),
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
            conditionQuestion: {
              id: '01935b8f-0000-7000-8000-000000000301',
              key: 'category.selected',
            },
            operator: ComparisonOperator.EQ,
            value: 1,
            state: ConditionState.REQUIRED,
          },
        ],
      }),
    ]);

    const result = await service.findQuestions({
      uiSection: 'category',
    });

    expect(repositoryMock.findQuestions).toHaveBeenCalledWith({
      uiSection: 'category',
    });
    expect(result.items).toEqual([
      {
        id: '01935b8f-0000-7000-8000-000000000201',
        questionId: '01935b8f-0000-7000-8000-000000000301',
        questionVariantId: '01935b8f-0000-7000-8000-000000000201',
        sort_order: 10,
        question: 'category.selected',
        questionVariant: '추천받을 제품군을 선택해 주세요.',
        answerType: 'SINGLE_CHOICE',
        userOptions: [
          { label: '토너', value: 0 },
          { label: '선크림', value: 1 },
          { label: '세럼', value: 2 },
          { label: '립케어', value: 3 },
          { label: '로션/크림', value: 4 },
          { label: '클렌저', value: 5 },
        ],
        visibilityConditions: [
          {
            questionId: '01935b8f-0000-7000-8000-000000000301',
            questionKey: 'category.selected',
            operator: 'EQ',
            value: 1,
            state: 'REQUIRED',
          },
        ],
        screen: 'context',
        uiSection: 'category',
        category: 'sunscreen',
        status: 'active',
        memo: null,
      },
    ]);
  });

  it('findQuestions는 uiSection 필터를 repository로 전달한다', async () => {
    repositoryMock.findQuestions.mockResolvedValue([
      createQuestionRecord({
        id: '01935b8f-0000-7000-8000-000000000201',
        uiSection: UiSection.owned_products,
      }),
    ]);

    const result = await service.findQuestions({ uiSection: 'owned_products' });

    expect(repositoryMock.findQuestions).toHaveBeenCalledWith({
      uiSection: 'owned_products',
    });
    expect(result.items[0]?.uiSection).toBe('owned_products');
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
        answerValues: [0, 1, 2, 3, 4, 5],
        isActive: true,
        variants: [
          expect.objectContaining({
            title: '추천받을 제품군을 선택해 주세요.',
            sortOrder: 10,
            sortAfterQuestionVariantId: '01935b8f-0000-7000-8000-000000000202',
            isActive: true,
          }),
        ],
      }),
    );
    expect(result.questionId).toBe('01935b8f-0000-7000-8000-000000000301');
  });

  it('createQuestion은 answerCount와 variant answers 개수가 다르면 BadRequestException을 던진다', async () => {
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

  it('updateStatus는 questionVariantId 기준 상태를 변경하고 table row를 반환한다', async () => {
    repositoryMock.updateQuestionVariantStatus.mockResolvedValue(
      createQuestionRecord({ isActive: false }),
    );

    const result = await service.updateStatus('01935b8f-0000-7000-8000-000000000201', {
      status: 'inactive',
    });

    expect(repositoryMock.updateQuestionVariantStatus).toHaveBeenCalledWith(
      '01935b8f-0000-7000-8000-000000000201',
      false,
    );
    expect(result).toEqual(
      expect.objectContaining({
        id: '01935b8f-0000-7000-8000-000000000201',
        questionVariantId: '01935b8f-0000-7000-8000-000000000201',
        status: 'inactive',
      }),
    );
  });

  it('updateStatus는 대상 variant가 없으면 NotFoundException을 던진다', async () => {
    repositoryMock.updateQuestionVariantStatus.mockResolvedValue(null);

    await expect(
      service.updateStatus('01935b8f-0000-7000-8000-000000000999', { status: 'active' }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('updateSortOrder는 question variant id 목록으로 순서를 저장한다', async () => {
    repositoryMock.updateQuestionVariantSortOrder.mockResolvedValue([
      createQuestionRecord({ sortOrder: 1 }),
    ]);

    const result = await service.updateSortOrder({
      questionVariantIds: ['01935b8f-0000-7000-8000-000000000201'],
    });

    expect(repositoryMock.updateQuestionVariantSortOrder).toHaveBeenCalledWith([
      '01935b8f-0000-7000-8000-000000000201',
    ]);
    expect(result.items[0]).toEqual(
      expect.objectContaining({
        id: '01935b8f-0000-7000-8000-000000000201',
        sort_order: 1,
      }),
    );
  });

  it('updateSortOrder는 잘못된 목록을 BadRequestException으로 변환한다', async () => {
    repositoryMock.updateQuestionVariantSortOrder.mockRejectedValue(
      new InvalidAdminQuestionSortOrderError('Invalid sort_order list'),
    );

    await expect(
      service.updateSortOrder({
        questionVariantIds: ['01935b8f-0000-7000-8000-000000000201'],
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
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
      answerValues: [0, 1, 2, 3, 4, 5],
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
    answerValues: [0, 1, 2, 3, 4, 5],
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
            conditionQuestion: {
              id: '01935b8f-0000-7000-8000-000000000301',
              key: 'category.selected',
            },
            operator: ComparisonOperator.EQ,
            value: 1,
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
    answerCount: 6,
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
        sortAfterQuestionVariantId: '01935b8f-0000-7000-8000-000000000202',
        status: 'active' as const,
        visibilityConditions: [
          {
            questionId: '01935b8f-0000-7000-8000-000000000301',
            operator: 'EQ' as const,
            value: 1,
            state: 'REQUIRED' as const,
          },
        ],
      },
    ],
  };
}
