import {
  type PriorityGateResponseDto,
  priorityGateResponseSchema,
  type UpsertPriorityGateResponsesRequest,
  upsertPriorityGateResponsesRequestSchema,
  type UpsertPriorityGateResponsesResponse,
  upsertPriorityGateResponsesResponseSchema,
} from '@skincare-decision/shared/schemas';

type ApiErrorPayload = {
  statusCode?: number;
  code?: string;
  message?: string;
  details?: unknown;
};

export class ApiError extends Error {
  readonly status: number;
  readonly code?: string;
  readonly details?: unknown;

  constructor(status: number, message: string, options?: { code?: string; details?: unknown }) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = options?.code;
    this.details = options?.details;
  }
}

export class ApiValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ApiValidationError';
  }
}

function getApiBaseUrl() {
  const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:4000/api';

  return baseUrl.replace(/\/+$/, '');
}

function getPriorityGateUrl(path = '') {
  return `${getApiBaseUrl()}/priority-gate${path}`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

async function readJson(response: Response): Promise<unknown> {
  const text = await response.text();

  if (text.length === 0) {
    return null;
  }

  try {
    return JSON.parse(text);
  } catch {
    throw new ApiError(response.status, 'Invalid JSON response');
  }
}

function extractErrorPayload(data: unknown): ApiErrorPayload {
  if (!isRecord(data)) {
    return {};
  }

  const rawError = data.error;

  if (!isRecord(rawError)) {
    return {};
  }

  return {
    statusCode: typeof rawError.statusCode === 'number' ? rawError.statusCode : undefined,
    code: typeof rawError.code === 'string' ? rawError.code : undefined,
    message: typeof rawError.message === 'string' ? rawError.message : undefined,
    details: rawError.details,
  };
}

function parseEnvelopeData(data: unknown): unknown {
  if (!isRecord(data) || data.success !== true || !('data' in data)) {
    throw new ApiValidationError('Invalid API response envelope');
  }

  return data.data;
}

function handleResponse(
  response: Response,
  schema: typeof priorityGateResponseSchema,
): Promise<PriorityGateResponseDto>;
function handleResponse(
  response: Response,
  schema: typeof upsertPriorityGateResponsesResponseSchema,
): Promise<UpsertPriorityGateResponsesResponse>;
async function handleResponse(
  response: Response,
  schema: typeof priorityGateResponseSchema | typeof upsertPriorityGateResponsesResponseSchema,
): Promise<PriorityGateResponseDto | UpsertPriorityGateResponsesResponse> {
  const data = await readJson(response);

  if (!response.ok) {
    const error = extractErrorPayload(data);
    throw new ApiError(
      error.statusCode ?? response.status,
      error.message ?? `Request failed with status ${response.status}`,
      {
        code: error.code,
        details: error.details,
      },
    );
  }

  const parsed = schema.safeParse(parseEnvelopeData(data));

  if (!parsed.success) {
    throw new ApiValidationError(`Invalid API response data: ${parsed.error.message}`);
  }

  return parsed.data;
}
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export const priorityGateApi = {
  getQuestions: async (): Promise<PriorityGateResponseDto> => {
    await sleep(3000);
    const response = await fetch(getPriorityGateUrl(), {
      method: 'GET',
      credentials: 'include',
    });

    return handleResponse(response, priorityGateResponseSchema);
  },

  submitResponses: async (
    data: UpsertPriorityGateResponsesRequest,
  ): Promise<UpsertPriorityGateResponsesResponse> => {
    const parsed = upsertPriorityGateResponsesRequestSchema.safeParse(data);

    if (!parsed.success) {
      throw new ApiValidationError(
        `Invalid priority gate response request: ${parsed.error.message}`,
      );
    }

    const response = await fetch(getPriorityGateUrl('/responses'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify(parsed.data),
    });

    return handleResponse(response, upsertPriorityGateResponsesResponseSchema);
  },
};
