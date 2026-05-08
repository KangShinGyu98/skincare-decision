// Service layer for events-domain orchestration.
import { Injectable } from '@nestjs/common';
import { EventsRepository } from './events.repository';

@Injectable()
export class EventsService {
  constructor(private readonly eventsRepository: EventsRepository) {}
}
