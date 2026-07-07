'use client';

import {
  closestCenter,
  DndContext,
  type DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { type ColumnDef, flexRender, getCoreRowModel, type Row, useReactTable, } from '@tanstack/react-table';
import { GripVerticalIcon } from 'lucide-react';
import { useMemo } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, } from '@/components/shadcn/Table';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger, } from '@/components/shadcn/tooltip';
import { cn } from '@/lib/utils';

const DRAG_COLUMN_ID = '__drag';

type SortableDataTableRowData = {
  id: string;
};

function getDefaultRowId(row: SortableDataTableRowData): string {
  return row.id;
}

export type SortableDataTableProps<TData extends SortableDataTableRowData> = {
  data: TData[];
  columns: ColumnDef<TData>[];
  getRowId?: (row: TData) => string;
  onRowsReorder: (rows: TData[]) => void;
  onRowClick?: (row: TData) => void;
  emptyMessage?: string;
  dragHandleLabel?: string;
  className?: string;
  tableClassName?: string;
};

export function SortableDataTable<TData extends SortableDataTableRowData>({
  data,
  columns,
  getRowId,
  onRowsReorder,
  onRowClick,
  emptyMessage = '표시할 항목이 없습니다.',
  dragHandleLabel = '순서 변경',
  className,
  tableClassName,
}: SortableDataTableProps<TData>) {
  const resolveRowId: (row: TData) => string = getRowId ?? getDefaultRowId;
  const rowIds = useMemo(() => data.map((row) => resolveRowId(row)), [data, resolveRowId]);
  const tableColumns = useMemo<ColumnDef<TData>[]>(
    () => [
      {
        id: DRAG_COLUMN_ID,
        header: '',
        size: 44,
        cell: ({ row }) => <span className="sr-only">drag {row.id}</span>,
      },
      ...columns,
    ],
    [columns],
  );
  const table = useReactTable({
    data,
    columns: tableColumns,
    getCoreRowModel: getCoreRowModel(),
    getRowId: resolveRowId,
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

    const oldIndex = rowIds.indexOf(String(active.id));
    const newIndex = rowIds.indexOf(String(over.id));

    if (oldIndex < 0 || newIndex < 0) {
      return;
    }

    onRowsReorder(arrayMove(data, oldIndex, newIndex));
  };

  return (
    <section
      className={cn(
        'overflow-hidden rounded-lg border border-[var(--color-border-light)] bg-[var(--color-bg-white)] shadow-sm',
        className,
      )}
    >
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <Table className={cn('table-fixed', tableClassName)}>
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
            {data.length > 0 ? (
              <SortableContext items={rowIds} strategy={verticalListSortingStrategy}>
                {table.getRowModel().rows.map((row) => (
                  <SortableDataTableRow
                    key={row.id}
                    row={row}
                    dragHandleLabel={dragHandleLabel}
                    onRowClick={onRowClick}
                  />
                ))}
              </SortableContext>
            ) : (
              <TableRow>
                <TableCell
                  colSpan={tableColumns.length}
                  className="h-32 text-center text-sm text-[var(--color-text-tertiary)]"
                >
                  {emptyMessage}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </DndContext>
    </section>
  );
}

function SortableDataTableRow<TData>({
  row,
  dragHandleLabel,
  onRowClick,
}: {
  row: Row<TData>;
  dragHandleLabel: string;
  onRowClick?: (row: TData) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({
    id: row.id,
  });

  return (
    <TableRow
      ref={setNodeRef}
      data-state={row.getIsSelected() ? 'selected' : undefined}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
      }}
      className={cn('align-top', onRowClick ? 'cursor-pointer' : null)}
      onClick={onRowClick ? () => onRowClick(row.original) : undefined}
    >
      {row.getVisibleCells().map((cell) => (
        <TableCell key={cell.id} className="min-h-14 whitespace-normal">
          {cell.column.id === DRAG_COLUMN_ID ? (
            <DragHandle attributes={attributes} listeners={listeners} label={dragHandleLabel} />
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
  label,
}: {
  attributes: ReturnType<typeof useSortable>['attributes'];
  listeners: ReturnType<typeof useSortable>['listeners'];
  label: string;
}) {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger
          render={
            <button
              type="button"
              className="inline-flex size-8 cursor-grab items-center justify-center rounded-md text-[var(--color-text-tertiary)] hover:bg-[var(--gray-3)] hover:text-[var(--color-text-primary)] active:cursor-grabbing"
              aria-label={label}
              onClick={(event) => event.stopPropagation()}
              {...attributes}
              {...listeners}
            >
              <GripVerticalIcon className="size-4" />
            </button>
          }
        />
        <TooltipContent>{label}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
