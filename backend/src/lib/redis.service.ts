// Shared Redis client wrapper for cache-oriented providers.
import { Injectable, OnModuleDestroy } from '@nestjs/common';
import Redis from 'ioredis';
import { AppConfigService } from '../config/app-config.service';

@Injectable()
export class RedisService implements OnModuleDestroy {
  readonly client: Redis;

  constructor(config: AppConfigService) {
    this.client = new Redis(config.redisUrl, {
      lazyConnect: true,
      enableOfflineQueue: false,
      maxRetriesPerRequest: 1,
    });
  }

  async onModuleDestroy(): Promise<void> {
    try {
      if (this.client.status === 'ready' || this.client.status === 'connect') {
        await this.client.quit();
        return;
      }
    } catch {
      // Fall back to disconnect when the graceful quit path fails.
    }

    this.client.disconnect();
  }
}
