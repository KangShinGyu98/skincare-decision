import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type {
  AuthenticatedUserDto,
  AdminQuestionDetail,
  AdminQuestionsQuery,
  AdminQuestionsResponse,
  AdminQuestionStatus,
  AdminRuleDetail,
  AdminRuleQuestionSearchResponse,
  AdminRulesResponse,
  AdminRuleStatus,
  AdminRuleTableRow,
  CategoryDecisionResponse,
  CategoryDecisionResponseValue,
  CategoryDecisionUiSection,
  CreateAdminRuleBody,
  PriorityGateResponseDto,
  PriorityGateResponseValue,
  QuestionUiSectionDto,
  ResetCategoryDecisionResponsesRequest,
  ResetPriorityGateResponsesRequest,
  UpdateAdminQuestionBody,
  UpdateAdminQuestionSortOrderBody,
  UpdateAdminRuleBody,
  UpdateAdminRuleSortOrderBody,
  UpsertCategoryDecisionResponsesRequest,
  UpsertPriorityGateResponsesRequest,
} from '@skincare-decision/shared/schemas';
import { adminQuestionsApi, adminRulesApi, authApi, categoryDecisionApi, priorityGateApi } from './api';

export const queryKeys = {
  auth: {
    me: ['auth', 'me'] as const,
  },
  priorityGate: {
    all: ['priority-gate'] as const,
    questions: ['priority-gate', 'questions'] as const,
  },
  categoryDecision: {
    all: ['category-decision'] as const,
    detail: (category?: string) => ['category-decision', { category: category ?? null }] as const,
  },
  adminRules: {
    all: ['admin', 'rules'] as const,
    list: ['admin', 'rules', 'list'] as const,
    detail: (ruleId: string) => ['admin', 'rules', 'detail', ruleId] as const,
    questions: (q: string, limit: number) => ['admin', 'rules', 'questions', { q, limit }] as const,
  },
  adminQuestions: {
    all: ['admin', 'questions'] as const,
    list: (query: AdminQuestionsQuery) => ['admin', 'questions', 'list', query] as const,
    detail: (questionId: string) => ['admin', 'questions', 'detail', questionId] as const,
  },
};

export const mutationKeys = {
  auth: {
    logout: ['auth', 'logout'] as const,
    consent: ['auth', 'consent'] as const,
  },
  adminRules: {
    status: ['admin', 'rules', 'status'] as const,
  },
  adminQuestions: {
    status: ['admin', 'questions', 'status'] as const,
  },
};

const RESPONSE_SAVE_DEBOUNCE_MS = 800;

export function useAuthMe() {
  return useQuery<AuthenticatedUserDto | null>({
    queryKey: queryKeys.auth.me,
    queryFn: authApi.getMe,
    retry: false,
  });
}

export function useLogout() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: mutationKeys.auth.logout,
    mutationFn: authApi.logout,
    onSuccess: () => {
      queryClient.setQueryData(queryKeys.auth.me, null);
      void queryClient.invalidateQueries({ queryKey: queryKeys.auth.me });
    },
  });
}

export function useConsent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: mutationKeys.auth.consent,
    mutationFn: authApi.consent,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.auth.me });
    },
  });
}

export function usePriorityGateQuestions() {
  return useQuery({
    queryKey: queryKeys.priorityGate.questions,
    queryFn: priorityGateApi.getQuestions,
  });
}

export function useSubmitPriorityGate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: UpsertPriorityGateResponsesRequest) => priorityGateApi.submitResponses(data),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.priorityGate.questions });
    },
  });
}

