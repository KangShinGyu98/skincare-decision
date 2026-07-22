'use client';

import { ErrorPanel } from '@/components/common/ErrorPanel';
import { CardSkeleton } from '@/components/common/skeleton/CardSkeleton';
import { Button } from '@/components/shadcn/button';
import { Card, CardAction, CardContent, CardHeader, CardTitle } from '@/components/shadcn/card';
import { Checkbox } from '@/components/shadcn/checkbox';
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
import { Separator } from '@/components/shadcn/seperator';
import { Spinner } from '@/components/shadcn/spinner';
import { Switch } from '@/components/shadcn/switch';
import { Textarea } from '@/components/shadcn/textarea';
import { isUnauthorizedError } from '@/lib/api';
import {
  useAdminRuleDialogActions,
  useAdminRuleDetail,
  useAdminRuleQuestionSearch,
} from '@/lib/hooks';
import { useForm } from '@tanstack/react-form';
import {
  adminRuleConditionOperatorSchema,
  adminRuleConditionStateSchema,
  adminRuleCtaTargetOptions,
  adminRuleCtaTargetValues,
  type AdminRuleDetail,
  type AdminRuleQuestionSearchItem,
  type CreateAdminRuleBody,
  createAdminRuleBodySchema,
  priorityGateResultTypeSchema,
} from '@skincare-decision/shared/schemas';
import { PlusIcon, Trash2Icon } from 'lucide-react';
import { useMemo } from 'react';

// 생성 요청일 때 만들 빈 form 초기값
export const EMPTY_ADMIN_RULE_DIALOG_FORM_VALUES = {
  name: '',
  conditions: [],
  resultType: 'HOLD',
  resultTitle: '',
  resultDescription: '',
  ctaLabel: '',
  ctaTarget: '',
  adminNote: '',
  status: 'active',
} satisfies CreateAdminRuleBody;

