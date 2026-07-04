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
  let repositoryMock: jest.Mocked<Pick<AdminRulesRepository, 'findRules' | 'updateRuleStatus'>>;

  beforeEach(async () => {
    repositoryMock = {
      findRules: jest.fn(),
      updateRuleStatus: jest.fn(),
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
            operator: ComparisonOperator.EQ,
            value: [1],
            state: ConditionState.REQUIRED,
            question: {
              key: 'life.recent_irritation',
              answerType: QuestionAnswerType.BOOLEAN,
              answerValues: [0, 1],
            },
          },
          {
            operator: ComparisonOperator.IN,
            value: [2, 3],
            state: ConditionState.REQUIRED,
            question: {
              key: 'life.outdoor_activity',
              answerType: QuestionAnswerType.THREE_CHOICE,
              answerValues: [1, 2, 3],
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
        ruleName: '최근 자극 보류',
        questions: ['life.recent_irritation', 'life.outdoor_activity'],
        conditionText: 'life.recent_irritation EQ true AND life.outdoor_activity IN [2, 3]',
        conclusion: '지금은 새 제품보다 피부 반응 안정화가 먼저예요.',
        resultType: 'HOLD',
        status: 'active',
        memo: null,
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
        questions: [],
        conditionText: 'fallback',
        resultType: 'PASS',
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
    isActive: true,
    resultType: PriorityRuleResultType.HOLD,
    resultTitle: '지금은 새 제품보다 피부 반응 안정화가 먼저예요.',
    conditions: [
      {
        operator: ComparisonOperator.EQ,
        value: [1],
        state: ConditionState.REQUIRED,
        question: {
          key: 'life.recent_irritation',
          answerType: QuestionAnswerType.BOOLEAN,
          answerValues: [0, 1],
        },
      },
    ],
    ...overrides,
  };
}
