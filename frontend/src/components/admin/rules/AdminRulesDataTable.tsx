'use client';

import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  type ColumnDef,
  type Row,
} from '@tanstack/react-table';
import type { AdminRuleStatus, AdminRuleTableRow } from '@skincare-decision/shared/schemas';
import { GripVerticalIcon } from 'lucide-react';
import { useMemo } from 'react';
import { Badge } from '@/components/shadcn/bedge';
import { Skeleton } from '@/components/shadcn/skeleton';
import { Spinner } from '@/components/shadcn/spinner';
import { Switch } from '@/components/shadcn/switch';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/shadcn/Table';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/shadcn/tooltip';
import { cn } from '@/lib/utils';

type AdminRulesDataTableProps = {
  rows: AdminRuleTableRow[];
  isLoading: boolean;
  isStatusMutationPending: boolean;
  pendingStatusRuleId: string | null;
  onRowsReorder: (rows: AdminRuleTableRow[]) => void;
  onRowClick: (ruleId: string) => void;
  onStatusChange: (ruleId: string, status: AdminRuleStatus) => void;
};

export function AdminRulesDataTable({
  rows,
  isLoading,
  isStatusMutationPending,
  pendingStatusRuleId,
  onRowsReorder,
  onRowClick,
  onStatusChange,
}: AdminRulesDataTableProps) {
  const columns = useMemo<ColumnDef<AdminRuleTableRow>[]>(
    () => [
      {
        id: 'drag',
        header: '',
        size: 44,
        cell: ({ row }) => <DragHandlePlaceholder id={row.original.id} />,
      },
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
        cell: ({ row }) => <ConditionColumn row={row.original} field="question" />,
      },
      {
        id: 'operator',
        header: 'operator',
        size: 120,
        cell: ({ row }) => <ConditionColumn row={row.original} field="operator" />,
      },
      {
        id: 'decisionValue',
        header: '결정값',
        size: 180,
        cell: ({ row }) => <ConditionColumn row={row.original} field="decisionValue" />,
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
    ],
    [isStatusMutationPending, onStatusChange, pendingStatusRuleId],
  );

  const table = useReactTable({
    data: rows,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getRowId: (row) => row.id,
  });
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over || active.id === over.id) {
      return;
    }

    const oldIndex = rows.findIndex((row) => row.id === active.id);
    const newIndex = rows.findIndex((row) => row.id === over.id);

    if (oldIndex < 0 || newIndex < 0) {
      return;
    }

    onRowsReorder(arrayMove(rows, oldIndex, newIndex));
  };

  return (
    <section className="overflow-hidden rounded-lg border border-[var(--color-border-light)] bg-[var(--color-bg-white)] shadow-sm">
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <Table className="min-w-[1220px] table-fixed">
          <TableHeader className="bg-[var(--gray-3)]">
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead
                    key={header.id}
                    style={{ width: header.getSize() }}
                    className="text-xs uppercase text-[var(--color-text-tertiary)]"
                  >
                    {header.isPlaceholder
                      ? null
                      : flexRender(header.column.columnDef.header, header.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <LoadingRows columnCount={columns.length} />
            ) : rows.length > 0 ? (
              <SortableContext
                items={rows.map((row) => row.id)}
                strategy={verticalListSortingStrategy}
              >
                {table.getRowModel().rows.map((row) => (
                  <SortableRuleRow key={row.id} row={row} onRowClick={onRowClick} />
                ))}
              </SortableContext>
            ) : (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-32 text-center text-sm text-[var(--color-text-tertiary)]"
                >
                  표시할 룰이 없습니다.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </DndContext>
    </section>
  );
}

function SortableRuleRow({
  row,
  onRowClick,
}: {
  row: Row<AdminRuleTableRow>;
  onRowClick: (ruleId: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({
    id: row.original.id,
  });

  return (
    <TableRow
      ref={setNodeRef}
      data-state={row.getIsSelected() ? 'selected' : undefined}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
      }}
      className="cursor-pointer align-top"
      onClick={() => onRowClick(row.original.id)}
    >
      {row.getVisibleCells().map((cell) => (
        <TableCell key={cell.id} className="min-h-14 whitespace-normal">
          {cell.column.id === 'drag' ? (
            <DragHandle attributes={attributes} listeners={listeners} />
          ) : (
            flexRender(cell.column.columnDef.cell, cell.getContext())
          )}
        </TableCell>
      ))}
    </TableRow>
  );
}

function DragHandle({
  attributes,
  listeners,
}: {
  attributes: ReturnType<typeof useSortable>['attributes'];
  listeners: ReturnType<typeof useSortable>['listeners'];
}) {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger
          render={
            <button
              type="button"
              className="inline-flex size-8 cursor-grab items-center justify-center rounded-md text-[var(--color-text-tertiary)] hover:bg-[var(--gray-3)] hover:text-[var(--color-text-primary)] active:cursor-grabbing"
              aria-label="순서 변경"
              onClick={(event) => event.stopPropagation()}
              {...attributes}
              {...listeners}
            >
              <GripVerticalIcon className="size-4" />
            </button>
          }
        />
        <TooltipContent>순서 변경</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

function DragHandlePlaceholder({ id }: { id: string }) {
  return <span className="sr-only">drag {id}</span>;
}

function ConditionColumn({
  row,
  field,
}: {
  row: AdminRuleTableRow;
  field: 'question' | 'operator' | 'decisionValue';
}) {
  if (row.conditions.length === 0) {
    return <span className="text-sm text-[var(--color-text-tertiary)]">fallback</span>;
  }

  return (
    <div className="grid gap-2">
      {row.conditions.map((condition) => {
        if (field === 'question') {
          return (
            <div key={condition.id} className="text-sm leading-5 text-[var(--color-text-primary)]">
              {condition.questionTitle}
            </div>
          );
        }

        if (field === 'operator') {
          return (
            <div key={condition.id}>
              <Badge variant="outline">{condition.operator}</Badge>
            </div>
          );
        }

        return (
          <div
            key={condition.id}
            className={cn(
              'text-sm leading-5 text-[var(--color-text-secondary)]',
              condition.state === 'EXCLUDED' ? 'line-through opacity-70' : null,
            )}
          >
            {condition.decisionValueText}
          </div>
        );
      })}
    </div>
  );
}

function LoadingRows({ columnCount }: { columnCount: number }) {
  return Array.from({ length: 6 }, (_, rowIndex) => (
    <TableRow key={rowIndex}>
      {Array.from({ length: columnCount }, (_, columnIndex) => (
        <TableCell key={columnIndex}>
          <Skeleton className="h-5 w-full" />
        </TableCell>
      ))}
    </TableRow>
  ));
}
