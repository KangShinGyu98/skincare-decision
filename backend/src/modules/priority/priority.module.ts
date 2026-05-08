// Priority module wiring controller, service, and repository layers.
import { Module } from '@nestjs/common';
import { PriorityController } from './priority.controller';
import { PriorityRepository } from './priority.repository';
import { PriorityService } from './priority.service';

@Module({
  controllers: [PriorityController],
  providers: [PriorityService, PriorityRepository],
  exports: [PriorityService],
})
export class PriorityModule {}
