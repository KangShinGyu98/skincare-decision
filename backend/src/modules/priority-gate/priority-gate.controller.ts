import { Controller, Delete, Get, Post, Req } from '@nestjs/common';
import { Public } from '../../common/decorators/auth.decorator';
import {
  type CreatePriorityGateSnapshotResponse,
  type PriorityGateResponseDto,
  type ResetPriorityGateResponsesRequest,
  type ResetPriorityGateResponsesResponse,
  type UpsertPriorityGateResponsesRequest,
  type UpsertPriorityGateResponsesResponse,
  resetPriorityGateResponsesRequestSchema,
  upsertPriorityGateResponsesRequestSchema,
} from '@skincare-decision/shared/schemas';
import type { RequestWithContext } from 'src/common/types/express-request.type';
import { PriorityGateService } from './priority-gate.service';
import { ZodBody, ZodQuery } from 'src/common/decorators/zod-body.decorator';
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
    @ZodBody(upsertPriorityGateResponsesRequestSchema) body: UpsertPriorityGateResponsesRequest,
  ): Promise<UpsertPriorityGateResponsesResponse> {
    const { deviceId, sessionId, user } = request.context;
    await Promise.all(
      Object.entries(body.responses).map(([questionVariantId, response]) =>
        this.sessionEventService.record({
          sessionId: sessionId!,
          eventName: 'priority_question_answered',
          screen: 'priority_gate',
          elementId: questionVariantId,
          payload: {
            questionVariantId,
            ...response,
          },
        }),
      ),
    );

    return this.service.getResponseReaction({
      deviceId: deviceId!,
      ...(user ? { userId: user.id } : {}),
      body,
    });
  }

  @Delete('reset-responses')
  async resetResponses(
    @Req() request: RequestWithContext,
    @ZodQuery(resetPriorityGateResponsesRequestSchema) query: ResetPriorityGateResponsesRequest,
  ): Promise<ResetPriorityGateResponsesResponse> {
    const { deviceId, sessionId, user } = request.context;
    const result = await this.service.resetResponses({
      deviceId: deviceId!,
      ...(user ? { userId: user.id } : {}),
      uiSection: query.uiSection,
    });

    await this.sessionEventService.record({
      sessionId: sessionId!,
      eventName: 'priority_responses_reset',
      screen: 'priority_gate',
      elementId: `priority_gate.reset.${query.uiSection}`,
      payload: {
        uiSection: query.uiSection,
        deletedCount: result.deletedCount,
      },
    });

    return result;
  }

  @Post('snapshot')
  async createSnapshot(
    @Req() request: RequestWithContext,
  ): Promise<CreatePriorityGateSnapshotResponse> {
    const { deviceId, sessionId, user } = request.context;
    const snapshot = await this.service.createSnapshot({
      deviceId: deviceId!,
      sessionId: sessionId!,
      ...(user ? { userId: user.id } : {}),
    });

    await this.sessionEventService.record({
      sessionId: sessionId!,
      eventName: 'priority_gate_cta_clicked',
      screen: 'priority_gate',
      elementId: 'priority_gate.cta',
      payload: {
        decisionRunId: snapshot.decisionRunId,
        resultType: snapshot.previewResult.resultType,
        ctaTarget: snapshot.previewResult.cta?.target ?? null,
      },
    });

    return snapshot;
  }
}
