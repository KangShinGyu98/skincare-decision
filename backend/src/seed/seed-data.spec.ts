import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/prisma/client';
import {
  CATEGORY_ATTRIBUTE_SEEDS,
  DEPRECATED_TONER_ATTRIBUTE_KEYS,
  INGREDIENT_GROUP_SEEDS,
  PRODUCT_CATEGORY_SEEDS,
  PRODUCT_FILTER_SEEDS,
  PRODUCT_MATRIX_FILTER_SEEDS,
  QUESTION_FILTER_MAPPING_SEEDS,
  REQUIRED_TONER_ATTRIBUTE_KEYS,
  TONER_PRODUCT_SEEDS,
  seedIngredient,
  seedProductCatalog,
  seedReferenceData,
} from './index';

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
