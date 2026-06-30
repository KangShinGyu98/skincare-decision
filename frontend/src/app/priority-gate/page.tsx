'use client';

import { PriorityGateQuestionItem } from '@/components/PriorityGateQuestionItem';
import { SkeletonCard } from '@/components/shadcn/skeleton-card';
import { usePriorityGateQuestions } from '@/lib/hooks';

export default function PriorityGatePage() {
  const { data, error, isError, isLoading } = usePriorityGateQuestions();
  const sections = data?.sections ?? [];
  const lifeRoutineSection = sections.find((section) => section.key === 'life_routine');
  const ownedProductsSection = sections.find((section) => section.key === 'owned_products');

  return (
    <main
      className="flex min-h-screen w-full flex-col items-center justify-center bg-[var(--color-bg-page)] p-10"
      aria-busy={isLoading}
      data-fetch-state={isLoading ? 'loading' : isError ? 'error' : 'success'}
    >
      <div className="col-span-2 flex flex-col gap-2 items-center">
        <h2>루틴을 점검하고 우선순위를 결정해드립니다.</h2>
        <span className="space-y-3 text-base leading-2 text-[var(--color-text-secondary)]">
          스킨케어 루틴과 사용 제품을 알려주세요.
        </span>
      </div>
      <div className="flex h-[70vh] w-full max-w-[1200px] translate-y-8 overflow-hidden   shadow-lg gap-6">
        <div
          id={lifeRoutineSection?.key ?? 'life_routine'}
          data-question-count={lifeRoutineSection?.questions.length ?? 0}
          className="flex h-full w-full flex-1 flex-col gap-4 overflow-y-auto rounded-xl border border-[var(--color-border-light)] border-t-[3px] border-t-[var(--color-primary-border)] bg-[var(--color-bg-white)] p-4 shadow-sm"
        >
          <h3 className="text-lg font-semibold text-[var(--color-text-heading)]">루틴 점검</h3>
          {isLoading ? (
            <SkeletonCard />
          ) : (
            lifeRoutineSection?.questions.map((question) => (
              <PriorityGateQuestionItem key={question.questionVariantId} question={question} />
            ))
          )}
        </div>
        <div
          id={ownedProductsSection?.key ?? 'owned_products'}
          data-question-count={ownedProductsSection?.questions.length ?? 0}
          className="flex h-full w-full flex-1 flex-col gap-4 overflow-y-auto rounded-xl border border-[var(--color-border-light)] border-t-[3px] border-t-[var(--gold-3)] bg-[var(--color-bg-white)] p-4 shadow-sm"
        >
          <h3 className="text-lg font-semibold text-[var(--color-text-heading)]">사용 제품</h3>
          {isLoading ? (
            <SkeletonCard />
          ) : (
            ownedProductsSection?.questions.map((question) => (
              <PriorityGateQuestionItem key={question.questionVariantId} question={question} />
            ))
          )}
        </div>
        <div
          id="priority-results"
          className="flex h-full w-full flex-1 flex-col items-center justify-center rounded-xl border border-[var(--color-border-light)] border-t-[3px] border-t-[var(--green-3)] bg-[var(--color-bg-white)] shadow-sm"
        >
          결과
        </div>
      </div>
      {isError ? (
        <p className="mt-6 text-sm text-[var(--color-error)]">
          {error instanceof Error ? error.message : '질문 데이터를 불러오지 못했습니다.'}
        </p>
      ) : null}
    </main>
  );
}
