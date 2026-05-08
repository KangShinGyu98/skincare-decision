// Root Nest module for the Skincare Decision backend.
import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { AppConfigModule } from './config/app-config.module';
import { AppLoggerModule } from './lib/app-logger.module';
import { PrismaModule } from './lib/prisma.module';
import { RedisModule } from './lib/redis.module';
import { HealthModule } from './modules/health/health.module';

@Module({
  imports: [
    AppConfigModule,
    AppLoggerModule,
    PrismaModule,
    RedisModule,
    ThrottlerModule.forRoot([
      {
        ttl: 60_000,
        limit: 20,
      },
    ]),
    HealthModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
