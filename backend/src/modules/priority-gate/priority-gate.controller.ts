import { Controller, Get, Post, Req } from '@nestjs/common';
import { Public } from '../../common/decorators/auth.decorator';
import {
  type PriorityGateResponseDto,
  type UpsertPriorityGateResponseRequest,
  type UpsertPriorityGateResponseResponse,
  upsertPriorityGateResponseRequestSchema,
} from '@skincare-decision/shared/schemas';
import type { RequestWithContext } from 'src/common/types/express-request.type';
import { PriorityGateService } from './priority-gate.service';
import { ZodBody } from 'src/common/decorators/zod-body.decorator';
import { SessionEventService } from '../session/session-event.service';

@Public()
@Controller('/priority-gate')
export class PriorityGateController {
  constructor(
    private readonly service: PriorityGateService,
    private readonly sessionEventService: SessionEventService,
  ) {}

  @Get()
  async getPriorityGate(@Req() request: RequestWithContext): Promise<PriorityGateResponseDto> {
    const { deviceId, sessionId, user } = request.context;
    await this.sessionEventService.record({
      sessionId: sessionId!,
      eventName: 'priority_gate_viewed',
      screen: 'priority_gate',
      elementId: 'priority_gate.page',
      payload: {},
    });

    return this.service.getPriorityGate({
      deviceId: deviceId!,
      ...(user ? { userId: user.id } : {}),
    });
  }

  @Post('responses')
  async selectChecklist(
    @Req() request: RequestWithContext,
    @ZodBody(upsertPriorityGateResponseRequestSchema) body: UpsertPriorityGateResponseRequest,
  ): Promise<UpsertPriorityGateResponseResponse> {
    const { deviceId, sessionId, user } = request.context;
    await this.sessionEventService.record({
      sessionId: sessionId!,
      eventName: 'priority_question_answered',
      screen: 'priority_gate',
      elementId: body.questionVariantId,
      payload: body,
    });
    return this.service.getResponseReaction({
      deviceId: deviceId!,
      ...(user ? { userId: user.id } : {}),
      body,
    });
  }
}
