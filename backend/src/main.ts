// Application bootstrap for the Skincare Decision backend.
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { cleanupOpenApiDoc } from 'nestjs-zod';
import { Logger } from 'nestjs-pino';
import { AppModule } from './app.module';
import { AppConfigService } from './config/app-config.service';
import { AppZodValidationPipe } from './lib/zod-validation.pipe';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    bufferLogs: true,
  });
  const config = app.get(AppConfigService);

  app.useLogger(app.get(Logger));
  app.use(cookieParser(config.cookieSecret));
  app.use(helmet());
  app.enableCors({
    origin: config.corsOrigin,
    credentials: true,
  });
  app.useGlobalPipes(new AppZodValidationPipe());
  app.enableShutdownHooks();

  const swaggerConfig = new DocumentBuilder()
    .setTitle('Skincare Decision API')
    .setDescription('NestJS backend for Skincare Decision MVP.')
    .setVersion('0.1.0')
    .build();
  const swaggerDocument = SwaggerModule.createDocument(app, swaggerConfig);

  SwaggerModule.setup('docs', app, cleanupOpenApiDoc(swaggerDocument));

  await app.listen(config.port);
}

bootstrap();
