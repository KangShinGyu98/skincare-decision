'use client';

import type { QuestionAnswerDto, QuestionAnswerTypeDto } from '@skincare-decision/shared/schemas';
import { useState } from 'react';
import { Checkbox } from '@/components/shadcn/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/shadcn/radio-group';
import { cn } from '@/lib/utils';

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
          value={selectedValues[0] !== undefined ? String(selectedValues[0]) : undefined}
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
    'flex min-h-10 cursor-pointer items-center gap-2 rounded-md border border-[var(--color-border)] bg-[var(--color-bg-component)] px-3 py-2 text-sm text-[var(--color-text-secondary)]',
    isSelected
      ? 'border-[var(--color-primary-border)] bg-[var(--color-primary-light)] text-[var(--color-primary-active)]'
      : null,
    disabled ? 'cursor-not-allowed opacity-60' : null,
    !canChange ? 'cursor-default' : null,
  );
}
