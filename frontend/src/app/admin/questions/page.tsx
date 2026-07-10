'use client';

import type {
  AdminQuestionsQuery,
  AdminQuestionStatus,
  AdminQuestionTableRow,
  AdminQuestionUiSection,
} from '@skincare-decision/shared/schemas';
import { useMutationState } from '@tanstack/react-query';
import { RefreshCwIcon, SaveIcon } from 'lucide-react';
import { useCallback, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { createAdminQuestionColumns } from '@/components/admin/questions/createAdminQuestionColumns';
import { SortableDataTable } from '@/components/common/data-table/SortableDataTable';
import { ErrorPanel } from '@/components/common/ErrorPanel';
import { Button } from '@/components/shadcn/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/shadcn/select';
import { Spinner } from '@/components/shadcn/spinner';
import {
  mutationKeys,
  useAdminQuestions,
  useSaveAdminQuestionSortOrder,
  useUpdateAdminQuestionStatus,
} from '@/lib/hooks';

type FilterOption<TValue extends string> = {
  label: string;
  value: TValue;
};

const UI_SECTION_OPTIONS = [
  { label: 'life_routine', value: 'life_routine' },
  { label: 'owned_products', value: 'owned_products' },
  { label: 'basic', value: 'basic' },
  { label: 'category', value: 'category' },
] as const satisfies readonly FilterOption<AdminQuestionUiSection>[];

const DEFAULT_UI_SECTION = UI_SECTION_OPTIONS[0].value;

function getFilterLabel<TValue extends string>(
  options: readonly FilterOption<TValue>[],
  value: TValue,
): string {
  return options.find((option) => option.value === value)?.label ?? value;
}

export default function AdminQuestionsPage() {
  const [uiSection, setUiSection] = useState<AdminQuestionUiSection>(DEFAULT_UI_SECTION);
  const [draftRows, setDraftRows] = useState<AdminQuestionTableRow[] | null>(null);

  const query = useMemo<AdminQuestionsQuery>(() => {
    return {
      uiSection,
    };
  }, [uiSection]);

  const { data, error, isError, isFetching, isLoading, refetch } = useAdminQuestions(query);
  const updateStatus = useUpdateAdminQuestionStatus();
  const saveSortOrder = useSaveAdminQuestionSortOrder();
  const pendingStatusQuestionVariantIds = useMutationState({
    filters: {
      mutationKey: mutationKeys.adminQuestions.status,
      status: 'pending',
    },
    select: (mutation) =>
      (mutation.state.variables as { questionVariantId: string } | undefined)?.questionVariantId,
  }).filter((questionVariantId): questionVariantId is string => Boolean(questionVariantId));

  const serverRows = data?.items ?? [];
  const rows = draftRows ?? serverRows;
  const isSortOrderDirty = draftRows !== null;
  const canSaveSortOrder = isSortOrderDirty;

  const resetDraftRows = () => {
    setDraftRows(null);
  };

  const handleUiSectionChange = (nextUiSection: AdminQuestionUiSection) => {
    resetDraftRows();
    setUiSection(nextUiSection);
  };

  const handleRowsReorder = useCallback((nextRows: AdminQuestionTableRow[]) => {
    setDraftRows(
      nextRows.map((row, index) => ({
        ...row,
        sort_order: index + 1,
      })),
    );
  }, []);

  const handleStatusChange = useCallback(
    (questionVariantId: string, nextStatus: AdminQuestionStatus) => {
      if (pendingStatusQuestionVariantIds.includes(questionVariantId)) {
        return;
      }

      updateStatus.mutate({ questionVariantId, status: nextStatus });
    },
    [pendingStatusQuestionVariantIds, updateStatus],
  );

  const columns = useMemo(
    () =>
      createAdminQuestionColumns({
        isStatusPending: (questionVariantId) =>
          pendingStatusQuestionVariantIds.includes(questionVariantId),
        onStatusChange: handleStatusChange,
      }),
    [handleStatusChange, pendingStatusQuestionVariantIds],
  );

  const handleRefresh = () => {
    void refetch();
  };

  const handleSaveSortOrder = () => {
    if (saveSortOrder.isPending) {
      return;
    }

    if (!isSortOrderDirty) {
      toast.info('변경 사항이 없습니다.');
      return;
    }

    saveSortOrder.mutate(
      {
        questionVariantIds: rows.map((row) => row.questionVariantId),
      },
      {
        onSuccess: () => {
          toast.success('순서 저장에 성공했습니다.');
          setDraftRows(null);
        },
      },
    );
  };

  const actionError = updateStatus.error ?? saveSortOrder.error;

  if (isError && !data) {
    return (
      <main
        className="min-h-screen bg-[var(--color-bg-page)] px-6 pb-10 pt-24"
        data-fetch-state="error"
      >
        <div className="mx-auto w-full max-w-[1440px]">
          <ErrorPanel
            message={
              error instanceof Error ? error.message : 'Question 목록을 불러오지 못했습니다.'
            }
          />
        </div>
      </main>
    );
  }

  if (isLoading) {
    return (
      <main
        className="flex min-h-screen items-center justify-center bg-[var(--color-bg-page)]"
        aria-busy="true"
        data-fetch-state="loading"
      >
        <Spinner className="size-12 text-[var(--color-primary)]" />
      </main>
    );
  }

  return (
    <main
      className="min-h-screen bg-[var(--color-bg-page)] px-6 pb-10 pt-24"
      aria-busy={isFetching || saveSortOrder.isPending}
      data-fetch-state={isFetching ? 'fetching' : 'success'}
    >
      <div className="mx-auto flex w-full max-w-[1440px] flex-col gap-5">
        <section className="flex flex-col gap-4 rounded-lg border border-[var(--color-border-light)]">
          <div className="flex min-h-16 flex-wrap justify-between gap-4">
            <div>
              <h1 className="text-2xl font-semibold text-[var(--color-text-heading)]">
                질문 점검 화면
              </h1>
              <span className="mr-2 text-sm text-[var(--color-text-tertiary)]">
                총 {rows.length}개
                {isSortOrderDirty ? ' · 변경된 순서는 저장버튼을 통해 저장해야 반영됩니다.' : ''}
              </span>
            </div>

            <div className="flex flex-col justify-end">
              <div className="flex flex-wrap items-center justify-end gap-2">
                <AdminQuestionFilterSelect
                  ariaLabel="ui section 필터"
                  disabled={isFetching || saveSortOrder.isPending}
                  options={UI_SECTION_OPTIONS}
                  value={uiSection}
                  onValueChange={handleUiSectionChange}
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleRefresh}
                  disabled={isFetching || saveSortOrder.isPending}
                >
                  {isFetching ? <Spinner /> : <RefreshCwIcon />}
                  새로고침
                </Button>
                <Button
                  type="button"
                  onClick={handleSaveSortOrder}
                  disabled={isFetching || saveSortOrder.isPending || !canSaveSortOrder}
                >
                  {saveSortOrder.isPending ? <Spinner /> : <SaveIcon />}
                  순서 저장
                </Button>
              </div>
            </div>
          </div>
        </section>

        {actionError ? (
          <ErrorPanel
            message={actionError instanceof Error ? actionError.message : '오류가 발생했습니다.'}
          />
        ) : null}

        {isError ? (
          <ErrorPanel
            message={
              error instanceof Error ? error.message : 'Question 목록을 불러오지 못했습니다.'
            }
          />
        ) : null}

        <div className="relative">
          <SortableDataTable
            data={rows}
            columns={columns}
            disabled={isFetching || saveSortOrder.isPending}
            onRowsReorder={handleRowsReorder}
            emptyMessage="표시할 질문이 없습니다."
            tableClassName="min-w-[1860px]"
          />
          {isFetching ? (
            <div className="absolute inset-0 flex items-center justify-center rounded-lg bg-[var(--color-bg-white)]/70 backdrop-blur-[1px]">
              <Spinner className="size-10 text-[var(--color-primary)]" />
            </div>
          ) : null}
        </div>
      </div>
    </main>
  );
}

function AdminQuestionFilterSelect<TValue extends string>({
  ariaLabel,
  disabled,
  options,
  value,
  onValueChange,
}: {
  ariaLabel: string;
  disabled: boolean;
  options: readonly FilterOption<TValue>[];
  value: TValue;
  onValueChange: (value: TValue) => void;
}) {
  return (
    <Select value={value} onValueChange={(nextValue) => onValueChange(nextValue as TValue)}>
      <SelectTrigger
        aria-label={ariaLabel}
        disabled={disabled}
        className="min-w-36 border-[var(--color-border)] bg-[var(--color-bg-white)]"
      >
        <SelectValue placeholder={ariaLabel}>
          {(selectedValue: TValue | null) =>
            selectedValue ? getFilterLabel(options, selectedValue) : ariaLabel
          }
        </SelectValue>
      </SelectTrigger>
      <SelectContent align="start" alignItemWithTrigger={false}>
        {options.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
