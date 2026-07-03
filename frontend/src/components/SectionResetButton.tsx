'use client';

import { RotateCcwIcon } from 'lucide-react';
import { useState } from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/shadcn/alert-dialog';
import { Button } from '@/components/shadcn/button';

type SectionResetButtonProps = {
  uiSection: string;
  sectionTitle: string;
  disabled: boolean;
  elementIdPrefix?: string;
  onReset: () => void;
};

export function SectionResetButton({
  uiSection,
  sectionTitle,
  disabled,
  elementIdPrefix = 'priority_gate.reset',
  onReset,
}: SectionResetButtonProps) {
  const [open, setOpen] = useState(false);
  const elementId = `${elementIdPrefix}.${uiSection}`;

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger
        id={elementId}
        data-element-id={elementId}
        disabled={disabled}
        render={
          <Button
            type="button"
            variant="ghost"
            size="xs"
            className="text-[var(--color-text-tertiary)] hover:bg-[var(--color-bg-component)] hover:text-[var(--color-text-primary)]"
          >
            <RotateCcwIcon aria-hidden="true" />
            초기화
          </Button>
        }
      />
      <AlertDialogContent
        size="sm"
        className="max-w-sm"
        overlayProps={{
          onClick: () => setOpen(false),
        }}
      >
        <AlertDialogHeader>
          <AlertDialogMedia>
            <RotateCcwIcon aria-hidden="true" />
          </AlertDialogMedia>
          <AlertDialogTitle>{sectionTitle} 답변을 초기화할까요?</AlertDialogTitle>
          <AlertDialogDescription>
            이 섹션에서 선택한 답변이 전부 취소됩니다.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel size="sm">취소</AlertDialogCancel>
          <AlertDialogAction
            type="button"
            variant="destructive"
            size="sm"
            disabled={disabled}
            onClick={() => {
              onReset();
              setOpen(false);
            }}
          >
            초기화
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
