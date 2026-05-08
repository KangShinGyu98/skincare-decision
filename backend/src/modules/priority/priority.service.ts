// Service layer for priority-domain orchestration.
import { Injectable } from '@nestjs/common';
import { PriorityRepository } from './priority.repository';

@Injectable()
export class PriorityService {
  constructor(private readonly priorityRepository: PriorityRepository) {}
}
