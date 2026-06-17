import { randomUUID } from 'node:crypto';
import { Prisma } from '../generated/prisma/client';

export function newSeedId(): string {
  return randomUUID();
}

export function inputJson(value: unknown): Prisma.InputJsonValue {
  return value as Prisma.InputJsonValue;
}

export function nullableJson(
  value: unknown | undefined,
): Prisma.InputJsonValue | Prisma.NullableJsonNullValueInput {
  if (value === undefined || value === null) {
    return Prisma.DbNull;
  }

  return inputJson(value);
}

export function categoryScopedKey(categoryKey: string, key: string): string {
  return `${categoryKey}:${key}`;
}

export function sameNumberArray(left: readonly number[], right: readonly number[]): boolean {
  return left.length === right.length && left.every((value, index) => value === right[index]);
}
