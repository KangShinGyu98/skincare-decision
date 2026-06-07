import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import cookieParser from 'cookie-parser';
import { RequestLoggingInterceptor } from './common/interceptors/request-logging.interceptor';
import { Logger } from 'nestjs-pino';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);
  const cookieSecret = configService.getOrThrow<string>('COOKIE_SECRET');

  const port = configService.getOrThrow<number>('PORT');
  const corsOrigin = configService.getOrThrow<string>('CORS_ORIGIN');

  app.enableCors({
    origin: corsOrigin,
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  app.setGlobalPrefix('api');

  app.use(cookieParser(cookieSecret));
  app.useLogger(app.get(Logger));
  app.useGlobalInterceptors(app.get(RequestLoggingInterceptor));

  await app.listen(port);
}

bootstrap().catch((error) => {
  console.error(error);
  process.exit(1);
});
