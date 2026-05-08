// Facts module wiring controller, service, and repository layers.
import { Module } from '@nestjs/common';
import { FactsController } from './facts.controller';
import { FactsRepository } from './facts.repository';
import { FactsService } from './facts.service';

@Module({
  controllers: [FactsController],
  providers: [FactsService, FactsRepository],
  exports: [FactsService],
})
export class FactsModule {}
