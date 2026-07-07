'use client';

import type { AdminRuleStatus, AdminRuleTableRow } from '@skincare-decision/shared/schemas';
import { RefreshCwIcon, SaveIcon } from 'lucide-react';
import { useCallback, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { AdminRuleDetailDialog } from '@/components/admin/rules/AdminRuleDetailDialog';
import { createAdminRuleColumns } from '@/components/admin/rules/createAdminRuleColumns';
import { SortableDataTable } from '@/components/common/data-table/SortableDataTable';
import { Button } from '@/components/shadcn/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/shadcn/Table';
import { Skeleton } from '@/components/shadcn/skeleton';
import { Spinner } from '@/components/shadcn/spinner';
import { useAdminRules, useSaveAdminRuleSortOrder, useUpdateAdminRuleStatus } from '@/lib/hooks';

const EMPTY_ADMIN_RULE_ROWS: AdminRuleTableRow[] = [];

export default function AdminRulesPage() {
  const { data, error, isError, isFetching, isLoading } = useAdminRules();
  const updateStatus = useUpdateAdminRuleStatus();
  const saveSortOrder = useSaveAdminRuleSortOrder();
  const [orderedRuleIds, setOrderedRuleIds] = useState<string[] | null>(null);
  const [selectedRuleId, setSelectedRuleId] = useState<string | null>(null);
  const serverRows = data?.items ?? EMPTY_ADMIN_RULE_ROWS;
  const isSortOrderDirty = orderedRuleIds !== null;
  const pendingStatusRuleId = updateStatus.isPending
    ? (updateStatus.variables?.ruleId ?? null)
    : null;

  const rows = useMemo(() => {
    if (!orderedRuleIds) {
      return serverRows;
    }

    const serverRowMap = new Map(serverRows.map((row) => [row.id, row]));
    const orderedRows = orderedRuleIds
      .map((ruleId) => serverRowMap.get(ruleId))
      .filter((row): row is AdminRuleTableRow => Boolean(row));
    const orderedRowIds = new Set(orderedRows.map((row) => row.id));
    const appendedRows = serverRows.filter((row) => !orderedRowIds.has(row.id));

    return [...orderedRows, ...appendedRows].map((row, index) => ({
      ...row,
      sort_order: index + 1,
    }));
  }, [orderedRuleIds, serverRows]);

  const handleRowsReorder = useCallback((nextRows: AdminRuleTableRow[]) => {
    setOrderedRuleIds(nextRows.map((row) => row.id));
  }, []);

  const handleStatusChange = useCallback(
    (ruleId: string, status: AdminRuleStatus) => {
      updateStatus.mutate({ ruleId, status });
    },
    [updateStatus],
  );

  const columns = useMemo(
    () =>
      createAdminRuleColumns({
        isStatusMutationPending: updateStatus.isPending,
        pendingStatusRuleId,
        onStatusChange: handleStatusChange,
      }),
    [handleStatusChange, pendingStatusRuleId, updateStatus.isPending],
  );

  const handleRowClick = useCallback((row: AdminRuleTableRow) => {
    setSelectedRuleId(row.id);
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
          setOrderedRuleIds(null);
        },
      },
    );
  };

  const handleRefresh = () => {
    window.location.reload();
  };

  const actionError = updateStatus.error ?? saveSortOrder.error;

  return (
    <main
      className="min-h-screen bg-[var(--color-bg-page)] px-6 pb-10 pt-24"
      aria-busy={isLoading || isFetching || saveSortOrder.isPending}
      data-fetch-state={isLoading ? 'loading' : isError ? 'error' : 'success'}
    >
      <div className="mx-auto flex w-full max-w-[1440px] flex-col gap-5">
        <section className="flex flex-col gap-4 rounded-lg border border-[var(--color-border-light)] ">
          <div className="flex min-h-16 flex-wrap justify-between gap-4">
            <div>
              <h1 className="text-2xl font-semibold text-[var(--color-text-heading)]">
                룰 점검 화면
              </h1>
              <span className="mr-2 text-sm text-[var(--color-text-tertiary)]">
                {isLoading ? '조회 중' : `총 ${rows.length}개`}
                {isSortOrderDirty ? ' · 순서 변경됨' : ''}
              </span>
            </div>
            <div className="flex flex-col justify-end">
              <div className="flex flex-wrap items-center justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleRefresh}
                  disabled={saveSortOrder.isPending}
                >
                  <RefreshCwIcon />
                  새로고침
                </Button>
                <Button
                  type="button"
                  onClick={handleSaveSortOrder}
                  disabled={saveSortOrder.isPending}
                >
                  {saveSortOrder.isPending ? <Spinner /> : <SaveIcon />}
                  순서 저장
                </Button>
              </div>
            </div>
          </div>
        </section>

        {isError ? (
          <ErrorPanel
            message={error instanceof Error ? error.message : 'Rule 목록을 불러오지 못했습니다.'}
          />
        ) : null}

        {actionError ? (
          <ErrorPanel
            message={
              actionError instanceof Error
                ? actionError.message
                : 'Rule 변경사항을 저장하지 못했습니다.'
            }
          />
        ) : null}

        {isLoading ? (
          <AdminRulesTableSkeleton />
        ) : (
          <SortableDataTable
            data={rows}
            columns={columns}
            onRowsReorder={handleRowsReorder}
            onRowClick={handleRowClick}
            emptyMessage="표시할 룰이 없습니다."
            tableClassName="min-w-[1220px]"
          />
        )}
      </div>

      <AdminRuleDetailDialog
        ruleId={selectedRuleId}
        open={selectedRuleId !== null}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedRuleId(null);
          }
        }}
      />
    </main>
  );
}

function ErrorPanel({ message }: { message: string }) {
  return (
    <section className="rounded-lg border border-[var(--red-3)] bg-[var(--red-1)] px-4 py-3 text-sm text-[var(--red-7)]">
      {message}
    </section>
  );
}

function AdminRulesTableSkeleton() {
  const columnWidths = [44, 220, 320, 120, 180, 340, 110, 220];

  return (
    <section className="overflow-hidden rounded-lg border border-[var(--color-border-light)] bg-[var(--color-bg-white)] shadow-sm">
      <Table className="min-w-[1220px] table-fixed">
        <TableHeader className="bg-[var(--gray-3)]">
          <TableRow>
            {columnWidths.map((width, index) => (
              <TableHead
                key={`${width}-${index}`}
                style={{ width }}
                className="text-xs uppercase text-[var(--color-text-tertiary)]"
              >
                <Skeleton className="h-4 w-2/3" />
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {Array.from({ length: 6 }, (_, rowIndex) => (
            <TableRow key={rowIndex}>
              {columnWidths.map((width, columnIndex) => (
                <TableCell key={`${rowIndex}-${width}-${columnIndex}`}>
                  <Skeleton className="h-5 w-full" />
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </section>
  );
}
