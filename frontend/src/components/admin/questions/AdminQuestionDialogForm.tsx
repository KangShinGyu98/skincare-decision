'use client';

import { useMemo } from 'react';
import { useForm } from '@tanstack/react-form';
import {
  adminQuestionCategorySchema,
  type AdminQuestionDetail,
  adminQuestionScreenSchema,
  type AdminQuestionTableRow,
  adminQuestionUiSectionSchema,
  adminRuleConditionOperatorSchema,
  adminRuleConditionStateSchema,
  type AdminRuleQuestionSearchItem,
  questionAnswerTypeSchema,
  type UpdateAdminQuestionBody,
  updateAdminQuestionBodySchema,
} from '@skincare-decision/shared/schemas';
import { PlusIcon, Trash2Icon } from 'lucide-react';
import { ErrorPanel } from '@/components/common/ErrorPanel';
import { CardSkeleton } from '@/components/common/skeleton/CardSkeleton';
import { Button } from '@/components/shadcn/button';
import { Card, CardAction, CardContent, CardHeader, CardTitle } from '@/components/shadcn/card';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/shadcn/dialog';
import { Field, FieldContent, FieldError, FieldLabel } from '@/components/shadcn/field';
import { Input } from '@/components/shadcn/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/shadcn/select';
import { Separator } from '@/components/shadcn/separator';
import { Spinner } from '@/components/shadcn/spinner';
import { Switch } from '@/components/shadcn/switch';
import { Textarea } from '@/components/shadcn/textarea';
import { isUnauthorizedError } from '@/lib/api';
import {
  useAdminQuestionDetail,
  useAdminQuestionDialogActions,
  useAdminQuestions,
  useAdminRuleQuestionSearch,
} from '@/lib/hooks';

const ALL_CATEGORY_VALUE = 'All';
const SORT_POSITION_TOP_VALUE = '__top__';

function createVariantAnswers(answerCount: number): string[] {
  return Array.from({ length: answerCount }, () => '');
}

function resizeAnswers(answers: string[], answerCount: number): string[] {
  return Array.from({ length: answerCount }, (_, index) => answers[index] ?? '');
}

function createEmptyAdminQuestionVariant(
  answerCount: number,
  sortAfterQuestionVariantId: string | null,
): UpdateAdminQuestionBody['variants'][number] {
  return {
    title: '',
    answers: createVariantAnswers(answerCount),
    screen: 'priority_gate',
    uiSection: 'life_routine',
    category: null,
    sort_order: 0,
    sortAfterQuestionVariantId,
    status: 'active',
    visibilityConditions: [],
  };
}

function createEmptyVisibilityCondition(): UpdateAdminQuestionBody['variants'][number]['visibilityConditions'][number] {
  return {
    questionId: '',
    operator: 'EQ',
    value: 0,
    state: 'REQUIRED',
  };
}

function toAdminQuestionFormValues(detail: AdminQuestionDetail): UpdateAdminQuestionBody {
  const answerCount = Math.max(1, detail.answerValues.length);

  return {
    question: detail.question,
    answerType: detail.answerType,
    answerCount,
    status: detail.status,
    variants: detail.variants.map((variant) => ({
      id: variant.id,
      title: variant.title,
      answers: resizeAnswers(variant.answers, answerCount),
      screen: variant.screen,
      uiSection: variant.uiSection,
      category: variant.category,
      sort_order: variant.sort_order,
      status: variant.status,
      visibilityConditions: variant.visibilityConditions.map((condition) => ({
        questionId: condition.questionId,
        operator: condition.operator,
        value: condition.value,
        state: condition.state,
      })),
    })),
  };
}

function getQuestionLabel(question: AdminRuleQuestionSearchItem): string {
  const title = question.questionVariant?.title ?? 'variant 없음';

  return `${question.questionKey} · ${title}`;
}

function getAnswerOptions(question: AdminRuleQuestionSearchItem | undefined) {
  if (!question) {
    return [];
  }

  return question.answerValues.map((value, index) => ({
    value,
    label: question.questionVariant?.answers[index]?.trim() || `선택지 ${index + 1}`,
  }));
}

function getQuestionVariantLabel(row: AdminQuestionTableRow): string {
  return `${row.question} · ${row.questionVariant}`;
}

function getLastQuestionVariantIdByUiSection(
  rows: AdminQuestionTableRow[],
  uiSection: UpdateAdminQuestionBody['variants'][number]['uiSection'],
  excludedQuestionVariantId?: string,
): string | null {
  const lastRow = rows
    .filter(
      (row) => row.uiSection === uiSection && row.questionVariantId !== excludedQuestionVariantId,
    )
    .at(-1);

  return lastRow?.questionVariantId ?? null;
}

