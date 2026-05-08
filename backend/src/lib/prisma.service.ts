// Shared Prisma client wrapper for repository access.
import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { AppConfigService } from '../config/app-config.service';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleDestroy {
  constructor(config: AppConfigService) {
    super({
      log: config.isProduction ? ['warn', 'error'] : ['query', 'info', 'warn', 'error'],
    });
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }
}
