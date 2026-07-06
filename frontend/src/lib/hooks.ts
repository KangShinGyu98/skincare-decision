import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type {
  AdminRuleDetail,
  AdminRulesResponse,
  AdminRuleStatus,
  AdminRuleTableRow,
  CategoryDecisionResponse,
  CategoryDecisionResponseValue,
  CategoryDecisionUiSection,
  PriorityGateResponseDto,
  PriorityGateResponseValue,
  QuestionUiSectionDto,
  ResetCategoryDecisionResponsesRequest,
  ResetPriorityGateResponsesRequest,
  UpdateAdminRuleSortOrderBody,
  UpsertCategoryDecisionResponsesRequest,
  UpsertPriorityGateResponsesRequest,
} from '@skincare-decision/shared/schemas';
import { adminRulesApi, categoryDecisionApi, priorityGateApi } from './api';

export const queryKeys = {
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
  },
};

const RESPONSE_SAVE_DEBOUNCE_MS = 800;

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

function mergeAdminRuleDetail(
  previousData: AdminRuleDetail | undefined,
  nextRow: AdminRuleTableRow,
): AdminRuleDetail | undefined {
  if (!previousData) {
    return previousData;
  }

  return {
    ...previousData,
    id: nextRow.id,
    sort_order: nextRow.sort_order,
    ruleName: nextRow.ruleName,
    conclusion: nextRow.conclusion,
    resultType: nextRow.resultType,
    status: nextRow.status,
    adminNote: nextRow.adminNote,
  };
}

function makeError(): void {
  throw new Error('대충 에러메시지');
}
export function useAdminRules() {
  return useQuery({
    queryKey: queryKeys.adminRules.list,
    queryFn: adminRulesApi.getRules,
    // queryFn: makeError,
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

export function useUpdateAdminRuleStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ ruleId, status }: { ruleId: string; status: AdminRuleStatus }) =>
      adminRulesApi.updateStatus(ruleId, { status }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.adminRules.all });
    },
  });
}

export function useUpdateAdminRuleAdminNote() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ ruleId, adminNote }: { ruleId: string; adminNote: string | null }) =>
      adminRulesApi.updateAdminNote(ruleId, { adminNote }),
    onSuccess: async (updatedRule) => {
      queryClient.setQueryData<AdminRulesResponse>(queryKeys.adminRules.list, (previousData) =>
        replaceAdminRuleRow(previousData, updatedRule),
      );
      queryClient.setQueryData<AdminRuleDetail>(
        queryKeys.adminRules.detail(updatedRule.id),
        (previousData) => mergeAdminRuleDetail(previousData, updatedRule),
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