function createEmptyAdminRuleCondition(): CreateAdminRuleBody['conditions'][number] {
  return {
    questionId: '',
    operator: 'EQ',
    state: 'REQUIRED',
    value: [],
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

function allowsMultipleValues(
  operator: CreateAdminRuleBody['conditions'][number]['operator'],
): boolean {
  return operator === 'IN' || operator === 'CONTAINS';
}

function getCtaTargetLabel(value: CreateAdminRuleBody['ctaTarget']) {
  return adminRuleCtaTargetOptions.find((target) => target.value === value)?.label ?? '선택 안 함';
}

function useAdminRuleDialogForm(
  initialValues: CreateAdminRuleBody,
  onSubmit: (values: CreateAdminRuleBody) => void,
) {
  return useForm({
    defaultValues: initialValues,
    validators: {
      onSubmit: createAdminRuleBodySchema,
      onBlur: createAdminRuleBodySchema,
    },
    onSubmit: ({ value }) => onSubmit(value),
  });
}

type AdminRuleDialogFormApi = ReturnType<typeof useAdminRuleDialogForm>;

//수정 요청일 때 초깃값 설정
export function toModifyAdminRuleBody(detail: AdminRuleDetail): CreateAdminRuleBody {
  return {
    name: detail.name,
    conditions: detail.conditions.map((condition) => ({
      questionId: condition.questionId,
      operator: condition.operator,
      state: condition.state,
      value: condition.value,
    })),
    resultType: detail.resultType,
    resultTitle: detail.resultTitle,
    resultDescription: detail.resultDescription,
    ctaLabel: detail.ctaLabel ?? '',
    ctaTarget: isCtaTargetValue(detail.ctaTarget) ? detail.ctaTarget : '',
    adminNote: detail.adminNote ?? '',
    status: detail.status,
  };
}
//초깃값 설정 헬퍼
function isCtaTargetValue(
  value: string | null,
): value is (typeof adminRuleCtaTargetValues)[number] {
  return adminRuleCtaTargetValues.some((target) => target === value);
}

//Props
type AdminRuleDialogFormProps = {
  ruleId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function AdminRuleDialogForm({ ruleId, open, onOpenChange }: AdminRuleDialogFormProps) {
  const isCreateMode = ruleId === null;
  const ruleDetailQuery = useAdminRuleDetail(open && ruleId ? ruleId : null);
  const {
    deleteRule,
    error: mutationError,
    isPending: isMutationPending,
    reset: resetMutation,
    submitRule,
  } = useAdminRuleDialogActions({
    ruleId,
    onSuccess: () => onOpenChange(false),
  });
  const initialValues = useMemo(() => {
    if (isCreateMode) {
      return EMPTY_ADMIN_RULE_DIALOG_FORM_VALUES;
    }

    if (!ruleDetailQuery.data) {
      return null;
    }

    return toModifyAdminRuleBody(ruleDetailQuery.data);
  }, [isCreateMode, ruleDetailQuery.data]);

  let dialogBody = null;

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      resetMutation();
    }

    onOpenChange(nextOpen);
  };

  const handleSubmit = (values: CreateAdminRuleBody) => {
    const payload = createAdminRuleBodySchema.parse(values);

    submitRule(payload);
  };

  const handleDelete = () => {
    if (!ruleId || isMutationPending) {
      return;
    }

    if (!window.confirm('이 룰을 삭제할까요?')) {
      return;
    }

    deleteRule();
  };

  if (!isCreateMode && ruleDetailQuery.isError) {
    dialogBody = (
      <ErrorPanel
        message={
          isUnauthorizedError(ruleDetailQuery.error)
            ? '로그인한 사용자만 확인할 수 있습니다.'
            : ruleDetailQuery.error instanceof Error
              ? ruleDetailQuery.error.message
              : 'Rule 상세 정보를 불러오지 못했습니다.'
        }
      />
    );
  } else if (!isCreateMode && ruleDetailQuery.isLoading) {
    dialogBody = <CardSkeleton />;
  } else if (initialValues) {
    dialogBody = (
      <AdminRuleDialogFormContent
        key={isCreateMode ? 'create' : ruleDetailQuery.data?.id}
        initialValues={initialValues}
        isCreateMode={isCreateMode}
        isOpen={open}
        isMutationPending={isMutationPending}
        mutationError={mutationError}
        onCancel={() => handleOpenChange(false)}
        onDelete={handleDelete}
        onSubmit={handleSubmit}
      />
    );
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        className="max-h-[92vh] w-[720px] max-w-[720px] overflow-hidden sm:max-w-[720px]"
        aria-busy={(!isCreateMode && ruleDetailQuery.isLoading) || ruleDetailQuery.isFetching}
      >
        <DialogHeader>
          <DialogTitle>룰 작성</DialogTitle>
        </DialogHeader>
        <Separator className="my-2" />

        {dialogBody}
      </DialogContent>
    </Dialog>
  );
}

type AdminRuleDialogFormContentProps = {
  initialValues: CreateAdminRuleBody;
  isCreateMode: boolean;
  isOpen: boolean;
  isMutationPending: boolean;
  mutationError: Error | null;
  onCancel: () => void;
  onDelete: () => void;
  onSubmit: (values: CreateAdminRuleBody) => void;
};

function AdminRuleDialogFormContent({
  initialValues,
  isCreateMode,
  isOpen,
  isMutationPending,
  mutationError,
  onCancel,
  onDelete,
  onSubmit,
}: AdminRuleDialogFormContentProps) {
  const questionSearchQuery = useAdminRuleQuestionSearch({
    limit: 50,
    enabled: isOpen,
  });
  const questionOptions = useMemo(() => {
    return [...(questionSearchQuery.data?.items ?? [])].sort((first, second) =>
      first.questionKey.localeCompare(second.questionKey),
    );
  }, [questionSearchQuery.data]);
  const questionMap = useMemo(
    () =>
      new Map(
        (questionSearchQuery.data?.items ?? []).map((question) => [question.questionId, question]),
      ),
    [questionSearchQuery.data],
  );

  const form = useAdminRuleDialogForm(initialValues, onSubmit);
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
        <form.Field name="name">
          {(field) => {
            const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid;

            return (
              <Field data-invalid={isInvalid}>
                <FieldLabel htmlFor={field.name}>name</FieldLabel>
                <Input
                  id={field.name}
                  name={field.name}
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(e.target.value)}
                  disabled={isFormDisabled}
                  aria-invalid={isInvalid}
                />
                {isInvalid && <FieldError errors={field.state.meta.errors} />}
              </Field>
            );
          }}
        </form.Field>
        <AdminRuleConditionsField
          form={form}
          questionOptions={questionOptions}
          questionMap={questionMap}
          questionSearchError={questionSearchQuery.error}
          disabled={isFormDisabled}
        />
        <Separator className="my-2" />
        <form.Field name="resultType">
          {(field) => {
            const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid;

            return (
              <Field orientation="responsive" data-invalid={isInvalid}>
                <FieldContent>
                  <FieldLabel htmlFor={field.name}>resultType</FieldLabel>
                  {isInvalid && <FieldError errors={field.state.meta.errors} />}
                </FieldContent>
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
                    className="min-w-[280px]"
                  >
                    <SelectValue placeholder="resultType" />
                  </SelectTrigger>
                  <SelectContent align="start" alignItemWithTrigger={false}>
                    {priorityGateResultTypeSchema.options.map((resultType) => (
                      <SelectItem key={resultType} value={resultType}>
                        {resultType}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
            );
          }}
        </form.Field>
        <form.Field name="resultTitle">
          {(field) => {
            const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid;

            return (
              <Field data-invalid={isInvalid}>
                <FieldLabel htmlFor={field.name}>resultTitle</FieldLabel>
                <Input
                  id={field.name}
                  name={field.name}
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(e.target.value)}
                  disabled={isFormDisabled}
                  aria-invalid={isInvalid}
                />
                {isInvalid && <FieldError errors={field.state.meta.errors} />}
              </Field>
            );
          }}
        </form.Field>
        <form.Field name="resultDescription">
          {(field) => {
            const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid;

            return (
              <Field data-invalid={isInvalid}>
                <FieldLabel htmlFor={field.name}>resultDescription</FieldLabel>
                <Textarea
                  id={field.name}
                  name={field.name}
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(e.target.value)}
                  disabled={isFormDisabled}
                  aria-invalid={isInvalid}
                />
                {isInvalid && <FieldError errors={field.state.meta.errors} />}
              </Field>
            );
          }}
        </form.Field>
        <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_minmax(280px,1fr)]">
          <form.Field name="ctaLabel">
            {(field) => {
              const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid;

              return (
                <Field data-invalid={isInvalid}>
                  <FieldLabel htmlFor={field.name}>ctaLabel</FieldLabel>
                  <Input
                    id={field.name}
                    name={field.name}
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={(e) => field.handleChange(e.target.value)}
                    disabled={isFormDisabled}
                    aria-invalid={isInvalid}
                  />
                  {isInvalid && <FieldError errors={field.state.meta.errors} />}
                </Field>
              );
            }}
          </form.Field>
          <form.Field name="ctaTarget">
            {(field) => {
              const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid;

              return (
                <Field data-invalid={isInvalid}>
                  <FieldLabel htmlFor={field.name}>ctaTarget</FieldLabel>
                  <Select
                    name={field.name}
                    value={field.state.value}
                    onValueChange={(value) => field.handleChange(value ?? '')}
                  >
                    <SelectTrigger
                      id={field.name}
                      aria-invalid={isInvalid}
                      disabled={isFormDisabled}
                      className="w-full"
                    >
                      <span className="flex min-w-0 flex-1 text-left">
                        {getCtaTargetLabel(field.state.value)}
                      </span>
                    </SelectTrigger>
                    <SelectContent align="start" alignItemWithTrigger={false}>
                      {adminRuleCtaTargetOptions.map((target) => (
                        <SelectItem key={target.value || 'empty'} value={target.value}>
                          {target.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {isInvalid && <FieldError errors={field.state.meta.errors} />}
                </Field>
              );
            }}
          </form.Field>
        </div>
        <Separator className="my-2" />
        <form.Field name="adminNote">
          {(field) => {
            const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid;

            return (
              <Field data-invalid={isInvalid}>
                <FieldLabel htmlFor={field.name}>adminNote</FieldLabel>
                <Textarea
                  id={field.name}
                  name={field.name}
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(e.target.value)}
                  disabled={isFormDisabled}
                  aria-invalid={isInvalid}
                />
                {isInvalid && <FieldError errors={field.state.meta.errors} />}
              </Field>
            );
          }}
        </form.Field>
        <Separator className="my-2" />
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
        {mutationError ? <p className="text-sm text-destructive">{mutationError.message}</p> : null}
      </div>
      <DialogFooter className="justify-between gap-2 sm:justify-between">
        <div>
          {!isCreateMode ? (
            <Button
              type="button"
              variant="destructive"
              onClick={onDelete}
              disabled={isMutationPending}
            >
              {isMutationPending ? <Spinner /> : <Trash2Icon />}
              삭제
            </Button>
          ) : null}
        </div>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onCancel} disabled={isMutationPending}>
            취소
          </Button>
          <Button type="submit" disabled={isMutationPending}>
            {isMutationPending ? <Spinner /> : null}
            저장
          </Button>
        </div>
      </DialogFooter>
    </form>
  );
}

type AdminRuleConditionsFieldProps = {
  form: AdminRuleDialogFormApi;
  questionOptions: AdminRuleQuestionSearchItem[];
  questionMap: Map<string, AdminRuleQuestionSearchItem>;
  questionSearchError: Error | null;
  disabled: boolean;
};

//array 를 감싸는 필드
function AdminRuleConditionsField({
  form,
  questionOptions,
  questionMap,
  questionSearchError,
  disabled,
}: AdminRuleConditionsFieldProps) {
  return (
    <form.Field name="conditions" mode="array">
      {(field) => {
        const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid;

        return (
          <Field data-invalid={isInvalid}>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <FieldLabel htmlFor={field.name}>conditions</FieldLabel>
              <Button
                type="button"
                variant="outline"
                onClick={() => field.pushValue(createEmptyAdminRuleCondition())}
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
                {field.state.value.map((_, index) => (
                  <AdminRuleConditionCard
                    key={index}
                    form={form}
                    index={index}
                    questionOptions={questionOptions}
                    questionMap={questionMap}
                    onRemove={() => field.removeValue(index)}
                    disabled={disabled}
                  />
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                조건을 추가해야 룰을 저장할 수 있습니다.
              </p>
            )}
          </Field>
        );
      }}
    </form.Field>
  );
}

type AdminRuleConditionCardProps = {
  form: AdminRuleDialogFormApi;
  index: number;
  questionOptions: AdminRuleQuestionSearchItem[];
  questionMap: Map<string, AdminRuleQuestionSearchItem>;
  onRemove: () => void;
  disabled: boolean;
};

//array 내부에
function AdminRuleConditionCard({
  form,
  index,
  questionOptions,
  questionMap,
  onRemove,
  disabled,
}: AdminRuleConditionCardProps) {
  return (
    <Card size="sm">
      <CardHeader>
        <CardTitle>조건 {index + 1}</CardTitle>
        <CardAction>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={onRemove}
            disabled={disabled}
            aria-label="조건 삭제"
          >
            <Trash2Icon />
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent className="grid min-w-0 gap-4">
        <form.Field name={`conditions[${index}].questionId` as const}>
          {(questionField) => {
            const questionFieldInvalid =
              questionField.state.meta.isTouched && !questionField.state.meta.isValid;

            return (
              <Field data-invalid={questionFieldInvalid}>
                <FieldLabel htmlFor={questionField.name}>questionId</FieldLabel>
                <Select
                  name={questionField.name}
                  value={questionField.state.value}
                  onValueChange={(value) => {
                    questionField.handleChange(value ?? '');
                    form.setFieldValue(`conditions[${index}].value` as const, []);
                  }}
                >
                  <SelectTrigger
                    id={questionField.name}
                    aria-invalid={questionFieldInvalid}
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
                {questionFieldInvalid && <FieldError errors={questionField.state.meta.errors} />}
              </Field>
            );
          }}
        </form.Field>

        <div className="grid min-w-0 gap-3 sm:grid-cols-2">
          <form.Field name={`conditions[${index}].operator` as const}>
            {(operatorField) => {
              const operatorFieldInvalid =
                operatorField.state.meta.isTouched && !operatorField.state.meta.isValid;

              return (
                <Field data-invalid={operatorFieldInvalid}>
                  <FieldLabel htmlFor={operatorField.name}>operator</FieldLabel>
                  <Select
                    name={operatorField.name}
                    value={operatorField.state.value}
                    onValueChange={(value) => {
                      if (!value) {
                        return;
                      }

                      operatorField.handleChange(value);

                      if (!allowsMultipleValues(value)) {
                        form.setFieldValue(`conditions[${index}].value` as const, (previousValue) =>
                          previousValue.slice(0, 1),
                        );
                      }
                    }}
                  >
                    <SelectTrigger
                      id={operatorField.name}
                      aria-invalid={operatorFieldInvalid}
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
                  {operatorFieldInvalid && <FieldError errors={operatorField.state.meta.errors} />}
                </Field>
              );
            }}
          </form.Field>

          <form.Field name={`conditions[${index}].state` as const}>
            {(stateField) => {
              const stateFieldInvalid =
                stateField.state.meta.isTouched && !stateField.state.meta.isValid;

              return (
                <Field data-invalid={stateFieldInvalid}>
                  <FieldLabel htmlFor={stateField.name}>state</FieldLabel>
                  <Select
                    name={stateField.name}
                    value={stateField.state.value}
                    onValueChange={(value) => {
                      if (value) {
                        stateField.handleChange(value);
                      }
                    }}
                  >
                    <SelectTrigger
                      id={stateField.name}
                      aria-invalid={stateFieldInvalid}
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
                  {stateFieldInvalid && <FieldError errors={stateField.state.meta.errors} />}
                </Field>
              );
            }}
          </form.Field>
        </div>

        <form.Subscribe
          selector={(state) => {
            const conditionValue = state.values.conditions[index];

            return {
              operator: conditionValue?.operator ?? 'EQ',
              questionId: conditionValue?.questionId ?? '',
            };
          }}
        >
          {({ operator, questionId }) => {
            const selectedQuestion = questionMap.get(questionId);
            const answerOptions = getAnswerOptions(selectedQuestion);

            return (
              <form.Field name={`conditions[${index}].value` as const}>
                {(valueField) => {
                  const valueFieldInvalid =
                    valueField.state.meta.isTouched && !valueField.state.meta.isValid;

                  return (
                    <Field data-invalid={valueFieldInvalid}>
                      <FieldLabel>value</FieldLabel>
                      {questionId.length === 0 ? (
                        <p className="text-sm text-muted-foreground">질문을 먼저 선택해 주세요.</p>
                      ) : answerOptions.length > 0 ? (
                        <div className="flex flex-wrap gap-2">
                          {answerOptions.map((answer) => (
                            <label
                              key={answer.value}
                              className="flex min-h-8 items-center gap-2 rounded-lg border border-border bg-background px-3 text-sm"
                            >
                              <Checkbox
                                checked={valueField.state.value.includes(answer.value)}
                                disabled={disabled}
                                onCheckedChange={(checked) => {
                                  if (checked !== true) {
                                    valueField.handleChange(
                                      valueField.state.value.filter(
                                        (value) => value !== answer.value,
                                      ),
                                    );
                                    return;
                                  }

                                  if (!allowsMultipleValues(operator)) {
                                    valueField.handleChange([answer.value]);
                                    return;
                                  }

                                  valueField.handleChange([
                                    ...new Set([...valueField.state.value, answer.value]),
                                  ]);
                                }}
                              />
                              <span>{answer.label}</span>
                            </label>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground">
                          선택 가능한 답변 값이 없습니다.
                        </p>
                      )}
                      {valueFieldInvalid && <FieldError errors={valueField.state.meta.errors} />}
                    </Field>
                  );
                }}
              </form.Field>
            );
          }}
        </form.Subscribe>
      </CardContent>
    </Card>
  );
}
