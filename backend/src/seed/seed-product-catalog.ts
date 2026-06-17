import type {
  Brand,
  Ingredient,
  Product,
  ProductCategory,
  PrismaClient,
} from '../generated/prisma/client';
import { TONER_PRODUCT_SEEDS } from './data';
import { inputJson, newSeedId } from './utils';

export interface ProductCatalogSeedResult {
  tonerCategory: ProductCategory;
  products: Product[];
}

export async function seedProductCatalog(prisma: PrismaClient): Promise<ProductCatalogSeedResult> {
  const tonerCategory = await requireTonerCategory(prisma);
  const products = await seedTonerProducts(prisma, tonerCategory);

  return {
    tonerCategory,
    products,
  };
}

export async function seedTonerProducts(
  prisma: PrismaClient,
  tonerCategory: ProductCategory,
): Promise<Product[]> {
  const products: Product[] = [];

  for (const seed of TONER_PRODUCT_SEEDS) {
    const brand = await seedBrand(prisma, seed.brandName);
    const existingProduct = await prisma.product.findFirst({
      where: {
        brandId: brand.id,
        categoryId: tonerCategory.id,
        name: seed.name,
      },
    });
    const data = {
      brandId: brand.id,
      categoryId: tonerCategory.id,
      name: seed.name,
      priceKrw: seed.priceKrw,
      volumeAmount: seed.volumeAmount ?? null,
      volumeUnit: seed.volumeUnit ?? null,
      volumeLabel: seed.volumeLabel || null,
      imageUrl: seed.imageUrl,
      purchaseUrl: seed.purchaseUrl,
      attributes: inputJson(seed.attributes),
      sortOrder: seed.sortOrder,
      isActive: seed.isActive,
      deletedAt: null,
    };
    const product = existingProduct
      ? await prisma.product.update({
          where: { id: existingProduct.id },
          data,
        })
      : await prisma.product.create({
          data: {
            id: newSeedId(),
            ...data,
          },
        });

    await seedProductIngredients(prisma, product, seed.ingredientNames);
    products.push(product);
  }

  return products;
}

export async function seedBrand(prisma: PrismaClient, name: string): Promise<Brand> {
  return prisma.brand.upsert({
    where: { name },
    create: {
      id: newSeedId(),
      name,
      deletedAt: null,
    },
    update: {
      deletedAt: null,
    },
  });
}

export async function seedIngredient(prisma: PrismaClient, nameKo: string): Promise<Ingredient> {
  const existing = await prisma.ingredient.findFirst({
    where: {
      nameKo,
    },
  });

  if (existing) {
    return prisma.ingredient.update({
      where: { id: existing.id },
      data: {
        nameEn: existing.nameEn === nameKo || existing.nameEn === '' ? null : existing.nameEn,
        deletedAt: null,
      },
    });
  }

  return prisma.ingredient.create({
    data: {
      id: newSeedId(),
      nameKo,
      nameEn: null,
      inciName: null,
      deletedAt: null,
    },
  });
}

export async function seedProductIngredients(
  prisma: PrismaClient,
  product: Product,
  ingredientNames: readonly string[],
): Promise<void> {
  const existingLinks = await prisma.productIngredient.findMany({
    where: { productId: product.id },
    orderBy: { orderIndex: 'asc' },
  });
  const temporaryOrderBase = -1_000_000 - Math.floor(Math.random() * 100_000);

  for (const [index, link] of existingLinks.entries()) {
    await prisma.productIngredient.update({
      where: { id: link.id },
      data: {
        orderIndex: temporaryOrderBase - index,
      },
    });
  }

  const uniqueNames = uniquePreservingOrder(ingredientNames);

  for (const [index, ingredientName] of uniqueNames.entries()) {
    const ingredient = await seedIngredient(prisma, ingredientName);
    const existingLink = await prisma.productIngredient.findUnique({
      where: {
        productId_ingredientId: {
          productId: product.id,
          ingredientId: ingredient.id,
        },
      },
    });
    const data = {
      productId: product.id,
      ingredientId: ingredient.id,
      orderIndex: index + 1,
      rawText: ingredientName,
    };

    if (existingLink) {
      await prisma.productIngredient.update({
        where: { id: existingLink.id },
        data,
      });
    } else {
      await prisma.productIngredient.create({
        data: {
          id: newSeedId(),
          ...data,
        },
      });
    }
  }
}

async function requireTonerCategory(prisma: PrismaClient): Promise<ProductCategory> {
  const tonerCategory = await prisma.productCategory.findUnique({
    where: { key: 'toner' },
  });

  if (!tonerCategory) {
    throw new Error(
      'Missing toner category. Run seedReferenceData(prisma) before seedProductCatalog(prisma).',
    );
  }

  return tonerCategory;
}

function uniquePreservingOrder(values: readonly string[]): string[] {
  const seen = new Set<string>();
  const uniqueValues: string[] = [];

  for (const value of values) {
    const normalized = value.trim();
    if (!normalized || seen.has(normalized)) {
      continue;
    }

    seen.add(normalized);
    uniqueValues.push(normalized);
  }

  return uniqueValues;
}
