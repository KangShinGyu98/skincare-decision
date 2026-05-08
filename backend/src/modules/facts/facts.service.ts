// Service layer for facts-domain orchestration.
import { Injectable } from '@nestjs/common';
import { FactsRepository } from './facts.repository';

@Injectable()
export class FactsService {
  constructor(private readonly factsRepository: FactsRepository) {}
}