function getCurrentSortAfterQuestionVariantId(
  rows: AdminQuestionTableRow[],
  currentQuestionVariantId: string | undefined,
): string | null {
  if (!currentQuestionVariantId) {
    return null;
  }

  const currentIndex = rows.findIndex((row) => row.questionVariantId === currentQuestionVariantId);

  if (currentIndex <= 0) {
    return null;
  }

  return rows[currentIndex - 1]?.questionVariantId ?? null;
}

function useAdminQuestionDialogForm(
  initialValues: UpdateAdminQuestionBody,
  onSubmit: (values: UpdateAdminQuestionBody) => void,
) {
  return useForm({
    defaultValues: initialValues,
    validators: {
      onSubmit: updateAdminQuestionBodySchema,
      onBlur: updateAdminQuestionBodySchema,
    },
    onSubmit: ({ value }) => onSubmit(value),
  });
}

type AdminQuestionDialogFormApi = ReturnType<typeof useAdminQuestionDialogForm>;

type AdminQuestionDialogFormProps = {
  questionId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function AdminQuestionDialogForm({
  questionId,
  open,
  onOpenChange,
}: AdminQuestionDialogFormProps) {
  const questionDetailQuery = useAdminQuestionDetail(open && questionId ? questionId : null);
  const {
    error: mutationError,
    isPending: isMutationPending,
    reset: resetMutation,
    submitQuestion,
  } = useAdminQuestionDialogActions({
    questionId,
    onSuccess: () => onOpenChange(false),
  });
  const initialValues = useMemo(() => {
    if (!questionDetailQuery.data) {
      return null;
    }

    return toAdminQuestionFormValues(questionDetailQuery.data);
  }, [questionDetailQuery.data]);

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      resetMutation();
    }

    onOpenChange(nextOpen);
  };

  const handleSubmit = (values: UpdateAdminQuestionBody) => {
    submitQuestion(updateAdminQuestionBodySchema.parse(values));
  };

  let dialogBody = null;

  if (questionDetailQuery.isError) {
    dialogBody = (
      <ErrorPanel
        message={
          isUnauthorizedError(questionDetailQuery.error)
            ? '로그인한 사용자만 확인할 수 있습니다.'
            : questionDetailQuery.error instanceof Error
              ? questionDetailQuery.error.message
              : 'Question 상세 정보를 불러오지 못했습니다.'
        }
      />
    );
  } else if (questionDetailQuery.isLoading) {
    dialogBody = <CardSkeleton />;
  } else if (initialValues) {
    dialogBody = (
      <AdminQuestionDialogFormContent
        key={questionDetailQuery.data?.id}
        initialValues={initialValues}
        isMutationPending={isMutationPending}
        mutationError={mutationError}
        onCancel={() => handleOpenChange(false)}
        onSubmit={handleSubmit}
      />
    );
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        className="max-h-[92vh] w-[840px] max-w-[840px] overflow-hidden sm:max-w-[840px]"
        aria-busy={questionDetailQuery.isLoading || questionDetailQuery.isFetching}
      >
        <DialogHeader>
          <DialogTitle>질문 수정</DialogTitle>
        </DialogHeader>
        <Separator className="my-2" />
        {dialogBody}
      </DialogContent>
    </Dialog>
  );
}

type AdminQuestionDialogFormContentProps = {
  initialValues: UpdateAdminQuestionBody;
  isMutationPending: boolean;
  mutationError: Error | null;
  onCancel: () => void;
  onSubmit: (values: UpdateAdminQuestionBody) => void;
};

