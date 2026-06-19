import { Injectable } from '@nestjs/common';
import type {
  SelectLandingConcernBodyDto,
  SelectLandingConcernResponseDto,
} from '@skincare-decision/shared/schemas';
import { UserResponseSource } from '../../generated/prisma/enums';
import { SessionEventService } from '../session/session-event.service';
import {
  type UpsertUserResponseInput,
  UserResponsesService,
} from '../user-responses/user-responses.service';
import { LandingConcernSelectionsRepository } from './landing-concern-selections.repository';

const FLOW_CONCERN_QUESTION_KEY = 'flow.concern';

const LANDING_CONCERN_RESPONSE_PRESETS = {
  acne_spot: {
    [FLOW_CONCERN_QUESTION_KEY]: [1],
  },
  acne: {
    [FLOW_CONCERN_QUESTION_KEY]: [2],
  },
  redness: {
    [FLOW_CONCERN_QUESTION_KEY]: [3],
    'life.recent_irritation': [1],
  },
  breakout_reaction: {
    [FLOW_CONCERN_QUESTION_KEY]: [4],
    'life.recent_irritation': [1],
  },
  recurring_trouble: {
    [FLOW_CONCERN_QUESTION_KEY]: [5],
  },
  sensitivity_reaction: {
    [FLOW_CONCERN_QUESTION_KEY]: [6],
    'life.recent_irritation': [1],
  },
  dryness: {
    [FLOW_CONCERN_QUESTION_KEY]: [7],
    'routine.recent_dry_tight': [1],
  },
  tightness: {
    [FLOW_CONCERN_QUESTION_KEY]: [8],
    'routine.recent_dry_tight': [1],
  },
  flaky_texture: {
    [FLOW_CONCERN_QUESTION_KEY]: [9],
    'routine.recent_dry_tight': [1],
  },
  oiliness: {
    [FLOW_CONCERN_QUESTION_KEY]: [10],
  },
  eye_area_dryness: {
    [FLOW_CONCERN_QUESTION_KEY]: [11],
    'routine.recent_dry_tight': [1],
  },
  lip_chapped: {
    [FLOW_CONCERN_QUESTION_KEY]: [12],
  },
  makeup_floating: {
    [FLOW_CONCERN_QUESTION_KEY]: [13],
    'context.makeup_use': [1],
  },
  pilling: {
    [FLOW_CONCERN_QUESTION_KEY]: [14],
    'context.makeup_use': [1],
  },
  cushion_help: {
    [FLOW_CONCERN_QUESTION_KEY]: [15],
    'context.makeup_use': [1],
  },
  foundation_help: {
    [FLOW_CONCERN_QUESTION_KEY]: [16],
    'context.makeup_use': [1],
  },
  sunscreen_need: {
    [FLOW_CONCERN_QUESTION_KEY]: [17],
  },
  lipcare_need: {
    [FLOW_CONCERN_QUESTION_KEY]: [18],
  },
  pigmentation: {
    [FLOW_CONCERN_QUESTION_KEY]: [19],
  },
  dark_circle: {
    [FLOW_CONCERN_QUESTION_KEY]: [20],
  },
  redness_chronic: {
    [FLOW_CONCERN_QUESTION_KEY]: [21],
    'life.recent_irritation': [1],
  },
  pore: {
    [FLOW_CONCERN_QUESTION_KEY]: [22],
  },
  tone: {
    [FLOW_CONCERN_QUESTION_KEY]: [23],
  },
  elasticity: {
    [FLOW_CONCERN_QUESTION_KEY]: [24],
  },
} as const satisfies Record<string, Record<string, readonly number[]>>;

export type SelectLandingConcernInput = SelectLandingConcernBodyDto & {
  sessionId: string;
  deviceId: string;
  userId?: string;
};

@Injectable()
export class LandingConcernSelectionsService {
  constructor(
    private readonly repository: LandingConcernSelectionsRepository,
    private readonly sessionEventService: SessionEventService,
    private readonly userResponsesService: UserResponsesService,
  ) {}

  async selectConcern(input: SelectLandingConcernInput): Promise<SelectLandingConcernResponseDto> {
    await this.recordConcernClicked(input);
    const concernResponses = await this.toConcernUserResponses(input);
    await this.upsertConcernUserResponses(concernResponses);

    return {
      concern: input.concern,
    };
  }

  private async recordConcernClicked(input: SelectLandingConcernInput): Promise<void> {
    await this.sessionEventService.record({
      sessionId: input.sessionId,
      eventName: 'concern_clicked',
      screen: 'landing',
      elementId: 'landing.concern',
      payload: {
        concern: input.concern,
      },
    });
  }

  private async toConcernUserResponses(
    input: SelectLandingConcernInput,
  ): Promise<UpsertUserResponseInput[]> {
    const preset = this.getConcernResponsePreset(input.concern);
    const questionIds = await this.repository.findQuestionIdsByKeys(Object.keys(preset));

    const concernResponses = Object.entries(preset).map(([questionKey, value]) => {
      const questionId = questionIds.get(questionKey);

      if (!questionId) {
        throw new Error(`Missing question: ${questionKey}`);
      }

      return {
        deviceId: input.deviceId,
        ...(input.userId ? { userId: input.userId } : {}),
        questionId,
        value: [...value],
        source: UserResponseSource.concern,
      };
    });

    return concernResponses;
  }

  private async upsertConcernUserResponses(inputs: UpsertUserResponseInput[]): Promise<void> {
    await Promise.all(
      inputs.map((input) => this.userResponsesService.upsertCurrentResponse(input)),
    );
  }

  private getConcernResponsePreset(concern: string): Record<string, readonly number[]> {
    const preset =
      LANDING_CONCERN_RESPONSE_PRESETS[concern as keyof typeof LANDING_CONCERN_RESPONSE_PRESETS];

    if (!preset) {
      throw new Error(`Unsupported landing concern: ${concern}`);
    }

    return preset;
  }
}
