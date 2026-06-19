import { Controller, Post, Req } from '@nestjs/common';
import {
  selectLandingConcernBodySchema,
  type SelectLandingConcernBodyDto,
  type SelectLandingConcernResponseDto,
} from '@skincare-decision/shared/schemas';
import { Public } from '../../common/decorators/auth.decorator';
import { ZodBody } from '../../common/decorators/zod-body.decorator';
import type { RequestWithContext } from '../../common/types/express-request.type';
import { LandingConcernSelectionsService } from './landing-concern-selections.service';

@Public()
@Controller('landing/concern-selections')
export class LandingConcernSelectionsController {
  constructor(private readonly service: LandingConcernSelectionsService) {}

  @Post()
  selectConcern(
    @Req() request: RequestWithContext,
    @ZodBody(selectLandingConcernBodySchema) body: SelectLandingConcernBodyDto,
  ): Promise<SelectLandingConcernResponseDto> {
    const { deviceId, sessionId, user } = request.context;

    return this.service.selectConcern({
      deviceId: deviceId!,
      sessionId: sessionId!,
      ...(user ? { userId: user.id } : {}),
      concern: body.concern,
    });
  }
}
