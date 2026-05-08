// Service layer for traceback-domain orchestration.
import { Injectable } from '@nestjs/common';
import { TracebackRepository } from './traceback.repository';

@Injectable()
export class TracebackService {
  constructor(private readonly tracebackRepository: TracebackRepository) {}
}