function AdminQuestionDialogFormContent({
  initialValues,
  isMutationPending,
  mutationError,
  onCancel,
  onSubmit,
}: AdminQuestionDialogFormContentProps) {
  const questionSearchQuery = useAdminRuleQuestionSearch({
    limit: 50,
  });
  const questionOptions = useMemo(() => {
    return [...(questionSearchQuery.data?.items ?? [])].sort((first, second) =>
      first.questionKey.localeCompare(second.questionKey),
    );
  }, [questionSearchQuery.data]);
  const questionMap = useMemo(
    () => new Map(questionOptions.map((question) => [question.questionId, question])),
    [questionOptions],
  );
  const lifeRoutineSortRowsQuery = useAdminQuestions({ uiSection: 'life_routine' });
  const ownedProductsSortRowsQuery = useAdminQuestions({ uiSection: 'owned_products' });
  const basicSortRowsQuery = useAdminQuestions({ uiSection: 'basic' });
  const categorySortRowsQuery = useAdminQuestions({ uiSection: 'category' });
  const sortRows = useMemo(
    () => [
      ...(lifeRoutineSortRowsQuery.data?.items ?? []),
      ...(ownedProductsSortRowsQuery.data?.items ?? []),
      ...(basicSortRowsQuery.data?.items ?? []),
      ...(categorySortRowsQuery.data?.items ?? []),
    ],
    [
      basicSortRowsQuery.data,
      categorySortRowsQuery.data,
      lifeRoutineSortRowsQuery.data,
      ownedProductsSortRowsQuery.data,
    ],
  );
  const sortRowsError =
    lifeRoutineSortRowsQuery.error ??
    ownedProductsSortRowsQuery.error ??
    basicSortRowsQuery.error ??
    categorySortRowsQuery.error;
  const form = useAdminQuestionDialogForm(initialValues, onSubmit);
  const isFormDisabled = isMutationPending;

  return (
    <form
      className="min-h-0"
      aria-busy={isFormDisabled}
      onSubmit={(event) => {
        event.preventDefault();
        event.stopPropagation();
        if (isFormDisabled) {
          return;
        }
        void form.handleSubmit();
      }}
    >
      <div className="-mx-4 no-scrollbar flex max-h-[68vh] flex-col gap-4 overflow-y-auto px-4 pb-4">
        <form.Field name="question">
          {(field) => {
            const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid;

            return (
              <Field data-invalid={isInvalid}>
                <FieldLabel htmlFor={field.name}>question</FieldLabel>
                <Input
                  id={field.name}
                  name={field.name}
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(event) => field.handleChange(event.target.value)}
                  disabled={isFormDisabled}
                  aria-invalid={isInvalid}
                />
                {isInvalid && <FieldError errors={field.state.meta.errors} />}
              </Field>
            );
          }}
        </form.Field>

        <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_220px]">
          <form.Field name="answerType">
            {(field) => {
              const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid;

              return (
                <Field data-invalid={isInvalid}>
                  <FieldLabel htmlFor={field.name}>answerType</FieldLabel>
                  <Select
                    name={field.name}
                    value={field.state.value}
                    onValueChange={(value) => {
                      if (value) {
                        field.handleChange(value);
                      }
                    }}
                  >
                    <SelectTrigger
                      id={field.name}
                      aria-invalid={isInvalid}
                      disabled={isFormDisabled}
                      className="w-full"
                    >
                      <SelectValue placeholder="answerType" />
                    </SelectTrigger>
                    <SelectContent align="start" alignItemWithTrigger={false}>
                      {questionAnswerTypeSchema.options.map((answerType) => (
                        <SelectItem key={answerType} value={answerType}>
                          {answerType}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {isInvalid && <FieldError errors={field.state.meta.errors} />}
                </Field>
              );
            }}
          </form.Field>

          <form.Field name="status">
            {(field) => {
              const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid;

              return (
                <Field orientation="responsive" data-invalid={isInvalid}>
                  <FieldContent>
                    <FieldLabel htmlFor={field.name}>status</FieldLabel>
                    {isInvalid && <FieldError errors={field.state.meta.errors} />}
                  </FieldContent>
                  <div className="flex items-center gap-2">
                    <Switch
                      id={field.name}
                      checked={field.state.value === 'active'}
                      onBlur={field.handleBlur}
                      onCheckedChange={(checked) =>
                        field.handleChange(checked ? 'active' : 'inactive')
                      }
                      disabled={isFormDisabled}
                      aria-invalid={isInvalid}
                    />
                    <span className="text-sm text-muted-foreground">{field.state.value}</span>
                  </div>
                </Field>
              );
            }}
          </form.Field>
        </div>

        <AdminQuestionAnswerCountField form={form} disabled={isFormDisabled} />
        <Separator className="my-2" />
        <AdminQuestionVariantsField
          form={form}
          questionOptions={questionOptions}
          questionMap={questionMap}
          questionSearchError={questionSearchQuery.error}
          sortRows={sortRows}
          sortRowsError={sortRowsError}
          disabled={isFormDisabled}
        />
        {mutationError ? <p className="text-sm text-destructive">{mutationError.message}</p> : null}
      </div>

      <DialogFooter className="gap-2">
        <Button type="button" variant="outline" onClick={onCancel} disabled={isMutationPending}>
          취소
        </Button>
        <Button type="submit" disabled={isMutationPending}>
          {isMutationPending ? <Spinner /> : null}
          저장
        </Button>
      </DialogFooter>
    </form>
  );
}

function AdminQuestionAnswerCountField({
  form,
  disabled,
}: {
  form: AdminQuestionDialogFormApi;
  disabled: boolean;
}) {
  return (
    <form.Field name="answerCount">
      {(field) => {
        const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid;

        return (
          <Field className="max-w-48" data-invalid={isInvalid}>
            <FieldLabel htmlFor={field.name}>answerCount</FieldLabel>
            <Input
              id={field.name}
              name={field.name}
              type="number"
              min={1}
              value={String(field.state.value)}
              onBlur={field.handleBlur}
              onChange={(event) => {
                const nextAnswerCount = Math.max(1, Number.parseInt(event.target.value, 10) || 1);

                field.handleChange(nextAnswerCount);
                form.setFieldValue('variants', (variants) =>
                  variants.map((variant) => ({
                    ...variant,
                    answers: resizeAnswers(variant.answers, nextAnswerCount),
                  })),
                );
              }}
              disabled={disabled}
              aria-invalid={isInvalid}
            />
            {isInvalid && <FieldError errors={field.state.meta.errors} />}
          </Field>
        );
      }}
    </form.Field>
  );
}

function AdminQuestionVariantsField({
  form,
  questionOptions,
  questionMap,
  questionSearchError,
  sortRows,
  sortRowsError,
  disabled,
}: {
  form: AdminQuestionDialogFormApi;
  questionOptions: AdminRuleQuestionSearchItem[];
  questionMap: Map<string, AdminRuleQuestionSearchItem>;
  questionSearchError: Error | null;
  sortRows: AdminQuestionTableRow[];
  sortRowsError: Error | null;
  disabled: boolean;
}) {
  return (
    <form.Field name="variants" mode="array">
      {(field) => {
        const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid;

        return (
          <Field data-invalid={isInvalid}>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <FieldLabel htmlFor={field.name}>variants</FieldLabel>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  const uiSection = 'life_routine';

                  field.pushValue(
                    createEmptyAdminQuestionVariant(
                      form.state.values.answerCount,
                      getLastQuestionVariantIdByUiSection(sortRows, uiSection),
                    ),
                  );
                }}
                disabled={disabled}
              >
                <PlusIcon />
                variant 추가
              </Button>
            </div>
            {isInvalid && <FieldError errors={field.state.meta.errors} />}
            {sortRowsError ? (
              <p className="text-sm text-destructive">{sortRowsError.message}</p>
            ) : null}
            <div className="grid gap-3">
              {field.state.value.map((_, index) => (
                <AdminQuestionVariantCard
                  key={index}
                  form={form}
                  index={index}
                  questionOptions={questionOptions}
                  questionMap={questionMap}
                  questionSearchError={questionSearchError}
                  sortRows={sortRows}
                  onRemove={() => field.removeValue(index)}
                  disabled={disabled}
                  removeDisabled={field.state.value.length <= 1}
                />
              ))}
            </div>
          </Field>
        );
      }}
    </form.Field>
  );
}

