import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { UpsertPriorityGateResponsesRequest } from '@skincare-decision/shared/schemas';
import { priorityGateApi } from './api';

export const queryKeys = {
  priorityGate: {
    all: ['priority-gate'] as const,
    questions: ['priority-gate', 'questions'] as const,
  },
};

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
