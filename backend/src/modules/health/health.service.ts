// Health check service for lightweight application liveness responses.
import { Injectable } from '@nestjs/common';
import type { HealthResponse } from '../../types/health.schema';

@Injectable()
export class HealthService {
  getStatus(): HealthResponse {
    return {
      status: 'ok',
      service: 'backend',
      timestamp: new Date().toISOString(),
    };
  }
}
