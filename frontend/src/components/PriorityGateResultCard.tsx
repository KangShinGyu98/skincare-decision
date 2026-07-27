'use client';

import type { PriorityGatePreviewResultDto } from '@skincare-decision/shared/schemas';
import { toast } from 'sonner';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/shadcn/card';
import { Button } from '@/components/shadcn/button';

type PriorityGateResultCardProps = {
  previewResult: PriorityGatePreviewResultDto;
  // 'dev-notice': 링크 대신 "개발중입니다" 토스트만 띄운다(구매 체크리스트 화면용).
  ctaBehavior?: 'link' | 'dev-notice';
};

export function PriorityGateResultCard({
  previewResult,
  ctaBehavior = 'link',
}: PriorityGateResultCardProps) {
  const categories = [
    ...(previewResult.recommendCategory
      ? [
          {
            label: '추천 제품군',
            value: previewResult.recommendCategory.name,
          },
        ]
      : []),
    ...previewResult.holdCategories.map((category) => ({
      label: '보류 제품군',
      value: category.name,
    })),
  ];

  return (
    <Card size="sm" className="w-full text-left shadow-none">
      <CardHeader>
        <CardTitle>{previewResult.title}</CardTitle>
        <CardDescription className="leading-relaxed">{previewResult.description}</CardDescription>
      </CardHeader>
      {categories.length > 0 ? (
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {categories.map((category) => (
              <span
                key={`${category.label}-${category.value}`}
                className="inline-flex items-center rounded-md border border-[var(--color-border-light)] bg-[var(--color-bg-component)] px-2 py-1 text-xs text-[var(--color-text-secondary)]"
              >
                {category.label}: {category.value}
              </span>
            ))}
          </div>
        </CardContent>
      ) : null}
      {previewResult.cta ? (
        <CardFooter className="border-[var(--color-border-light)] bg-[var(--gray-3)]">
          {ctaBehavior === 'dev-notice' ? (
            <Button
              type="button"
              size="sm"
              className="w-full"
              onClick={() => toast('개발중입니다.')}
            >
              {previewResult.cta.label}
            </Button>
          ) : (
            <Button asChild size="sm" className="w-full">
              <a href={previewResult.cta.target}>{previewResult.cta.label}</a>
            </Button>
          )}
        </CardFooter>
      ) : null}
    </Card>
  );
}