export function useDebouncedPriorityGateResponseBatch() {
  const queryClient = useQueryClient();
  const timeoutIdRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const requestMapRef = useRef(new Map<string, PriorityGateResponseValue>());
  const optimisticSnapshotRef = useRef<PriorityGateResponseDto | undefined>(undefined);
  const [error, setError] = useState<Error | null>(null);

  const restoreOptimisticSnapshot = useCallback(() => {
    if (!optimisticSnapshotRef.current) {
      return;
    }

    queryClient.setQueryData(queryKeys.priorityGate.questions, optimisticSnapshotRef.current);
    optimisticSnapshotRef.current = undefined;
  }, [queryClient]);

  const setQuestionResponseInCache = useCallback(
    (questionVariantId: string, value: number[]) => {
      const currentData = queryClient.getQueryData<PriorityGateResponseDto>(
        queryKeys.priorityGate.questions,
      );

      if (!optimisticSnapshotRef.current && currentData) {
        optimisticSnapshotRef.current = currentData;
      }

      queryClient.setQueryData<PriorityGateResponseDto>(
        queryKeys.priorityGate.questions,
        (previousData) => {
          if (!previousData) {
            return previousData;
          }

          return {
            ...previousData,
            sections: previousData.sections.map((section) => ({
              ...section,
              questions: section.questions.map((question) =>
                question.questionVariantId === questionVariantId
                  ? {
                      ...question,
                      currentResponse: value,
                    }
                  : question,
              ),
            })),
          };
        },
      );
    },
    [queryClient],
  );

  const { isPending, mutate: submitPriorityGateResponses } = useMutation({
    mutationFn: (data: UpsertPriorityGateResponsesRequest) => priorityGateApi.submitResponses(data),
    onMutate: () => {
      setError(null);
    },
    onSuccess: () => {
      optimisticSnapshotRef.current = undefined;
    },
    onError: (requestError: Error) => {
      setError(requestError);
      restoreOptimisticSnapshot();
    },
    onSettled: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.priorityGate.questions });
    },
  });

  const flushResponses = useCallback(() => {
    const responses = Object.fromEntries(requestMapRef.current.entries());

    requestMapRef.current.clear();
    timeoutIdRef.current = null;

    if (Object.keys(responses).length === 0) {
      return;
    }

    submitPriorityGateResponses({ responses });
  }, [submitPriorityGateResponses]);

  const saveResponse = useCallback(
    (questionVariantId: string, response: PriorityGateResponseValue) => {
      setQuestionResponseInCache(questionVariantId, response.value);
      requestMapRef.current.set(questionVariantId, response);

      if (timeoutIdRef.current) {
        clearTimeout(timeoutIdRef.current);
      }

      timeoutIdRef.current = setTimeout(flushResponses, RESPONSE_SAVE_DEBOUNCE_MS);
    },
    [flushResponses, setQuestionResponseInCache],
  );

  const clearPendingResponses = useCallback(() => {
    if (timeoutIdRef.current) {
      clearTimeout(timeoutIdRef.current);
      timeoutIdRef.current = null;
    }

    requestMapRef.current.clear();
    restoreOptimisticSnapshot();
  }, [restoreOptimisticSnapshot]);

  useEffect(() => {
    return () => {
      if (timeoutIdRef.current) {
        clearTimeout(timeoutIdRef.current);
        timeoutIdRef.current = null;
      }

      flushResponses();
    };
  }, [flushResponses]);

  return {
    clearError: () => setError(null),
    clearPendingResponses,
    error,
    isPending,
    saveResponse,
  };
}

export function useResetPriorityGateResponses() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: ResetPriorityGateResponsesRequest) => priorityGateApi.resetResponses(data),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.priorityGate.questions });
    },
  });
}

export function usePriorityGateActions() {
  const batch = useDebouncedPriorityGateResponseBatch();
  const reset = useResetPriorityGateResponses();

  const resetPriorityGateSection = useCallback(
    (uiSection: QuestionUiSectionDto) => {
      batch.clearPendingResponses();
      batch.clearError();
      reset.reset();
      reset.mutate({ uiSection });
    },
    [batch, reset],
  );

  return {
    error: batch.error ?? reset.error,
    isPending: batch.isPending || reset.isPending,
    resetPriorityGateSection,
    saveResponse: batch.saveResponse,
  };
}

export function useCategoryDecision(category?: string) {
  return useQuery({
    queryKey: queryKeys.categoryDecision.detail(category),
    queryFn: () => categoryDecisionApi.getCategoryDecision(category),
  });
}

export function useSubmitCategoryDecision(category?: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: UpsertCategoryDecisionResponsesRequest) =>
      categoryDecisionApi.submitResponses(data),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: queryKeys.categoryDecision.detail(category),
      });
    },
  });
}

