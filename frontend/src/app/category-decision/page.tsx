'use client';

import type { CategoryDecisionUiSection } from '@skincare-decision/shared/schemas';
import { useRouter, useSearchParams } from 'next/navigation';
import { CategoryDecisionResultCard } from '@/components/CategoryDecisionResultCard';
import { PriorityGateQuestionItem } from '@/components/PriorityGateQuestionItem';
import { SectionResetButton } from '@/components/SectionResetButton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/shadcn/select';
import { SkeletonCard } from '@/components/shadcn/skeleton-card';
import { Spinner } from '@/components/shadcn/spinner';
import { useCategoryDecision, useCategoryDecisionActions } from '@/lib/hooks';

const SECTION_TITLE_BY_KEY = {
  basic: '기본 확인',
  category: '제품군 기준',
} satisfies Record<CategoryDecisionUiSection, string>;

const CATEGORY_SELECT_ITEMS = [
  { id: 'toner', key: 'toner', name: '토너' },
  { id: 'sunscreen', key: 'sunscreen', name: '선크림' },
  { id: 'serum', key: 'serum', name: '세럼' },
  { id: 'lipcare', key: 'lipcare', name: '립케어' },
  { id: 'moisturizer', key: 'moisturizer', name: '로션 / 크림' },
  { id: 'cleanser', key: 'cleanser', name: '클렌저' },
] as const;

function getCategoryParam(searchParams: { get: (name: string) => string | null }) {
  const category = searchParams.get('category')?.trim();

  return category && category.length > 0 ? category : undefined;
}

