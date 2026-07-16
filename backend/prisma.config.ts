import { resolve } from 'node:path';
import { config } from 'dotenv';
import { defineConfig, env } from 'prisma/config';

/**
 * 프로덕션(ECS)에서는 .env 파일이 없고 환경변수가 직접 주입되므로 dotenv 로딩을 건너뛴다.
 * 또한 runtime 이미지에는 src/ 가 포함되지 않으므로(pnpm deploy --prod)
 * src/config/env-file-path 를 import 하면 CLI가 모듈을 찾지 못해 죽는다.
 * 따라서 경로 계산을 이 파일 안에서 직접 한다.
 */
if (process.env['NODE_ENV'] !== 'production') {
  const nodeEnv = process.env['NODE_ENV'] ?? 'development';
  config({ path: resolve(process.cwd(), '..', `.env.${nodeEnv}`) });
}

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
    seed: 'ts-node -r tsconfig-paths/register prisma/seed.ts',
  },
  datasource: {
    url: env('DATABASE_URL'),
  },
});
