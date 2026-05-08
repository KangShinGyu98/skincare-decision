// Root Nest module for the Skincare Decision backend.
import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { AppConfigModule } from './config/app-config.module';
import { AppLoggerModule } from './lib/app-logger.module';
import { PrismaModule } from './lib/prisma.module';
import { RedisModule } from './lib/redis.module';
import { CatalogModule } from './modules/catalog/catalog.module';
import { EventsModule } from './modules/events/events.module';
import { FactsModule } from './modules/facts/facts.module';
import { HealthModule } from './modules/health/health.module';
import { IdentityModule } from './modules/identity/identity.module';
import { MatrixModule } from './modules/matrix/matrix.module';
import { PriorityModule } from './modules/priority/priority.module';
import { TracebackModule } from './modules/traceback/traceback.module';

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
    IdentityModule,
    FactsModule,
    PriorityModule,
    CatalogModule,
    MatrixModule,
    TracebackModule,
    EventsModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
