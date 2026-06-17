import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { getEnvFilePath } from './config/env-file-path';
import { validateEnv } from './config/env.validation';
import { RequestContextMiddleware } from './common/middleware/request-context.middleware';
import { DeviceSessionMiddleware } from './common/middleware/device-session.middleware';
import { LoggerModule } from './common/logger/logger.module';
import { RequestLoggingInterceptor } from './common/interceptors/request-logging.interceptor';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { ResponseEnvelopeInterceptor } from './common/interceptors/response-envelope.interceptor';
import { CatsModule } from './modules/cats/cats.module';
import { AuthModule } from './modules/auth/auth.module';
import { APP_GUARD } from '@nestjs/core';
import { AuthGuard } from './common/guards/auth.guard';
import { PermissionGuard } from './common/guards/permission.guard';
import { PrismaModule } from './prisma/prisma.module';
import { SessionModule } from './modules/session/session.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: getEnvFilePath(),
      validate: validateEnv,
    }),
    PrismaModule,
    LoggerModule,
    CatsModule,
    SessionModule,
    AuthModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    RequestLoggingInterceptor,
    ResponseEnvelopeInterceptor,
    HttpExceptionFilter,
    {
      provide: APP_GUARD,
      useClass: AuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: PermissionGuard,
    },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(RequestContextMiddleware, DeviceSessionMiddleware).forRoutes('*');
  }
}
