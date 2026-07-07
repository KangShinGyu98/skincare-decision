import { PriorityRuleResultType } from '../../generated/prisma/enums';
import { PrismaService } from '../../prisma/prisma.service';
import {
  AdminRulesRepository,
  InvalidAdminRuleSortOrderError,
  type AdminRuleTableRecord,
} from './admin-rules.repository';

describe('AdminRulesRepository', () => {
  it('updateRuleSortOrder는 전체 rule id 목록을 검증하고 sort_order를 일괄 재생성한다', async () => {
    const { repository, transaction } = createRepository();
    transaction.$queryRaw.mockResolvedValue([
      { id: '01935b8f-0000-7000-8000-000000000101' },
      { id: '01935b8f-0000-7000-8000-000000000102' },
    ]);
    transaction.priorityRule.findMany.mockResolvedValue([
      createRuleRecord({
        id: '01935b8f-0000-7000-8000-000000000102',
        sortOrder: 1,
      }),
      createRuleRecord({
        id: '01935b8f-0000-7000-8000-000000000101',
        sortOrder: 2,
      }),
    ]);

    const result = await repository.updateRuleSortOrder([
      '01935b8f-0000-7000-8000-000000000102',
      '01935b8f-0000-7000-8000-000000000101',
    ]);

    expect(transaction.$queryRaw).toHaveBeenCalledTimes(1);
    expect(transaction.$executeRaw).toHaveBeenCalledTimes(1);
    expect(transaction.priorityRule.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
      }),
    );
    expect(result.map((rule) => rule.id)).toEqual([
      '01935b8f-0000-7000-8000-000000000102',
      '01935b8f-0000-7000-8000-000000000101',
    ]);
  });

  it('updateRuleSortOrder는 중복 rule id를 거부한다', async () => {
    const { repository, transaction } = createRepository();
    transaction.$queryRaw.mockResolvedValue([
      { id: '01935b8f-0000-7000-8000-000000000101' },
      { id: '01935b8f-0000-7000-8000-000000000102' },
    ]);

    await expect(
      repository.updateRuleSortOrder([
        '01935b8f-0000-7000-8000-000000000101',
        '01935b8f-0000-7000-8000-000000000101',
      ]),
    ).rejects.toBeInstanceOf(InvalidAdminRuleSortOrderError);
    expect(transaction.$executeRaw).not.toHaveBeenCalled();
  });

  it('updateRuleSortOrder는 알 수 없는 rule id를 거부한다', async () => {
    const { repository, transaction } = createRepository();
    transaction.$queryRaw.mockResolvedValue([
      { id: '01935b8f-0000-7000-8000-000000000101' },
      { id: '01935b8f-0000-7000-8000-000000000102' },
    ]);

    await expect(
      repository.updateRuleSortOrder([
        '01935b8f-0000-7000-8000-000000000101',
        '01935b8f-0000-7000-8000-000000000999',
      ]),
    ).rejects.toBeInstanceOf(InvalidAdminRuleSortOrderError);
    expect(transaction.$executeRaw).not.toHaveBeenCalled();
  });

  it('updateRuleSortOrder는 누락된 rule id가 있으면 거부한다', async () => {
    const { repository, transaction } = createRepository();
    transaction.$queryRaw.mockResolvedValue([
      { id: '01935b8f-0000-7000-8000-000000000101' },
      { id: '01935b8f-0000-7000-8000-000000000102' },
    ]);

    await expect(
      repository.updateRuleSortOrder(['01935b8f-0000-7000-8000-000000000101']),
    ).rejects.toBeInstanceOf(InvalidAdminRuleSortOrderError);
    expect(transaction.$executeRaw).not.toHaveBeenCalled();
  });
});

function createRepository() {
  const transaction = {
    $queryRaw: jest.fn(),
    $executeRaw: jest.fn(),
    priorityRule: {
      findMany: jest.fn(),
    },
  };
  const prisma = {
    $transaction: jest.fn((callback: (tx: typeof transaction) => unknown) => callback(transaction)),
  };

  return {
    repository: new AdminRulesRepository(prisma as unknown as PrismaService),
    transaction,
  };
}

function createRuleRecord(overrides: Partial<AdminRuleTableRecord> = {}): AdminRuleTableRecord {
  return {
    id: '01935b8f-0000-7000-8000-000000000101',
    name: '최근 자극 보류',
    sortOrder: 1,
    isActive: true,
    resultType: PriorityRuleResultType.HOLD,
    resultTitle: '지금은 새 제품보다 피부 반응 안정화가 먼저예요.',
    adminNote: '모든 제품군 추천보다 우선',
    conditions: [],
    ...overrides,
  };
}
