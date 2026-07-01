'use client';

import type { QuestionAnswerTypeDto, QuestionDto } from '@skincare-decision/shared/schemas';
import { useState } from 'react';
import { cn } from '@/lib/utils';

type PriorityGateQuestionItemProps = {
  question: QuestionDto;
  value?: number[];
  disabled?: boolean;
  onValueChange?: (value: number[]) => void;
};

const ANSWER_INPUT_TYPE = {
  BOOLEAN: 'radio',
  THREE_CHOICE: 'radio',
  FOUR_CHOICE: 'radio',
  FIVE_CHOICE: 'radio',
  SINGLE_CHOICE: 'radio',
  MULTI_CHOICE: 'checkbox',
} satisfies Record<QuestionAnswerTypeDto, 'checkbox' | 'radio'>;

function getNextValue(question: QuestionDto, selectedValues: number[], answerValue: number) {
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
  const inputType = ANSWER_INPUT_TYPE[question.answerType];
  const canChange = !disabled && (!isControlled || onValueChange !== undefined);

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
      <legend className="px-1 text-sm font-medium leading-relaxed text-[var(--color-text-primary)]">
        {question.title}
      </legend>
      <div
        className={cn(
          'mt-3 grid gap-2',
          question.answers.length <= 2 ? 'grid-cols-2' : 'grid-cols-1',
          question.answerType === 'MULTI_CHOICE' ? 'sm:grid-cols-2' : null,
        )}
      >
        {question.answers.map((answer) => {
          const inputId = `${question.questionVariantId}-${answer.value}`;
          const isSelected = selectedValues.includes(answer.value);

          return (
            <label
              key={answer.value}
              htmlFor={inputId}
              className={cn(
                'flex min-h-10 cursor-pointer items-center gap-2 rounded-md border border-[var(--color-border)] bg-[var(--color-bg-component)] px-3 py-2 text-sm text-[var(--color-text-secondary)]',
                isSelected
                  ? 'border-[var(--color-primary-border)] bg-[var(--color-primary-light)] text-[var(--color-primary-active)]'
                  : null,
                disabled ? 'cursor-not-allowed opacity-60' : null,
                !canChange ? 'cursor-default' : null,
              )}
            >
              <input
                id={inputId}
                type={inputType}
                name={question.questionVariantId}
                value={answer.value}
                checked={isSelected}
                disabled={disabled}
                readOnly={!canChange}
                onChange={
                  canChange
                    ? () => handleValueChange(getNextValue(question, selectedValues, answer.value))
                    : undefined
                }
                className="size-4 shrink-0 accent-[var(--color-primary)]"
              />
              <span>{answer.label}</span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
