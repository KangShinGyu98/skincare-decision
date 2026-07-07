'use client';

import type { ColumnDef } from '@tanstack/react-table';
import type { AdminRuleStatus, AdminRuleTableRow } from '@skincare-decision/shared/schemas';
import { Badge } from '@/components/shadcn/bedge';
import { Spinner } from '@/components/shadcn/spinner';
import { Switch } from '@/components/shadcn/switch';
import { cn } from '@/lib/utils';

type CreateAdminRuleColumnsOptions = {
  isStatusMutationPending: boolean;
  pendingStatusRuleId: string | null;
  onStatusChange: (ruleId: string, status: AdminRuleStatus) => void;
};

export function createAdminRuleColumns({
  isStatusMutationPending,
  pendingStatusRuleId,
  onStatusChange,
}: CreateAdminRuleColumnsOptions): ColumnDef<AdminRuleTableRow>[] {
  return [
    {
      accessorKey: 'ruleName',
      header: '룰 이름',
      size: 220,
      cell: ({ row }) => (
        <span className="font-medium text-[var(--color-text-primary)]">
          {row.original.ruleName}
        </span>
      ),
    },
    {
      id: 'question',
      header: '질문',
      size: 320,
      cell: ({ row }) => {
        if (row.original.conditions.length === 0) {
          return <span className="text-sm text-[var(--color-text-tertiary)]">fallback</span>;
        }

        return (
          <div className="grid gap-2">
            {row.original.conditions.map((condition) => (
              <div
                key={condition.id}
                className="text-sm leading-5 text-[var(--color-text-primary)]"
              >
                {condition.questionTitle}
              </div>
            ))}
          </div>
        );
      },
    },
    {
      id: 'operator',
      header: 'operator',
      size: 120,
      cell: ({ row }) => {
        if (row.original.conditions.length === 0) {
          return <span className="text-sm text-[var(--color-text-tertiary)]">-</span>;
        }

        return (
          <div className="grid gap-2">
            {row.original.conditions.map((condition) => (
              <div key={condition.id}>
                <Badge variant="outline">{condition.operator}</Badge>
              </div>
            ))}
          </div>
        );
      },
    },
    {
      id: 'decisionValue',
      header: '결정값',
      size: 180,
      cell: ({ row }) => {
        if (row.original.conditions.length === 0) {
          return <span className="text-sm text-[var(--color-text-tertiary)]">-</span>;
        }

        return (
          <div className="grid gap-2">
            {row.original.conditions.map((condition) => (
              <div
                key={condition.id}
                className={cn(
                  'text-sm leading-5 text-[var(--color-text-secondary)]',
                  condition.state === 'EXCLUDED' ? 'line-through opacity-70' : null,
                )}
              >
                {condition.decisionValueText}
              </div>
            ))}
          </div>
        );
      },
    },
    {
      accessorKey: 'conclusion',
      header: '결론',
      size: 340,
      cell: ({ row }) => (
        <p className="whitespace-normal text-sm leading-6 text-[var(--color-text-secondary)]">
          {row.original.conclusion}
        </p>
      ),
    },
    {
      id: 'status',
      header: '상태',
      size: 110,
      cell: ({ row }) => {
        const isPending = pendingStatusRuleId === row.original.id;

        return (
          <div className="flex items-center gap-2" onClick={(event) => event.stopPropagation()}>
            <Switch
              checked={row.original.status === 'active'}
              disabled={isStatusMutationPending}
              onCheckedChange={(checked) =>
                onStatusChange(row.original.id, checked ? 'active' : 'inactive')
              }
              aria-label={`${row.original.ruleName} 상태 변경`}
            />
            {isPending ? (
              <Spinner className="size-3 text-[var(--color-primary)]" />
            ) : (
              <span className="text-xs text-[var(--color-text-tertiary)]">
                {row.original.status}
              </span>
            )}
          </div>
        );
      },
    },
    {
      accessorKey: 'adminNote',
      header: '메모',
      size: 220,
      cell: ({ row }) => (
        <p className="line-clamp-2 whitespace-normal text-sm leading-5 text-[var(--color-text-secondary)]">
          {row.original.adminNote?.trim() || '-'}
        </p>
      ),
    },
  ];
}
