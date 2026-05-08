// Zod schema for validating backend environment variables.
import { z } from 'zod';

export const envSchema = z.object({
  NODE_ENV: z.enum(['local', 'development', 'test', 'production']).default('local'),
  PORT: z.coerce.number().int().positive().default(4000),
  DATABASE_URL: z
    .string()
    .min(1)
    .default(
      'postgresql://skincare_decision:skincare_decision@localhost:5432/skincare_decision?schema=public',
    ),
  REDIS_URL: z.string().min(1).default('redis://localhost:6379'),
  COOKIE_SECRET: z.string().min(1).default('dev-only-change-me'),
  CORS_ORIGIN: z.string().min(1).default('http://localhost:3000'),
});

export type AppEnv = z.infer<typeof envSchema>;
