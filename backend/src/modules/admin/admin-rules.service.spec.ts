import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';
import {
  ComparisonOperator,
  ConditionState,
  PriorityRuleResultType,
  QuestionAnswerType,
} from '../../generated/prisma/enums';
import {
  AdminRulesRepository,
  InvalidAdminRuleConditionError,
  InvalidAdminRuleSortOrderError,
  type AdminRuleRecord,
} from './admin-rules.repository';
import { AdminRulesService } from './admin-rules.service';

describe('AdminRulesService', () => {
  let service: AdminRulesService;
  let repositoryMock: jest.Mocked<
    Pick<
      AdminRulesRepository,
      | 'findRules'
      | 'findRuleById'
      | 'searchQuestions'
      | 'createRule'
      | 'updateRule'
      | 'deleteRule'
      | 'updateRuleStatus'
      | 'updateRuleSortOrder'
    >
  >;

  beforeEach(async () => {
    repositoryMock = {
      findRules: jest.fn(),
      findRuleById: jest.fn(),
      searchQuestions: jest.fn(),
      createRule: jest.fn(),
      updateRule: jest.fn(),
      deleteRule: jest.fn(),
      updateRuleStatus: jest.fn(),
      updateRuleSortOrder: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdminRulesService,
        {
          provide: AdminRulesRepository,
          useValue: repositoryMock,
        },
      ],
    }).compile();

    service = module.get(AdminRulesService);
  });

  it('findRules는 priority rule record를 Rule Admin Table row로 변환한다', async () => {
    repositoryMock.findRules.mockResolvedValue([
      createRuleRecord({
        conditions: [
          {
            id: '01935b8f-0000-7000-8000-000000000401',
            operator: ComparisonOperator.EQ,
            value: [1],
            state: ConditionState.REQUIRED,
            question: {
              id: '01935b8f-0000-7000-8000-000000000301',
              key: 'life.recent_irritation',
              answerType: QuestionAnswerType.SINGLE_CHOICE,
              answerValues: [0, 1],
              variants: [
                {
                  id: '01935b8f-0000-7000-8000-000000000311',
                  title: '최근 제품 사용 후 따가움, 붉어짐, 가려움이 있었나요?',
                  answers: ['아니요', '예'],
                },
              ],
            },
          },
          {
            id: '01935b8f-0000-7000-8000-000000000402',
            operator: ComparisonOperator.IN,
            value: [2, 3],
            state: ConditionState.REQUIRED,
            question: {
              id: '01935b8f-0000-7000-8000-000000000302',
              key: 'life.outdoor_activity',
              answerType: QuestionAnswerType.SINGLE_CHOICE,
              answerValues: [1, 2, 3],
              variants: [
                {
                  id: '01935b8f-0000-7000-8000-000000000312',
                  title: '하루 야외 활동 시간은 어느 정도인가요?',
                  answers: ['1시간 미만', '1-3시간', '3시간 이상'],
                },
              ],
            },
          },
        ],
      }),
    ]);

    const result = await service.findRules();

    expect(repositoryMock.findRules).toHaveBeenCalledWith();
    expect(result.items).toEqual([
      {
        id: '01935b8f-0000-7000-8000-000000000101',
        sort_order: 10,
        ruleName: '최근 자극 보류',
        conditions: [
          {
            id: '01935b8f-0000-7000-8000-000000000401',
            questionId: '01935b8f-0000-7000-8000-000000000301',
            questionTitle: '최근 제품 사용 후 따가움, 붉어짐, 가려움이 있었나요?',
            operator: 'EQ',
            decisionValues: [{ label: '예', value: 1 }],
            decisionValueText: '예',
            state: 'REQUIRED',
          },
          {
            id: '01935b8f-0000-7000-8000-000000000402',
            questionId: '01935b8f-0000-7000-8000-000000000302',
            questionTitle: '하루 야외 활동 시간은 어느 정도인가요?',
            operator: 'IN',
            decisionValues: [
              { label: '1-3시간', value: 2 },
              { label: '3시간 이상', value: 3 },
            ],
            decisionValueText: '1-3시간, 3시간 이상',
            state: 'REQUIRED',
          },
        ],
        conclusion: '지금은 새 제품보다 피부 반응 안정화가 먼저예요.',
        resultType: 'HOLD',
        status: 'active',
        adminNote: '모든 제품군 추천보다 우선',
      },
    ]);
  });

  it('findRules는 조건이 없으면 fallback 조건으로 표시한다', async () => {
    repositoryMock.findRules.mockResolvedValue([
      createRuleRecord({
        resultType: PriorityRuleResultType.PASS,
        conditions: [],
      }),
    ]);

    const result = await service.findRules();

    expect(result.items[0]).toEqual(
      expect.objectContaining({
        conditions: [],
        resultType: 'PASS',
      }),
    );
  });

  it('findRule은 상세 모달용 데이터를 반환한다', async () => {
    repositoryMock.findRuleById.mockResolvedValue(
      createRuleRecord({
        ctaLabel: '선크림 보러가기',
        ctaTarget: '/category-decision?category=sunscreen',
      }),
    );

    const result = await service.findRule('01935b8f-0000-7000-8000-000000000101');

    expect(repositoryMock.findRuleById).toHaveBeenCalledWith(
      '01935b8f-0000-7000-8000-000000000101',
    );
    expect(result).toEqual(
      expect.objectContaining({
        name: '최근 자극 보류',
        ruleName: '최근 자극 보류',
        status: 'active',
        resultType: 'HOLD',
        resultTitle: '지금은 새 제품보다 피부 반응 안정화가 먼저예요.',
        resultDescription: '최근 자극이 있으면 새 제품 도입보다 안정화가 우선입니다.',
        ctaLabel: '선크림 보러가기',
        ctaTarget: '/category-decision?category=sunscreen',
        cta: {
          label: '선크림 보러가기',
          target: '/category-decision?category=sunscreen',
        },
      }),
    );
    expect(result.conditions[0]).toEqual(
      expect.objectContaining({
        questionKey: 'life.recent_irritation',
        operator: 'EQ',
        value: [1],
        questionVariant: {
          id: '01935b8f-0000-7000-8000-000000000311',
          title: '최근 제품 사용 후 따가움, 붉어짐, 가려움이 있었나요?',
          answers: ['아니요', '예'],
        },
      }),
    );
  });

  it('updateStatus는 상태 변경 후 table row를 반환한다', async () => {
    repositoryMock.updateRuleStatus.mockResolvedValue(
      createRuleRecord({
        isActive: false,
      }),
    );

    const result = await service.updateStatus('01935b8f-0000-7000-8000-000000000101', {
      status: 'inactive',
    });

    expect(repositoryMock.updateRuleStatus).toHaveBeenCalledWith(
      '01935b8f-0000-7000-8000-000000000101',
      false,
    );
    expect(result.status).toBe('inactive');
  });

  it('searchQuestions는 rule condition에 연결할 question 후보를 반환한다', async () => {
    repositoryMock.searchQuestions.mockResolvedValue([
      {
        id: '01935b8f-0000-7000-8000-000000000301',
        key: 'life.recent_irritation',
        answerType: QuestionAnswerType.SINGLE_CHOICE,
        answerValues: [0, 1],
        variants: [
          {
            id: '01935b8f-0000-7000-8000-000000000311',
            title: '최근 제품 사용 후 따가움, 붉어짐, 가려움이 있었나요?',
            answers: ['아니요', '예'],
          },
        ],
      },
    ]);

    const result = await service.searchQuestions({
      q: 'irritation',
      limit: 20,
    });

    expect(repositoryMock.searchQuestions).toHaveBeenCalledWith({
      q: 'irritation',
      limit: 20,
    });
    expect(result.items).toEqual([
      {
        questionId: '01935b8f-0000-7000-8000-000000000301',
        questionKey: 'life.recent_irritation',
        answerType: 'SINGLE_CHOICE',
        answerValues: [0, 1],
        questionVariant: {
          id: '01935b8f-0000-7000-8000-000000000311',
          title: '최근 제품 사용 후 따가움, 붉어짐, 가려움이 있었나요?',
          answers: ['아니요', '예'],
        },
      },
    ]);
  });

  it('createRule은 rule과 condition 입력을 저장하고 상세 데이터를 반환한다', async () => {
    repositoryMock.createRule.mockResolvedValue(createRuleRecord());

    const result = await service.createRule(createRuleMutationBody());

    expect(repositoryMock.createRule).toHaveBeenCalledWith({
      name: '최근 자극 보류',
      isActive: true,
      resultType: 'HOLD',
      resultTitle: '지금은 새 제품보다 피부 반응 안정화가 먼저예요.',
      resultDescription: '최근 자극이 있으면 새 제품 도입보다 안정화가 우선입니다.',
      ctaLabel: null,
      ctaTarget: null,
      adminNote: null,
      conditions: [
        {
          questionId: '01935b8f-0000-7000-8000-000000000301',
          operator: 'EQ',
          value: [1],
          state: 'REQUIRED',
        },
      ],
    });
    expect(result.id).toBe('01935b8f-0000-7000-8000-000000000101');
    expect(result.conditions[0]?.questionKey).toBe('life.recent_irritation');
  });

  it('createRule은 빈 문자열 optional text를 저장 직전에 null로 변환한다', async () => {
    repositoryMock.createRule.mockResolvedValue(createRuleRecord());

    await service.createRule({
      ...createRuleMutationBody(),
      ctaLabel: '',
      ctaTarget: '',
      adminNote: '   ',
    });

    expect(repositoryMock.createRule).toHaveBeenCalledWith(
      expect.objectContaining({
        ctaLabel: null,
        ctaTarget: null,
        adminNote: null,
      }),
    );
  });

  it('updateRule은 대상 rule이 없으면 NotFoundException을 던진다', async () => {
    repositoryMock.updateRule.mockResolvedValue(null);

    await expect(
      service.updateRule('01935b8f-0000-7000-8000-000000000999', createRuleMutationBody()),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('createRule은 invalid condition을 BadRequestException으로 변환한다', async () => {
    repositoryMock.createRule.mockRejectedValue(
      new InvalidAdminRuleConditionError('Unknown question id'),
    );

    await expect(service.createRule(createRuleMutationBody())).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('deleteRule은 rule을 삭제하고 삭제 응답을 반환한다', async () => {
    repositoryMock.deleteRule.mockResolvedValue(true);

    const result = await service.deleteRule('01935b8f-0000-7000-8000-000000000101');

    expect(repositoryMock.deleteRule).toHaveBeenCalledWith('01935b8f-0000-7000-8000-000000000101');
    expect(result).toEqual({
      id: '01935b8f-0000-7000-8000-000000000101',
      deleted: true,
    });
  });

  it('updateSortOrder는 정렬된 rule id 목록으로 sort_order를 저장하고 table row 목록을 반환한다', async () => {
    repositoryMock.updateRuleSortOrder.mockResolvedValue([
      createRuleRecord({
        id: '01935b8f-0000-7000-8000-000000000102',
        sortOrder: 10,
        name: '기본 통과',
        resultType: PriorityRuleResultType.PASS,
      }),
      createRuleRecord({
        id: '01935b8f-0000-7000-8000-000000000101',
        sortOrder: 20,
      }),
    ]);

    const result = await service.updateSortOrder({
      ruleIds: ['01935b8f-0000-7000-8000-000000000102', '01935b8f-0000-7000-8000-000000000101'],
    });

    expect(repositoryMock.updateRuleSortOrder).toHaveBeenCalledWith([
      '01935b8f-0000-7000-8000-000000000102',
      '01935b8f-0000-7000-8000-000000000101',
    ]);
    expect(result.items.map((item) => ({ id: item.id, sort_order: item.sort_order }))).toEqual([
      { id: '01935b8f-0000-7000-8000-000000000102', sort_order: 10 },
      { id: '01935b8f-0000-7000-8000-000000000101', sort_order: 20 },
    ]);
  });

  it('updateSortOrder는 invalid sort_order list를 BadRequestException으로 변환한다', async () => {
    repositoryMock.updateRuleSortOrder.mockRejectedValue(
      new InvalidAdminRuleSortOrderError('Invalid sort_order list'),
    );

    await expect(
      service.updateSortOrder({
        ruleIds: ['01935b8f-0000-7000-8000-000000000102'],
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('updateStatus는 대상 rule이 없으면 NotFoundException을 던진다', async () => {
    repositoryMock.updateRuleStatus.mockResolvedValue(null);

    await expect(
      service.updateStatus('01935b8f-0000-7000-8000-000000000999', {
        status: 'active',
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});

function createRuleRecord(overrides: Partial<AdminRuleRecord> = {}): AdminRuleRecord {
  return {
    id: '01935b8f-0000-7000-8000-000000000101',
    name: '최근 자극 보류',
    sortOrder: 10,
    isActive: true,
    resultType: PriorityRuleResultType.HOLD,
    resultTitle: '지금은 새 제품보다 피부 반응 안정화가 먼저예요.',
    resultDescription: '최근 자극이 있으면 새 제품 도입보다 안정화가 우선입니다.',
    adminNote: '모든 제품군 추천보다 우선',
    ctaLabel: null,
    ctaTarget: null,
    conditions: [
      {
        id: '01935b8f-0000-7000-8000-000000000401',
        operator: ComparisonOperator.EQ,
        value: [1],
        state: ConditionState.REQUIRED,
        question: {
          id: '01935b8f-0000-7000-8000-000000000301',
          key: 'life.recent_irritation',
          answerType: QuestionAnswerType.SINGLE_CHOICE,
          answerValues: [0, 1],
          variants: [
            {
              id: '01935b8f-0000-7000-8000-000000000311',
              title: '최근 제품 사용 후 따가움, 붉어짐, 가려움이 있었나요?',
              answers: ['아니요', '예'],
            },
          ],
        },
      },
    ],
    ...overrides,
  };
}

function createRuleMutationBody() {
  return {
    name: '최근 자극 보류',
    status: 'active' as const,
    resultType: 'HOLD' as const,
    resultTitle: '지금은 새 제품보다 피부 반응 안정화가 먼저예요.',
    resultDescription: '최근 자극이 있으면 새 제품 도입보다 안정화가 우선입니다.',
    ctaLabel: '',
    ctaTarget: '' as const,
    adminNote: '',
    conditions: [
      {
        questionId: '01935b8f-0000-7000-8000-000000000301',
        operator: 'EQ' as const,
        value: [1],
        state: 'REQUIRED' as const,
      },
    ],
  };
}
