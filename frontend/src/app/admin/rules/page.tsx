'use client';

import type { AdminRuleStatus, AdminRuleTableRow } from '@skincare-decision/shared/schemas';
import { useMutationState } from '@tanstack/react-query';
import { PlusIcon, RefreshCwIcon, SaveIcon } from 'lucide-react';
import { useCallback, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { AdminRuleDialogForm } from '@/components/admin/rules/AdminRuleDialogForm';
import { createAdminRuleColumns } from '@/components/admin/rules/createAdminRuleColumns';
import { SortableDataTable } from '@/components/common/data-table/SortableDataTable';
import { ErrorPanel } from '@/components/common/ErrorPanel';
import { AdminRulesPageSkeleton } from '@/components/common/skeleton/AdminRulesPageSkeleton';
import { Button } from '@/components/shadcn/button';
import { Spinner } from '@/components/shadcn/spinner';
import { mutationKeys, useAdminRules, useSaveAdminRuleSortOrder, useUpdateAdminRuleStatus, } from '@/lib/hooks';

export default function AdminRulesPage() {
  const { data, error, isError, isFetching, isLoading } = useAdminRules();
  const updateStatus = useUpdateAdminRuleStatus();
  //status 에서 pending 인 애들만 배열로 저장
  const pendingStatusRuleIds = useMutationState({
    filters: {
      mutationKey: mutationKeys.adminRules.status,
      status: 'pending',
    },
    select: (mutation) => (mutation.state.variables as { ruleId: string } | undefined)?.ruleId,
  }).filter((ruleId): ruleId is string => Boolean(ruleId));

  const saveSortOrder = useSaveAdminRuleSortOrder();
  const serverRows = data?.items ?? [];
  const [draftRows, setDraftRows] = useState<AdminRuleTableRow[] | null>(null);
  const [ruleFormDialogState, setRuleFormDialogState] = useState<{
    open: boolean;
    ruleId: string | null;
  }>({
    open: false,
    ruleId: null,
  });
  const rows = draftRows ?? serverRows;
  const isSortOrderDirty = draftRows !== null;

  const handleRowsReorder = useCallback((nextRows: AdminRuleTableRow[]) => {
    setDraftRows(
      nextRows.map((row, index) => ({
        ...row,
        sort_order: index + 1,
      })),
    );
  }, []);

  const handleStatusChange = useCallback(
    (ruleId: string, status: AdminRuleStatus) => {
      if (pendingStatusRuleIds.includes(ruleId)) {
        return;
      }

      updateStatus.mutate({ ruleId, status });
    },
    [pendingStatusRuleIds, updateStatus],
  );

  const columns = useMemo(
    () =>
      createAdminRuleColumns({
        isStatusPending: (ruleId) => pendingStatusRuleIds.includes(ruleId),
        onStatusChange: handleStatusChange,
      }),
    [handleStatusChange, pendingStatusRuleIds],
  );

  const handleRowClick = useCallback((row: AdminRuleTableRow) => {
    setRuleFormDialogState({
      open: true,
      ruleId: row.id,
    });
  }, []);

  const handleCreateRule = useCallback(() => {
    setRuleFormDialogState({
      open: true,
      ruleId: null,
    });
  }, []);

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
        ruleIds: rows.map((row) => row.id),
      },
      {
        onSuccess: () => {
          toast.success('순서 저장에 성공했습니다.');
          setDraftRows(null);
        },
      },
    );
  };

  const handleRefresh = () => {
    window.location.reload();
  };

  const actionError = updateStatus.error ?? saveSortOrder.error;

  if (isError) {
    return (
      <ErrorPanel
        message={error instanceof Error ? error.message : 'Rule 목록을 불러오지 못했습니다.'}
      />
    );
  }
  if (isLoading) {
    return <AdminRulesPageSkeleton />;
  }

  return (
    <main
      className="min-h-screen bg-[var(--color-bg-page)] px-6 pb-10 pt-24"
      aria-busy={saveSortOrder.isPending}
      data-fetch-state="success"
    >
      <div className="mx-auto flex w-full max-w-[1440px] flex-col gap-5">
        <section className="flex flex-col gap-4 rounded-lg border border-[var(--color-border-light)] ">
          <div className="flex min-h-16 flex-wrap justify-between gap-4">
            <div>
              <h1 className="text-2xl font-semibold text-[var(--color-text-heading)]">
                룰 점검 화면
              </h1>
              <span className="mr-2 text-sm text-[var(--color-text-tertiary)]">
                총 {rows.length}개
                {isSortOrderDirty ? '변경된 순서는 저장버튼을 통해 저장해야 반영됩니다.' : ''}
              </span>
            </div>
            <div className="flex flex-col justify-end">
              <div className="flex flex-wrap items-center justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleRefresh}
                  disabled={saveSortOrder.isPending || isFetching}
                >
                  <RefreshCwIcon />
                  새로고침
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleCreateRule}
                  disabled={saveSortOrder.isPending || isFetching}
                >
                  <PlusIcon />룰 생성
                </Button>
                <Button
                  type="button"
                  onClick={handleSaveSortOrder}
                  disabled={saveSortOrder.isPending || isFetching || !isSortOrderDirty}
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

        <SortableDataTable
          data={rows}
          columns={columns}
          onRowsReorder={handleRowsReorder}
          onRowClick={handleRowClick}
          emptyMessage="표시할 룰이 없습니다."
          tableClassName="min-w-[1220px]"
        />
      </div>

      <AdminRuleDialogForm
        ruleId={ruleFormDialogState.ruleId}
        open={ruleFormDialogState.open}
        onOpenChange={(open) => {
          setRuleFormDialogState((previousState) => ({
            open,
            ruleId: open ? previousState.ruleId : null,
          }));
        }}
      />
    </main>
  );
}
