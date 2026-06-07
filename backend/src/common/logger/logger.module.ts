import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { LoggerModule as PinoLoggerModule } from 'nestjs-pino';
import type { Env } from '../../config/env.validation';
import { AppLogger } from './logger.service';

@Module({
  imports: [
    PinoLoggerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService<Env, true>) => {
        const nodeEnv = configService.get('NODE_ENV', { infer: true });
        const logLevel = configService.get('LOG_LEVEL', { infer: true });
        const pinoHttp = {
          level: logLevel,
          autoLogging: false,
          ...(nodeEnv === 'development'
            ? {
                transport: {
                  target: 'pino-pretty',
                  options: {
                    singleLine: true,
                    colorize: true,
                  },
                },
              }
            : {}),
        };

        return {
          pinoHttp,
        };
      },
    }),
  ],
  providers: [AppLogger],
  exports: [PinoLoggerModule, AppLogger],
})
export class LoggerModule {}
