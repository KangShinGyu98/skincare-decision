import { Controller, Post, Req } from '@nestjs/common';
import {
  recordSessionEventBodySchema,
  type RecordSessionEventBodyDto,
} from '@skincare-decision/shared/schemas';
import { ZodBody } from '../../common/decorators/zod-body.decorator';
import type { RequestWithContext } from '../../common/types/express-request.type';
import { SessionEventService } from './session-event.service';

@Controller('session')
export class SessionController {
  constructor(private readonly sessionEventService: SessionEventService) {}

  @Post('events')
  recordEvent(
    @Req() request: RequestWithContext,
    @ZodBody(recordSessionEventBodySchema) body: RecordSessionEventBodyDto,
  ) {
    const sessionId = request.context.sessionId!;

    return this.sessionEventService.record({
      sessionId,
      eventName: body.eventName,
      screen: body.screen,
      ...(body.elementId ? { elementId: body.elementId } : {}),
      payload: body.payload,
    });
  }
}
