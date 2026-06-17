import type {
  CategoryAttributeDefinition,
  IngredientGroup,
  ProductCategory,
  ProductFilterDefinition,
  ProductMatrixFilterDefinition,
  Question,
} from '../generated/prisma/client';
import type { PrismaClient } from '../generated/prisma/client';
import {
  CATEGORY_ATTRIBUTE_SEEDS,
  DEPRECATED_TONER_ATTRIBUTE_KEYS,
  DEPRECATED_TONER_MATRIX_FILTER_KEYS,
  INGREDIENT_GROUP_SEEDS,
  PRIORITY_RULE_SEEDS,
  PRODUCT_CATEGORY_SEEDS,
  PRODUCT_FILTER_SEEDS,
  PRODUCT_MATRIX_FILTER_SEEDS,
  QUESTION_FILTER_MAPPING_SEEDS,
  QUESTION_SEEDS,
  QUESTION_VARIANT_SEEDS,
} from './data';
import { categoryScopedKey, inputJson, newSeedId, nullableJson } from './utils';

type CategoryMap = Map<string, ProductCategory>;
type AttributeMap = Map<string, CategoryAttributeDefinition>;
type QuestionMap = Map<string, Question>;
type ProductFilterMap = Map<string, ProductFilterDefinition>;
type MatrixFilterMap = Map<string, ProductMatrixFilterDefinition>;
type IngredientGroupMap = Map<string, IngredientGroup>;

export interface ReferenceSeedResult {
  categories: CategoryMap;
  attributes: AttributeMap;
  questions: QuestionMap;
  productFilters: ProductFilterMap;
  matrixFilters: MatrixFilterMap;
  ingredientGroups: IngredientGroupMap;
}

export async function seedReferenceData(prisma: PrismaClient): Promise<ReferenceSeedResult> {
  const categories = await seedProductCategories(prisma);
  await softDeactivateDeprecatedTonerSeedDefinitions(prisma, categories);

  const attributes = await seedCategoryAttributes(prisma, categories);
  const questions = await seedQuestions(prisma);

  await seedQuestionVariants(prisma, questions);
  await seedPriorityRules(prisma, questions, categories);

  const productFilters = await seedProductFilters(prisma, attributes);
  const matrixFilters = await seedProductMatrixFilters(
    prisma,
    categories,
    attributes,
    productFilters,
  );

  await seedQuestionFilterMappings(prisma, questions, matrixFilters);
  const ingredientGroups = await seedIngredientGroups(prisma);

  return {
    categories,
    attributes,
    questions,
    productFilters,
    matrixFilters,
    ingredientGroups,
  };
}

export async function seedProductCategories(prisma: PrismaClient): Promise<CategoryMap> {
  const categories = new Map<string, ProductCategory>();

  for (const seed of PRODUCT_CATEGORY_SEEDS) {
    const category = await prisma.productCategory.upsert({
      where: { key: seed.key },
      create: {
        id: newSeedId(),
        key: seed.key,
        name: seed.name,
        description: seed.description,
        deletedAt: null,
      },
      update: {
        name: seed.name,
        description: seed.description,
        deletedAt: null,
      },
    });

    categories.set(seed.key, category);
  }

  return categories;
}

export async function seedCategoryAttributes(
  prisma: PrismaClient,
  categories: CategoryMap,
): Promise<AttributeMap> {
  const attributes = new Map<string, CategoryAttributeDefinition>();

  for (const seed of CATEGORY_ATTRIBUTE_SEEDS) {
    const category = requireCategory(categories, seed.categoryKey);
    const attribute = await prisma.categoryAttributeDefinition.upsert({
      where: {
        categoryId_key: {
          categoryId: category.id,
          key: seed.key,
        },
      },
      create: {
        id: newSeedId(),
        categoryId: category.id,
        key: seed.key,
        label: seed.label,
        valueType: seed.valueType,
        options: nullableJson(seed.options ? [...seed.options] : undefined),
        isRequired: seed.isRequired,
        sortOrder: seed.sortOrder,
        deletedAt: null,
      },
      update: {
        label: seed.label,
        valueType: seed.valueType,
        options: nullableJson(seed.options ? [...seed.options] : undefined),
        isRequired: seed.isRequired,
        sortOrder: seed.sortOrder,
        deletedAt: null,
      },
    });

    attributes.set(categoryScopedKey(seed.categoryKey, seed.key), attribute);
  }

  return attributes;
}

