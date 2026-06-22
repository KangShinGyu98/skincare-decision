import { Injectable } from '@nestjs/common';
import {
  priorityGateResponseSchema,
  questionAnswerTypeSchema,
  questionUiSectionSchema,
  type PriorityGateResponseDto,
  type QuestionAnswerDto,
  type QuestionDto,
  type QuestionSectionDto,
  type QuestionUiSectionDto,
} from '@skincare-decision/shared/schemas';
import {
  type CurrentResponseRecord,
  type QuestionRecord,
  PriorityGateRepository,
} from './priority-gate.repository';

type GetInput = {
  deviceId: string;
  userId?: string;
};

@Injectable()
export class PriorityGateService {
  constructor(private readonly repository: PriorityGateRepository) {}

  async getPriorityGate(input: GetInput): Promise<PriorityGateResponseDto> {
    const questions = await this.repository.findPriorityGateQuestions();
    const questionIds = questions.map((question) => question.questionId);

    const responseRecords = await this.repository.findCurrentResponses(
      input.deviceId,
      questionIds,
      input.userId,
    );

    const questionsWithResponses = this.combineQuestionsWithResponses(questions, responseRecords);
    const questionsBySections = this.groupQuestionsBySections(questionsWithResponses);
    //TODO: questionsFilter DB Schema에 sourceQuestions 추가하고, 해당 필터 로직 적용하기

    return priorityGateResponseSchema.parse(questionsBySections);
  }

  private combineQuestionsWithResponses(
    questions: QuestionRecord[],
    responses: CurrentResponseRecord[],
  ): QuestionDto[] {
    const responseMap = new Map<string, number[]>();

    for (const response of responses) {
      if (!responseMap.has(response.questionId)) {
        responseMap.set(response.questionId, response.value);
      }
    }

    const questionsWithResponses = questions.map((question) => {
      const uiSection = questionUiSectionSchema.parse(question.uiSection);
      const responseValue = responseMap.get(question.questionId);

      return {
        questionId: question.questionId,
        questionVariantId: question.id,
        key: question.question.key,
        title: question.title,
        answerType: questionAnswerTypeSchema.parse(question.question.answerType),
        uiSection,
        sortOrder: question.sortOrder,
        answers: this.toAnswers(question),
        currentResponse: responseValue ?? null,
      };
    });

    return questionsWithResponses;
  }

  private groupQuestionsBySections(questions: QuestionDto[]): PriorityGateResponseDto {
    const sectionMap = new Map<QuestionUiSectionDto, QuestionDto[]>();

    for (const question of questions) {
      const sectionQuestions = sectionMap.get(question.uiSection) ?? [];

      sectionQuestions.push(question);
      sectionMap.set(question.uiSection, sectionQuestions);
    }

    const sections: QuestionSectionDto[] = questionUiSectionSchema.options
      .map((key) => {
        const sectionQuestions = sectionMap.get(key);

        if (!sectionQuestions) {
          return null;
        }

        return {
          key,
          questions: sectionQuestions,
        };
      })
      .filter((section): section is QuestionSectionDto => section !== null);

    return { sections };
  }

  private toAnswers(question: QuestionRecord): QuestionAnswerDto[] {
    if (question.answers.length !== question.question.answerValues.length) {
      throw new Error(`Question answer count mismatch: ${question.question.key}`);
    }

    return question.question.answerValues.map((value, index) => {
      const label = question.answers[index];

      if (label === undefined) {
        throw new Error(`Missing answer label: ${question.question.key}`);
      }

      return {
        label,
        value,
      };
    });
  }
}
