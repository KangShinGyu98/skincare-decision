import type { CategoryDecisionPreviewResult } from '@skincare-decision/shared/schemas';
import { Button } from '@/components/shadcn/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/shadcn/card';

type CategoryDecisionResultCardProps = {
  previewResult: CategoryDecisionPreviewResult;
};

export function CategoryDecisionResultCard({ previewResult }: CategoryDecisionResultCardProps) {
  return (
    <Card size="sm" className="w-full text-left shadow-none">
      <CardHeader>
        <CardTitle>{previewResult.title}</CardTitle>
        <CardDescription className="leading-relaxed">{previewResult.description}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap gap-2">
          {previewResult.selectedCategory ? (
            <span className="inline-flex items-center rounded-md border border-[var(--color-border-light)] bg-[var(--color-bg-component)] px-2 py-1 text-xs text-[var(--color-text-secondary)]">
              제품군: {previewResult.selectedCategory.name}
            </span>
          ) : null}
          <span className="inline-flex items-center rounded-md border border-[var(--color-border-light)] bg-[var(--color-bg-component)] px-2 py-1 text-xs text-[var(--color-text-secondary)]">
            답변 {previewResult.answeredQuestionCount}/{previewResult.totalQuestionCount}
          </span>
        </div>
      </CardContent>
      {previewResult.cta ? (
        <CardFooter className="border-[var(--color-border-light)] bg-[var(--gray-3)]">
          <Button asChild size="sm" className="w-full">
            <a href={previewResult.cta.target}>{previewResult.cta.label}</a>
          </Button>
        </CardFooter>
      ) : null}
    </Card>
  );
}
