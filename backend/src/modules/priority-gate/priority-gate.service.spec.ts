import { Test, type TestingModule } from '@nestjs/testing';
import {
  ComparisonOperator,
  ConditionState,
  PriorityRuleResultType,
  QuestionAnswerType,
  UiSection,
  UserResponseSource,
} from '../../generated/prisma/enums';
import { UserResponsesService } from '../user-responses/user-responses.service';
import {
  PriorityGateRepository,
  type PriorityRuleRecord,
  type QuestionRecord,
} from './priority-gate.repository';
import { PriorityGateService } from './priority-gate.service';

describe('PriorityGateService', () => {
  let service: PriorityGateService;
  let repositoryMock: jest.Mocked<
    Pick<
      PriorityGateRepository,
      | 'findPriorityGateQuestions'
      | 'findCurrentResponses'
      | 'findPriorityRules'
      | 'findProductCategoriesByKeysOrIds'
      | 'createDecisionRun'
    >
  >;
  let userResponsesServiceMock: jest.Mocked<Pick<UserResponsesService, 'upsertCurrentResponses'>>;

  beforeEach(async () => {
    repositoryMock = {
      findPriorityGateQuestions: jest.fn(),
      findCurrentResponses: jest.fn(),
      findPriorityRules: jest.fn(),
      findProductCategoriesByKeysOrIds: jest.fn(),
      createDecisionRun: jest.fn(),
    };
    userResponsesServiceMock = {
      upsertCurrentResponses: jest.fn(),
    };

    const testingModule: TestingModule = await Test.createTestingModule({
      providers: [
        PriorityGateService,
        {
          provide: PriorityGateRepository,
          useValue: repositoryMock,
        },
        {
          provide: UserResponsesService,
          useValue: userResponsesServiceMock,
        },
      ],
    }).compile();

    service = testingModule.get(PriorityGateService);
  });

  it('getPriorityGate는 repository에서 questions와 current responses를 조회한다', async () => {
    repositoryMock.findPriorityGateQuestions.mockResolvedValue([
      createQuestionRecord({
        id: '018f0000-0000-7000-8000-000000000101',
        questionId: '018f0000-0000-7000-8000-000000000201',
      }),
      createQuestionRecord({
        id: '018f0000-0000-7000-8000-000000000102',
        questionId: '018f0000-0000-7000-8000-000000000202',
      }),
    ]);
    repositoryMock.findCurrentResponses.mockResolvedValue([]);

    await service.getPriorityGate({
      deviceId: '018f0000-0000-7000-8000-000000000001',
      userId: '018f0000-0000-7000-8000-000000000002',
    });

    expect(repositoryMock.findPriorityGateQuestions).toHaveBeenCalledTimes(1);
    expect(repositoryMock.findCurrentResponses).toHaveBeenCalledWith(
      '018f0000-0000-7000-8000-000000000001',
      ['018f0000-0000-7000-8000-000000000201', '018f0000-0000-7000-8000-000000000202'],
      '018f0000-0000-7000-8000-000000000002',
    );
  });

  it('getPriorityGate는 variant answers와 question answerValues를 answers DTO로 매핑한다', async () => {
    repositoryMock.findPriorityGateQuestions.mockResolvedValue([
      createQuestionRecord({
        id: '018f0000-0000-7000-8000-000000000101',
        questionId: '018f0000-0000-7000-8000-000000000201',
        answers: ['No', 'Yes'],
        answerValues: [0, 1],
      }),
    ]);
    repositoryMock.findCurrentResponses.mockResolvedValue([
      {
        questionId: '018f0000-0000-7000-8000-000000000201',
        value: [1],
      },
    ]);

    const result = await service.getPriorityGate({
      deviceId: '018f0000-0000-7000-8000-000000000001',
    });

    expect(result).toEqual({
      sections: [
        {
          key: 'life_routine',
          questions: [
            expect.objectContaining({
              answers: [
                { label: 'No', value: 0 },
                { label: 'Yes', value: 1 },
              ],
              currentResponse: [1],
            }),
          ],
        },
      ],
    });
  });

  it('getPriorityGate는 uiSection 기준으로 sections 배열을 만든다', async () => {
    repositoryMock.findPriorityGateQuestions.mockResolvedValue([
      createQuestionRecord({
        id: '018f0000-0000-7000-8000-000000000102',
        questionId: '018f0000-0000-7000-8000-000000000202',
        key: 'product.owned_categories',
        title: 'Owned product categories',
        uiSection: UiSection.owned_products,
        sortOrder: 10,
      }),
      createQuestionRecord({
        id: '018f0000-0000-7000-8000-000000000101',
        questionId: '018f0000-0000-7000-8000-000000000201',
        key: 'life.recent_irritation',
        title: 'Recent irritation',
        uiSection: UiSection.life_routine,
        sortOrder: 10,
      }),
    ]);
    repositoryMock.findCurrentResponses.mockResolvedValue([]);

    const result = await service.getPriorityGate({
      deviceId: '018f0000-0000-7000-8000-000000000001',
    });

    expect(result.sections).toEqual([
      {
        key: 'life_routine',
        questions: [
          expect.objectContaining({
            key: 'life.recent_irritation',
            currentResponse: null,
          }),
        ],
      },
      {
        key: 'owned_products',
        questions: [
          expect.objectContaining({
            key: 'product.owned_categories',
            currentResponse: null,
          }),
        ],
      },
    ]);
  });

  it('getResponseReaction는 답변을 저장하고 fallback previewResult를 반환한다', async () => {
    const questionVariantId = '018f0000-0000-7000-8000-000000000101';
    const responseValue = {
      questionId: '018f0000-0000-7000-8000-000000000201',
      value: [1],
    };
    const body = {
      responses: {
        [questionVariantId]: responseValue,
      },
    };

    repositoryMock.findCurrentResponses.mockResolvedValue([]);
    repositoryMock.findPriorityRules.mockResolvedValue([]);

    const result = await service.getResponseReaction({
      deviceId: '018f0000-0000-7000-8000-000000000001',
      body,
    });

    expect(userResponsesServiceMock.upsertCurrentResponses).toHaveBeenCalledWith([
      {
        deviceId: '018f0000-0000-7000-8000-000000000001',
        questionId: responseValue.questionId,
        value: [1],
        source: UserResponseSource.priority_gate,
      },
    ]);
    expect(result.responses).toEqual(body.responses);
    expect(result.previewResults[0]?.resultType).toBe('PASS');
  });

  it('getResponseReaction는 매칭된 priority rule 결과를 previewResults로 반환한다', async () => {
    const questionVariantId = '018f0000-0000-7000-8000-000000000101';
    const responseValue = {
      questionId: '018f0000-0000-7000-8000-000000000201',
      value: [1],
    };
    const body = {
      responses: {
        [questionVariantId]: responseValue,
      },
    };
    const rule = createPriorityRuleRecord({
      resultType: PriorityRuleResultType.HOLD,
      resultTitle: '기능성 제품 추가는 보류하는 편이 안전합니다',
      resultDescription: '이미 활성 성분이 많은 루틴에서는 중복을 줄여야 합니다.',
      ctaLabel: '성분 중복 확인',
      ctaTarget: '/decision/traceback',
      holdCategories: ['serum'],
      conditions: [
        {
          questionId: responseValue.questionId,
          operator: ComparisonOperator.EQ,
          value: [1],
          state: ConditionState.REQUIRED,
        },
      ],
    });

    repositoryMock.findCurrentResponses.mockResolvedValue([
      {
        questionId: responseValue.questionId,
        value: [1],
      },
    ]);
    repositoryMock.findPriorityRules.mockResolvedValue([rule]);
    repositoryMock.findProductCategoriesByKeysOrIds.mockResolvedValue([
      {
        id: '018f0000-0000-7000-8000-000000000301',
        key: 'serum',
        name: '세럼',
        description: null,
      },
    ]);

    const result = await service.getResponseReaction({
      deviceId: '018f0000-0000-7000-8000-000000000001',
      body,
    });

    expect(result.previewResults).toEqual([
      {
        resultType: 'HOLD',
        title: '기능성 제품 추가는 보류하는 편이 안전합니다',
        description: '이미 활성 성분이 많은 루틴에서는 중복을 줄여야 합니다.',
        cta: {
          label: '성분 중복 확인',
          target: '/decision/traceback',
        },
        recommendCategory: null,
        holdCategories: [
          {
            id: '018f0000-0000-7000-8000-000000000301',
            key: 'serum',
            name: '세럼',
            description: null,
          },
        ],
      },
    ]);
  });

  it('getResponseReaction는 매칭된 priority rule 결과를 최대 3개까지 반환한다', async () => {
    const questionId = '018f0000-0000-7000-8000-000000000201';
    const body = {
      responses: {
        '018f0000-0000-7000-8000-000000000101': {
          questionId,
          value: [1],
        },
      },
    };

    repositoryMock.findCurrentResponses.mockResolvedValue([
      {
        questionId,
        value: [1],
      },
    ]);
    repositoryMock.findPriorityRules.mockResolvedValue(
      [1, 2, 3, 4].map((index) =>
        createPriorityRuleRecord({
          id: `018f0000-0000-7000-8000-00000000040${index}`,
          priority: index,
          resultTitle: `matched rule ${index}`,
          conditions: [
            {
              questionId,
              operator: ComparisonOperator.EQ,
              value: [1],
              state: ConditionState.REQUIRED,
            },
          ],
        }),
      ),
    );
    repositoryMock.findProductCategoriesByKeysOrIds.mockResolvedValue([]);

    const result = await service.getResponseReaction({
      deviceId: '018f0000-0000-7000-8000-000000000001',
      body,
    });

    expect(result.previewResults.map((previewResult) => previewResult.title)).toEqual([
      'matched rule 1',
      'matched rule 2',
      'matched rule 3',
    ]);
  });

  it('createSnapshot은 현재 답변과 previewResult를 decision_runs에 저장한다', async () => {
    const question = createQuestionRecord({
      questionId: '018f0000-0000-7000-8000-000000000201',
      key: 'life.recent_irritation',
    });

    repositoryMock.findPriorityRules.mockResolvedValue([]);
    repositoryMock.findCurrentResponses.mockResolvedValueOnce([]).mockResolvedValueOnce([
      {
        questionId: question.questionId,
        value: [1],
      },
    ]);
    repositoryMock.findPriorityGateQuestions.mockResolvedValue([question]);
    repositoryMock.createDecisionRun.mockResolvedValue({
      id: 123n,
    });

    const result = await service.createSnapshot({
      deviceId: '018f0000-0000-7000-8000-000000000001',
      sessionId: '018f0000-0000-7000-8000-000000000002',
    });

    expect(repositoryMock.createDecisionRun).toHaveBeenCalledWith({
      deviceId: '018f0000-0000-7000-8000-000000000001',
      sessionId: '018f0000-0000-7000-8000-000000000002',
      decisionType: 'PRIORITY_GATE',
      sourceScreen: 'priority_gate',
      resultType: 'PASS',
      resultTitle: '현재 답변에서는 우선 확인할 신호가 없습니다',
      resultDescription:
        '지금까지 선택한 내용만으로는 새 제품 선택을 멈추거나 특정 제품군을 먼저 볼 조건이 발견되지 않았습니다.',
      ctaLabel: '제품군 고르기',
      ctaTarget: '/category-decision',
      inputSnapshot: {
        responses: [
          {
            questionId: question.questionId,
            key: 'life.recent_irritation',
            value: [1],
          },
        ],
      },
      appliedFiltersSnapshot: {},
      resultSnapshot: {
        resultType: 'PASS',
        title: '현재 답변에서는 우선 확인할 신호가 없습니다',
        description:
          '지금까지 선택한 내용만으로는 새 제품 선택을 멈추거나 특정 제품군을 먼저 볼 조건이 발견되지 않았습니다.',
        cta: {
          label: '제품군 고르기',
          target: '/category-decision',
        },
        recommendCategory: null,
        holdCategories: [],
      },
    });
    expect(result.decisionRunId).toBe('123');
    expect(result.previewResult.resultType).toBe('PASS');
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
): QuestionRecord {
  return {
    id: overrides.id ?? '018f0000-0000-7000-8000-000000000101',
    questionId: overrides.questionId ?? '018f0000-0000-7000-8000-000000000201',
    title: overrides.title ?? 'Recent irritation',
    answers: overrides.answers ?? ['No', 'Yes'],
    uiSection: overrides.uiSection ?? UiSection.life_routine,
    sortOrder: overrides.sortOrder ?? 10,
    question: {
      key: overrides.key ?? 'life.recent_irritation',
      answerType: overrides.answerType ?? QuestionAnswerType.BOOLEAN,
      answerValues: overrides.answerValues ?? [0, 1],
    },
  };
}

function createPriorityRuleRecord(overrides: Partial<PriorityRuleRecord> = {}): PriorityRuleRecord {
  return {
    id: overrides.id ?? '018f0000-0000-7000-8000-000000000401',
    priority: overrides.priority ?? 10,
    resultType: overrides.resultType ?? PriorityRuleResultType.PASS,
    resultTitle: overrides.resultTitle ?? '현재 답변에서는 우선 확인할 신호가 없습니다',
    resultDescription:
      overrides.resultDescription ??
      '지금까지 선택한 내용만으로는 새 제품 선택을 멈추거나 특정 제품군을 먼저 볼 조건이 발견되지 않았습니다.',
    holdCategories: overrides.holdCategories ?? null,
    ctaLabel: overrides.ctaLabel ?? '제품군 고르기',
    ctaTarget: overrides.ctaTarget ?? '/category-decision',
    recommendCategory: overrides.recommendCategory ?? null,
    conditions: overrides.conditions ?? [],
  };
}
