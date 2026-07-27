import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/prisma/client';
import {
  CATEGORY_ATTRIBUTE_SEEDS,
  DEPRECATED_TONER_ATTRIBUTE_KEYS,
  INGREDIENT_GROUP_SEEDS,
  PRODUCT_CATEGORY_SEEDS,
  PRIORITY_RULE_SEEDS,
  PRODUCT_FILTER_SEEDS,
  PRODUCT_MATRIX_FILTER_SEEDS,
  QUESTION_FILTER_MAPPING_SEEDS,
  QUESTION_SEEDS,
  QUESTION_VARIANT_SEEDS,
  QUESTION_VISIBILITY_CONDITION_SEEDS,
  REQUIRED_TONER_ATTRIBUTE_KEYS,
  TONER_PRODUCT_SEEDS,
  seedIngredient,
  seedProductCatalog,
  seedReferenceData,
} from './index';
import { CHECKLIST_RULE_SORT_ORDERS } from '../modules/category-decision/category-decision.service';

describe('seed data validation', () => {
  const activeTonerAttributeKeys = new Set(
    CATEGORY_ATTRIBUTE_SEEDS.filter((attribute) => attribute.categoryKey === 'toner').map(
      (attribute) => attribute.key,
    ),
  );
  const deprecatedTonerAttributeKeys = new Set<string>(DEPRECATED_TONER_ATTRIBUTE_KEYS);

  it('keeps every toner product attribute key in the active toner attribute definitions', () => {
    for (const product of TONER_PRODUCT_SEEDS) {
      for (const attributeKey of Object.keys(product.attributes)) {
        expect(activeTonerAttributeKeys.has(attributeKey)).toBe(true);
      }
    }
  });

  it('does not emit deprecated toner-only subjective attribute keys', () => {
    const serializedProducts = JSON.stringify(TONER_PRODUCT_SEEDS);

    for (const deprecatedKey of deprecatedTonerAttributeKeys) {
      expect(activeTonerAttributeKeys.has(deprecatedKey)).toBe(false);
      expect(serializedProducts).not.toContain(deprecatedKey);
    }
  });

  it('does not emit the removed CSV skin type memo field', () => {
    expect(JSON.stringify(TONER_PRODUCT_SEEDS)).not.toContain('피부타입메모');
  });

  it('contains only production-eligible toner products', () => {
    expect(TONER_PRODUCT_SEEDS).toHaveLength(25);

    for (const product of TONER_PRODUCT_SEEDS) {
      expect(product.name).toBeTruthy();
      expect(product.name).not.toContain('단종');
      expect(product.priceKrw).toBeGreaterThan(0);
      expect(product.purchaseUrl).toMatch(/^https:\/\//);
      expect(product.imageUrl).toBeNull();
      expect(product.ingredientNames.length).toBeGreaterThan(0);

      for (const requiredKey of REQUIRED_TONER_ATTRIBUTE_KEYS) {
        expect(product.attributes).toHaveProperty(requiredKey);
      }
    }
  });

  it('uses the revised hydrating toner rule based on role_tags', () => {
    const hydratingFilter = PRODUCT_FILTER_SEEDS.find(
      (filter) => filter.categoryKey === 'toner' && filter.attributeKey === 'role_tags',
    );
    const hydratingMatrixFilter = PRODUCT_MATRIX_FILTER_SEEDS.find(
      (filter) => filter.categoryKey === 'toner' && filter.key === 'hydrating_toner',
    );

    expect(hydratingFilter).toMatchObject({
      defaultOperator: 'CONTAINS',
      defaultValue: 'hydration',
    });
    expect(hydratingMatrixFilter).toMatchObject({
      definitionKind: 'ATTRIBUTE',
      attributeKey: 'role_tags',
    });
  });

  it('keeps toner filters and mappings off deprecated toner fields', () => {
    for (const filter of PRODUCT_FILTER_SEEDS.filter((seed) => seed.categoryKey === 'toner')) {
      expect(deprecatedTonerAttributeKeys.has(filter.attributeKey)).toBe(false);
    }

    for (const matrixFilter of PRODUCT_MATRIX_FILTER_SEEDS.filter(
      (seed) => seed.categoryKey === 'toner',
    )) {
      if (matrixFilter.attributeKey) {
        expect(deprecatedTonerAttributeKeys.has(matrixFilter.attributeKey)).toBe(false);
      }
    }

    expect(
      QUESTION_FILTER_MAPPING_SEEDS.every(
        (mapping) => mapping.categoryKey !== 'toner' || mapping.matrixFilterKey !== 'wipe_safe',
      ),
    ).toBe(true);
  });

  it('does not copy Korean raw ingredient names into nameEn', async () => {
    const koreanRawName = '\uC815\uC81C\uC218';
    const create = jest.fn().mockResolvedValue({ id: 'ingredient-id' });
    const prisma = {
      ingredient: {
        findFirst: jest.fn().mockResolvedValue(null),
        create,
      },
    } as unknown as PrismaClient;

    await seedIngredient(prisma, koreanRawName);

    expect(create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        nameKo: koreanRawName,
        nameEn: null,
        inciName: null,
      }),
    });
  });

  it('clears only legacy ingredient nameEn values copied from nameKo', async () => {
    const koreanRawName = '\uC815\uC81C\uC218';
    const update = jest.fn().mockResolvedValue({ id: 'ingredient-id' });
    const prisma = {
      ingredient: {
        findFirst: jest.fn().mockResolvedValue({
          id: 'ingredient-id',
          nameKo: koreanRawName,
          nameEn: koreanRawName,
        }),
        update,
      },
    } as unknown as PrismaClient;

    await seedIngredient(prisma, koreanRawName);

    expect(update).toHaveBeenCalledWith({
      where: { id: 'ingredient-id' },
      data: {
        nameEn: null,
        deletedAt: null,
      },
    });
  });

  it('clears empty ingredient nameEn placeholder values', async () => {
    const update = jest.fn().mockResolvedValue({ id: 'ingredient-id' });
    const prisma = {
      ingredient: {
        findFirst: jest.fn().mockResolvedValue({
          id: 'ingredient-id',
          nameKo: '\uC815\uC81C\uC218',
          nameEn: '',
        }),
        update,
      },
    } as unknown as PrismaClient;

    await seedIngredient(prisma, '\uC815\uC81C\uC218');

    expect(update).toHaveBeenCalledWith({
      where: { id: 'ingredient-id' },
      data: {
        nameEn: null,
        deletedAt: null,
      },
    });
  });

  it('preserves enriched ingredient nameEn values', async () => {
    const update = jest.fn().mockResolvedValue({ id: 'ingredient-id' });
    const prisma = {
      ingredient: {
        findFirst: jest.fn().mockResolvedValue({
          id: 'ingredient-id',
          nameKo: '\uC815\uC81C\uC218',
          nameEn: 'Water',
        }),
        update,
      },
    } as unknown as PrismaClient;

    await seedIngredient(prisma, '\uC815\uC81C\uC218');

    expect(update).toHaveBeenCalledWith({
      where: { id: 'ingredient-id' },
      data: {
        nameEn: 'Water',
        deletedAt: null,
      },
    });
  });
});

