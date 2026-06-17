import { config } from 'dotenv';
import { defineConfig, env } from 'prisma/config';
import { getEnvFilePath } from './src/config/env-file-path';

config({ path: getEnvFilePath() });

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
  },
  datasource: {
    url: env('DATABASE_URL'),
  },
});
