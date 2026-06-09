import { z } from 'zod';

export const createCatBodySchema = z
  .object({
    name: z.string().min(1),
    age: z.coerce.number().int().nonnegative(),
    breed: z.string().min(1),
  })
  .strict();

export type CreateCatBodyDto = z.infer<typeof createCatBodySchema>;

export const listCatsQuerySchema = z
  .object({
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().max(100).default(20),
  })
  .strict();

export type ListCatsQueryDto = z.infer<typeof listCatsQuerySchema>;

export const catParamSchema = z
  .object({
    catId: z.uuid(),
  })
  .strict();

export type CatParamDto = z.infer<typeof catParamSchema>;
