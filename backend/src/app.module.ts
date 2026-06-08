import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { validateEnv } from './config/env.validation';
import { RequestContextMiddleware } from './common/middleware/request-context.middleware';
import { DeviceSessionMiddleware } from './common/middleware/device-session.middleware';
import { LoggerModule } from './common/logger/logger.module';
import { RequestLoggingInterceptor } from './common/interceptors/request-logging.interceptor';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate: validateEnv,
    }),
    LoggerModule,
  ],
  controllers: [AppController],
  providers: [AppService, RequestLoggingInterceptor, HttpExceptionFilter],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(RequestContextMiddleware, DeviceSessionMiddleware).forRoutes('*');
  }
}