export default function CategoryDecisionPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const category = getCategoryParam(searchParams);
  const { data, error, isError, isLoading } = useCategoryDecision(category);
  const {
    error: responseError,
    isPending: isCategoryDecisionActionPending,
    resetCategoryDecisionSection,
    saveResponse,
  } = useCategoryDecisionActions(category);

  const sections = data?.sections ?? [];
  const basicSection = sections.find((section) => section.key === 'basic');
  const categorySection = sections.find((section) => section.key === 'category');
  const previewResults = data?.previewResults ?? [];
  const selectedCategory = data?.selectedCategory ?? null;
  const categorySectionTitle = selectedCategory
    ? `${selectedCategory.name} 기준`
    : SECTION_TITLE_BY_KEY.category;
  const selectedCategoryKey = category ?? selectedCategory?.key ?? null;
  const getCategoryLabel = (categoryKey: string | null) =>
    CATEGORY_SELECT_ITEMS.find((productCategory) => productCategory.key === categoryKey)?.name ??
    selectedCategory?.name ??
    '제품군 선택';

  const handleCategoryChange = (nextCategory: string | null) => {
    if (!nextCategory || nextCategory === selectedCategoryKey) {
      return;
    }

    const nextSearchParams = new URLSearchParams(searchParams.toString());
    nextSearchParams.set('category', nextCategory);
    router.push(`/category-decision?${nextSearchParams.toString()}`);
  };

  return (
    <main
      className="flex min-h-screen w-full flex-col items-center justify-center bg-[var(--color-bg-page)] p-10"
      aria-busy={isLoading || isCategoryDecisionActionPending}
      data-fetch-state={isLoading ? 'loading' : isError ? 'error' : 'success'}
    >
      <div className="col-span-2 flex flex-col items-center gap-3">
        <h2>제품군 선택 기준을 정리합니다.</h2>
        <div className="flex flex-wrap items-center justify-center gap-3">
          <Select
            value={selectedCategoryKey}
            onValueChange={(value) => handleCategoryChange(value)}
          >
            <SelectTrigger
              aria-label="제품군 선택"
              className="min-w-40 border-[var(--color-border)] bg-[var(--color-bg-white)]"
            >
              <SelectValue placeholder="제품군 선택">
                {(value: string | null) => getCategoryLabel(value)}
              </SelectValue>
            </SelectTrigger>
            <SelectContent align="center" alignItemWithTrigger={false}>
              {CATEGORY_SELECT_ITEMS.map((productCategory) => (
                <SelectItem key={productCategory.id} value={productCategory.key}>
                  {productCategory.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <span className="space-y-3 text-base leading-2 text-[var(--color-text-secondary)]">
            제품군에 맞는 질문만 확인하고, 답변은 이후 필터에 반영합니다.
          </span>
        </div>
      </div>
      <div className="flex h-[70vh] w-full max-w-[1200px] translate-y-8 gap-6 overflow-hidden shadow-lg">
        <div
          id={basicSection?.key ?? 'basic'}
          data-question-count={basicSection?.questions.length ?? 0}
          className="flex h-full w-full flex-1 flex-col gap-4 overflow-y-auto rounded-xl border border-[var(--color-border-light)] border-t-[3px] border-t-[var(--color-primary-border)] bg-[var(--color-bg-white)] p-4 shadow-sm"
        >
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-lg font-semibold text-[var(--color-text-heading)]">
              {SECTION_TITLE_BY_KEY.basic}
            </h3>
            <SectionResetButton
              uiSection="basic"
              sectionTitle={SECTION_TITLE_BY_KEY.basic}
              disabled={isLoading || isCategoryDecisionActionPending || !basicSection}
              elementIdPrefix="category_decision.reset"
              onReset={() => resetCategoryDecisionSection('basic')}
            />
          </div>
          {isLoading ? (
            <SkeletonCard />
          ) : basicSection ? (
            basicSection.questions.map((question) => (
              <PriorityGateQuestionItem
                key={question.questionVariantId}
                question={question}
                value={question.currentResponse ?? []}
                disabled={isCategoryDecisionActionPending}
                onValueChange={(value) => {
                  saveResponse(question.questionVariantId, {
                    questionId: question.questionId,
                    value,
                  });
                }}
              />
            ))
          ) : (
            <span className="text-sm text-[var(--color-text-tertiary)]">
              표시할 기본 질문이 없습니다.
            </span>
          )}
        </div>
        <div
          id={categorySection?.key ?? 'category'}
          data-question-count={categorySection?.questions.length ?? 0}
          className="flex h-full w-full flex-1 flex-col gap-4 overflow-y-auto rounded-xl border border-[var(--color-border-light)] border-t-[3px] border-t-[var(--gold-3)] bg-[var(--color-bg-white)] p-4 shadow-sm"
        >
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-lg font-semibold text-[var(--color-text-heading)]">
              {categorySectionTitle}
            </h3>
            <SectionResetButton
              uiSection="category"
              sectionTitle={categorySectionTitle}
              disabled={isLoading || isCategoryDecisionActionPending || !categorySection}
              elementIdPrefix="category_decision.reset"
              onReset={() => resetCategoryDecisionSection('category')}
            />
          </div>
          {isLoading ? (
            <SkeletonCard />
          ) : categorySection ? (
            categorySection.questions.map((question) => (
              <PriorityGateQuestionItem
                key={question.questionVariantId}
                question={question}
                value={question.currentResponse ?? []}
                disabled={isCategoryDecisionActionPending}
                onValueChange={(value) => {
                  saveResponse(question.questionVariantId, {
                    questionId: question.questionId,
                    value,
                  });
                }}
              />
            ))
          ) : (
            <span className="text-sm text-[var(--color-text-tertiary)]">
              제품군을 선택하면 기준 질문이 표시됩니다.
            </span>
          )}
        </div>
        <div
          id="category-results"
          className="flex h-full w-full flex-1 flex-col gap-4 rounded-xl border border-[var(--color-border-light)] border-t-[3px] border-t-[var(--green-3)] bg-[var(--color-bg-white)] p-4 shadow-sm"
        >
          <h3 className="text-lg font-semibold text-[var(--color-text-heading)]">결론</h3>
          <div className="flex min-h-0 flex-1 items-start justify-center overflow-y-auto">
            {isLoading || isCategoryDecisionActionPending ? (
              <Spinner className="size-7 text-[var(--color-primary)]" />
            ) : responseError ? (
              <p className="text-center text-sm text-[var(--color-error)]">
                {responseError.message}
              </p>
            ) : previewResults.length > 0 ? (
              <div className="flex w-full flex-col gap-3">
                {previewResults.map((previewResult) => (
                  <CategoryDecisionResultCard
                    key={`${previewResult.title}-${previewResult.selectedCategory?.key ?? 'none'}`}
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
          {error instanceof Error ? error.message : '카테고리 질문 데이터를 불러오지 못했습니다.'}
        </p>
      ) : null}
    </main>
  );
}
