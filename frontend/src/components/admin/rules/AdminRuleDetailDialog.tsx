'use client';

import { useState } from 'react';
import { Badge } from '@/components/shadcn/bedge';
import { Button } from '@/components/shadcn/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/shadcn/dialog';
import { Separator } from '@/components/shadcn/separator';
import { Skeleton } from '@/components/shadcn/skeleton';
import { Spinner } from '@/components/shadcn/spinner';
import { useAdminRuleDetail, useUpdateAdminRuleAdminNote } from '@/lib/hooks';

type AdminRuleDetailDialogProps = {
  ruleId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function AdminRuleDetailDialog({ ruleId, open, onOpenChange }: AdminRuleDetailDialogProps) {
  const { data, error, isError, isLoading } = useAdminRuleDetail(open ? ruleId : null);
  const updateAdminNote = useUpdateAdminRuleAdminNote();
  const [adminNoteDraft, setAdminNoteDraft] = useState<{
    ruleId: string;
    value: string;
  } | null>(null);
  const hasAdminNoteDraft = adminNoteDraft !== null && adminNoteDraft.ruleId === data?.id;
  const adminNote = hasAdminNoteDraft ? adminNoteDraft.value : (data?.adminNote ?? '');

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      setAdminNoteDraft(null);
    }

    onOpenChange(nextOpen);
  };

  const handleSaveNote = () => {
    if (!data || updateAdminNote.isPending) {
      return;
    }

    updateAdminNote.mutate(
      {
        ruleId: data.id,
        adminNote,
      },
      {
        onSuccess: () => {
          setAdminNoteDraft(null);
        },
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>{data?.ruleName ?? 'Rule detail'}</DialogTitle>
          <DialogDescription>룰 조건, 결론, CTA, 관리자 메모를 확인합니다.</DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="grid gap-3">
            <Skeleton className="h-5 w-2/3" />
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-24 w-full" />
          </div>
        ) : isError ? (
          <p className="text-sm text-[var(--color-error)]">
            {error instanceof Error ? error.message : '룰 상세를 불러오지 못했습니다.'}
          </p>
        ) : data ? (
          <div className="grid max-h-[70vh] gap-5 overflow-y-auto pr-1">
            <section className="grid gap-3">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="secondary">{data.resultType}</Badge>
                <Badge variant={data.status === 'active' ? 'default' : 'outline'}>
                  {data.status}
                </Badge>
              </div>
              <p className="text-sm leading-6 text-[var(--color-text-secondary)]">
                {data.conclusion}
              </p>
              <p className="text-sm leading-6 text-[var(--color-text-tertiary)]">
                {data.resultDescription}
              </p>
            </section>

            <Separator />

            <section className="grid gap-3">
              <h3 className="text-sm font-semibold text-[var(--color-text-heading)]">조건</h3>
              {data.conditions.length > 0 ? (
                <div className="grid gap-2">
                  {data.conditions.map((condition) => (
                    <div
                      key={condition.id}
                      className="grid gap-2 rounded-lg border border-[var(--color-border-light)] bg-[var(--color-bg-component)] p-3 text-sm"
                    >
                      <div className="font-medium text-[var(--color-text-primary)]">
                        {condition.questionTitle}
                      </div>
                      <div className="flex flex-wrap items-center gap-2 text-xs text-[var(--color-text-secondary)]">
                        <Badge variant="outline">{condition.operator}</Badge>
                        <span>{condition.decisionValueText}</span>
                        <Badge variant={condition.state === 'REQUIRED' ? 'secondary' : 'outline'}>
                          {condition.state}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-[var(--color-text-tertiary)]">fallback rule</p>
              )}
            </section>

            <Separator />

            <section className="grid gap-3">
              <h3 className="text-sm font-semibold text-[var(--color-text-heading)]">CTA</h3>
              <div className="grid gap-1 text-sm text-[var(--color-text-secondary)]">
                <div>label: {data.ctaLabel ?? '-'}</div>
                <div>target: {data.ctaTarget ?? '-'}</div>
              </div>
            </section>

            <Separator />

            <section className="grid gap-2">
              <label
                htmlFor="admin-rule-note"
                className="text-sm font-semibold text-[var(--color-text-heading)]"
              >
                메모
              </label>
              <textarea
                id="admin-rule-note"
                value={adminNote}
                onChange={(event) => {
                  if (!data) {
                    return;
                  }

                  setAdminNoteDraft({
                    ruleId: data.id,
                    value: event.target.value,
                  });
                }}
                maxLength={2000}
                className="min-h-28 resize-y rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-white)] p-3 text-sm leading-6 text-[var(--color-text-primary)] outline-none focus:border-[var(--color-primary-border)] focus:ring-2 focus:ring-[rgba(24,144,255,0.16)]"
                placeholder="근거, 보류 이유, 추후 수정 필요점을 적습니다."
              />
              {updateAdminNote.error ? (
                <p className="text-sm text-[var(--color-error)]">
                  {updateAdminNote.error instanceof Error
                    ? updateAdminNote.error.message
                    : '메모를 저장하지 못했습니다.'}
                </p>
              ) : null}
            </section>
          </div>
        ) : null}

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={updateAdminNote.isPending}
          >
            닫기
          </Button>
          <Button
            type="button"
            onClick={handleSaveNote}
            disabled={!data || updateAdminNote.isPending}
          >
            {updateAdminNote.isPending ? <Spinner /> : null}
            메모 저장
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
