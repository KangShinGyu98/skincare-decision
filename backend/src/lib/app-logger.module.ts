// Pino logger module configured for local development and production.
import { Module } from '@nestjs/common';
import { LoggerModule as PinoLoggerModule } from 'nestjs-pino';
import { AppConfigModule } from '../config/app-config.module';
import { AppConfigService } from '../config/app-config.service';

@Module({
  imports: [
    AppConfigModule,
    PinoLoggerModule.forRootAsync({
      imports: [AppConfigModule],
      inject: [AppConfigService],
      useFactory: (config: AppConfigService) => ({
        pinoHttp: {
          level: config.isProduction ? 'info' : 'debug',
          transport: config.isProduction
            ? undefined
            : {
                target: 'pino-pretty',
                options: {
                  colorize: true,
                  singleLine: true,
                  translateTime: 'SYS:standard',
                },
              },
          redact: {
            paths: ['req.headers.cookie'],
            remove: true,
          },
        },
      }),
    }),
  ],
  exports: [PinoLoggerModule],
})
export class AppLoggerModule {}
