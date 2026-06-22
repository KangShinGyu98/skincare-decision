import { Controller, Get, Req } from '@nestjs/common';
import { Public } from '../../common/decorators/auth.decorator';
import type { PriorityGateResponseDto } from '@skincare-decision/shared/schemas';
import type { RequestWithContext } from 'src/common/types/express-request.type';
import { PriorityGateService } from './priority-gate.service';
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
}