export function useDebouncedCategoryDecisionResponseBatch(category?: string) {
  const queryClient = useQueryClient();
  const timeoutIdRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const requestMapRef = useRef(new Map<string, CategoryDecisionResponseValue>());
  const optimisticSnapshotRef = useRef<CategoryDecisionResponse | undefined>(undefined);
  const [error, setError] = useState<Error | null>(null);
  const queryKey = useMemo(() => queryKeys.categoryDecision.detail(category), [category]);

  const restoreOptimisticSnapshot = useCallback(() => {
    if (!optimisticSnapshotRef.current) {
      return;
    }

    queryClient.setQueryData(queryKey, optimisticSnapshotRef.current);
    optimisticSnapshotRef.current = undefined;
  }, [queryClient, queryKey]);

  const setQuestionResponseInCache = useCallback(
    (questionVariantId: string, value: number[]) => {
      const currentData = queryClient.getQueryData<CategoryDecisionResponse>(queryKey);

      if (!optimisticSnapshotRef.current && currentData) {
        optimisticSnapshotRef.current = currentData;
      }

      queryClient.setQueryData<CategoryDecisionResponse>(queryKey, (previousData) => {
        if (!previousData) {
          return previousData;
        }

        return {
          ...previousData,
          sections: previousData.sections.map((section) => ({
            ...section,
            questions: section.questions.map((question) =>
              question.questionVariantId === questionVariantId
                ? {
                    ...question,
                    currentResponse: value,
                  }
                : question,
            ),
          })),
        };
      });
    },
    [queryClient, queryKey],
  );

  const { isPending, mutate: submitCategoryDecisionResponses } = useMutation({
    mutationFn: (data: UpsertCategoryDecisionResponsesRequest) =>
      categoryDecisionApi.submitResponses(data),
    onMutate: () => {
      setError(null);
    },
    onSuccess: () => {
      optimisticSnapshotRef.current = undefined;
    },
    onError: (requestError: Error) => {
      setError(requestError);
      restoreOptimisticSnapshot();
    },
    onSettled: async () => {
      await queryClient.invalidateQueries({ queryKey });
    },
  });

  const flushResponses = useCallback(() => {
    const responses = Object.fromEntries(requestMapRef.current.entries());

    requestMapRef.current.clear();
    timeoutIdRef.current = null;

    if (Object.keys(responses).length === 0) {
      return;
    }

    submitCategoryDecisionResponses({ responses });
  }, [submitCategoryDecisionResponses]);

  const saveResponse = useCallback(
    (questionVariantId: string, response: CategoryDecisionResponseValue) => {
      setQuestionResponseInCache(questionVariantId, response.value);
      requestMapRef.current.set(questionVariantId, response);

      if (timeoutIdRef.current) {
        clearTimeout(timeoutIdRef.current);
      }

      timeoutIdRef.current = setTimeout(flushResponses, RESPONSE_SAVE_DEBOUNCE_MS);
    },
    [flushResponses, setQuestionResponseInCache],
  );

  const clearPendingResponses = useCallback(() => {
    if (timeoutIdRef.current) {
      clearTimeout(timeoutIdRef.current);
      timeoutIdRef.current = null;
    }

    requestMapRef.current.clear();
    restoreOptimisticSnapshot();
  }, [restoreOptimisticSnapshot]);

  useEffect(() => {
    return () => {
      if (timeoutIdRef.current) {
        clearTimeout(timeoutIdRef.current);
        timeoutIdRef.current = null;
      }

      flushResponses();
    };
  }, [flushResponses]);

  return {
    clearError: () => setError(null),
    clearPendingResponses,
    error,
    isPending,
    saveResponse,
  };
}

export function useResetCategoryDecisionResponses(category?: string) {
  const queryClient = useQueryClient();
  const queryKey = useMemo(() => queryKeys.categoryDecision.detail(category), [category]);

  return useMutation({
    mutationFn: (data: ResetCategoryDecisionResponsesRequest) =>
      categoryDecisionApi.resetResponses(data),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey });
    },
  });
}

export function useCategoryDecisionActions(category?: string) {
  const batch = useDebouncedCategoryDecisionResponseBatch(category);
  const reset = useResetCategoryDecisionResponses(category);

  const resetCategoryDecisionSection = useCallback(
    (uiSection: CategoryDecisionUiSection) => {
      batch.clearPendingResponses();
      batch.clearError();
      reset.reset();
      reset.mutate({ uiSection });
    },
    [batch, reset],
  );

  return {
    error: batch.error ?? reset.error,
    isPending: batch.isPending || reset.isPending,
    resetCategoryDecisionSection,
    saveResponse: batch.saveResponse,
  };
}

function replaceAdminRuleRow(
  previousData: AdminRulesResponse | undefined,
  nextRow: AdminRuleTableRow,
): AdminRulesResponse | undefined {
  if (!previousData) {
    return previousData;
  }

  return {
    items: previousData.items.map((item) => (item.id === nextRow.id ? nextRow : item)),
  };
}

