import { Test, type TestingModule } from '@nestjs/testing';
import type { RequestWithContext } from '../../common/types/express-request.type';
import { LandingConcernSelectionsController } from './landing-concern-selections.controller';
import { LandingConcernSelectionsService } from './landing-concern-selections.service';

jest.mock('@skincare-decision/shared/schemas', () => ({
  selectLandingConcernBodySchema: {},
}));

/**
 * LandingConcernSelectionsController의 selectConcern 메서드는
 * request context와 body를 LandingConcernSelectionsService.selectConcern에 전달한다.
 */
describe('LandingConcernSelectionsController', () => {
  let controller: LandingConcernSelectionsController;
  let serviceMock: jest.Mocked<Pick<LandingConcernSelectionsService, 'selectConcern'>>;

  beforeEach(async () => {
    serviceMock = {
      selectConcern: jest.fn(),
    };

    const testingModule: TestingModule = await Test.createTestingModule({
      controllers: [LandingConcernSelectionsController],
      providers: [
        {
          provide: LandingConcernSelectionsService,
          useValue: serviceMock,
        },
      ],
    }).compile();

    controller = testingModule.get(LandingConcernSelectionsController);
  });

  it('selectConcern은 service.selectConcern 결과를 반환해야 한다', async () => {
    const request = {
      context: {
        requestId: 'request-1',
        deviceId: '01935b8f-0000-7000-8000-000000000001',
        sessionId: '01935b8f-0000-7000-8000-000000000002',
        startedAt: Date.now(),
      },
    } as RequestWithContext;
    const body = { concern: 'acne' };
    const result = { concern: 'acne' };

    serviceMock.selectConcern.mockResolvedValue(result);

    await expect(controller.selectConcern(request, body)).resolves.toBe(result);
    expect(serviceMock.selectConcern).toHaveBeenCalledTimes(1);
  });

  it('selectConcern은 request context의 deviceId, sessionId와 body의 concern을 service에 전달해야 한다', async () => {
    const request = {
      context: {
        requestId: 'request-1',
        deviceId: '01935b8f-0000-7000-8000-000000000001',
        sessionId: '01935b8f-0000-7000-8000-000000000002',
        user: {
          id: '01935b8f-0000-7000-8000-000000000003',
          roles: ['USER'],
        },
        startedAt: Date.now(),
      },
    } as RequestWithContext;
    const body = { concern: 'redness' };

    serviceMock.selectConcern.mockResolvedValue({ concern: 'redness' });

    await controller.selectConcern(request, body);

    expect(serviceMock.selectConcern).toHaveBeenCalledTimes(1);
    expect(serviceMock.selectConcern).toHaveBeenCalledWith({
      deviceId: '01935b8f-0000-7000-8000-000000000001',
      sessionId: '01935b8f-0000-7000-8000-000000000002',
      userId: '01935b8f-0000-7000-8000-000000000003',
      concern: 'redness',
    });
  });
});
