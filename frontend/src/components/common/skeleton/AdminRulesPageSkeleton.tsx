import { Spinner } from '@/components/shadcn/spinner';

export function AdminRulesPageSkeleton() {
  return (
    <main
      className="flex min-h-below-header items-center justify-center bg-[var(--color-bg-page)]"
      aria-busy="true"
      data-fetch-state="loading"
    >
      <Spinner className="size-12 text-[var(--color-primary)]" />
    </main>
  );
}