function appendAdminRuleRow(
  previousData: AdminRulesResponse | undefined,
  nextRow: AdminRuleTableRow,
): AdminRulesResponse | undefined {
  if (!previousData) {
    return previousData;
  }

  const hasExistingRow = previousData.items.some((item) => item.id === nextRow.id);
  const items = hasExistingRow
    ? previousData.items.map((item) => (item.id === nextRow.id ? nextRow : item))
    : [...previousData.items, nextRow];

  return {
    items: [...items].sort((first, second) => first.sort_order - second.sort_order),
  };
}

function removeAdminRuleRow(
  previousData: AdminRulesResponse | undefined,
  ruleId: string,
): AdminRulesResponse | undefined {
  if (!previousData) {
    return previousData;
  }

  return {
    items: previousData.items.filter((item) => item.id !== ruleId),
  };
}

export function useAdminRules() {
  return useQuery({
    queryKey: queryKeys.adminRules.list,
    queryFn: adminRulesApi.getRules,
  });
}

export function useAdminQuestions(query: AdminQuestionsQuery) {
  return useQuery<AdminQuestionsResponse>({
    queryKey: queryKeys.adminQuestions.list(query),
    queryFn: () => adminQuestionsApi.getQuestions(query),
  });
}

export function useAdminQuestionDetail(questionId: string | null) {
  return useQuery({
    queryKey: questionId
      ? queryKeys.adminQuestions.detail(questionId)
      : ['admin', 'questions', 'detail', null],
    queryFn: () => {
      if (!questionId) {
        throw new Error('questionId is required');
      }

      return adminQuestionsApi.getQuestion(questionId);
    },
    enabled: Boolean(questionId),
  });
}

export function useAdminRuleDetail(ruleId: string | null) {
  return useQuery({
    queryKey: ruleId ? queryKeys.adminRules.detail(ruleId) : ['admin', 'rules', 'detail', null],
    queryFn: () => {
      if (!ruleId) {
        throw new Error('ruleId is required');
      }

      return adminRulesApi.getRule(ruleId);
    },
    enabled: Boolean(ruleId),
  });
}

export function useAdminRuleQuestionSearch(
  query: { q?: string; limit?: number; enabled?: boolean } = {},
) {
  const q = query.q?.trim() ?? '';
  const limit = query.limit ?? 50;

  return useQuery<AdminRuleQuestionSearchResponse>({
    queryKey: queryKeys.adminRules.questions(q, limit),
    queryFn: () =>
      adminRulesApi.searchQuestions({
        q: q.length > 0 ? q : undefined,
        limit,
      }),
    enabled: query.enabled ?? true,
  });
}

export function useCreateAdminRule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateAdminRuleBody) => adminRulesApi.createRule(data),
    onSuccess: async (createdRule) => {
      queryClient.setQueryData<AdminRulesResponse>(queryKeys.adminRules.list, (previousData) =>
        appendAdminRuleRow(previousData, createdRule),
      );
      queryClient.setQueryData<AdminRuleDetail>(
        queryKeys.adminRules.detail(createdRule.id),
        createdRule,
      );
      await queryClient.invalidateQueries({ queryKey: queryKeys.adminRules.all });
    },
  });
}

export function useUpdateAdminRule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ ruleId, data }: { ruleId: string; data: UpdateAdminRuleBody }) =>
      adminRulesApi.updateRule(ruleId, data),
    onSuccess: async (updatedRule) => {
      queryClient.setQueryData<AdminRulesResponse>(queryKeys.adminRules.list, (previousData) =>
        replaceAdminRuleRow(previousData, updatedRule),
      );
      queryClient.setQueryData<AdminRuleDetail>(
        queryKeys.adminRules.detail(updatedRule.id),
        updatedRule,
      );
      await queryClient.invalidateQueries({ queryKey: queryKeys.adminRules.all });
    },
  });
}

export function useDeleteAdminRule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (ruleId: string) => adminRulesApi.deleteRule(ruleId),
    onSuccess: async (response) => {
      queryClient.setQueryData<AdminRulesResponse>(queryKeys.adminRules.list, (previousData) =>
        removeAdminRuleRow(previousData, response.id),
      );
      queryClient.removeQueries({ queryKey: queryKeys.adminRules.detail(response.id) });
      await queryClient.invalidateQueries({ queryKey: queryKeys.adminRules.all });
    },
  });
}

