import { Test, type TestingModule } from '@nestjs/testing';
import type { PriorityGateResponseDto } from '@skincare-decision/shared/schemas';
import type { RequestWithContext } from '../../common/types/express-request.type';
import { SessionEventService } from '../session/session-event.service';
import { PriorityGateController } from './priority-gate.controller';
import { PriorityGateService } from './priority-gate.service';

describe('PriorityGateController', () => {
  let controller: PriorityGateController;
  let serviceMock: jest.Mocked<Pick<PriorityGateService, 'getPriorityGate'>>;
  let sessionEventServiceMock: jest.Mocked<Pick<SessionEventService, 'record'>>;

  beforeEach(async () => {
    serviceMock = {
      getPriorityGate: jest.fn(),
    };
    sessionEventServiceMock = {
      record: jest.fn(),
    };

    const testingModule: TestingModule = await Test.createTestingModule({
      controllers: [PriorityGateController],
      providers: [
        {
          provide: PriorityGateService,
          useValue: serviceMock,
        },
        {
          provide: SessionEventService,
          useValue: sessionEventServiceMock,
        },
      ],
    }).compile();

    controller = testingModule.get(PriorityGateController);
  });

  it('getPriorityGate는 service.getPriorityGate 결과를 반환한다', async () => {
    const response: PriorityGateResponseDto = {
      sections: [
        {
          key: 'life_routine',
          questions: [],
        },
      ],
    };
    const request = {
      context: {
        requestId: '018f0000-0000-7000-8000-000000000001',
        deviceId: '018f0000-0000-7000-8000-000000000002',
        sessionId: '018f0000-0000-7000-8000-000000000004',
        startedAt: Date.now(),
      },
    } as unknown as RequestWithContext;

    serviceMock.getPriorityGate.mockResolvedValue(response);

    await expect(controller.getPriorityGate(request)).resolves.toBe(response);
  });

  it('getPriorityGate는 request context의 deviceId와 userId를 service에 전달한다', async () => {
    const response: PriorityGateResponseDto = {
      sections: [],
    };
    const request = {
      context: {
        requestId: '018f0000-0000-7000-8000-000000000001',
        deviceId: '018f0000-0000-7000-8000-000000000002',
        sessionId: '018f0000-0000-7000-8000-000000000004',
        user: {
          id: '018f0000-0000-7000-8000-000000000003',
          roles: ['USER'],
          permissions: [],
        },
        startedAt: Date.now(),
      },
    } as unknown as RequestWithContext;

    serviceMock.getPriorityGate.mockResolvedValue(response);

    await controller.getPriorityGate(request);

    expect(serviceMock.getPriorityGate).toHaveBeenCalledWith({
      deviceId: '018f0000-0000-7000-8000-000000000002',
      userId: '018f0000-0000-7000-8000-000000000003',
    });
  });

  it('getPriorityGate는 priority gate 진입 이벤트를 기록한다', async () => {
    const response: PriorityGateResponseDto = {
      sections: [],
    };
    const request = {
      context: {
        requestId: '018f0000-0000-7000-8000-000000000001',
        deviceId: '018f0000-0000-7000-8000-000000000002',
        sessionId: '018f0000-0000-7000-8000-000000000004',
        startedAt: Date.now(),
      },
    } as unknown as RequestWithContext;

    serviceMock.getPriorityGate.mockResolvedValue(response);

    await controller.getPriorityGate(request);

    expect(sessionEventServiceMock.record).toHaveBeenCalledWith({
      sessionId: '018f0000-0000-7000-8000-000000000004',
      eventName: 'priority_gate_viewed',
      screen: 'priority_gate',
      elementId: 'priority_gate.page',
      payload: {},
    });
  });
});
