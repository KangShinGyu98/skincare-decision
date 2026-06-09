import { Injectable } from '@nestjs/common';
import { PinoLogger } from 'nestjs-pino';

@Injectable()
export class AppLogger {
  constructor(private readonly logger: PinoLogger) {}

  info(message: string, payload?: Record<string, unknown>): void {
    this.logger.info(payload ?? {}, message);
  }

  warn(message: string, payload?: Record<string, unknown>): void {
    this.logger.warn(payload ?? {}, message);
  }

  error(message: string, payload?: Record<string, unknown>): void {
    this.logger.error(payload ?? {}, message);
  }

  debug(message: string, payload?: Record<string, unknown>): void {
    this.logger.debug(payload ?? {}, message);
  }
}