export function useAdminRuleDialogActions({
  ruleId,
  onSuccess,
}: {
  ruleId: string | null;
  onSuccess?: () => void;
}) {
  const createRule = useCreateAdminRule();
  const updateRule = useUpdateAdminRule();
  const deleteRule = useDeleteAdminRule();
  const isMutatingRef = useRef(false);
  const isPending = createRule.isPending || updateRule.isPending || deleteRule.isPending;
  const error = createRule.error ?? updateRule.error ?? deleteRule.error;

  const unlockMutation = useCallback(() => {
    isMutatingRef.current = false;
  }, []);

  const reset = useCallback(() => {
    isMutatingRef.current = false;
    createRule.reset();
    updateRule.reset();
    deleteRule.reset();
  }, [createRule, updateRule, deleteRule]);

  const submitRule = useCallback(
    (data: CreateAdminRuleBody) => {
      if (isPending || isMutatingRef.current) {
        return;
      }

      isMutatingRef.current = true;

      if (ruleId === null) {
        createRule.mutate(data, { onSettled: unlockMutation, onSuccess });
        return;
      }

      updateRule.mutate({ ruleId, data }, { onSettled: unlockMutation, onSuccess });
    },
    [createRule, isPending, onSuccess, ruleId, unlockMutation, updateRule],
  );

  const deleteRuleById = useCallback(() => {
    if (!ruleId || isPending || isMutatingRef.current) {
      return;
    }

    isMutatingRef.current = true;

    deleteRule.mutate(ruleId, { onSettled: unlockMutation, onSuccess });
  }, [deleteRule, isPending, onSuccess, ruleId, unlockMutation]);

  return {
    deleteRule: deleteRuleById,
    error,
    isPending,
    reset,
    submitRule,
  };
}

export function useUpdateAdminRuleStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: mutationKeys.adminRules.status,
    mutationFn: ({ ruleId, status }: { ruleId: string; status: AdminRuleStatus }) =>
      adminRulesApi.updateStatus(ruleId, { status }),
    onSuccess: async (updatedRule) => {
      queryClient.setQueryData<AdminRulesResponse>(queryKeys.adminRules.list, (previousData) =>
        replaceAdminRuleRow(previousData, updatedRule),
      );
      await queryClient.invalidateQueries({ queryKey: queryKeys.adminRules.all });
    },
  });
}

export function useSaveAdminRuleSortOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: UpdateAdminRuleSortOrderBody) => adminRulesApi.updateSortOrder(data),
    onSuccess: async (response) => {
      queryClient.setQueryData<AdminRulesResponse>(queryKeys.adminRules.list, response);
      await queryClient.invalidateQueries({ queryKey: queryKeys.adminRules.all });
    },
  });
}

export function useUpdateAdminQuestion() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ questionId, data }: { questionId: string; data: UpdateAdminQuestionBody }) =>
      adminQuestionsApi.updateQuestion(questionId, data),
    onSuccess: async (updatedQuestion) => {
      queryClient.setQueryData<AdminQuestionDetail>(
        queryKeys.adminQuestions.detail(updatedQuestion.id),
        updatedQuestion,
      );
      await queryClient.invalidateQueries({ queryKey: queryKeys.adminQuestions.all });
    },
  });
}

export function useAdminQuestionDialogActions({
  questionId,
  onSuccess,
}: {
  questionId: string | null;
  onSuccess?: () => void;
}) {
  const updateQuestion = useUpdateAdminQuestion();
  const isMutatingRef = useRef(false);
  const isPending = updateQuestion.isPending;
  const error = updateQuestion.error;

  const unlockMutation = useCallback(() => {
    isMutatingRef.current = false;
  }, []);

  const reset = useCallback(() => {
    isMutatingRef.current = false;
    updateQuestion.reset();
  }, [updateQuestion]);

  const submitQuestion = useCallback(
    (data: UpdateAdminQuestionBody) => {
      if (!questionId || isPending || isMutatingRef.current) {
        return;
      }

      isMutatingRef.current = true;
      updateQuestion.mutate({ questionId, data }, { onSettled: unlockMutation, onSuccess });
    },
    [isPending, onSuccess, questionId, unlockMutation, updateQuestion],
  );

  return {
    error,
    isPending,
    reset,
    submitQuestion,
  };
}

export function useUpdateAdminQuestionStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: mutationKeys.adminQuestions.status,
    mutationFn: ({
      questionVariantId,
      status,
    }: {
      questionVariantId: string;
      status: AdminQuestionStatus;
    }) => adminQuestionsApi.updateStatus(questionVariantId, { status }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.adminQuestions.all });
    },
  });
}

export function useSaveAdminQuestionSortOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: UpdateAdminQuestionSortOrderBody) => adminQuestionsApi.updateSortOrder(data),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.adminQuestions.all });
    },
  });
}
