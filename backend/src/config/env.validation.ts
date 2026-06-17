import { z } from 'zod';

const envSchema = z.object({
  POSTGRES_BIND_ADDRESS: z.string().min(1).default('127.0.0.1'),
  POSTGRES_HOST_PORT: z.coerce.number().int().positive().default(5432),
  POSTGRES_USER: z.string().min(1).optional(),
  POSTGRES_PASSWORD: z.string().min(1).optional(),
  POSTGRES_DB: z.string().min(1).optional(),
  REDIS_BIND_ADDRESS: z.string().min(1).default('127.0.0.1'),
  REDIS_HOST_PORT: z.coerce.number().int().positive().default(6379),
  TZ: z.string().min(1).default('UTC'),
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
  SESSION_COOKIE_MAX_AGE_SECONDS: z.coerce.number().int().positive().default(1800),
  TRUST_PROXY: z.coerce.boolean().default(false),
});

export type Env = z.infer<typeof envSchema>;

export function validateEnv(config: Record<string, unknown>): Env {
  const result = envSchema.safeParse(config);

  if (!result.success) {
    throw new Error(z.prettifyError(result.error));
  }

  return result.data;
}