export async function softDeactivateDeprecatedTonerSeedDefinitions(
  prisma: PrismaClient,
  categories: CategoryMap,
): Promise<void> {
  const toner = categories.get('toner');
  if (!toner) {
    return;
  }

  const now = new Date();
  const deprecatedAttributes = await prisma.categoryAttributeDefinition.findMany({
    where: {
      categoryId: toner.id,
      key: { in: [...DEPRECATED_TONER_ATTRIBUTE_KEYS] },
      deletedAt: null,
    },
    select: { id: true },
  });
  const deprecatedAttributeIds = deprecatedAttributes.map((attribute) => attribute.id);

  if (deprecatedAttributeIds.length > 0) {
    await prisma.productFilterDefinition.updateMany({
      where: {
        attributeDefinitionId: { in: deprecatedAttributeIds },
        deletedAt: null,
      },
      data: {
        isActive: false,
        deletedAt: now,
      },
    });
  }

  const deprecatedProductFilters = await prisma.productFilterDefinition.findMany({
    where: {
      attributeDefinitionId: { in: deprecatedAttributeIds },
    },
    select: { id: true },
  });
  const deprecatedProductFilterIds = deprecatedProductFilters.map((filter) => filter.id);

  const matrixFilters = await prisma.productMatrixFilterDefinition.findMany({
    where: {
      categoryId: toner.id,
      OR: [
        { key: { in: [...DEPRECATED_TONER_MATRIX_FILTER_KEYS] } },
        { productFilterDefinitionId: { in: deprecatedProductFilterIds } },
      ],
      deletedAt: null,
    },
    select: { id: true },
  });
  const matrixFilterIds = matrixFilters.map((filter) => filter.id);

  if (matrixFilterIds.length > 0) {
    await prisma.questionFilterMapping.updateMany({
      where: {
        matrixFilterDefinitionId: { in: matrixFilterIds },
        deletedAt: null,
      },
      data: {
        deletedAt: now,
      },
    });

    await prisma.productMatrixFilterDefinition.updateMany({
      where: {
        id: { in: matrixFilterIds },
      },
      data: {
        isActive: false,
        deletedAt: now,
      },
    });
  }

  if (deprecatedAttributeIds.length > 0) {
    await prisma.categoryAttributeDefinition.updateMany({
      where: {
        id: { in: deprecatedAttributeIds },
      },
      data: {
        deletedAt: now,
      },
    });
  }
}

export async function seedQuestions(prisma: PrismaClient): Promise<QuestionMap> {
  const questions = new Map<string, Question>();

  for (const seed of QUESTION_SEEDS) {
    const question = await prisma.question.upsert({
      where: { key: seed.key },
      create: {
        id: newSeedId(),
        key: seed.key,
        answerType: seed.answerType,
        answerValues: [...seed.answerValues],
        isActive: true,
        deletedAt: null,
      },
      update: {
        answerType: seed.answerType,
        answerValues: [...seed.answerValues],
        isActive: true,
        deletedAt: null,
      },
    });

    questions.set(seed.key, question);
  }

  return questions;
}

export async function seedQuestionVariants(
  prisma: PrismaClient,
  questions: QuestionMap,
): Promise<void> {
  for (const seed of QUESTION_VARIANT_SEEDS) {
    const question = requireQuestion(questions, seed.questionKey);
    const existing = await prisma.questionVariant.findFirst({
      where: {
        questionId: question.id,
        screen: seed.screen,
        uiSection: seed.uiSection,
        sortOrder: seed.sortOrder,
      },
    });
    const data = {
      title: seed.title,
      answers: [...seed.answers],
      screen: seed.screen,
      uiSection: seed.uiSection,
      sortOrder: seed.sortOrder,
      isActive: true,
      deletedAt: null,
    };

    if (existing) {
      await prisma.questionVariant.update({
        where: { id: existing.id },
        data,
      });
    } else {
      await prisma.questionVariant.create({
        data: {
          id: newSeedId(),
          questionId: question.id,
          ...data,
        },
      });
    }
  }
}