type AdminQuestionVariantCardProps = {
  form: AdminQuestionDialogFormApi;
  index: number;
  questionOptions: AdminRuleQuestionSearchItem[];
  questionMap: Map<string, AdminRuleQuestionSearchItem>;
  questionSearchError: Error | null;
  sortRows: AdminQuestionTableRow[];
  onRemove: () => void;
  disabled: boolean;
  removeDisabled: boolean;
};

function AdminQuestionVariantCard({
  form,
  index,
  questionOptions,
  questionMap,
  questionSearchError,
  sortRows,
  onRemove,
  disabled,
  removeDisabled,
}: AdminQuestionVariantCardProps) {
  return (
    <Card size="sm">
      <CardHeader>
        <CardTitle>variant {index + 1}</CardTitle>
        <CardAction>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={onRemove}
            disabled={disabled || removeDisabled}
            aria-label="variant 삭제"
          >
            <Trash2Icon />
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent className="grid min-w-0 gap-4">
        <form.Field name={`variants[${index}].title` as const}>
          {(field) => {
            const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid;

            return (
              <Field data-invalid={isInvalid}>
                <FieldLabel htmlFor={field.name}>title</FieldLabel>
                <Textarea
                  id={field.name}
                  name={field.name}
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(event) => field.handleChange(event.target.value)}
                  disabled={disabled}
                  aria-invalid={isInvalid}
                />
                {isInvalid && <FieldError errors={field.state.meta.errors} />}
              </Field>
            );
          }}
        </form.Field>

        <div className="grid gap-3 sm:grid-cols-4">
          <AdminQuestionVariantSelectField
            form={form}
            name={`variants[${index}].screen` as const}
            label="screen"
            options={adminQuestionScreenSchema.options}
            disabled={disabled}
          />
          <AdminQuestionVariantUiSectionField
            form={form}
            index={index}
            sortRows={sortRows}
            disabled={disabled}
          />
          <form.Field name={`variants[${index}].category` as const}>
            {(field) => {
              const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid;

              return (
                <Field data-invalid={isInvalid}>
                  <FieldLabel htmlFor={field.name}>category</FieldLabel>
                  <Select
                    name={field.name}
                    value={field.state.value ?? ALL_CATEGORY_VALUE}
                    onValueChange={(value) => {
                      field.handleChange(
                        value === ALL_CATEGORY_VALUE
                          ? null
                          : adminQuestionCategorySchema.parse(value),
                      );
                    }}
                  >
                    <SelectTrigger
                      id={field.name}
                      aria-invalid={isInvalid}
                      disabled={disabled}
                      className="w-full"
                    >
                      <SelectValue placeholder="category" />
                    </SelectTrigger>
                    <SelectContent align="start" alignItemWithTrigger={false}>
                      <SelectItem value={ALL_CATEGORY_VALUE}>All</SelectItem>
                      {adminQuestionCategorySchema.options.map((category) => (
                        <SelectItem key={category} value={category}>
                          {category}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {isInvalid && <FieldError errors={field.state.meta.errors} />}
                </Field>
              );
            }}
          </form.Field>
          <AdminQuestionVariantSortPositionField
            form={form}
            index={index}
            sortRows={sortRows}
            disabled={disabled}
          />
        </div>

        <form.Field name={`variants[${index}].status` as const}>
          {(field) => {
            const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid;

            return (
              <Field orientation="responsive" data-invalid={isInvalid}>
                <FieldContent>
                  <FieldLabel htmlFor={field.name}>status</FieldLabel>
                  {isInvalid && <FieldError errors={field.state.meta.errors} />}
                </FieldContent>
                <div className="flex items-center gap-2">
                  <Switch
                    id={field.name}
                    checked={field.state.value === 'active'}
                    onBlur={field.handleBlur}
                    onCheckedChange={(checked) =>
                      field.handleChange(checked ? 'active' : 'inactive')
                    }
                    disabled={disabled}
                    aria-invalid={isInvalid}
                  />
                  <span className="text-sm text-muted-foreground">{field.state.value}</span>
                </div>
              </Field>
            );
          }}
        </form.Field>

        <AdminQuestionVariantAnswersField form={form} variantIndex={index} disabled={disabled} />
        <AdminQuestionVisibilityConditionsField
          form={form}
          variantIndex={index}
          questionOptions={questionOptions}
          questionMap={questionMap}
          questionSearchError={questionSearchError}
          disabled={disabled}
        />
      </CardContent>
    </Card>
  );
}

function AdminQuestionVariantSelectField({
  form,
  name,
  label,
  options,
  disabled,
}: {
  form: AdminQuestionDialogFormApi;
  name: `variants[${number}].screen` | `variants[${number}].uiSection`;
  label: string;
  options: readonly string[];
  disabled: boolean;
}) {
  return (
    <form.Field name={name}>
      {(field) => {
        const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid;

        return (
          <Field data-invalid={isInvalid}>
            <FieldLabel htmlFor={field.name}>{label}</FieldLabel>
            <Select
              name={field.name}
              value={field.state.value}
              onValueChange={(value) => {
                if (value) {
                  field.handleChange(value);
                }
              }}
            >
              <SelectTrigger
                id={field.name}
                aria-invalid={isInvalid}
                disabled={disabled}
                className="w-full"
              >
                <SelectValue placeholder={label} />
              </SelectTrigger>
              <SelectContent align="start" alignItemWithTrigger={false}>
                {options.map((option) => (
                  <SelectItem key={option} value={option}>
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {isInvalid && <FieldError errors={field.state.meta.errors} />}
          </Field>
        );
      }}
    </form.Field>
  );
}

function AdminQuestionVariantUiSectionField({
  form,
  index,
  sortRows,
  disabled,
}: {
  form: AdminQuestionDialogFormApi;
  index: number;
  sortRows: AdminQuestionTableRow[];
  disabled: boolean;
}) {
  return (
    <form.Field name={`variants[${index}].uiSection` as const}>
      {(field) => {
        const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid;

        return (
          <Field data-invalid={isInvalid}>
            <FieldLabel htmlFor={field.name}>uiSection</FieldLabel>
            <Select
              name={field.name}
              value={field.state.value}
              onValueChange={(value) => {
                if (!value) {
                  return;
                }

                const nextUiSection = adminQuestionUiSectionSchema.parse(value);
                const currentVariantId = form.state.values.variants[index]?.id;

                field.handleChange(nextUiSection);
                form.setFieldValue(
                  `variants[${index}].sortAfterQuestionVariantId` as const,
                  getLastQuestionVariantIdByUiSection(sortRows, nextUiSection, currentVariantId),
                );
              }}
            >
              <SelectTrigger
                id={field.name}
                aria-invalid={isInvalid}
                disabled={disabled}
                className="w-full"
              >
                <SelectValue placeholder="uiSection" />
              </SelectTrigger>
              <SelectContent align="start" alignItemWithTrigger={false}>
                {adminQuestionUiSectionSchema.options.map((option) => (
                  <SelectItem key={option} value={option}>
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {isInvalid && <FieldError errors={field.state.meta.errors} />}
          </Field>
        );
      }}
    </form.Field>
  );
}

function AdminQuestionVariantSortPositionField({
  form,
  index,
  sortRows,
  disabled,
}: {
  form: AdminQuestionDialogFormApi;
  index: number;
  sortRows: AdminQuestionTableRow[];
  disabled: boolean;
}) {
  return (
    <form.Field name={`variants[${index}].sortAfterQuestionVariantId` as const}>
      {(field) => {
        const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid;

        return (
          <form.Field name={`variants[${index}].uiSection` as const}>
            {(uiSectionField) => {
              const currentVariantId = form.state.values.variants[index]?.id;
              const sectionRows = sortRows.filter(
                (row) => row.uiSection === uiSectionField.state.value,
              );
              const positionRows = sectionRows.filter(
                (row) => row.questionVariantId !== currentVariantId,
              );
              const effectiveSortAfterQuestionVariantId =
                field.state.value === undefined
                  ? getCurrentSortAfterQuestionVariantId(sectionRows, currentVariantId)
                  : field.state.value;
              const selectedValue = effectiveSortAfterQuestionVariantId ?? SORT_POSITION_TOP_VALUE;
              const firstPositionRow = positionRows[0];

              return (
                <Field data-invalid={isInvalid}>
                  <FieldLabel htmlFor={field.name}>position</FieldLabel>
                  <Select
                    name={field.name}
                    value={selectedValue}
                    onValueChange={(value) => {
                      if (!value) {
                        return;
                      }

                      field.handleChange(value === SORT_POSITION_TOP_VALUE ? null : value);
                    }}
                  >
                    <SelectTrigger
                      id={field.name}
                      aria-invalid={isInvalid}
                      disabled={disabled}
                      className="w-full"
                    >
                      <SelectValue placeholder="position" />
                    </SelectTrigger>
                    <SelectContent
                      align="start"
                      alignItemWithTrigger={false}
                      className="min-w-[min(720px,calc(100vw-3rem))]"
                    >
                      {firstPositionRow ? (
                        <SelectItem value={SORT_POSITION_TOP_VALUE}>
                          {getQuestionVariantLabel(firstPositionRow)} 위
                        </SelectItem>
                      ) : null}
                      {positionRows.slice(1).map((row, rowIndex) => {
                        const previousRow = positionRows[rowIndex];

                        if (!previousRow) {
                          return null;
                        }

                        return (
                          <SelectItem
                            key={row.questionVariantId}
                            value={previousRow.questionVariantId}
                          >
                            {getQuestionVariantLabel(row)} 위
                          </SelectItem>
                        );
                      })}
                      <SelectItem
                        value={positionRows.at(-1)?.questionVariantId ?? SORT_POSITION_TOP_VALUE}
                      >
                        맨 아래
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  {isInvalid && <FieldError errors={field.state.meta.errors} />}
                </Field>
              );
            }}
          </form.Field>
        );
      }}
    </form.Field>
  );
}

function AdminQuestionVariantAnswersField({
  form,
  variantIndex,
  disabled,
}: {
  form: AdminQuestionDialogFormApi;
  variantIndex: number;
  disabled: boolean;
}) {
  return (
    <form.Field name={`variants[${variantIndex}].answers` as const} mode="array">
      {(field) => {
        const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid;

        return (
          <Field data-invalid={isInvalid}>
            <FieldLabel htmlFor={field.name}>answers</FieldLabel>
            {isInvalid && <FieldError errors={field.state.meta.errors} />}
            <div className="grid gap-2 sm:grid-cols-2">
              {field.state.value.map((_, answerIndex) => (
                <form.Field
                  key={answerIndex}
                  name={`variants[${variantIndex}].answers[${answerIndex}]` as const}
                >
                  {(answerField) => {
                    const answerInvalid =
                      answerField.state.meta.isTouched && !answerField.state.meta.isValid;

                    return (
                      <Field data-invalid={answerInvalid}>
                        <FieldLabel htmlFor={answerField.name}>answer {answerIndex + 1}</FieldLabel>
                        <Input
                          id={answerField.name}
                          name={answerField.name}
                          value={answerField.state.value}
                          onBlur={answerField.handleBlur}
                          onChange={(event) => answerField.handleChange(event.target.value)}
                          disabled={disabled}
                          aria-invalid={answerInvalid}
                        />
                        {answerInvalid && <FieldError errors={answerField.state.meta.errors} />}
                      </Field>
                    );
                  }}
                </form.Field>
              ))}
            </div>
          </Field>
        );
      }}
    </form.Field>
  );
}

function AdminQuestionVisibilityConditionsField({
  form,
  variantIndex,
  questionOptions,
  questionMap,
  questionSearchError,
  disabled,
}: {
  form: AdminQuestionDialogFormApi;
  variantIndex: number;
  questionOptions: AdminRuleQuestionSearchItem[];
  questionMap: Map<string, AdminRuleQuestionSearchItem>;
  questionSearchError: Error | null;
  disabled: boolean;
}) {
  return (
    <form.Field name={`variants[${variantIndex}].visibilityConditions` as const} mode="array">
      {(field) => {
        const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid;

        return (
          <Field data-invalid={isInvalid}>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <FieldLabel htmlFor={field.name}>visibilityConditions</FieldLabel>
              <Button
                type="button"
                variant="outline"
                onClick={() => field.pushValue(createEmptyVisibilityCondition())}
                disabled={disabled}
              >
                <PlusIcon />
                조건 추가
              </Button>
            </div>
            {isInvalid && <FieldError errors={field.state.meta.errors} />}
            {questionSearchError ? (
              <p className="text-sm text-destructive">
                {isUnauthorizedError(questionSearchError)
                  ? '로그인한 사용자만 확인할 수 있습니다.'
                  : questionSearchError.message}
              </p>
            ) : null}
            {field.state.value.length > 0 ? (
              <div className="grid gap-3">
                {field.state.value.map((_, conditionIndex) => (
                  <AdminQuestionVisibilityConditionRow
                    key={conditionIndex}
                    form={form}
                    variantIndex={variantIndex}
                    conditionIndex={conditionIndex}
                    questionOptions={questionOptions}
                    questionMap={questionMap}
                    onRemove={() => field.removeValue(conditionIndex)}
                    disabled={disabled}
                  />
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">추가 visibility condition이 없습니다.</p>
            )}
          </Field>
        );
      }}
    </form.Field>
  );
}

function AdminQuestionVisibilityConditionRow({
  form,
  variantIndex,
  conditionIndex,
  questionOptions,
  questionMap,
  onRemove,
  disabled,
}: {
  form: AdminQuestionDialogFormApi;
  variantIndex: number;
  conditionIndex: number;
  questionOptions: AdminRuleQuestionSearchItem[];
  questionMap: Map<string, AdminRuleQuestionSearchItem>;
  onRemove: () => void;
  disabled: boolean;
}) {
  return (
    <div className="grid gap-3 rounded-lg border border-border p-3 sm:grid-cols-[minmax(0,1fr)_120px_120px_180px_auto]">
      <form.Field
        name={
          `variants[${variantIndex}].visibilityConditions[${conditionIndex}].questionId` as const
        }
      >
        {(field) => {
          const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid;

          return (
            <Field data-invalid={isInvalid}>
              <FieldLabel htmlFor={field.name}>questionId</FieldLabel>
              <Select
                name={field.name}
                value={field.state.value}
                onValueChange={(value) => {
                  const selectedQuestion = value ? questionMap.get(value) : undefined;
                  const firstValue = selectedQuestion?.answerValues[0] ?? 0;

                  field.handleChange(value ?? '');
                  form.setFieldValue(
                    `variants[${variantIndex}].visibilityConditions[${conditionIndex}].value` as const,
                    firstValue,
                  );
                }}
              >
                <SelectTrigger
                  id={field.name}
                  aria-invalid={isInvalid}
                  disabled={disabled}
                  className="w-full"
                >
                  <SelectValue placeholder="questionId">
                    {(value: string | null) => {
                      const question = value ? questionMap.get(value) : undefined;

                      return question ? getQuestionLabel(question) : '질문 선택';
                    }}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent
                  align="start"
                  alignItemWithTrigger={false}
                  className="min-w-[min(720px,calc(100vw-3rem))]"
                >
                  {questionOptions.map((question) => (
                    <SelectItem key={question.questionId} value={question.questionId}>
                      {getQuestionLabel(question)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {isInvalid && <FieldError errors={field.state.meta.errors} />}
            </Field>
          );
        }}
      </form.Field>

      <form.Field
        name={`variants[${variantIndex}].visibilityConditions[${conditionIndex}].operator` as const}
      >
        {(field) => {
          const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid;

          return (
            <Field data-invalid={isInvalid}>
              <FieldLabel htmlFor={field.name}>operator</FieldLabel>
              <Select
                name={field.name}
                value={field.state.value}
                onValueChange={(value) => {
                  if (value) {
                    field.handleChange(value);
                  }
                }}
              >
                <SelectTrigger
                  id={field.name}
                  aria-invalid={isInvalid}
                  disabled={disabled}
                  className="w-full"
                >
                  <SelectValue placeholder="operator" />
                </SelectTrigger>
                <SelectContent align="start" alignItemWithTrigger={false}>
                  {adminRuleConditionOperatorSchema.options.map((operator) => (
                    <SelectItem key={operator} value={operator}>
                      {operator}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {isInvalid && <FieldError errors={field.state.meta.errors} />}
            </Field>
          );
        }}
      </form.Field>

      <form.Field
        name={`variants[${variantIndex}].visibilityConditions[${conditionIndex}].state` as const}
      >
        {(field) => {
          const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid;

          return (
            <Field data-invalid={isInvalid}>
              <FieldLabel htmlFor={field.name}>state</FieldLabel>
              <Select
                name={field.name}
                value={field.state.value}
                onValueChange={(value) => {
                  if (value) {
                    field.handleChange(value);
                  }
                }}
              >
                <SelectTrigger
                  id={field.name}
                  aria-invalid={isInvalid}
                  disabled={disabled}
                  className="w-full"
                >
                  <SelectValue placeholder="state" />
                </SelectTrigger>
                <SelectContent align="start" alignItemWithTrigger={false}>
                  {adminRuleConditionStateSchema.options.map((state) => (
                    <SelectItem key={state} value={state}>
                      {state}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {isInvalid && <FieldError errors={field.state.meta.errors} />}
            </Field>
          );
        }}
      </form.Field>

      <form.Field
        name={`variants[${variantIndex}].visibilityConditions[${conditionIndex}].value` as const}
      >
        {(field) => {
          const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid;

          return (
            <form.Field
              name={
                `variants[${variantIndex}].visibilityConditions[${conditionIndex}].questionId` as const
              }
            >
              {(questionField) => {
                const selectedQuestion = questionMap.get(questionField.state.value);
                const answerOptions = getAnswerOptions(selectedQuestion);

                return (
                  <Field data-invalid={isInvalid}>
                    <FieldLabel htmlFor={field.name}>value</FieldLabel>
                    <Select
                      name={field.name}
                      value={String(field.state.value)}
                      onValueChange={(value) => {
                        if (!value) {
                          return;
                        }

                        field.handleChange(Number.parseInt(value, 10));
                      }}
                    >
                      <SelectTrigger
                        id={field.name}
                        aria-invalid={isInvalid}
                        disabled={disabled || answerOptions.length === 0}
                        className="w-full"
                      >
                        <SelectValue placeholder="value" />
                      </SelectTrigger>
                      <SelectContent align="start" alignItemWithTrigger={false}>
                        {answerOptions.map((answer) => (
                          <SelectItem key={answer.value} value={String(answer.value)}>
                            {answer.label} · {answer.value}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {isInvalid && <FieldError errors={field.state.meta.errors} />}
                  </Field>
                );
              }}
            </form.Field>
          );
        }}
      </form.Field>

      <div className="flex items-end">
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          onClick={onRemove}
          disabled={disabled}
          aria-label="visibility condition 삭제"
        >
          <Trash2Icon />
        </Button>
      </div>
    </div>
  );
}
