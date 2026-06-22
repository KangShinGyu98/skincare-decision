import { Test, type TestingModule } from '@nestjs/testing';
import { QuestionAnswerType, UiSection } from '../../generated/prisma/enums';
import { PriorityGateRepository, type QuestionRecord } from './priority-gate.repository';
import { PriorityGateService } from './priority-gate.service';

describe('PriorityGateService', () => {
  let service: PriorityGateService;
  let repositoryMock: jest.Mocked<
    Pick<PriorityGateRepository, 'findPriorityGateQuestions' | 'findCurrentResponses'>
  >;

  beforeEach(async () => {
    repositoryMock = {
      findPriorityGateQuestions: jest.fn(),
      findCurrentResponses: jest.fn(),
    };

    const testingModule: TestingModule = await Test.createTestingModule({
      providers: [
        PriorityGateService,
        {
          provide: PriorityGateRepository,
          useValue: repositoryMock,
        },
      ],
    }).compile();

    service = testingModule.get(PriorityGateService);
  });

  it('getPriorityGate는 repository에서 questions와 current responses를 조회한다', async () => {
    repositoryMock.findPriorityGateQuestions.mockResolvedValue([
      createQuestionRecord({
        id: '018f0000-0000-7000-8000-000000000101',
        questionId: '018f0000-0000-7000-8000-000000000201',
      }),
      createQuestionRecord({
        id: '018f0000-0000-7000-8000-000000000102',
        questionId: '018f0000-0000-7000-8000-000000000202',
      }),
    ]);
    repositoryMock.findCurrentResponses.mockResolvedValue([]);

    await service.getPriorityGate({
      deviceId: '018f0000-0000-7000-8000-000000000001',
      userId: '018f0000-0000-7000-8000-000000000002',
    });

    expect(repositoryMock.findPriorityGateQuestions).toHaveBeenCalledTimes(1);
    expect(repositoryMock.findCurrentResponses).toHaveBeenCalledWith(
      '018f0000-0000-7000-8000-000000000001',
      ['018f0000-0000-7000-8000-000000000201', '018f0000-0000-7000-8000-000000000202'],
      '018f0000-0000-7000-8000-000000000002',
    );
  });

  it('getPriorityGate는 variant answers와 question answerValues를 answers DTO로 매핑한다', async () => {
    repositoryMock.findPriorityGateQuestions.mockResolvedValue([
      createQuestionRecord({
        id: '018f0000-0000-7000-8000-000000000101',
        questionId: '018f0000-0000-7000-8000-000000000201',
        answers: ['No', 'Yes'],
        answerValues: [0, 1],
      }),
    ]);
    repositoryMock.findCurrentResponses.mockResolvedValue([
      {
        questionId: '018f0000-0000-7000-8000-000000000201',
        value: [1],
      },
    ]);

    const result = await service.getPriorityGate({
      deviceId: '018f0000-0000-7000-8000-000000000001',
    });

    expect(result).toEqual({
      sections: [
        {
          key: 'life_routine',
          questions: [
            expect.objectContaining({
              answers: [
                { label: 'No', value: 0 },
                { label: 'Yes', value: 1 },
              ],
              currentResponse: [1],
            }),
          ],
        },
      ],
    });
  });

  it('getPriorityGate는 uiSection 기준으로 sections 배열을 만든다', async () => {
    repositoryMock.findPriorityGateQuestions.mockResolvedValue([
      createQuestionRecord({
        id: '018f0000-0000-7000-8000-000000000102',
        questionId: '018f0000-0000-7000-8000-000000000202',
        key: 'product.owned_categories',
        title: 'Owned product categories',
        uiSection: UiSection.owned_products,
        sortOrder: 10,
      }),
      createQuestionRecord({
        id: '018f0000-0000-7000-8000-000000000101',
        questionId: '018f0000-0000-7000-8000-000000000201',
        key: 'life.recent_irritation',
        title: 'Recent irritation',
        uiSection: UiSection.life_routine,
        sortOrder: 10,
      }),
    ]);
    repositoryMock.findCurrentResponses.mockResolvedValue([]);

    const result = await service.getPriorityGate({
      deviceId: '018f0000-0000-7000-8000-000000000001',
    });

    expect(result.sections).toEqual([
      {
        key: 'life_routine',
        questions: [
          expect.objectContaining({
            key: 'life.recent_irritation',
            currentResponse: null,
          }),
        ],
      },
      {
        key: 'owned_products',
        questions: [
          expect.objectContaining({
            key: 'product.owned_categories',
            currentResponse: null,
          }),
        ],
      },
    ]);
  });
});

function createQuestionRecord(
  overrides: Partial<{
    id: string;
    questionId: string;
    key: string;
    title: string;
    answerType: QuestionAnswerType;
    answers: string[];
    answerValues: number[];
    uiSection: UiSection;
    sortOrder: number;
  }> = {},
): QuestionRecord {
  return {
    id: overrides.id ?? '018f0000-0000-7000-8000-000000000101',
    questionId: overrides.questionId ?? '018f0000-0000-7000-8000-000000000201',
    title: overrides.title ?? 'Recent irritation',
    answers: overrides.answers ?? ['No', 'Yes'],
    uiSection: overrides.uiSection ?? UiSection.life_routine,
    sortOrder: overrides.sortOrder ?? 10,
    question: {
      key: overrides.key ?? 'life.recent_irritation',
      answerType: overrides.answerType ?? QuestionAnswerType.BOOLEAN,
      answerValues: overrides.answerValues ?? [0, 1],
    },
  };
}
