import { z } from 'zod';

export type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonValue[]
  | {
      [key: string]: JsonValue;
    };

const jsonValueSchema: z.ZodType<JsonValue> = z.lazy(() =>
  z.union([
    z.string(),
    z.number(),
    z.boolean(),
    z.null(),
    z.array(jsonValueSchema),
    z.record(z.string(), jsonValueSchema),
  ]),
);

export const recordSessionEventBodySchema = z
  .object({
    eventName: z.string().min(1).max(100),
    screen: z.string().min(1).max(100),
    elementId: z.string().min(1).max(100).optional(),
    payload: z.record(z.string(), jsonValueSchema).default({}),
  })
  .strict();

export type RecordSessionEventBodyDto = z.infer<typeof recordSessionEventBodySchema>;
