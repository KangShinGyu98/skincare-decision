import { Controller, Get, Post, Req } from '@nestjs/common';
import {
  categoryDecisionQuerySchema,
  type CategoryDecisionQuery,
  type CategoryDecisionResponse,
  type UpsertCategoryDecisionResponseRequest,
  type UpsertCategoryDecisionResponseResponse,
  upsertCategoryDecisionResponseRequestSchema,
} from '@skincare-decision/shared/schemas';
import { Public } from '../../common/decorators/auth.decorator';
import { ZodBody, ZodQuery } from '../../common/decorators/zod-body.decorator';
import type { RequestWithContext } from '../../common/types/express-request.type';
import { SessionEventService } from '../session/session-event.service';
import { CategoryDecisionService } from './category-decision.service';

@Public()
@Controller('/category-decision')
export class CategoryDecisionController {
  constructor(
    private readonly service: CategoryDecisionService,
    private readonly sessionEventService: SessionEventService,
  ) {}

  @Get()
  getCategoryDecision(
    @Req() request: RequestWithContext,
    @ZodQuery(categoryDecisionQuerySchema) query: CategoryDecisionQuery,
  ): Promise<CategoryDecisionResponse> {
    const { deviceId, user } = request.context;

    return this.service.getCategoryDecision({
      deviceId: deviceId!,
      ...(user ? { userId: user.id } : {}),
      ...(query.category ? { category: query.category } : {}),
    });
  }

  @Post('responses')
  async selectChecklist(
    @Req() request: RequestWithContext,
    @ZodBody(upsertCategoryDecisionResponseRequestSchema)
    body: UpsertCategoryDecisionResponseRequest,
  ): Promise<UpsertCategoryDecisionResponseResponse> {
    const { deviceId, sessionId, user } = request.context;

    await this.sessionEventService.record({
      sessionId: sessionId!,
      eventName: 'context_question_answered',
      screen: 'category_decision',
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
