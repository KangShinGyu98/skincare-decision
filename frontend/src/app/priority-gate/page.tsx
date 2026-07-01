'use client';

//todo timeout 읽고 스피너 확인하기
import type {
  PriorityGateResponseValue,
  UpsertPriorityGateResponsesResponse,
} from '@skincare-decision/shared/schemas';
import { useCallback, useEffect, useRef, useState } from 'react';
import { PriorityGateQuestionItem } from '@/components/PriorityGateQuestionItem';
import { SkeletonCard } from '@/components/shadcn/skeleton-card';
import { Spinner } from '@/components/shadcn/spinner';
import { usePriorityGateQuestions, useSubmitPriorityGate } from '@/lib/hooks';

const RESPONSE_SAVE_DEBOUNCE_MS = 800;

type PreviewResult = UpsertPriorityGateResponsesResponse['previewResults'][number];

export default function PriorityGatePage() {
  const { data, error, isError, isLoading } = usePriorityGateQuestions();
  const { mutateAsync: submitPriorityGateResponses } = useSubmitPriorityGate();

  const sections = data?.sections ?? [];
  const lifeRoutineSection = sections.find((section) => section.key === 'life_routine');
  const ownedProductsSection = sections.find((section) => section.key === 'owned_products');
  // 전체 debounce timer 1개
  const timeoutIdRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 저장 대기 중인 요청들
  // key: questionVariantId
  // value: 마지막으로 선택된 저장 요청
  const requestMapRef = useRef(new Map<string, PriorityGateResponseValue>());

  const [previewResults, setPreviewResults] = useState<PreviewResult[]>([]);
  const [submitError, setSubmitError] = useState<Error | null>(null);
  const [isSavingResponse, setIsSavingResponse] = useState(false);

  const flushResponses = useCallback(() => {
    const responses = Object.fromEntries(requestMapRef.current.entries());

    requestMapRef.current.clear();
    timeoutIdRef.current = null;

    if (Object.keys(responses).length === 0) {
      return;
    }

    setIsSavingResponse(true);
    setSubmitError(null);

    void submitPriorityGateResponses({ responses })
      .then((response) => {
        setPreviewResults(response.previewResults);
      })
      .catch((requestError: unknown) => {
        setSubmitError(
          requestError instanceof Error ? requestError : new Error('답변 저장에 실패했습니다.'),
        );
      })
      .finally(() => {
        setIsSavingResponse(false);
      });
  }, [submitPriorityGateResponses]);

  const saveResponse = useCallback(
    (questionVariantId: string, response: PriorityGateResponseValue) => {
      requestMapRef.current.set(questionVariantId, response);

      if (timeoutIdRef.current) {
        clearTimeout(timeoutIdRef.current);
      }

      timeoutIdRef.current = setTimeout(flushResponses, RESPONSE_SAVE_DEBOUNCE_MS);
    },
    [flushResponses],
  );

  //unmount 시 flush
  useEffect(() => {
    return () => {
      if (timeoutIdRef.current) {
        clearTimeout(timeoutIdRef.current);
        timeoutIdRef.current = null;
      }

      flushResponses();
    };
  }, [flushResponses]);

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
              <PriorityGateQuestionItem
                key={question.questionVariantId}
                question={question}
                onValueChange={(value) => {
                  saveResponse(
                    question.questionVariantId,
                    {
                      questionId: question.questionId,
                      value,
                    },
                  );
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
          <h3 className="text-lg font-semibold text-[var(--color-text-heading)]">사용 제품</h3>
          {isLoading ? (
            <SkeletonCard />
          ) : (
            ownedProductsSection?.questions.map((question) => (
              <PriorityGateQuestionItem
                key={question.questionVariantId}
                question={question}
                onValueChange={(value) => {
                  saveResponse(
                    question.questionVariantId,
                    {
                      questionId: question.questionId,
                      value,
                    },
                  );
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
          <div className="flex min-h-0 flex-1 items-center justify-center">
            {isLoading || isSavingResponse ? (
              <Spinner className="size-7 text-[var(--color-primary)]" />
            ) : submitError ? (
              <p className="text-center text-sm text-[var(--color-error)]">{submitError.message}</p>
            ) : previewResults.length > 0 ? (
              <div className="flex w-full flex-col gap-3 text-center">
                {previewResults.map((previewResult) => (
                  <section
                    key={`${previewResult.resultType}-${previewResult.title}`}
                    className="rounded-lg border border-[var(--color-border-light)] p-3"
                  >
                    <p className="text-base font-semibold text-[var(--color-text-primary)]">
                      {previewResult.title}
                    </p>
                    <p className="mt-2 text-sm leading-relaxed text-[var(--color-text-secondary)]">
                      {previewResult.description}
                    </p>
                    {previewResult.recommendCategory ? (
                      <p className="mt-2 text-sm font-medium text-[var(--color-primary-active)]">
                        추천 제품군: {previewResult.recommendCategory.name}
                      </p>
                    ) : null}
                  </section>
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
