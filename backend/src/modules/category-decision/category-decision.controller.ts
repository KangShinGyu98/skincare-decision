import { Controller, Delete, Get, Post, Req } from '@nestjs/common';
import {
  categoryDecisionQuerySchema,
  resetCategoryDecisionResponsesRequestSchema,
  type CategoryDecisionQuery,
  type CategoryDecisionResponse,
  type ResetCategoryDecisionResponsesRequest,
  type ResetCategoryDecisionResponsesResponse,
  type UpsertCategoryDecisionResponsesRequest,
  type UpsertCategoryDecisionResponsesResponse,
  upsertCategoryDecisionResponsesRequestSchema,
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
    @ZodBody(upsertCategoryDecisionResponsesRequestSchema)
    body: UpsertCategoryDecisionResponsesRequest,
  ): Promise<UpsertCategoryDecisionResponsesResponse> {
    const { deviceId, sessionId, user } = request.context;

    await this.sessionEventService.record({
      sessionId: sessionId!,
      eventName: 'context_question_answered',
      screen: 'category_decision',
      elementId: 'category_decision.responses',
      payload: body,
    });

    return this.service.getResponseReaction({
      deviceId: deviceId!,
      ...(user ? { userId: user.id } : {}),
      body,
    });
  }

  @Delete('reset-responses')
  async resetResponses(
    @Req() request: RequestWithContext,
    @ZodQuery(resetCategoryDecisionResponsesRequestSchema)
    query: ResetCategoryDecisionResponsesRequest,
  ): Promise<ResetCategoryDecisionResponsesResponse> {
    const { deviceId, sessionId, user } = request.context;
    const result = await this.service.resetResponses({
      deviceId: deviceId!,
      ...(user ? { userId: user.id } : {}),
      uiSection: query.uiSection,
    });

    await this.sessionEventService.record({
      sessionId: sessionId!,
      eventName: 'context_responses_reset',
      screen: 'category_decision',
      elementId: `category_decision.reset.${query.uiSection}`,
      payload: {
        uiSection: query.uiSection,
        deletedCount: result.deletedCount,
      },
    });

    return result;
  }
}
