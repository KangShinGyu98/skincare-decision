'use client';

import type {
  AdminQuestionStatus,
  AdminQuestionTableRow,
} from '@skincare-decision/shared/schemas';
import type { ColumnDef } from '@tanstack/react-table';
import { Badge } from '@/components/shadcn/bedge';
import { Spinner } from '@/components/shadcn/spinner';
import { Switch } from '@/components/shadcn/switch';

type CreateAdminQuestionColumnsOptions = {
  isStatusPending: (questionVariantId: string) => boolean;
  onStatusChange: (questionVariantId: string, status: AdminQuestionStatus) => void;
};

type VisibilityCondition = AdminQuestionTableRow['visibilityConditions'][number];

export function createAdminQuestionColumns({
  isStatusPending,
  onStatusChange,
}: CreateAdminQuestionColumnsOptions): ColumnDef<AdminQuestionTableRow>[] {
  return [
    {
      accessorKey: 'question',
      header: 'question',
      size: 220,
      cell: ({ row }) => (
        <span className="font-medium text-[var(--color-text-primary)]">
          {row.original.question}
        </span>
      ),
    },
    {
      accessorKey: 'questionVariant',
      header: 'question_variant',
      size: 320,
      cell: ({ row }) => (
        <p className="whitespace-normal text-sm leading-5 text-[var(--color-text-primary)]">
          {row.original.questionVariant}
        </p>
      ),
    },
    {
      accessorKey: 'answerType',
      header: 'answer_type',
      size: 130,
      cell: ({ row }) => <Badge variant="outline">{row.original.answerType}</Badge>,
    },
    {
      id: 'userOptions',
      header: 'user_options',
      size: 280,
      cell: ({ row }) => (
        <div className="flex flex-wrap gap-1">
          {row.original.userOptions.map((option) => (
            <Badge key={option.value} variant="outline">
              {option.label} · {option.value}
            </Badge>
          ))}
        </div>
      ),
    },
    {
      id: 'visibilityConditions',
      header: '노출 조건',
      size: 360,
      cell: ({ row }) => (
        <VisibilityConditionsCell
          category={row.original.category}
          conditions={row.original.visibilityConditions}
        />
      ),
    },
    {
      id: 'status',
      header: '상태',
      size: 120,
      cell: ({ row }) => {
        const isPending = isStatusPending(row.original.questionVariantId);

        return (
          <div className="flex items-center gap-2" onClick={(event) => event.stopPropagation()}>
            <Switch
              checked={row.original.status === 'active'}
              disabled={isPending}
              onCheckedChange={(checked) =>
                onStatusChange(row.original.questionVariantId, checked ? 'active' : 'inactive')
              }
              aria-label={`${row.original.questionVariant} 상태 변경`}
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
      accessorKey: 'screen',
      header: 'screen',
      size: 130,
      cell: ({ row }) => <Badge variant="outline">{row.original.screen}</Badge>,
    },
    {
      accessorKey: 'uiSection',
      header: 'ui_section',
      size: 150,
      cell: ({ row }) => <Badge variant="outline">{row.original.uiSection}</Badge>,
    },
    {
      accessorKey: 'category',
      header: 'category',
      size: 130,
      cell: ({ row }) => (
        <span className="text-sm text-[var(--color-text-secondary)]">
          {row.original.category ?? 'common'}
        </span>
      ),
    },
    {
      accessorKey: 'memo',
      header: '메모',
      size: 180,
      cell: ({ row }) => (
        <p className="line-clamp-2 whitespace-normal text-sm leading-5 text-[var(--color-text-secondary)]">
          {row.original.memo?.trim() || '-'}
        </p>
      ),
    },
  ];
}

function VisibilityConditionsCell({
  category,
  conditions,
}: {
  category: AdminQuestionTableRow['category'];
  conditions: VisibilityCondition[];
}) {
  return (
    <div className="flex flex-col gap-1 font-mono text-xs text-[var(--color-text-secondary)]">
      <span>category EQ {category ?? 'all'}</span>
      {conditions.map((condition, index) => (
        <div className="flex flex-wrap items-center gap-1.5" key={`${condition.state}-${index}`}>
          <Badge variant={condition.state === 'EXCLUDED' ? 'destructive' : 'outline'}>
            {condition.state}
          </Badge>
          <span>
            visibility_condition {condition.operator} {formatVisibilityConditionValue(condition)}
          </span>
        </div>
      ))}
    </div>
  );
}

function formatVisibilityConditionValue(condition: VisibilityCondition): string {
  if (condition.operator === 'IN') {
    return `[${condition.value}]`;
  }

  return String(condition.value);
}
