// Health check controller exposed for load balancers and local verification.
import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { SkipThrottle } from '@nestjs/throttler';
import { ZodResponse } from 'nestjs-zod';
import { HealthResponseDto, type HealthResponse } from '../../types/health.schema';
import { HealthService } from './health.service';

@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get()
  @SkipThrottle()
  @ApiOkResponse({ description: 'Backend liveness check.' })
  @ZodResponse({ status: 200, description: 'Backend liveness check.', type: HealthResponseDto })
  getHealth(): HealthResponse {
    return this.healthService.getStatus();
  }
}
