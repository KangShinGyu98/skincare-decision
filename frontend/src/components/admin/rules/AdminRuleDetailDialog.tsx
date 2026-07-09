'use client';

import type {
  AdminRuleConditionOperator,
  AdminRuleConditionState,
  AdminRuleDetail,
  AdminRuleQuestionSearchItem,
  AdminRuleStatus,
  CreateAdminRuleBody,
} from '@skincare-decision/shared/schemas';
import { adminRuleCtaTargetSchema } from '@skincare-decision/shared/schemas';
import { PlusIcon, Trash2Icon } from 'lucide-react';
import { type SetStateAction, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/shadcn/button';
import { Card, CardAction, CardContent, CardHeader, CardTitle } from '@/components/shadcn/card';
import { Checkbox } from '@/components/shadcn/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/shadcn/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/shadcn/select';
import { Skeleton } from '@/components/shadcn/skeleton';
import { Spinner } from '@/components/shadcn/spinner';
import { Switch } from '@/components/shadcn/switch';
import { Textarea } from '@/components/shadcn/textarea';
import {
  useAdminRuleDetail,
  useAdminRuleQuestionSearch,
  useCreateAdminRule,
  useDeleteAdminRule,
  useUpdateAdminRule,
} from '@/lib/hooks';

type AdminRuleDetailDialogProps = {
  ruleId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

type ResultType = CreateAdminRuleBody['resultType'];

type RuleConditionDraft = {
  localId: string;
  questionId: string;
  operator: AdminRuleConditionOperator;
  value: number[];
  state: AdminRuleConditionState;
};

type RuleFormState = {
  name: string;
  status: AdminRuleStatus;
  conditions: RuleConditionDraft[];
  resultType: ResultType;
  resultTitle: string;
  resultDescription: string;
  ctaLabel: string;
  ctaTarget: string;
  adminNote: string;
};

const RESULT_TYPE_OPTIONS = ['STOP', 'HOLD', 'CAUTION', 'PASS', 'ROUTE_CATEGORY'] as const;
const CONDITION_OPERATOR_OPTIONS = ['EQ', 'IN', 'CONTAINS', 'GTE', 'LTE', 'NEQ'] as const;
const CONDITION_STATE_OPTIONS = ['REQUIRED', 'EXCLUDED'] as const;
const CTA_TARGET_EMPTY_VALUE = '__empty_cta_target__';
const CTA_TARGET_OPTIONS = [
  {
    label: '루틴 점검',
    value: '/priority-gate',
  },
  {
    label: '구매 체크리스트 - 토너',
    value: '/category-decision?category=toner',
  },
  {
    label: '구매 체크리스트 - 선크림',
    value: '/category-decision?category=sunscreen',
  },
  {
    label: '구매 체크리스트 - 세럼',
    value: '/category-decision?category=serum',
  },
  {
    label: '구매 체크리스트 - 립케어',
    value: '/category-decision?category=lipcare',
  },
  {
    label: '구매 체크리스트 - 로션 / 크림',
    value: '/category-decision?category=moisturizer',
  },
  {
    label: '구매 체크리스트 - 클렌저',
    value: '/category-decision?category=cleanser',
  },
] as const;

const INPUT_CLASS_NAME =
  'h-9 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-white)] px-3 text-sm text-[var(--color-text-primary)] outline-none focus:border-[var(--color-primary-border)] focus:ring-2 focus:ring-[rgba(24,144,255,0.16)] disabled:cursor-not-allowed disabled:opacity-60';
const FIELD_LABEL_CLASS_NAME = 'text-sm font-medium text-[var(--color-text-heading)]';

function createDraftId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random()}`;
}

function createEmptyCondition(): RuleConditionDraft {
  return {
    localId: createDraftId(),
    questionId: '',
    operator: 'EQ',
    value: [],
    state: 'REQUIRED',
  };
}

function createEmptyFormState(): RuleFormState {
  return {
    name: '',
    status: 'active',
    conditions: [],
    resultType: 'HOLD',
    resultTitle: '',
    resultDescription: '',
    ctaLabel: '',
    ctaTarget: '',
    adminNote: '',
  };
}

function createFormStateFromDetail(detail: AdminRuleDetail): RuleFormState {
  return {
    name: detail.name,
    status: detail.status,
    conditions: detail.conditions.map((condition) => ({
      localId: condition.id,
      questionId: condition.questionId,
      operator: condition.operator,
      value: condition.value,
      state: condition.state,
    })),
    resultType: detail.resultType,
    resultTitle: detail.resultTitle,
    resultDescription: detail.resultDescription,
    ctaLabel: detail.ctaLabel ?? '',
    ctaTarget: detail.ctaTarget ?? '',
    adminNote: detail.adminNote ?? '',
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

function allowsMultipleValues(operator: AdminRuleConditionOperator): boolean {
  return operator === 'IN' || operator === 'CONTAINS';
}

function getCtaTargetLabel(value: string | null): string {
  if (!value || value === CTA_TARGET_EMPTY_VALUE) {
    return '선택 안 함';
  }

  return CTA_TARGET_OPTIONS.find((option) => option.value === value)?.label ?? '기존 설정된 링크';
}

export function AdminRuleDetailDialog({ ruleId, open, onOpenChange }: AdminRuleDetailDialogProps) {
  const isCreateMode = ruleId === null;
  const { data, error, isError, isLoading } = useAdminRuleDetail(open && ruleId ? ruleId : null);
  const [formState, setFormState] = useState<{
    key: string;
    value: RuleFormState;
  }>(() => ({
    key: 'closed',
    value: createEmptyFormState(),
  }));
  const questionSearchQuery = useAdminRuleQuestionSearch({
    limit: 50,
    enabled: open,
  });
  const createRule = useCreateAdminRule();
  const updateRule = useUpdateAdminRule();
  const deleteRule = useDeleteAdminRule();
  const isMutationPending = createRule.isPending || updateRule.isPending || deleteRule.isPending;
  const mutationError = createRule.error ?? updateRule.error ?? deleteRule.error;
  const canBuildForm = isCreateMode || Boolean(data);
  const nextFormKey = isCreateMode ? 'create' : (data?.id ?? 'loading');

  if (open && canBuildForm && formState.key !== nextFormKey) {
    setFormState({
      key: nextFormKey,
      value: isCreateMode ? createEmptyFormState() : createFormStateFromDetail(data!),
    });
  }

  const form = formState.value;
  const setForm = (updater: SetStateAction<RuleFormState>) => {
    setFormState((previousState) => ({
      ...previousState,
      value:
        typeof updater === 'function'
          ? (updater as (previousForm: RuleFormState) => RuleFormState)(previousState.value)
          : updater,
    }));
  };

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
  const hasUnknownCtaTarget =
    form.ctaTarget.length > 0 &&
    !CTA_TARGET_OPTIONS.some((targetOption) => targetOption.value === form.ctaTarget);

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      setFormState({
        key: 'closed',
        value: createEmptyFormState(),
      });
      createRule.reset();
      updateRule.reset();
      deleteRule.reset();
    }

    onOpenChange(nextOpen);
  };

  const updateCondition = (
    localId: string,
    updater: (condition: RuleConditionDraft) => RuleConditionDraft,
  ) => {
    setForm((previousForm) => ({
      ...previousForm,
      conditions: previousForm.conditions.map((condition) =>
        condition.localId === localId ? updater(condition) : condition,
      ),
    }));
  };

  const handleConditionValueChange = (
    condition: RuleConditionDraft,
    answerValue: number,
    checked: boolean,
  ) => {
    updateCondition(condition.localId, (previousCondition) => {
      if (!checked) {
        return {
          ...previousCondition,
          value: previousCondition.value.filter((value) => value !== answerValue),
        };
      }

      if (!allowsMultipleValues(previousCondition.operator)) {
        return {
          ...previousCondition,
          value: [answerValue],
        };
      }

      return {
        ...previousCondition,
        value: [...new Set([...previousCondition.value, answerValue])],
      };
    });
  };

  const handleAddCondition = () => {
    setForm((previousForm) => ({
      ...previousForm,
      conditions: [...previousForm.conditions, createEmptyCondition()],
    }));
  };

  const handleRemoveCondition = (localId: string) => {
    setForm((previousForm) => ({
      ...previousForm,
      conditions: previousForm.conditions.filter((condition) => condition.localId !== localId),
    }));
  };

  const buildPayload = (): CreateAdminRuleBody | null => {
    if (form.conditions.length === 0) {
      toast.error('룰 조건을 1개 이상 추가해 주세요.');
      return null;
    }

    const hasIncompleteCondition = form.conditions.some((condition) => {
      const hasAnyInput = condition.questionId.length > 0 || condition.value.length > 0;

      return hasAnyInput && (condition.questionId.length === 0 || condition.value.length === 0);
    });

    if (hasIncompleteCondition) {
      toast.error('조건 카드를 완성하거나 삭제해 주세요.');
      return null;
    }

    const ctaLabel = form.ctaLabel.trim();
    const ctaTargetParseResult = adminRuleCtaTargetSchema.safeParse(form.ctaTarget.trim());

    if (!ctaTargetParseResult.success) {
      toast.error('CTA target이 허용된 값이 아닙니다.');
      return null;
    }

    const ctaTarget = ctaTargetParseResult.data;

    if (ctaLabel.length > 0 && ctaTarget.length === 0) {
      toast.error('CTA label을 입력하면 target도 입력해야 합니다.');
      return null;
    }

    return {
      name: form.name,
      status: form.status,
      resultType: form.resultType,
      resultTitle: form.resultTitle,
      resultDescription: form.resultDescription,
      ctaLabel,
      ctaTarget,
      adminNote: form.adminNote.trim(),
      conditions: form.conditions
        .filter((condition) => condition.questionId.length > 0)
        .map((condition) => ({
          questionId: condition.questionId,
          operator: condition.operator,
          value: condition.value,
          state: condition.state,
        })),
    };
  };

  const handleSave = () => {
    if (isMutationPending) {
      return;
    }

    const payload = buildPayload();

    if (!payload) {
      return;
    }

    if (isCreateMode) {
      createRule.mutate(payload, {
        onSuccess: () => {
          handleOpenChange(false);
        },
      });
      return;
    }

    if (!ruleId) {
      return;
    }

    updateRule.mutate(
      {
        ruleId,
        data: payload,
      },
      {
        onSuccess: () => {
          handleOpenChange(false);
        },
      },
    );
  };

  const handleDelete = () => {
    if (!ruleId || deleteRule.isPending) {
      return;
    }

    if (!window.confirm('이 룰을 삭제할까요?')) {
      return;
    }

    deleteRule.mutate(ruleId, {
      onSuccess: () => {
        handleOpenChange(false);
      },
    });
  };

  const isEditLoading = !isCreateMode && isLoading;
  const canRenderForm = isCreateMode || Boolean(data);

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-h-[92vh] w-[720px] max-w-[720px] overflow-hidden sm:max-w-[720px]">
        <DialogHeader>
          <DialogTitle>{isCreateMode ? '룰 생성' : '룰 수정'}</DialogTitle>
          <DialogDescription>룰 입력 후 저장 버튼을 누르면 저장됩니다.</DialogDescription>
        </DialogHeader>

        {isEditLoading ? (
          <div className="grid gap-3">
            <Skeleton className="h-9 w-2/3" />
            <Skeleton className="h-36 w-full" />
            <Skeleton className="h-44 w-full" />
          </div>
        ) : isError ? (
          <p className="text-sm text-[var(--color-error)]">
            {error instanceof Error ? error.message : '룰 상세를 불러오지 못했습니다.'}
          </p>
        ) : canRenderForm ? (
          <div className="-mx-4 no-scrollbar max-h-[68vh] overflow-y-auto px-4">
            <div className="grid gap-6">
              <section className="grid gap-2">
                <label htmlFor="admin-rule-name" className={FIELD_LABEL_CLASS_NAME}>
                  이름
                </label>
                <input
                  id="admin-rule-name"
                  value={form.name}
                  onChange={(event) =>
                    setForm((previousForm) => ({
                      ...previousForm,
                      name: event.target.value,
                    }))
                  }
                  className={INPUT_CLASS_NAME}
                  disabled={isMutationPending}
                  placeholder="룰 이름"
                />
              </section>

              <section className="grid gap-3">
                <div className="flex flex-wrap items-end justify-between gap-3">
                  <h3 className={FIELD_LABEL_CLASS_NAME}>조건</h3>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleAddCondition}
                    disabled={isMutationPending}
                  >
                    <PlusIcon />
                    조건 추가
                  </Button>
                </div>

                {form.conditions.length > 0 ? (
                  <div className="grid gap-3">
                    {form.conditions.map((condition, index) => {
                      const selectedQuestion = questionMap.get(condition.questionId);
                      const answerOptions = getAnswerOptions(selectedQuestion);

                      return (
                        <Card
                          key={condition.localId}
                          size="sm"
                          className="bg-[var(--color-bg-component)]"
                        >
                          <CardHeader>
                            <CardTitle>조건 {index + 1}</CardTitle>
                            <CardAction>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon-sm"
                                onClick={() => handleRemoveCondition(condition.localId)}
                                disabled={isMutationPending}
                                aria-label="조건 삭제"
                              >
                                <Trash2Icon />
                              </Button>
                            </CardAction>
                          </CardHeader>
                          <CardContent className="grid min-w-0 gap-4">
                            <div className="grid min-w-0 gap-3">
                              <label className="grid min-w-0 gap-1.5">
                                <span className={FIELD_LABEL_CLASS_NAME}>question variant</span>
                                <Select
                                  value={condition.questionId}
                                  onValueChange={(value) =>
                                    updateCondition(condition.localId, (previousCondition) => ({
                                      ...previousCondition,
                                      questionId: value ?? '',
                                      value: [],
                                    }))
                                  }
                                  disabled={isMutationPending}
                                >
                                  <SelectTrigger className="h-9 w-full min-w-0 border-[var(--color-border)] bg-[var(--color-bg-white)]">
                                    <SelectValue placeholder="질문 선택">
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
                                      <SelectItem
                                        key={question.questionId}
                                        value={question.questionId}
                                      >
                                        {getQuestionLabel(question)}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </label>

                              <div className="grid min-w-0 gap-3 sm:grid-cols-2">
                                <label className="grid min-w-0 gap-1.5">
                                  <span className={FIELD_LABEL_CLASS_NAME}>operator</span>
                                  <Select
                                    value={condition.operator}
                                    onValueChange={(value) =>
                                      updateCondition(condition.localId, (previousCondition) => ({
                                        ...previousCondition,
                                        operator: value as AdminRuleConditionOperator,
                                        value: allowsMultipleValues(
                                          value as AdminRuleConditionOperator,
                                        )
                                          ? previousCondition.value
                                          : previousCondition.value.slice(0, 1),
                                      }))
                                    }
                                    disabled={isMutationPending}
                                  >
                                    <SelectTrigger className="h-9 w-full border-[var(--color-border)] bg-[var(--color-bg-white)]">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent align="start" alignItemWithTrigger={false}>
                                      {CONDITION_OPERATOR_OPTIONS.map((operator) => (
                                        <SelectItem key={operator} value={operator}>
                                          {operator}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </label>

                                <label className="grid min-w-0 gap-1.5">
                                  <span className={FIELD_LABEL_CLASS_NAME}>state</span>
                                  <Select
                                    value={condition.state}
                                    onValueChange={(value) =>
                                      updateCondition(condition.localId, (previousCondition) => ({
                                        ...previousCondition,
                                        state: value as AdminRuleConditionState,
                                      }))
                                    }
                                    disabled={isMutationPending}
                                  >
                                    <SelectTrigger className="h-9 w-full border-[var(--color-border)] bg-[var(--color-bg-white)]">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent align="start" alignItemWithTrigger={false}>
                                      {CONDITION_STATE_OPTIONS.map((state) => (
                                        <SelectItem key={state} value={state}>
                                          {state}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </label>
                              </div>
                            </div>

                            <div className="grid gap-2">
                              <div className={FIELD_LABEL_CLASS_NAME}>결정값</div>
                              {condition.questionId.length === 0 ? (
                                <p className="text-sm text-[var(--color-text-tertiary)]">
                                  질문을 먼저 선택해 주세요.
                                </p>
                              ) : answerOptions.length > 0 ? (
                                <div className="flex flex-wrap gap-2">
                                  {answerOptions.map((answer) => (
                                    <label
                                      key={answer.value}
                                      className="flex min-h-8 items-center gap-2 rounded-lg border border-[var(--color-border-light)] bg-[var(--color-bg-white)] px-3 text-sm text-[var(--color-text-primary)]"
                                    >
                                      <Checkbox
                                        checked={condition.value.includes(answer.value)}
                                        onCheckedChange={(checked) =>
                                          handleConditionValueChange(
                                            condition,
                                            answer.value,
                                            checked === true,
                                          )
                                        }
                                        disabled={isMutationPending}
                                      />
                                      <span>{answer.label}</span>
                                    </label>
                                  ))}
                                </div>
                              ) : (
                                <p className="text-sm text-[var(--color-text-tertiary)]">
                                  선택 가능한 답변 값이 없습니다.
                                </p>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-sm text-[var(--color-text-tertiary)]">
                    조건을 추가해야 룰을 저장할 수 있습니다.
                  </p>
                )}
              </section>

              <section className="grid gap-3">
                <h3 className={FIELD_LABEL_CLASS_NAME}>결론</h3>
                <label className="grid max-w-xs gap-1.5">
                  <span className={FIELD_LABEL_CLASS_NAME}>result type</span>
                  <Select
                    value={form.resultType}
                    onValueChange={(value) =>
                      setForm((previousForm) => ({
                        ...previousForm,
                        resultType: value as ResultType,
                      }))
                    }
                    disabled={isMutationPending}
                  >
                    <SelectTrigger className="h-9 w-full border-[var(--color-border)] bg-[var(--color-bg-white)]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent align="start" alignItemWithTrigger={false}>
                      {RESULT_TYPE_OPTIONS.map((resultType) => (
                        <SelectItem key={resultType} value={resultType}>
                          {resultType}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </label>

                <label className="grid gap-1.5">
                  <span className={FIELD_LABEL_CLASS_NAME}>title</span>
                  <input
                    value={form.resultTitle}
                    onChange={(event) =>
                      setForm((previousForm) => ({
                        ...previousForm,
                        resultTitle: event.target.value,
                      }))
                    }
                    className={INPUT_CLASS_NAME}
                    disabled={isMutationPending}
                    placeholder="결론 제목"
                  />
                </label>

                <label className="grid gap-1.5">
                  <span className={FIELD_LABEL_CLASS_NAME}>description</span>
                  <Textarea
                    value={form.resultDescription}
                    onChange={(event) =>
                      setForm((previousForm) => ({
                        ...previousForm,
                        resultDescription: event.target.value,
                      }))
                    }
                    className="min-h-24"
                    disabled={isMutationPending}
                    placeholder="결론 설명"
                  />
                </label>

                <div className="grid gap-3 lg:grid-cols-2">
                  <label className="grid gap-1.5">
                    <span className={FIELD_LABEL_CLASS_NAME}>CTA label</span>
                    <input
                      value={form.ctaLabel}
                      onChange={(event) =>
                        setForm((previousForm) => ({
                          ...previousForm,
                          ctaLabel: event.target.value,
                        }))
                      }
                      className={INPUT_CLASS_NAME}
                      disabled={isMutationPending}
                      placeholder="CTA label"
                    />
                  </label>
                  <label className="grid gap-1.5">
                    <span className={FIELD_LABEL_CLASS_NAME}>CTA target</span>
                    <Select
                      value={form.ctaTarget || CTA_TARGET_EMPTY_VALUE}
                      onValueChange={(value) =>
                        setForm((previousForm) => ({
                          ...previousForm,
                          ctaTarget: value === CTA_TARGET_EMPTY_VALUE ? '' : (value ?? ''),
                        }))
                      }
                      disabled={isMutationPending}
                    >
                      <SelectTrigger className="h-9 w-full border-[var(--color-border)] bg-[var(--color-bg-white)]">
                        <SelectValue placeholder="CTA 이동 대상 선택">
                          {(value: string | null) => getCtaTargetLabel(value)}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent align="start" alignItemWithTrigger={false}>
                        <SelectItem value={CTA_TARGET_EMPTY_VALUE}>선택 안 함</SelectItem>
                        {hasUnknownCtaTarget ? (
                          <SelectItem value={form.ctaTarget}>기존 설정된 링크</SelectItem>
                        ) : null}
                        {CTA_TARGET_OPTIONS.map((targetOption) => (
                          <SelectItem key={targetOption.value} value={targetOption.value}>
                            {targetOption.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </label>
                </div>
              </section>

              <section className="grid gap-2">
                <label htmlFor="admin-rule-note" className={FIELD_LABEL_CLASS_NAME}>
                  메모
                </label>
                <Textarea
                  id="admin-rule-note"
                  value={form.adminNote}
                  onChange={(event) =>
                    setForm((previousForm) => ({
                      ...previousForm,
                      adminNote: event.target.value,
                    }))
                  }
                  className="min-h-28"
                  maxLength={2000}
                  disabled={isMutationPending}
                  placeholder="근거, 보류 이유, 추후 수정 필요점을 적습니다."
                />
              </section>

              <section className="flex items-center justify-between gap-4 rounded-lg border border-[var(--color-border-light)] bg-[var(--color-bg-component)] px-4 py-3">
                <div>
                  <div className={FIELD_LABEL_CLASS_NAME}>상태</div>
                  <p className="text-sm text-[var(--color-text-tertiary)]">
                    {form.status === 'active' ? 'active' : 'inactive'}
                  </p>
                </div>
                <Switch
                  checked={form.status === 'active'}
                  onCheckedChange={(checked) =>
                    setForm((previousForm) => ({
                      ...previousForm,
                      status: checked ? 'active' : 'inactive',
                    }))
                  }
                  disabled={isMutationPending}
                />
              </section>

              {mutationError ? (
                <p className="text-sm text-[var(--color-error)]">
                  {mutationError instanceof Error
                    ? mutationError.message
                    : '룰 변경사항을 저장하지 못했습니다.'}
                </p>
              ) : null}
            </div>
          </div>
        ) : null}

        <DialogFooter className="justify-between gap-2 sm:justify-between">
          <div>
            {!isCreateMode ? (
              <Button
                type="button"
                variant="destructive"
                onClick={handleDelete}
                disabled={isMutationPending || !data}
              >
                {deleteRule.isPending ? <Spinner /> : <Trash2Icon />}
                삭제
              </Button>
            ) : null}
          </div>
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={isMutationPending}
            >
              취소
            </Button>
            <Button
              type="button"
              onClick={handleSave}
              disabled={isMutationPending || isEditLoading}
            >
              {createRule.isPending || updateRule.isPending ? <Spinner /> : null}
              저장
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
