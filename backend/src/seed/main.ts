import { PrismaPg } from '@prisma/adapter-pg';
import { config } from 'dotenv';
import { getEnvFilePath } from '../config/env-file-path';
import { PrismaClient } from '../generated/prisma/client';
import { seedProductCatalog } from './seed-product-catalog';
import { seedReferenceData } from './seed-reference-data';

/**
 * 컴파일 가능한 seed 진입점.
 * nest build 로 dist/seed/main.js 로 컴파일되며, production 이미지에서
 * ts-node 없이 `node dist/seed/main.js` 로 실행한다.
 * DATABASE_URL 은 실행 환경(ECS/Secrets Manager 등)에서 주입한다.
 */
async function main(): Promise<void> {
  config({ path: getEnvFilePath() });

  const connectionString = process.env['DATABASE_URL'];

  if (!connectionString) {
    throw new Error('DATABASE_URL is required to run the seed.');
  }

  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString }),
  });

  try {
    await prisma.$connect();
    await seedReferenceData(prisma);
    await seedProductCatalog(prisma);
  } finally {
    await prisma.$disconnect();
  }
}

void main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
