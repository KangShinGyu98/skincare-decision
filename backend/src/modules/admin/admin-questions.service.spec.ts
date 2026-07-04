import { NotFoundException } from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';
import {
  ComparisonOperator,
  ConditionState,
  QuestionAnswerType,
  Screen,
  UiSection,
} from '../../generated/prisma/enums';
import { AdminQuestionsRepository, type AdminQuestionRecord } from './admin-questions.repository';
import { AdminQuestionsService } from './admin-questions.service';

describe('AdminQuestionsService', () => {
  let service: AdminQuestionsService;
  let repositoryMock: jest.Mocked<
    Pick<AdminQuestionsRepository, 'findQuestions' | 'updateQuestionStatus'>
  >;

  beforeEach(async () => {
    repositoryMock = {
      findQuestions: jest.fn(),
      updateQuestionStatus: jest.fn(),
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
      status: 'active',
    });
    expect(result.items).toEqual([
      {
        id: '01935b8f-0000-7000-8000-000000000201',
        questionId: '01935b8f-0000-7000-8000-000000000301',
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
          'screen EQ context AND ui_section EQ category AND visibility_condition EQ 2',
        screen: 'context',
        uiSection: 'category',
        status: 'active',
        memo: null,
      },
    ]);
  });

  it('findQuestions는 category 필터에서 공통 질문과 해당 category 조건 질문만 남긴다', async () => {
    repositoryMock.findQuestions.mockResolvedValue([
      createQuestionRecord({
        id: '01935b8f-0000-7000-8000-000000000201',
        visibilityConditions: [],
      }),
      createQuestionRecord({
        id: '01935b8f-0000-7000-8000-000000000202',
        visibilityConditions: [
          {
            operator: ComparisonOperator.EQ,
            value: 2,
            state: ConditionState.REQUIRED,
          },
        ],
      }),
      createQuestionRecord({
        id: '01935b8f-0000-7000-8000-000000000203',
        visibilityConditions: [
          {
            operator: ComparisonOperator.EQ,
            value: 4,
            state: ConditionState.REQUIRED,
          },
        ],
      }),
    ]);

    const result = await service.findQuestions({ category: 'sunscreen' });

    expect(result.items.map((item) => item.id)).toEqual([
      '01935b8f-0000-7000-8000-000000000201',
      '01935b8f-0000-7000-8000-000000000202',
    ]);
  });

  it('updateStatus는 상태 변경 후 table row를 반환한다', async () => {
    repositoryMock.updateQuestionStatus.mockResolvedValue(
      createQuestionRecord({
        isActive: false,
      }),
    );

    const result = await service.updateStatus('01935b8f-0000-7000-8000-000000000201', {
      status: 'inactive',
    });

    expect(repositoryMock.updateQuestionStatus).toHaveBeenCalledWith(
      '01935b8f-0000-7000-8000-000000000201',
      false,
    );
    expect(result.status).toBe('inactive');
  });

  it('updateStatus는 대상 question variant가 없으면 NotFoundException을 던진다', async () => {
    repositoryMock.updateQuestionStatus.mockResolvedValue(null);

    await expect(
      service.updateStatus('01935b8f-0000-7000-8000-000000000999', {
        status: 'active',
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
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
