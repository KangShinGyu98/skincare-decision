import { existsSync } from 'node:fs';
import Module, { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';
import { PrismaPg } from '@prisma/adapter-pg';
import { config } from 'dotenv';
import { getEnvFilePath } from '../src/config/env-file-path';

config({ path: getEnvFilePath() });

type NodeModuleWithResolve = typeof Module & {
  _resolveFilename(
    request: string,
    parent: NodeJS.Module | undefined,
    isMain: boolean,
    options?: unknown,
  ): string;
};

const generatedPrismaDir = resolve(__dirname, '../src/generated/prisma');
const nodeModule = Module as NodeModuleWithResolve;
const originalResolveFilename = nodeModule._resolveFilename;
const requireFromSeed = createRequire(__filename);

nodeModule._resolveFilename = function resolveGeneratedPrismaTs(request, parent, isMain, options) {
  if (
    typeof request === 'string' &&
    request.endsWith('.js') &&
    parent?.filename.startsWith(generatedPrismaDir)
  ) {
    const redirectedRequest = request.replace(/\.js$/, '.ts');

    try {
      return originalResolveFilename.call(this, redirectedRequest, parent, isMain, options);
    } catch (error) {
      const resolved = resolve(dirname(parent.filename), redirectedRequest);
      if (existsSync(resolved)) {
        return resolved;
      }

      throw error;
    }
  }

  return originalResolveFilename.call(this, request, parent, isMain, options);
};

async function main() {
  const connectionString = process.env['DATABASE_URL'];
  if (!connectionString) {
    throw new Error('DATABASE_URL is required to run Prisma seed.');
  }

  const { PrismaClient } = requireFromSeed(
    '../src/generated/prisma/client',
  ) as typeof import('../src/generated/prisma/client');
  const { seedProductCatalog, seedReferenceData } = requireFromSeed(
    '../src/seed',
  ) as typeof import('../src/seed');

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
