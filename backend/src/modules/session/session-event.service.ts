import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Prisma } from '../../generated/prisma/client';

export type RecordSessionEventInput = {
  sessionId: string;
  eventName: string;
  screen: string;
  elementId?: string;
  payload: Prisma.InputJsonValue;
};

export type RecordSessionEventResult = {
  eventId: string;
  sessionId: string;
};

@Injectable()
export class SessionEventService {
  constructor(private readonly prisma: PrismaService) {}

  async record(input: RecordSessionEventInput): Promise<RecordSessionEventResult> {
    const event = await this.prisma.sessionEvent.create({
      data: {
        sessionId: input.sessionId,
        eventName: input.eventName,
        screen: input.screen,
        elementId: input.elementId ?? null,
        payload: input.payload,
      },
    });

    return {
      eventId: event.id.toString(),
      sessionId: event.sessionId,
    };
  }
}