describe('v12 priority gate seed integrity', () => {
  const questionByKey = new Map<string, (typeof QUESTION_SEEDS)[number]>(
    QUESTION_SEEDS.map((question) => [question.key, question]),
  );

  it('binds every variant to a known question with a matching answer count', () => {
    // question_variants.answer_count == questions.answer_count 복합 FK 위반을 시드 전에 잡는다.
    for (const variant of QUESTION_VARIANT_SEEDS) {
      const question = questionByKey.get(variant.questionKey);
      expect(question).toBeDefined();
      expect(variant.answers.length).toBe(question?.answerValues.length);
    }
  });

  it('gives every question at least one variant to render', () => {
    for (const question of QUESTION_SEEDS) {
      const variants = QUESTION_VARIANT_SEEDS.filter(
        (variant) => variant.questionKey === question.key,
      );
      expect(variants.length).toBeGreaterThanOrEqual(1);
    }
  });

  it('keeps every rule condition value within its question answer range', () => {
    for (const rule of PRIORITY_RULE_SEEDS) {
      for (const condition of rule.conditions) {
        const question = questionByKey.get(condition.questionKey);
        expect(question).toBeDefined();
        expect(condition.value.length).toBeGreaterThanOrEqual(1);

        for (const value of condition.value) {
          expect(question?.answerValues).toContain(value);
        }

        if (condition.operator === 'GTE' || condition.operator === 'LTE') {
          expect(condition.value).toHaveLength(1);
        }

        // EQ/NEQ/GTE/LTE는 단일선택 질문에만 쓴다(첫 원소·집합 완전일치 의미).
        if (['EQ', 'NEQ', 'GTE', 'LTE'].includes(condition.operator)) {
          expect(question?.answerType).toBe('SINGLE_CHOICE');
        }
      }
    }
  });

  it('makes every non-PASS rule reachable with at least one REQUIRED condition', () => {
    // REQUIRED가 0개인 비-PASS 룰은 엔진에서 절대 발동하지 않는다.
    for (const rule of PRIORITY_RULE_SEEDS) {
      if (rule.resultType === 'PASS') {
        continue;
      }

      const requiredCount = rule.conditions.filter(
        (condition) => condition.state === 'REQUIRED',
      ).length;
      expect(requiredCount).toBeGreaterThanOrEqual(1);
    }
  });

  it('uses unique rule names and sort orders', () => {
    const names = PRIORITY_RULE_SEEDS.map((rule) => rule.name);
    const sortOrders = PRIORITY_RULE_SEEDS.map((rule) => rule.sortOrder);

    expect(new Set(names).size).toBe(names.length);
    expect(new Set(sortOrders).size).toBe(sortOrders.length);
  });

  it('keeps variant identity tuples unique so idempotent upsert cannot overwrite a sibling', () => {
    // seedQuestionVariants는 (questionKey, screen, uiSection, category, sortOrder)로 기존 행을 찾는다.
    const identities = QUESTION_VARIANT_SEEDS.map(
      (variant) =>
        `${variant.questionKey}|${variant.screen}|${variant.uiSection}|${variant.category ?? ''}|${variant.sortOrder}`,
    );
    expect(new Set(identities).size).toBe(identities.length);
  });

  it('maps every checklist rule sortOrder to a seeded rule', () => {
    // 구매 체크리스트(카테고리별 룰 부분집합)가 시드와 어긋나면 카드가 조용히 사라진다.
    const seededSortOrders = new Set(PRIORITY_RULE_SEEDS.map((rule) => rule.sortOrder));

    for (const [category, sortOrders] of CHECKLIST_RULE_SORT_ORDERS) {
      for (const sortOrder of sortOrders) {
        expect({ category, sortOrder, seeded: seededSortOrders.has(sortOrder) }).toEqual({
          category,
          sortOrder,
          seeded: true,
        });
      }
    }
  });

  it('resolves every visibility condition reference within range', () => {
    for (const visibility of QUESTION_VISIBILITY_CONDITION_SEEDS) {
      expect(questionByKey.get(visibility.targetQuestionKey)).toBeDefined();

      const conditionQuestion = questionByKey.get(visibility.conditionQuestionKey);
      expect(conditionQuestion).toBeDefined();
      expect(conditionQuestion?.answerValues).toContain(visibility.value);

      const variant = QUESTION_VARIANT_SEEDS.find(
        (candidate) =>
          candidate.questionKey === visibility.targetQuestionKey &&
          candidate.screen === visibility.targetScreen &&
          candidate.uiSection === visibility.targetUiSection &&
          candidate.sortOrder === visibility.targetSortOrder,
      );
      expect(variant).toBeDefined();
    }
  });
});

