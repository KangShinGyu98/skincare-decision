'use client';

import type { QuestionAnswerDto, QuestionAnswerTypeDto } from '@skincare-decision/shared/schemas';
import { useState } from 'react';
import { Checkbox } from '@/components/shadcn/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/shadcn/radio-group';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/shadcn/tooltip';
import { cn } from '@/lib/utils';

// 용어가 낯선 질문에 붙이는 설명 툴팁. question.key로 매칭한다.
const QUESTION_TOOLTIP_BY_KEY: Record<string, string> = {
  'product.moisturizer_type':
    '피부에 수분·유분을 채워 장벽을 보호하는 제품이에요. 로션, 수분크림, 영양크림, 재생크림 등이 모두 보습제예요.',
};

type ChoiceQuestion = {
  questionId: string;
  questionVariantId: string;
  key: string;
  title: string;
  answerType: QuestionAnswerTypeDto;
  answers: QuestionAnswerDto[];
  currentResponse: number[] | null;
};

type PriorityGateQuestionItemProps = {
  question: ChoiceQuestion;
  value?: number[];
  disabled?: boolean;
  onValueChange?: (value: number[]) => void;
};

function getNextValue(question: ChoiceQuestion, selectedValues: number[], answerValue: number) {
  if (question.answerType !== 'MULTI_CHOICE') {
    return [answerValue];
  }

  if (selectedValues.includes(answerValue)) {
    return selectedValues.filter((value) => value !== answerValue);
  }

  return [...selectedValues, answerValue];
}

export function PriorityGateQuestionItem({
  question,
  value,
  disabled = false,
  onValueChange,
}: PriorityGateQuestionItemProps) {
  const isControlled = value !== undefined;
  const [internalValue, setInternalValue] = useState<number[]>(question.currentResponse ?? []);
  const selectedValues = isControlled ? value : internalValue;
  const canChange = !disabled && (!isControlled || onValueChange !== undefined);
  const isMultiChoice = question.answerType === 'MULTI_CHOICE';
  const selectedRadioValue = selectedValues[0] !== undefined ? String(selectedValues[0]) : '';
  const tooltip = QUESTION_TOOLTIP_BY_KEY[question.key];

  const handleValueChange = (nextValue: number[]) => {
    if (!canChange) {
      return;
    }

    if (!isControlled) {
      setInternalValue(nextValue);
    }

    onValueChange?.(nextValue);
  };

  return (
    <fieldset
      className="w-full rounded-lg border border-[var(--color-border-light)] bg-[var(--color-bg-white)] p-4"
      data-answer-type={question.answerType}
      data-question-id={question.questionId}
      data-question-key={question.key}
    >
      <legend className="flex items-center gap-1.5 px-1 text-sm font-medium leading-relaxed text-[var(--color-text-primary)]">
        <span>{question.title}</span>
        {tooltip ? (
          <Tooltip>
            <TooltipTrigger
              type="button"
              aria-label={`${question.title} 설명`}
              className="inline-flex size-4 shrink-0 items-center justify-center rounded-full border border-[var(--color-border)] text-[10px] leading-none text-[var(--color-text-tertiary)] hover:text-[var(--color-text-secondary)]"
            >
              ?
            </TooltipTrigger>
            <TooltipContent>{tooltip}</TooltipContent>
          </Tooltip>
        ) : null}
      </legend>

      {isMultiChoice ? (
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          {question.answers.map((answer) => {
            const inputId = `${question.questionVariantId}-${answer.value}`;
            const isSelected = selectedValues.includes(answer.value);

            return (
              <label
                key={answer.value}
                htmlFor={inputId}
                className={getAnswerLabelClassName({
                  canChange,
                  disabled,
                  isSelected,
                })}
              >
                <Checkbox
                  id={inputId}
                  name={question.questionVariantId}
                  value={String(answer.value)}
                  checked={isSelected}
                  disabled={disabled}
                  onCheckedChange={
                    canChange
                      ? () =>
                          handleValueChange(getNextValue(question, selectedValues, answer.value))
                      : undefined
                  }
                  className="border-[var(--color-border)] data-checked:border-[var(--color-primary)] data-checked:bg-[var(--color-primary)]"
                />
                <span>{answer.label}</span>
              </label>
            );
          })}
        </div>
      ) : (
        <RadioGroup
          value={selectedRadioValue}
          onValueChange={
            canChange ? (nextValue) => handleValueChange([Number(nextValue)]) : undefined
          }
          disabled={disabled}
          readOnly={!canChange}
          name={question.questionVariantId}
          className={cn(
            'mt-3 grid gap-2',
            question.answers.length <= 2 ? 'grid-cols-2' : 'grid-cols-1',
          )}
        >
          {question.answers.map((answer) => {
            const inputId = `${question.questionVariantId}-${answer.value}`;
            const isSelected = selectedValues.includes(answer.value);

            return (
              <label
                key={answer.value}
                htmlFor={inputId}
                // 이미 선택된 항목을 다시 클릭하면 선택을 해제한다(라디오는 기본적으로 해제가 없다).
                // preventDefault가 label→input 네이티브 전달과 base-ui 재선택을 모두 막는다.
                onClick={
                  canChange && isSelected
                    ? (event) => {
                        event.preventDefault();
                        handleValueChange([]);
                      }
                    : undefined
                }
                className={getAnswerLabelClassName({
                  canChange,
                  disabled,
                  isSelected,
                })}
              >
                <RadioGroupItem
                  id={inputId}
                  value={String(answer.value)}
                  disabled={disabled}
                  readOnly={!canChange}
                  className="border-[var(--color-border)] data-checked:border-[var(--color-primary)] data-checked:bg-[var(--color-primary)]"
                />
                <span>{answer.label}</span>
              </label>
            );
          })}
        </RadioGroup>
      )}
    </fieldset>
  );
}

function getAnswerLabelClassName({
  canChange,
  disabled,
  isSelected,
}: {
  canChange: boolean;
  disabled: boolean;
  isSelected: boolean;
}) {
  return cn(
    // relative 필수: base-ui가 label 안에 position:absolute hidden input을 렌더하는데,
    // positioned 조상이 없으면 문서 루트 기준으로 배치되어 overflow 클리핑을 벗어나
    // 문서 스크롤 영역을 늘리고(footer 아래 빈 공간), focus 시 페이지 점프를 일으킨다.
    'relative flex min-h-10 cursor-pointer items-center gap-2 rounded-md border border-[var(--color-border)] bg-[var(--color-bg-component)] px-3 py-2 text-sm text-[var(--color-text-secondary)]',
    isSelected
      ? 'border-[var(--color-primary-border)] bg-[var(--color-primary-light)] text-[var(--color-primary-active)]'
      : null,
    disabled ? 'cursor-not-allowed opacity-60' : null,
    !canChange ? 'cursor-default' : null,
  );
}
