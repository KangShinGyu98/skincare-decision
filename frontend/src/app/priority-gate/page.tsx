'use client';

import type { QuestionUiSectionDto } from '@skincare-decision/shared/schemas';
import { useCallback } from 'react';
import { PriorityGateQuestionItem } from '@/components/PriorityGateQuestionItem';
import { PriorityGateResultCard } from '@/components/PriorityGateResultCard';
import { SectionResetButton } from '@/components/SectionResetButton';
import { SkeletonCard } from '@/components/shadcn/skeleton-card';
import { Spinner } from '@/components/shadcn/spinner';
import { usePriorityGateActions, usePriorityGateQuestions } from '@/lib/hooks';

export default function PriorityGatePage() {
  const { data, error, isError, isLoading } = usePriorityGateQuestions();
  const {
    error: responseError,
    isPending: isPriorityGateActionPending,
    resetPriorityGateSection,
    saveResponse,
  } = usePriorityGateActions();

  const sections = data?.sections ?? [];
  const lifeRoutineSection = sections.find((section) => section.key === 'life_routine');
  const ownedProductsSection = sections.find((section) => section.key === 'owned_products');

  const previewResults = data?.previewResults ?? [];

  const resetSectionResponses = useCallback(
    (uiSection: QuestionUiSectionDto) => {
      resetPriorityGateSection(uiSection);
    },
    [resetPriorityGateSection],
  );

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
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-lg font-semibold text-[var(--color-text-heading)]">루틴 점검</h3>
            <SectionResetButton
              uiSection="life_routine"
              sectionTitle="루틴 점검"
              disabled={isLoading || isPriorityGateActionPending}
              onReset={() => resetSectionResponses('life_routine')}
            />
          </div>
          {isLoading ? (
            <SkeletonCard />
          ) : (
            lifeRoutineSection?.questions.map((question) => (
              <PriorityGateQuestionItem
                key={question.questionVariantId}
                question={question}
                value={question.currentResponse ?? []}
                disabled={isPriorityGateActionPending}
                onValueChange={(value) => {
                  saveResponse(question.questionVariantId, {
                    questionId: question.questionId,
                    value,
                  });
                }}
              />
            ))
          )}
        </div>
        <div
          id={ownedProductsSection?.key ?? 'owned_products'}
          data-question-count={ownedProductsSection?.questions.length ?? 0}
          className="flex h-full w-full flex-1 flex-col gap-4 overflow-y-auto rounded-xl border border-[var(--color-border-light)] border-t-[3px] border-t-[var(--gold-3)] bg-[var(--color-bg-white)] p-4 shadow-sm"
        >
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-lg font-semibold text-[var(--color-text-heading)]">사용 제품</h3>
            <SectionResetButton
              uiSection="owned_products"
              sectionTitle="사용 제품"
              disabled={isLoading || isPriorityGateActionPending}
              onReset={() => resetSectionResponses('owned_products')}
            />
          </div>
          {isLoading ? (
            <SkeletonCard />
          ) : (
            ownedProductsSection?.questions.map((question) => (
              <PriorityGateQuestionItem
                key={question.questionVariantId}
                question={question}
                value={question.currentResponse ?? []}
                disabled={isPriorityGateActionPending}
                onValueChange={(value) => {
                  saveResponse(question.questionVariantId, {
                    questionId: question.questionId,
                    value,
                  });
                }}
              />
            ))
          )}
        </div>
        <div
          id="priority-results"
          className="flex h-full w-full flex-1 flex-col gap-4 rounded-xl border border-[var(--color-border-light)] border-t-[3px] border-t-[var(--green-3)] bg-[var(--color-bg-white)] p-4 shadow-sm"
        >
          <h3 className="text-lg font-semibold text-[var(--color-text-heading)]">결론</h3>
          <div className="flex min-h-0 flex-1 items-start justify-center overflow-y-auto">
            {isLoading || isPriorityGateActionPending ? (
              <Spinner className="size-7 text-[var(--color-primary)]" />
            ) : responseError ? (
              <p className="text-center text-sm text-[var(--color-error)]">
                {responseError.message}
              </p>
            ) : previewResults.length > 0 ? (
              <div className="flex w-full flex-col gap-3">
                {previewResults.map((previewResult) => (
                  <PriorityGateResultCard
                    key={`${previewResult.resultType}-${previewResult.title}`}
                    previewResult={previewResult}
                  />
                ))}
              </div>
            ) : (
              <span className="text-sm text-[var(--color-text-tertiary)]">
                답변을 선택하면 결론이 표시됩니다.
              </span>
            )}
          </div>
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
