import { Test, type TestingModule } from '@nestjs/testing';
import { UserResponseSource } from '../../generated/prisma/enums';
import { SessionEventService } from '../session/session-event.service';
import { UserResponsesService } from '../user-responses/user-responses.service';
import { LandingConcernSelectionsRepository } from './landing-concern-selections.repository';
import { LandingConcernSelectionsService } from './landing-concern-selections.service';

/**
 * LandingConcernSelectionsService의 selectConcern 메서드는
 * Concern 클릭 이벤트를 기록하고 Concern preset을 user_responses 저장 호출로 변환한다.
 */
describe('LandingConcernSelectionsService', () => {
  let service: LandingConcernSelectionsService;
  let repositoryMock: jest.Mocked<
    Pick<LandingConcernSelectionsRepository, 'findQuestionIdsByKeys'>
  >;
  let sessionEventServiceMock: jest.Mocked<Pick<SessionEventService, 'record'>>;
  let userResponsesServiceMock: jest.Mocked<Pick<UserResponsesService, 'upsertCurrentResponse'>>;

  beforeEach(async () => {
    repositoryMock = {
      findQuestionIdsByKeys: jest.fn(),
    };
    sessionEventServiceMock = {
      record: jest.fn(),
    };
    userResponsesServiceMock = {
      upsertCurrentResponse: jest.fn(),
    };

    const testingModule: TestingModule = await Test.createTestingModule({
      providers: [
        LandingConcernSelectionsService,
        {
          provide: LandingConcernSelectionsRepository,
          useValue: repositoryMock,
        },
        {
          provide: SessionEventService,
          useValue: sessionEventServiceMock,
        },
        {
          provide: UserResponsesService,
          useValue: userResponsesServiceMock,
        },
      ],
    }).compile();

    service = testingModule.get(LandingConcernSelectionsService);
  });

  it('Concern 클릭 이벤트 저장을 SessionEventService에 위임해야 한다', async () => {
    repositoryMock.findQuestionIdsByKeys.mockResolvedValue(
      new Map([['flow.concern', '01935b8f-0000-7000-8000-000000000101']]),
    );

    await expect(
      service.selectConcern({
        deviceId: '01935b8f-0000-7000-8000-000000000001',
        sessionId: '01935b8f-0000-7000-8000-000000000002',
        concern: 'acne',
      }),
    ).resolves.toEqual({ concern: 'acne' });

    expect(sessionEventServiceMock.record).toHaveBeenCalledTimes(1);
    expect(sessionEventServiceMock.record).toHaveBeenCalledWith({
      sessionId: '01935b8f-0000-7000-8000-000000000002',
      eventName: 'concern_clicked',
      screen: 'landing',
      elementId: 'landing.concern',
      payload: {
        concern: 'acne',
      },
    });
  });

  it('Concern preset을 user_response 저장 호출로 변환해야 한다', async () => {
    repositoryMock.findQuestionIdsByKeys.mockResolvedValue(
      new Map([
        ['flow.concern', '01935b8f-0000-7000-8000-000000000101'],
        ['life.recent_irritation', '01935b8f-0000-7000-8000-000000000102'],
      ]),
    );

    await service.selectConcern({
      deviceId: '01935b8f-0000-7000-8000-000000000001',
      sessionId: '01935b8f-0000-7000-8000-000000000002',
      userId: '01935b8f-0000-7000-8000-000000000003',
      concern: 'redness',
    });

    expect(repositoryMock.findQuestionIdsByKeys).toHaveBeenCalledTimes(1);
    expect(repositoryMock.findQuestionIdsByKeys).toHaveBeenCalledWith([
      'flow.concern',
      'life.recent_irritation',
    ]);
    expect(userResponsesServiceMock.upsertCurrentResponse).toHaveBeenCalledTimes(2);
    expect(userResponsesServiceMock.upsertCurrentResponse).toHaveBeenCalledWith({
      deviceId: '01935b8f-0000-7000-8000-000000000001',
      userId: '01935b8f-0000-7000-8000-000000000003',
      questionId: '01935b8f-0000-7000-8000-000000000101',
      value: [3],
      source: UserResponseSource.concern,
    });
    expect(userResponsesServiceMock.upsertCurrentResponse).toHaveBeenCalledWith({
      deviceId: '01935b8f-0000-7000-8000-000000000001',
      userId: '01935b8f-0000-7000-8000-000000000003',
      questionId: '01935b8f-0000-7000-8000-000000000102',
      value: [1],
      source: UserResponseSource.concern,
    });
  });
});
