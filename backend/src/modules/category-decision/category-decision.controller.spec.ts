import { Test, type TestingModule } from '@nestjs/testing';
import type {
  CategoryDecisionResponse,
  UpsertCategoryDecisionResponseResponse,
} from '@skincare-decision/shared/schemas';
import type { RequestWithContext } from '../../common/types/express-request.type';
import { SessionEventService } from '../session/session-event.service';
import { CategoryDecisionController } from './category-decision.controller';
import { CategoryDecisionService } from './category-decision.service';

describe('CategoryDecisionController', () => {
  let controller: CategoryDecisionController;
  let serviceMock: jest.Mocked<
    Pick<CategoryDecisionService, 'getCategoryDecision' | 'getResponseReaction'>
  >;
  let sessionEventServiceMock: jest.Mocked<Pick<SessionEventService, 'record'>>;

  beforeEach(async () => {
    serviceMock = {
      getCategoryDecision: jest.fn(),
      getResponseReaction: jest.fn(),
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
      questionId: '018f0000-0000-7000-8000-000000000201',
      questionVariantId: '018f0000-0000-7000-8000-000000000101',
      value: [2],
    };
    const response: UpsertCategoryDecisionResponseResponse = {
      response: body,
      previewResult: {
        title: 'Ready to narrow Sunscreen',
        description:
          'The saved answers will be used to prepare the initial product matrix filters.',
        cta: {
          label: 'View product matrix',
          target: '/product-matrix?category=sunscreen&source=CATEGORY_DECISION_CTA',
        },
        selectedCategory: {
          id: '018f0000-0000-7000-8000-000000000301',
          key: 'sunscreen',
          name: 'Sunscreen',
          description: null,
        },
        answeredQuestionCount: 1,
        totalQuestionCount: 2,
      },
    };
    const request = createRequest();

    serviceMock.getResponseReaction.mockResolvedValue(response);

    await expect(controller.selectChecklist(request, body)).resolves.toBe(response);

    expect(sessionEventServiceMock.record).toHaveBeenCalledWith({
      sessionId: '018f0000-0000-7000-8000-000000000004',
      eventName: 'context_question_answered',
      screen: 'category_decision',
      elementId: body.questionVariantId,
      payload: body,
    });
    expect(serviceMock.getResponseReaction).toHaveBeenCalledWith({
      deviceId: '018f0000-0000-7000-8000-000000000002',
      body,
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
