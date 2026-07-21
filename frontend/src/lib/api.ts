import {
  type AuthenticatedUserDto,
  authenticatedUserSchema,
  type AdminQuestionDetail,
  adminQuestionDetailSchema,
  type AdminQuestionsQuery,
  type AdminQuestionsResponse,
  adminQuestionsResponseSchema,
  type AdminRuleDetail,
  adminRuleDetailSchema,
  type AdminRuleQuestionSearchResponse,
  adminRuleQuestionSearchResponseSchema,
  type AdminRulesResponse,
  adminRulesResponseSchema,
  type CategoryDecisionResponse,
  categoryDecisionResponseSchema,
  type CreateAdminRuleBody,
  createAdminRuleBodySchema,
  type CreateAdminRuleResponse,
  createAdminRuleResponseSchema,
  type DeleteAdminRuleResponse,
  deleteAdminRuleResponseSchema,
  type PriorityGateResponseDto,
  priorityGateResponseSchema,
  type ResetCategoryDecisionResponsesRequest,
  resetCategoryDecisionResponsesRequestSchema,
  type ResetCategoryDecisionResponsesResponse,
  resetCategoryDecisionResponsesResponseSchema,
  type ResetPriorityGateResponsesRequest,
  resetPriorityGateResponsesRequestSchema,
  type ResetPriorityGateResponsesResponse,
  resetPriorityGateResponsesResponseSchema,
  type UpdateAdminQuestionBody,
  updateAdminQuestionBodySchema,
  type UpdateAdminQuestionResponse,
  updateAdminQuestionResponseSchema,
  type UpdateAdminQuestionSortOrderBody,
  updateAdminQuestionSortOrderBodySchema,
  type UpdateAdminQuestionSortOrderResponse,
  updateAdminQuestionSortOrderResponseSchema,
  type UpdateAdminQuestionStatusBody,
  updateAdminQuestionStatusBodySchema,
  type UpdateAdminQuestionStatusResponse,
  updateAdminQuestionStatusResponseSchema,
  type UpdateAdminRuleBody,
  updateAdminRuleBodySchema,
  type UpdateAdminRuleResponse,
  updateAdminRuleResponseSchema,
  type UpdateAdminRuleSortOrderBody,
  updateAdminRuleSortOrderBodySchema,
  type UpdateAdminRuleSortOrderResponse,
  updateAdminRuleSortOrderResponseSchema,
  type UpdateAdminRuleStatusBody,
  updateAdminRuleStatusBodySchema,
  type UpdateAdminRuleStatusResponse,
  updateAdminRuleStatusResponseSchema,
  type UpsertCategoryDecisionResponsesRequest,
  upsertCategoryDecisionResponsesRequestSchema,
  type UpsertCategoryDecisionResponsesResponse,
  upsertCategoryDecisionResponsesResponseSchema,
  type UpsertPriorityGateResponsesRequest,
  upsertPriorityGateResponsesRequestSchema,
  type UpsertPriorityGateResponsesResponse,
  upsertPriorityGateResponsesResponseSchema,
} from '@skincare-decision/shared/schemas';
import { z } from 'zod';

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

function getCategoryDecisionUrl(path = '') {
  return `${getApiBaseUrl()}/category-decision${path}`;
}

function getAdminRulesUrl(path = '') {
  return `${getApiBaseUrl()}/admin/rules${path}`;
}

function getAdminQuestionsUrl(path = '') {
  return `${getApiBaseUrl()}/admin/questions${path}`;
}