export async function seedPriorityRules(
  prisma: PrismaClient,
  questions: QuestionMap,
  categories: CategoryMap,
): Promise<void> {
  for (const seed of PRIORITY_RULE_SEEDS) {
    const recommendCategoryId = seed.recommendCategoryKey
      ? requireCategory(categories, seed.recommendCategoryKey).id
      : null;
    const holdCategories = seed.holdCategories ? [...seed.holdCategories] : undefined;
    const data = {
      name: seed.name,
      priority: seed.priority,
      isActive: true,
      resultType: seed.resultType,
      resultTitle: seed.resultTitle,
      resultDescription: seed.resultDescription,
      holdCategories: nullableJson(holdCategories),
      recommendCategoryId,
      ctaLabel: seed.ctaLabel ?? null,
      ctaTarget: seed.ctaTarget ?? null,
      deletedAt: null,
    };
    const existingRule = await prisma.priorityRule.findFirst({
      where: {
        name: seed.name,
        priority: seed.priority,
      },
    });
    const rule = existingRule
      ? await prisma.priorityRule.update({
          where: { id: existingRule.id },
          data,
        })
      : await prisma.priorityRule.create({
          data: {
            id: newSeedId(),
            ...data,
          },
        });

    for (const condition of seed.conditions) {
      const question = requireQuestion(questions, condition.questionKey);
      const existingCondition = await prisma.priorityRuleCondition.findFirst({
        where: {
          ruleId: rule.id,
          questionId: question.id,
          operator: condition.operator,
          value: { equals: [...condition.value] },
          state: condition.state,
        },
      });
      const conditionData = {
        ruleId: rule.id,
        questionId: question.id,
        operator: condition.operator,
        value: [...condition.value],
        state: condition.state,
      };

      if (existingCondition) {
        await prisma.priorityRuleCondition.update({
          where: { id: existingCondition.id },
          data: conditionData,
        });
      } else {
        await prisma.priorityRuleCondition.create({
          data: {
            id: newSeedId(),
            ...conditionData,
          },
        });
      }
    }
  }
}

export async function seedProductFilters(
  prisma: PrismaClient,
  attributes: AttributeMap,
): Promise<ProductFilterMap> {
  const filters = new Map<string, ProductFilterDefinition>();

  for (const seed of PRODUCT_FILTER_SEEDS) {
    const attribute = requireAttribute(attributes, seed.categoryKey, seed.attributeKey);
    const data = {
      attributeDefinitionId: attribute.id,
      label: seed.label,
      defaultOperator: seed.defaultOperator,
      allowedOperators: [...seed.allowedOperators],
      defaultValue: inputJson(seed.defaultValue),
      inputType: seed.inputType,
      options: nullableJson(seed.options ? [...seed.options] : undefined),
      sortOrder: seed.sortOrder,
      isActive: true,
      deletedAt: null,
    };
    const existing = await prisma.productFilterDefinition.findFirst({
      where: {
        attributeDefinitionId: attribute.id,
        label: seed.label,
      },
    });
    const filter = existing
      ? await prisma.productFilterDefinition.update({
          where: { id: existing.id },
          data,
        })
      : await prisma.productFilterDefinition.create({
          data: {
            id: newSeedId(),
            ...data,
          },
        });

    filters.set(categoryScopedKey(seed.categoryKey, seed.attributeKey), filter);
  }

  return filters;
}

export async function seedProductMatrixFilters(
  prisma: PrismaClient,
  categories: CategoryMap,
  attributes: AttributeMap,
  productFilters: ProductFilterMap,
): Promise<MatrixFilterMap> {
  const matrixFilters = new Map<string, ProductMatrixFilterDefinition>();

  for (const seed of PRODUCT_MATRIX_FILTER_SEEDS) {
    const category = requireCategory(categories, seed.categoryKey);
    const productFilterDefinitionId =
      seed.definitionKind === 'ATTRIBUTE'
        ? requireProductFilter(
            productFilters,
            seed.categoryKey,
            requireAttributeKey(seed.attributeKey),
          ).id
        : null;
    const data = {
      categoryId: category.id,
      productFilterDefinitionId,
      key: seed.key,
      label: seed.label,
      definitionKind: seed.definitionKind,
      computedFilterKey: seed.computedFilterKey ?? null,
      operatorOverride: seed.operatorOverride ?? null,
      valueOverride: nullableJson(seed.valueOverride),
      conditionPayload: nullableJson(seed.conditionPayload),
      isDefault: seed.isDefault,
      isManualSelectable: seed.isManualSelectable,
      sortOrder: seed.sortOrder,
      isActive: true,
      deletedAt: null,
    };

    if (seed.definitionKind === 'ATTRIBUTE') {
      requireAttribute(attributes, seed.categoryKey, requireAttributeKey(seed.attributeKey));
    }

    const matrixFilter = await prisma.productMatrixFilterDefinition.upsert({
      where: {
        categoryId_key: {
          categoryId: category.id,
          key: seed.key,
        },
      },
      create: {
        id: newSeedId(),
        ...data,
      },
      update: data,
    });

    matrixFilters.set(categoryScopedKey(seed.categoryKey, seed.key), matrixFilter);
  }

  return matrixFilters;
}

