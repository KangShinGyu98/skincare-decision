// Traceback module wiring controller, service, and repository layers.
import { Module } from '@nestjs/common';
import { TracebackController } from './traceback.controller';
import { TracebackRepository } from './traceback.repository';
import { TracebackService } from './traceback.service';

@Module({
  controllers: [TracebackController],
  providers: [TracebackService, TracebackRepository],
  exports: [TracebackService],
})
export class TracebackModule {}
