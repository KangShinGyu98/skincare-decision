import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/shadcn/skeleton';

function SkeletonCard({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="skeleton-card"
      className={cn('flex h-full w-full flex-col gap-4', className)}
      {...props}
    >
      <Skeleton className="h-4 w-2/3 bg-[var(--color-border)]" />
      <Skeleton className="h-4 w-1/2 bg-[var(--color-border)]" />
      <Skeleton className="aspect-video w-full bg-[var(--color-border)]" />
    </div>
  );
}

export { SkeletonCard };
