import { z } from 'zod';

const envSchema = z.object({
  DATABASE_URL: z.string().min(1),
  REDIS_URL: z.string().min(1),
  COOKIE_SECRET: z.string().min(1),
  CORS_ORIGIN: z.string().min(1),
  PORT: z.coerce.number().int().positive().default(3000),
  NODE_ENV: z.enum(['development', 'test', 'production']).default('production'),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),
  REQUEST_ID_HEADER: z.string().min(1).default('x-request-id'),
  DEVICE_ID_COOKIE_NAME: z.string().min(1).default('skincare_device_id'),
  SESSION_ID_COOKIE_NAME: z.string().min(1).default('skincare_session_id'),
  COOKIE_MAX_AGE_DAYS: z.coerce.number().int().positive().default(365),
  TRUST_PROXY: z.coerce.boolean().default(false),
  DEVICE_SESSION_COOKIE_MAX_AGE_DAYS: z.coerce.number().int().positive().default(30),
});

export type Env = z.infer<typeof envSchema>;

export function validateEnv(config: Record<string, unknown>): Env {
  const result = envSchema.safeParse(config);

  if (!result.success) {
    throw new Error(z.prettifyError(result.error));
  }

  return result.data;
}
