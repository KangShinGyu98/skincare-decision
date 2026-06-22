import { Controller, Get, Req } from '@nestjs/common';
import { Public } from '../../common/decorators/auth.decorator';
import type { PriorityGateResponseDto } from '@skincare-decision/shared/schemas';
import type { RequestWithContext } from 'src/common/types/express-request.type';
import { PriorityGateService } from './priority-gate.service';

@Public()
@Controller('/priority-gate')
export class PriorityGateController {
  constructor(private readonly service: PriorityGateService) {}

  @Get()
  getPriorityGate(@Req() request: RequestWithContext): Promise<PriorityGateResponseDto> {
    const { deviceId, user } = request.context;

    return this.service.getPriorityGate({
      deviceId: deviceId!,
      ...(user ? { userId: user.id } : {}),
    });
  }
}
