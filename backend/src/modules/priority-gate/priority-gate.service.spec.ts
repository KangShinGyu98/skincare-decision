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
  let userResponsesServiceMock: jest.Mocked<
    Pick<UserResponsesService, 'upsertCurrentResponses' | 'deleteCurrentResponses'>
  >;

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
      deleteCurrentResponses: jest.fn(),
    };
    repositoryMock.findPriorityRules.mockResolvedValue([]);
    repositoryMock.findProductCategoriesByKeysOrIds.mockResolvedValue([]);

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

    expect(result.sections).toEqual([
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
    ]);
    expect(result.previewResults).toEqual([
      expect.objectContaining({
        resultType: 'PASS',
      }),
    ]);
  });

  it('getPriorityGate는 저장된 답변이 없으면 previewResults를 빈 배열로 반환한다', async () => {
    repositoryMock.findPriorityGateQuestions.mockResolvedValue([
      createQuestionRecord({
        questionId: '018f0000-0000-7000-8000-000000000201',
      }),
    ]);
    repositoryMock.findCurrentResponses.mockResolvedValue([]);

    const result = await service.getPriorityGate({
      deviceId: '018f0000-0000-7000-8000-000000000001',
    });

    expect(repositoryMock.findPriorityRules).not.toHaveBeenCalled();
    expect(result.previewResults).toEqual([]);
  });

  it('getPriorityGate는 저장된 답변이 있으면 현재 답변 기준 previewResults를 반환한다', async () => {
    const questionId = '018f0000-0000-7000-8000-000000000201';
    const question = createQuestionRecord({
      questionId,
    });
    const rule = createPriorityRuleRecord({
      resultType: PriorityRuleResultType.HOLD,
      resultTitle: '기능성 제품 추가는 보류하는 편이 안전합니다',
      resultDescription: '이미 활성 성분이 많은 루틴에서는 중복을 줄여야 합니다.',
      conditions: [
        {
          questionId,
          operator: ComparisonOperator.EQ,
          value: [1],
          state: ConditionState.REQUIRED,
        },
      ],
    });

    repositoryMock.findPriorityGateQuestions.mockResolvedValue([question]);
    repositoryMock.findCurrentResponses
      .mockResolvedValueOnce([
        {
          questionId,
          value: [1],
        },
      ])
      .mockResolvedValueOnce([
        {
          questionId,
          value: [1],
        },
      ]);
    repositoryMock.findPriorityRules.mockResolvedValue([rule]);

    const result = await service.getPriorityGate({
      deviceId: '018f0000-0000-7000-8000-000000000001',
      userId: '018f0000-0000-7000-8000-000000000002',
    });

    expect(result.previewResults).toEqual([
      expect.objectContaining({
        resultType: 'HOLD',
        title: '기능성 제품 추가는 보류하는 편이 안전합니다',
      }),
    ]);
    expect(result.sections).toEqual([
      {
        key: 'life_routine',
        questions: [
          expect.objectContaining({
            currentResponse: [1],
          }),
        ],
      },
    ]);
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
        sortOrder: 30,
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
            sortOrder: 30,
          },
        ],
      },
    ]);
  });

  it('getResponseReaction는 추천 카테고리 CTA를 category query target으로 반환한다', async () => {
    const questionId = '018f0000-0000-7000-8000-000000000201';
    const body = {
      responses: {
        '018f0000-0000-7000-8000-000000000101': {
          questionId,
          value: [1],
        },
      },
    };
    const rule = createPriorityRuleRecord({
      resultType: PriorityRuleResultType.ROUTE_CATEGORY,
      resultTitle: '선크림을 먼저 고르는 것이 좋습니다',
      resultDescription: '낮 사용 루틴에서는 자외선 차단이 우선입니다.',
      ctaLabel: '선크림 보기',
      ctaTarget: '/products/sunscreen',
      recommendCategory: {
        id: '018f0000-0000-7000-8000-000000000301',
        key: 'sunscreen',
        name: '선크림',
        description: null,
        sortOrder: 20,
      },
      conditions: [
        {
          questionId,
          operator: ComparisonOperator.EQ,
          value: [1],
          state: ConditionState.REQUIRED,
        },
      ],
    });

    repositoryMock.findCurrentResponses.mockResolvedValue([
      {
        questionId,
        value: [1],
      },
    ]);
    repositoryMock.findPriorityRules.mockResolvedValue([rule]);

    const result = await service.getResponseReaction({
      deviceId: '018f0000-0000-7000-8000-000000000001',
      body,
    });

    expect(result.previewResults[0]).toEqual(
      expect.objectContaining({
        resultType: 'ROUTE_CATEGORY',
        cta: {
          label: '선크림 보기',
          target: '/category-decision?category=sunscreen',
        },
        recommendCategory: {
          id: '018f0000-0000-7000-8000-000000000301',
          key: 'sunscreen',
          name: '선크림',
          description: null,
          sortOrder: 20,
        },
      }),
    );
  });

  it('getResponseReaction는 기존 products 카테고리 CTA target도 category query target으로 정규화한다', async () => {
    const questionId = '018f0000-0000-7000-8000-000000000201';
    const body = {
      responses: {
        '018f0000-0000-7000-8000-000000000101': {
          questionId,
          value: [1],
        },
      },
    };
    const rule = createPriorityRuleRecord({
      resultType: PriorityRuleResultType.CAUTION,
      resultTitle: '비슷한 토너를 이미 쓰고 있을 수 있습니다',
      resultDescription: '토너를 추가할 때는 기존 제품과 겹치지 않는지 확인해야 합니다.',
      ctaLabel: '토너 필터 조정',
      ctaTarget: '/products/toner',
      conditions: [
        {
          questionId,
          operator: ComparisonOperator.EQ,
          value: [1],
          state: ConditionState.REQUIRED,
        },
      ],
    });

    repositoryMock.findCurrentResponses.mockResolvedValue([
      {
        questionId,
        value: [1],
      },
    ]);
    repositoryMock.findPriorityRules.mockResolvedValue([rule]);

    const result = await service.getResponseReaction({
      deviceId: '018f0000-0000-7000-8000-000000000001',
      body,
    });

    expect(result.previewResults[0]?.cta).toEqual({
      label: '토너 필터 조정',
      target: '/category-decision?category=toner',
    });
  });

  it('getResponseReaction는 매칭된 priority rule 결과를 모두 반환한다', async () => {
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
          sortOrder: index,
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
      'matched rule 4',
    ]);
  });

  it('resetResponses는 요청한 uiSection의 질문 답변만 삭제한다', async () => {
    repositoryMock.findPriorityGateQuestions.mockResolvedValue([
      createQuestionRecord({
        id: '018f0000-0000-7000-8000-000000000101',
        questionId: '018f0000-0000-7000-8000-000000000201',
        uiSection: UiSection.life_routine,
      }),
      createQuestionRecord({
        id: '018f0000-0000-7000-8000-000000000102',
        questionId: '018f0000-0000-7000-8000-000000000202',
        uiSection: UiSection.owned_products,
      }),
    ]);
    userResponsesServiceMock.deleteCurrentResponses.mockResolvedValue(1);

    const result = await service.resetResponses({
      deviceId: '018f0000-0000-7000-8000-000000000001',
      userId: '018f0000-0000-7000-8000-000000000002',
      uiSection: 'life_routine',
    });

    expect(userResponsesServiceMock.deleteCurrentResponses).toHaveBeenCalledWith({
      deviceId: '018f0000-0000-7000-8000-000000000001',
      userId: '018f0000-0000-7000-8000-000000000002',
      questionIds: ['018f0000-0000-7000-8000-000000000201'],
    });
    expect(result).toEqual({
      deletedCount: 1,
    });
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
        cta: null,
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
      answerType: overrides.answerType ?? QuestionAnswerType.SINGLE_CHOICE,
      answerValues: overrides.answerValues ?? [0, 1],
    },
  };
}

function createPriorityRuleRecord(overrides: Partial<PriorityRuleRecord> = {}): PriorityRuleRecord {
  return {
    id: overrides.id ?? '018f0000-0000-7000-8000-000000000401',
    sortOrder: overrides.sortOrder ?? 10,
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
