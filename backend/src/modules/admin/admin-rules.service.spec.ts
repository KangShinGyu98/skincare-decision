import { NotFoundException } from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';
import {
  ComparisonOperator,
  ConditionState,
  PriorityRuleResultType,
  QuestionAnswerType,
} from '../../generated/prisma/enums';
import { AdminRulesRepository, type AdminRuleRecord } from './admin-rules.repository';
import { AdminRulesService } from './admin-rules.service';

describe('AdminRulesService', () => {
  let service: AdminRulesService;
  let repositoryMock: jest.Mocked<
    Pick<
      AdminRulesRepository,
      | 'findRules'
      | 'findRuleById'
      | 'updateRuleStatus'
      | 'updateRuleAdminNote'
      | 'updateRulePriorities'
    >
  >;

  beforeEach(async () => {
    repositoryMock = {
      findRules: jest.fn(),
      findRuleById: jest.fn(),
      updateRuleStatus: jest.fn(),
      updateRuleAdminNote: jest.fn(),
      updateRulePriorities: jest.fn(),
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
              answerType: QuestionAnswerType.BOOLEAN,
              answerValues: [0, 1],
              variants: [
                {
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
              answerType: QuestionAnswerType.THREE_CHOICE,
              answerValues: [1, 2, 3],
              variants: [
                {
                  title: '하루 야외 활동 시간은 어느 정도인가요?',
                  answers: ['1시간 미만', '1-3시간', '3시간 이상'],
                },
              ],
            },
          },
        ],
      }),
    ]);

    const result = await service.findRules({
      resultType: 'HOLD',
      status: 'active',
    });

    expect(repositoryMock.findRules).toHaveBeenCalledWith({
      resultType: 'HOLD',
      status: 'active',
    });
    expect(result.items).toEqual([
      {
        id: '01935b8f-0000-7000-8000-000000000101',
        priority: 10,
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

    const result = await service.findRules({});

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
        recommendCategory: {
          id: '01935b8f-0000-7000-8000-000000000501',
          key: 'sunscreen',
          name: '선크림',
        },
      }),
    );

    const result = await service.findRule('01935b8f-0000-7000-8000-000000000101');

    expect(repositoryMock.findRuleById).toHaveBeenCalledWith(
      '01935b8f-0000-7000-8000-000000000101',
    );
    expect(result).toEqual(
      expect.objectContaining({
        resultDescription: '최근 자극이 있으면 새 제품 도입보다 안정화가 우선입니다.',
        ctaLabel: '선크림 보러가기',
        ctaTarget: '/category-decision?category=sunscreen',
        recommendCategory: {
          id: '01935b8f-0000-7000-8000-000000000501',
          key: 'sunscreen',
          name: '선크림',
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

  it('updateAdminNote는 공백 note를 null로 정규화해 저장한다', async () => {
    repositoryMock.updateRuleAdminNote.mockResolvedValue(
      createRuleRecord({
        adminNote: null,
      }),
    );

    const result = await service.updateAdminNote('01935b8f-0000-7000-8000-000000000101', {
      adminNote: '   ',
    });

    expect(repositoryMock.updateRuleAdminNote).toHaveBeenCalledWith(
      '01935b8f-0000-7000-8000-000000000101',
      null,
    );
    expect(result.adminNote).toBeNull();
  });

  it('updatePriorities는 저장된 priority 순서의 table row 목록을 반환한다', async () => {
    repositoryMock.updateRulePriorities.mockResolvedValue([
      createRuleRecord({
        id: '01935b8f-0000-7000-8000-000000000102',
        priority: 10,
        name: '기본 통과',
        resultType: PriorityRuleResultType.PASS,
      }),
      createRuleRecord({
        id: '01935b8f-0000-7000-8000-000000000101',
        priority: 20,
      }),
    ]);

    const result = await service.updatePriorities({
      items: [
        { ruleId: '01935b8f-0000-7000-8000-000000000102', priority: 10 },
        { ruleId: '01935b8f-0000-7000-8000-000000000101', priority: 20 },
      ],
    });

    expect(repositoryMock.updateRulePriorities).toHaveBeenCalledWith([
      { ruleId: '01935b8f-0000-7000-8000-000000000102', priority: 10 },
      { ruleId: '01935b8f-0000-7000-8000-000000000101', priority: 20 },
    ]);
    expect(result.items.map((item) => item.id)).toEqual([
      '01935b8f-0000-7000-8000-000000000102',
      '01935b8f-0000-7000-8000-000000000101',
    ]);
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
    priority: 10,
    isActive: true,
    resultType: PriorityRuleResultType.HOLD,
    resultTitle: '지금은 새 제품보다 피부 반응 안정화가 먼저예요.',
    resultDescription: '최근 자극이 있으면 새 제품 도입보다 안정화가 우선입니다.',
    adminNote: '모든 제품군 추천보다 우선',
    ctaLabel: null,
    ctaTarget: null,
    recommendCategory: null,
    conditions: [
      {
        id: '01935b8f-0000-7000-8000-000000000401',
        operator: ComparisonOperator.EQ,
        value: [1],
        state: ConditionState.REQUIRED,
        question: {
          id: '01935b8f-0000-7000-8000-000000000301',
          key: 'life.recent_irritation',
          answerType: QuestionAnswerType.BOOLEAN,
          answerValues: [0, 1],
          variants: [
            {
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