export async function seedQuestionFilterMappings(
  prisma: PrismaClient,
  questions: QuestionMap,
  matrixFilters: MatrixFilterMap,
): Promise<void> {
  for (const seed of QUESTION_FILTER_MAPPING_SEEDS) {
    const question = requireQuestion(questions, seed.triggerQuestionKey);
    const matrixFilter = requireMatrixFilter(matrixFilters, seed.categoryKey, seed.matrixFilterKey);
    const existing = await prisma.questionFilterMapping.findFirst({
      where: {
        triggerQuestionId: question.id,
        triggerOperator: seed.triggerOperator,
        triggerValue: { equals: [...seed.triggerValue] },
        matrixFilterDefinitionId: matrixFilter.id,
      },
    });
    const data = {
      triggerQuestionId: question.id,
      triggerOperator: seed.triggerOperator,
      triggerValue: [...seed.triggerValue],
      matrixFilterDefinitionId: matrixFilter.id,
      deletedAt: null,
    };

    if (existing) {
      await prisma.questionFilterMapping.update({
        where: { id: existing.id },
        data,
      });
    } else {
      await prisma.questionFilterMapping.create({
        data: {
          id: newSeedId(),
          ...data,
        },
      });
    }
  }
}

export async function seedIngredientGroups(prisma: PrismaClient): Promise<IngredientGroupMap> {
  const groups = new Map<string, IngredientGroup>();

  for (const seed of INGREDIENT_GROUP_SEEDS) {
    const group = await prisma.ingredientGroup.upsert({
      where: { key: seed.key },
      create: {
        id: newSeedId(),
        key: seed.key,
        name: seed.name,
        description: seed.description,
        deletedAt: null,
      },
      update: {
        name: seed.name,
        description: seed.description,
        deletedAt: null,
      },
    });

    groups.set(seed.key, group);
  }

  return groups;
}

function requireCategory(categories: CategoryMap, key: string): ProductCategory {
  const category = categories.get(key);
  if (!category) {
    throw new Error(`Missing seeded product category: ${key}`);
  }

  return category;
}

function requireAttribute(
  attributes: AttributeMap,
  categoryKey: string,
  key: string,
): CategoryAttributeDefinition {
  const attribute = attributes.get(categoryScopedKey(categoryKey, key));
  if (!attribute) {
    throw new Error(`Missing seeded category attribute: ${categoryKey}.${key}`);
  }

  return attribute;
}

function requireAttributeKey(key: string | undefined): string {
  if (!key) {
    throw new Error('ATTRIBUTE matrix filter requires attributeKey');
  }

  return key;
}

function requireProductFilter(
  filters: ProductFilterMap,
  categoryKey: string,
  attributeKey: string,
): ProductFilterDefinition {
  const filter = filters.get(categoryScopedKey(categoryKey, attributeKey));
  if (!filter) {
    throw new Error(`Missing seeded product filter: ${categoryKey}.${attributeKey}`);
  }

  return filter;
}

function requireQuestion(questions: QuestionMap, key: string): Question {
  const question = questions.get(key);
  if (!question) {
    throw new Error(`Missing seeded question: ${key}`);
  }

  return question;
}

function requireMatrixFilter(
  matrixFilters: MatrixFilterMap,
  categoryKey: string,
  key: string,
): ProductMatrixFilterDefinition {
  const filter = matrixFilters.get(categoryScopedKey(categoryKey, key));
  if (!filter) {
    throw new Error(`Missing seeded matrix filter: ${categoryKey}.${key}`);
  }

  return filter;
}
