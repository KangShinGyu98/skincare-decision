import { useCallback, useEffect, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type {
  PriorityGateResponseDto,
  PriorityGateResponseValue,
  ResetCategoryDecisionResponsesRequest,
  UpsertCategoryDecisionResponsesRequest,
  ResetPriorityGateResponsesRequest,
  UpsertPriorityGateResponsesRequest,
} from '@skincare-decision/shared/schemas';
import { categoryDecisionApi, priorityGateApi } from './api';

export const queryKeys = {
  priorityGate: {
    all: ['priority-gate'] as const,
    questions: ['priority-gate', 'questions'] as const,
  },
  categoryDecision: {
    all: ['category-decision'] as const,
    detail: (category?: string) => ['category-decision', { category: category ?? null }] as const,
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

export function useResetCategoryDecisionResponses() {
  return useMutation({
    mutationFn: (data: ResetCategoryDecisionResponsesRequest) =>
      categoryDecisionApi.resetResponses(data),
  });
}
