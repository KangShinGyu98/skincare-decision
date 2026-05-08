// Typed configuration access for backend runtime settings.
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { AppEnv } from './env.schema';

@Injectable()
export class AppConfigService {
  constructor(private readonly configService: ConfigService<AppEnv, true>) {}

  get nodeEnv(): AppEnv['NODE_ENV'] {
    return this.configService.getOrThrow<AppEnv['NODE_ENV']>('NODE_ENV');
  }

  get isProduction(): boolean {
    return this.nodeEnv === 'production';
  }

  get port(): number {
    return this.configService.getOrThrow<number>('PORT');
  }

  get databaseUrl(): string {
    return this.configService.getOrThrow<string>('DATABASE_URL');
  }

  get redisUrl(): string {
    return this.configService.getOrThrow<string>('REDIS_URL');
  }

  get cookieSecret(): string {
    return this.configService.getOrThrow<string>('COOKIE_SECRET');
  }

  get corsOrigin(): string {
    return this.configService.getOrThrow<string>('CORS_ORIGIN');
  }
}
