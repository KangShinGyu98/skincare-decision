import { Test, type TestingModule } from '@nestjs/testing';
import type {
  CategoryDecisionResponse,
  ResetCategoryDecisionResponsesResponse,
  UpsertCategoryDecisionResponsesResponse,
} from '@skincare-decision/shared/schemas';
import type { RequestWithContext } from '../../common/types/express-request.type';
import { SessionEventService } from '../session/session-event.service';
import { CategoryDecisionController } from './category-decision.controller';
import { CategoryDecisionService } from './category-decision.service';

describe('CategoryDecisionController', () => {
  let controller: CategoryDecisionController;
  let serviceMock: jest.Mocked<
    Pick<CategoryDecisionService, 'getCategoryDecision' | 'getResponseReaction' | 'resetResponses'>
  >;
  let sessionEventServiceMock: jest.Mocked<Pick<SessionEventService, 'record'>>;

  beforeEach(async () => {
    serviceMock = {
      getCategoryDecision: jest.fn(),
      getResponseReaction: jest.fn(),
      resetResponses: jest.fn(),
    };
    sessionEventServiceMock = {
      record: jest.fn(),
    };

    const testingModule: TestingModule = await Test.createTestingModule({
      controllers: [CategoryDecisionController],
      providers: [
        {
          provide: CategoryDecisionService,
          useValue: serviceMock,
        },
        {
          provide: SessionEventService,
          useValue: sessionEventServiceMock,
        },
      ],
    }).compile();

    controller = testingModule.get(CategoryDecisionController);
  });

  it('getCategoryDecision passes request context and query category to service', async () => {
    const response: CategoryDecisionResponse = {
      selectedCategory: null,
      sections: [],
      previewResults: [],
    };
    const request = createRequest({
      userId: '018f0000-0000-7000-8000-000000000003',
    });

    serviceMock.getCategoryDecision.mockResolvedValue(response);

    await expect(controller.getCategoryDecision(request, { category: 'sunscreen' })).resolves.toBe(
      response,
    );

    expect(serviceMock.getCategoryDecision).toHaveBeenCalledWith({
      deviceId: '018f0000-0000-7000-8000-000000000002',
      userId: '018f0000-0000-7000-8000-000000000003',
      category: 'sunscreen',
    });
  });

  it('selectChecklist records event and passes body to service', async () => {
    const body = {
      category: 'sunscreen',
      responses: {
        '018f0000-0000-7000-8000-000000000101': {
          questionId: '018f0000-0000-7000-8000-000000000201',
          value: [1],
        },
      },
    };
    const response: UpsertCategoryDecisionResponsesResponse = {
      responses: body.responses,
      previewResults: [
        {
          resultType: 'CAUTION',
          title: '썬크림의 백탁·발림성이 고민이라면',
          description: '쿠션이나 파우더를 사용해보거나, 유기·혼합자차를 고려해볼 수 있습니다.',
          cta: null,
          recommendCategory: null,
          holdCategories: [],
        },
      ],
    };
    const request = createRequest();

    serviceMock.getResponseReaction.mockResolvedValue(response);

    await expect(controller.selectChecklist(request, body)).resolves.toBe(response);

    expect(sessionEventServiceMock.record).toHaveBeenCalledTimes(1);
    expect(sessionEventServiceMock.record).toHaveBeenCalledWith({
      sessionId: '018f0000-0000-7000-8000-000000000004',
      eventName: 'context_question_answered',
      screen: 'category_decision',
      elementId: 'category_decision.responses',
      payload: body,
    });
    expect(serviceMock.getResponseReaction).toHaveBeenCalledWith({
      deviceId: '018f0000-0000-7000-8000-000000000002',
      body,
    });
  });

  it('resetResponses passes request context to service and records event', async () => {
    const response: ResetCategoryDecisionResponsesResponse = {
      deletedCount: 2,
    };
    const request = createRequest({
      userId: '018f0000-0000-7000-8000-000000000003',
    });

    serviceMock.resetResponses.mockResolvedValue(response);

    await expect(controller.resetResponses(request, { uiSection: 'basic' })).resolves.toBe(
      response,
    );

    expect(serviceMock.resetResponses).toHaveBeenCalledWith({
      deviceId: '018f0000-0000-7000-8000-000000000002',
      userId: '018f0000-0000-7000-8000-000000000003',
      uiSection: 'basic',
    });
    expect(sessionEventServiceMock.record).toHaveBeenCalledWith({
      sessionId: '018f0000-0000-7000-8000-000000000004',
      eventName: 'context_responses_reset',
      screen: 'category_decision',
      elementId: 'category_decision.reset.basic',
      payload: {
        uiSection: 'basic',
        deletedCount: 2,
      },
    });
  });

  function createRequest(input: { userId?: string } = {}): RequestWithContext {
    return {
      context: {
        requestId: '018f0000-0000-7000-8000-000000000001',
        deviceId: '018f0000-0000-7000-8000-000000000002',
        sessionId: '018f0000-0000-7000-8000-000000000004',
        ...(input.userId
          ? {
              user: {
                id: input.userId,
                roles: ['USER'],
                permissions: [],
              },
            }
          : {}),
        startedAt: Date.now(),
      },
    } as unknown as RequestWithContext;
  }
});