const testDatabaseUrl = process.env['TEST_DATABASE_URL'];
const describeDb = testDatabaseUrl ? describe : describe.skip;

describeDb('seed database integration', () => {
  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString: testDatabaseUrl ?? '' }),
  });

  beforeAll(async () => {
    await prisma.$connect();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('runs twice without duplicating seeded reference and product rows', async () => {
    await seedReferenceData(prisma);
    await seedProductCatalog(prisma);
    const first = await getSeedSnapshot(prisma);

    await seedReferenceData(prisma);
    await seedProductCatalog(prisma);
    const second = await getSeedSnapshot(prisma);

    expect(second).toEqual(first);
    expect(first.categories).toBe(PRODUCT_CATEGORY_SEEDS.length);
    expect(first.tonerProducts).toBe(TONER_PRODUCT_SEEDS.length);
    expect(first.ingredientGroups).toBe(INGREDIENT_GROUP_SEEDS.length);
    expect(first.tonerMatrixFilters).toBe(
      PRODUCT_MATRIX_FILTER_SEEDS.filter((filter) => filter.categoryKey === 'toner').length,
    );
  });
});

async function getSeedSnapshot(prisma: PrismaClient) {
  const categoryKeys = PRODUCT_CATEGORY_SEEDS.map((category) => category.key);
  const productNames = TONER_PRODUCT_SEEDS.map((product) => product.name);
  const tonerMatrixFilterKeys = PRODUCT_MATRIX_FILTER_SEEDS.filter(
    (filter) => filter.categoryKey === 'toner',
  ).map((filter) => filter.key);

  const [categories, tonerProducts, ingredientGroups, tonerMatrixFilters] = await Promise.all([
    prisma.productCategory.count({
      where: {
        key: { in: categoryKeys },
        deletedAt: null,
      },
    }),
    prisma.product.count({
      where: {
        name: { in: productNames },
        category: { key: 'toner' },
        deletedAt: null,
      },
    }),
    prisma.ingredientGroup.count({
      where: {
        key: { in: INGREDIENT_GROUP_SEEDS.map((group) => group.key) },
        deletedAt: null,
      },
    }),
    prisma.productMatrixFilterDefinition.count({
      where: {
        key: { in: tonerMatrixFilterKeys },
        category: { key: 'toner' },
        deletedAt: null,
        isActive: true,
      },
    }),
  ]);

  return {
    categories,
    tonerProducts,
    ingredientGroups,
    tonerMatrixFilters,
  };
}
