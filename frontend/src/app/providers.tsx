'use client';

import { MutationCache, QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { type ReactNode, useState } from 'react';
import { toast } from 'sonner';
import { Toaster } from '@/components/shadcn/sonner';
import { isForbiddenError } from '@/lib/api';

function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 5 * 60 * 1000,
        retry: 1,
        refetchOnWindowFocus: false,
      },
      mutations: {
        retry: 0,
      },
    },
    mutationCache: new MutationCache({
      onError: (error) => {
        if (isForbiddenError(error)) {
          toast.error('관리자만 사용할 수 있는 기능입니다.');
        }
      },
    }),
  });
}

export function AppProviders({ children }: { children: ReactNode }) {
  const [queryClient] = useState(() => createQueryClient());

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      <Toaster position="top-center" />
    </QueryClientProvider>
  );
}