function getAuthUrl(path = '') {
  return `${getApiBaseUrl()}/auth${path}`;
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

async function handleResponse<TSchema extends z.ZodType>(
  response: Response,
  schema: TSchema,
): Promise<z.infer<TSchema>> {
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

export const authApi = {
  getMe: async (): Promise<AuthenticatedUserDto | null> => {
    const response = await fetch(getAuthUrl('/me'), {
      method: 'GET',
      credentials: 'include',
    });

    if (response.status === 401) {
      return null;
    }

    return handleResponse(response, authenticatedUserSchema);
  },

  logout: async (): Promise<void> => {
    const response = await fetch(getAuthUrl('/logout'), {
      method: 'POST',
      credentials: 'include',
    });

    await handleResponse(response, z.object({ ok: z.boolean() }));
  },

  consent: async (): Promise<void> => {
    const response = await fetch(getAuthUrl('/consent'), {
      method: 'POST',
      credentials: 'include',
    });

    await handleResponse(response, z.object({ ok: z.boolean() }));
  },

  getGoogleLoginUrl: (redirectTo?: string): string => {
    const searchParams = redirectTo ? `?${new URLSearchParams({ redirectTo })}` : '';

    return `${getAuthUrl('/google')}${searchParams}`;
  },
};

export const priorityGateApi = {
  getQuestions: async (): Promise<PriorityGateResponseDto> => {
    // await sleep(1500);
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

  resetResponses: async (
    data: ResetPriorityGateResponsesRequest,
  ): Promise<ResetPriorityGateResponsesResponse> => {
    const parsed = resetPriorityGateResponsesRequestSchema.safeParse(data);

    if (!parsed.success) {
      throw new ApiValidationError(`Invalid priority gate reset request: ${parsed.error.message}`);
    }

    const searchParams = new URLSearchParams({
      uiSection: parsed.data.uiSection,
    });
    const response = await fetch(getPriorityGateUrl(`/reset-responses?${searchParams}`), {
      method: 'DELETE',
      credentials: 'include',
    });

    return handleResponse(response, resetPriorityGateResponsesResponseSchema);
  },
};

export const categoryDecisionApi = {
  getCategoryDecision: async (category?: string): Promise<CategoryDecisionResponse> => {
    // await sleep(1500);
    const searchParams = category ? `?${new URLSearchParams({ category })}` : '';
    const response = await fetch(getCategoryDecisionUrl(searchParams), {
      method: 'GET',
      credentials: 'include',
    });

    return handleResponse(response, categoryDecisionResponseSchema);
  },

  submitResponses: async (
    data: UpsertCategoryDecisionResponsesRequest,
  ): Promise<UpsertCategoryDecisionResponsesResponse> => {
    const parsed = upsertCategoryDecisionResponsesRequestSchema.safeParse(data);

    if (!parsed.success) {
      throw new ApiValidationError(
        `Invalid category decision response request: ${parsed.error.message}`,
      );
    }

    const response = await fetch(getCategoryDecisionUrl('/responses'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify(parsed.data),
    });

    return handleResponse(response, upsertCategoryDecisionResponsesResponseSchema);
  },

  resetResponses: async (
    data: ResetCategoryDecisionResponsesRequest,
  ): Promise<ResetCategoryDecisionResponsesResponse> => {
    const parsed = resetCategoryDecisionResponsesRequestSchema.safeParse(data);

    if (!parsed.success) {
      throw new ApiValidationError(
        `Invalid category decision reset request: ${parsed.error.message}`,
      );
    }

    const searchParams = new URLSearchParams({
      uiSection: parsed.data.uiSection,
    });
    const response = await fetch(getCategoryDecisionUrl(`/reset-responses?${searchParams}`), {
      method: 'DELETE',
      credentials: 'include',
    });

    return handleResponse(response, resetCategoryDecisionResponsesResponseSchema);
  },
};

export const adminRulesApi = {
  getRules: async (): Promise<AdminRulesResponse> => {
    await sleep(2000);
    const response = await fetch(getAdminRulesUrl(), {
      method: 'GET',
      credentials: 'include',
    });

    return handleResponse(response, adminRulesResponseSchema);
  },

  getRule: async (ruleId: string): Promise<AdminRuleDetail> => {
    const response = await fetch(getAdminRulesUrl(`/${ruleId}`), {
      method: 'GET',
      credentials: 'include',
    });

    return handleResponse(response, adminRuleDetailSchema);
  },

  searchQuestions: async (
    query: { q?: string; limit?: number } = {},
  ): Promise<AdminRuleQuestionSearchResponse> => {
    const searchParams = new URLSearchParams();

    if (query.q) {
      searchParams.set('q', query.q);
    }

    if (query.limit) {
      searchParams.set('limit', String(query.limit));
    }

    const search = searchParams.toString();
    const response = await fetch(getAdminRulesUrl(`/questions${search ? `?${search}` : ''}`), {
      method: 'GET',
      credentials: 'include',
    });

    return handleResponse(response, adminRuleQuestionSearchResponseSchema);
  },

  createRule: async (data: CreateAdminRuleBody): Promise<CreateAdminRuleResponse> => {
    const parsed = createAdminRuleBodySchema.safeParse(data);

    if (!parsed.success) {
      throw new ApiValidationError(`Invalid admin rule create request: ${parsed.error.message}`);
    }

    const response = await fetch(getAdminRulesUrl(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify(parsed.data),
    });

    return handleResponse(response, createAdminRuleResponseSchema);
  },

  updateRule: async (
    ruleId: string,
    data: UpdateAdminRuleBody,
  ): Promise<UpdateAdminRuleResponse> => {
    const parsed = updateAdminRuleBodySchema.safeParse(data);

    if (!parsed.success) {
      throw new ApiValidationError(`Invalid admin rule update request: ${parsed.error.message}`);
    }

    const response = await fetch(getAdminRulesUrl(`/${ruleId}`), {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify(parsed.data),
    });

    return handleResponse(response, updateAdminRuleResponseSchema);
  },

  deleteRule: async (ruleId: string): Promise<DeleteAdminRuleResponse> => {
    const response = await fetch(getAdminRulesUrl(`/${ruleId}`), {
      method: 'DELETE',
      credentials: 'include',
    });

    return handleResponse(response, deleteAdminRuleResponseSchema);
  },

  updateStatus: async (
    ruleId: string,
    data: UpdateAdminRuleStatusBody,
  ): Promise<UpdateAdminRuleStatusResponse> => {
    const parsed = updateAdminRuleStatusBodySchema.safeParse(data);
    await sleep(3000);
    if (!parsed.success) {
      throw new ApiValidationError(`Invalid admin rule status request: ${parsed.error.message}`);
    }

    const response = await fetch(getAdminRulesUrl(`/${ruleId}/status`), {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify(parsed.data),
    });

    return handleResponse(response, updateAdminRuleStatusResponseSchema);
  },

  updateSortOrder: async (
    data: UpdateAdminRuleSortOrderBody,
  ): Promise<UpdateAdminRuleSortOrderResponse> => {
    const parsed = updateAdminRuleSortOrderBodySchema.safeParse(data);

    if (!parsed.success) {
      throw new ApiValidationError(
        `Invalid admin rule sort_order request: ${parsed.error.message}`,
      );
    }

    const response = await fetch(getAdminRulesUrl('/sort_order'), {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify(parsed.data),
    });

    return handleResponse(response, updateAdminRuleSortOrderResponseSchema);
  },
};

export const adminQuestionsApi = {
  getQuestions: async (query: AdminQuestionsQuery): Promise<AdminQuestionsResponse> => {
    const searchParams = new URLSearchParams();

    searchParams.set('uiSection', query.uiSection);

    const search = searchParams.toString();
    const response = await fetch(getAdminQuestionsUrl(search ? `?${search}` : ''), {
      method: 'GET',
      credentials: 'include',
    });

    return handleResponse(response, adminQuestionsResponseSchema);
  },

  getQuestion: async (questionId: string): Promise<AdminQuestionDetail> => {
    const response = await fetch(getAdminQuestionsUrl(`/${questionId}`), {
      method: 'GET',
      credentials: 'include',
    });

    return handleResponse(response, adminQuestionDetailSchema);
  },

  updateQuestion: async (
    questionId: string,
    data: UpdateAdminQuestionBody,
  ): Promise<UpdateAdminQuestionResponse> => {
    const parsed = updateAdminQuestionBodySchema.safeParse(data);

    if (!parsed.success) {
      throw new ApiValidationError(
        `Invalid admin question update request: ${parsed.error.message}`,
      );
    }

    const response = await fetch(getAdminQuestionsUrl(`/${questionId}`), {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify(parsed.data),
    });

    return handleResponse(response, updateAdminQuestionResponseSchema);
  },

  updateStatus: async (
    questionVariantId: string,
    data: UpdateAdminQuestionStatusBody,
  ): Promise<UpdateAdminQuestionStatusResponse> => {
    const parsed = updateAdminQuestionStatusBodySchema.safeParse(data);
    await sleep(2000);
    if (!parsed.success) {
      throw new ApiValidationError(
        `Invalid admin question status request: ${parsed.error.message}`,
      );
    }

    const response = await fetch(getAdminQuestionsUrl(`/${questionVariantId}/status`), {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify(parsed.data),
    });

    return handleResponse(response, updateAdminQuestionStatusResponseSchema);
  },

  updateSortOrder: async (
    data: UpdateAdminQuestionSortOrderBody,
  ): Promise<UpdateAdminQuestionSortOrderResponse> => {
    const parsed = updateAdminQuestionSortOrderBodySchema.safeParse(data);

    if (!parsed.success) {
      throw new ApiValidationError(
        `Invalid admin question sort_order request: ${parsed.error.message}`,
      );
    }

    const response = await fetch(getAdminQuestionsUrl('/sort_order'), {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify(parsed.data),
    });

    return handleResponse(response, updateAdminQuestionSortOrderResponseSchema);
  },
};
