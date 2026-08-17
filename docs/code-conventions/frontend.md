# 프론트엔드 코드 구조 규칙

`frontend/` 에 새 코드를 쓰기 전에 읽는다. 여기 적힌 규칙은 전부 **현재 코드에서 실제로 지켜지고 있는 것**이며, 각 규칙마다 근거 파일을 함께 표기했다. 새 규칙을 만들 때는 이 문서를 먼저 고친다.

린트로 강제되는 규칙은 하나도 없다(`frontend/eslint.config.mjs` 는 stock `eslint-config-next`). 즉 **이 문서가 유일한 강제 수단**이다.

---

## 0. 레이어와 의존 방향

```
shared/schemas   (계약: zod schema + 타입)
      ↓
lib/api.ts       (Repo: fetch + 응답 검증)
      ↓
lib/hooks.ts     (Service: useQuery / useMutation / use*Actions)
      ↓
components/**    (UI: shadcn 조합)
      ↓
app/**           (AppWiring: 라우트 조립)
```

- 화살표 **역방향 import 금지**. `lib/api.ts` 가 `components/` 를 import 하는 일은 없다.
- **UI에서 `fetch` 직접 호출 금지.** `frontend/src` 전체에서 `fetch` 는 `lib/api.ts` 안에만 존재한다.
- 실제 디렉터리는 아래처럼 얕다. `hooks/`, `api/`, `store/`, `types/`, `features/` 같은 폴더는 **만들지 않는다.**

```
frontend/src/
├── app/                      # 라우트 세그먼트만
├── components/
│   ├── *.tsx                 # 도메인 컴포넌트 (flat)
│   ├── admin/{rules,questions}/
│   ├── common/{data-table,skeleton}/
│   ├── icons/
│   └── shadcn/               # UI 프리미티브 (= 다른 프로젝트의 components/ui)
├── lib/{api.ts, hooks.ts, utils.ts, legalContent.ts}
└── style/
```

---

## 1. 퍼블리싱은 shadcn 프리미티브를 컴포넌트 단위로 조합한다

- UI 프리미티브는 `@/components/shadcn/<kebab-case>` 에서 **필요한 컴포넌트만 named import** 한다.
- 도메인 컴포넌트는 프리미티브를 조합하고 props를 받기만 한다. **쿼리/뮤테이션 로직을 갖지 않는다.**
- 클래스 병합은 반드시 `cn` (`@/lib/utils`).

`frontend/src/components/PriorityGateQuestionItem.tsx:1-8`

```tsx
'use client';

import type { QuestionAnswerDto, QuestionAnswerTypeDto } from '@skincare-decision/shared/schemas';
import { useState } from 'react';
import { Checkbox } from '@/components/shadcn/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/shadcn/radio-group';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/shadcn/tooltip';
import { cn } from '@/lib/utils';
```

이 컴포넌트는 `value` / `onValueChange` / `disabled` 를 props로 받고(`:26-32`), 데이터 조회는 전부 페이지가 담당한다.

**금지**

- 도메인 컴포넌트 안에서 `useQuery` / `useMutation` 호출
- Radix/base-ui 를 `components/shadcn/` 을 거치지 않고 직접 import
- `className` 문자열 수동 결합 (`cn` 사용)

---

## 2. 조회는 `useQuery`, 변경은 `useMutation` — 훅은 얇게

- 모든 훅은 `frontend/src/lib/hooks.ts` 한 파일에 모은다. 도메인별 파일로 쪼개지 않는다.
- `queryFn` 은 `xxxApi.*` 호출만 한다. 훅 안에서 데이터 가공을 하지 않는다(가공은 컴포넌트 또는 서비스가 아니라 백엔드 DTO가 이미 끝낸 상태로 온다).

`frontend/src/lib/hooks.ts:105-110`

```ts
export function usePriorityGateQuestions() {
  return useQuery({
    queryKey: queryKeys.priorityGate.questions,
    queryFn: priorityGateApi.getQuestions,
  });
}
```

- 모든 mutation 훅은 `useQueryClient()` 를 잡고 `onSuccess` 에서 무효화한다. **무효화 없는 mutation은 없다.**
- 다른 화면 캐시에 영향이 있으면 교차 무효화하고 **이유를 주석으로 남긴다.**

`frontend/src/lib/hooks.ts:112-124`

```ts
export function useSubmitPriorityGate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: UpsertPriorityGateResponsesRequest) => priorityGateApi.submitResponses(data),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.priorityGate.questions });
      // 루틴 점검과 구매 체크리스트는 같은 user_responses를 공유한다.
      // 상대 화면의 캐시를 stale로 표시해 다음 진입 시 자동 refetch되게 한다.
      await queryClient.invalidateQueries({ queryKey: queryKeys.categoryDecision.all });
    },
  });
}
```

---

## 3. queryKey / mutationKey 는 팩토리에만 정의한다

- `hooks.ts` 최상단의 `queryKeys` / `mutationKeys` 객체가 **유일한 키 정의처**다. 인라인 배열 금지.
- 구조: `도메인(kebab) → all / list / detail(...) → 파라미터는 객체로 tail`. 전부 `as const`.
- `mutationKeys` 는 페이지가 `useMutationState` 로 진행 중 상태를 읽기 위해 존재한다(`app/admin/rules/page.tsx`). 그 용도가 없으면 mutationKey를 붙이지 않아도 된다.

`frontend/src/lib/hooks.ts:32-55`

```ts
export const queryKeys = {
  auth: { me: ['auth', 'me'] as const },
  priorityGate: {
    all: ['priority-gate'] as const,
    questions: ['priority-gate', 'questions'] as const,
  },
  categoryDecision: {
    all: ['category-decision'] as const,
    detail: (category?: string) => ['category-decision', { category: category ?? null }] as const,
  },
  adminRules: {
    all: ['admin', 'rules'] as const,
    list: ['admin', 'rules', 'list'] as const,
    detail: (ruleId: string) => ['admin', 'rules', 'detail', ruleId] as const,
    questions: (q: string, limit: number) => ['admin', 'rules', 'questions', { q, limit }] as const,
  },
};
```

---

## 4. action이 2개 이상이면 `use<Domain>Actions()` 로 묶는다

**이 레포에서 가장 강한 규칙이다.** 한 화면이 여러 개의 mutation을 쓰게 되는 순간, 컴포넌트가 개별 mutation 훅을 나열하지 않고 **하나의 파사드 훅**을 통해서만 접근한다. `actions/` 폴더나 `actions.ts` 파일은 만들지 않는다 — 묶는 단위는 훅이다.

파사드의 불변 조건:

| 항목         | 규칙                                        |
| ------------ | ------------------------------------------- |
| 반환 형태    | `{ error, isPending, ...액션들 }` 단일 객체 |
| `error`      | 하위 mutation의 error를 `??` 체인으로 병합  |
| `isPending`  | 하위 mutation의 isPending을 `\|\|` 로 병합  |
| 액션 함수    | 전부 `useCallback`                          |
| 반환 키 순서 | 알파벳 순                                   |
| 노출 범위    | 컴포넌트는 개별 mutation 훅을 보지 못한다   |

`frontend/src/lib/hooks.ts:270-290`

```ts
export function usePriorityGateActions() {
  const batch = useDebouncedPriorityGateResponseBatch();
  const reset = useResetPriorityGateResponses();

  const resetPriorityGateSection = useCallback(
    (uiSection: QuestionUiSectionDto) => {
      batch.clearPendingResponses();
      batch.clearError();
      reset.reset();
      reset.mutate({ uiSection });
    },
    [batch, reset],
  );

  return {
    error: batch.error ?? reset.error,
    isPending: batch.isPending || reset.isPending,
    resetPriorityGateSection,
    saveResponse: batch.saveResponse,
  };
}
```

중복 제출을 막아야 하면 `isMutatingRef` 재진입 락을 파사드 안에 둔다 — `useAdminRuleDialogActions` (`hooks.ts:632-692`)가 create/update/delete 3개를 묶으면서 락과 `reset()` 까지 함께 제공하는 형태다.

소비 측은 파사드만 구조분해한다. `frontend/src/app/priority-gate/page.tsx:20-26`

```tsx
const { data, error, isError, isLoading } = usePriorityGateQuestions();
const {
  error: responseError,
  isPending: isPriorityGateActionPending,
  resetPriorityGateSection,
  saveResponse,
} = usePriorityGateActions();
```

같은 형태의 다른 사례: `useCategoryDecisionActions(category)` (`hooks.ts:453-472`).

---

## 5. API 호출은 `lib/api.ts` 의 `xxxApi` 네임스페이스 객체로만

- 도메인마다 `export const <domain>Api = { ... }` 객체 하나. 현재 5개: `authApi`, `priorityGateApi`, `categoryDecisionApi`, `adminRulesApi`, `adminQuestionsApi`.
- 메서드는 화살표 함수 + **반환 타입을 shared DTO로 명시** + `credentials: 'include'`.
- **응답은 예외 없이 `handleResponse(response, <sharedSchema>)` 로 zod 검증**한다. 서버 봉투(`{success,data,meta}`)를 벗기고 `data` 만 스키마로 파싱한다.
- 쓰기 요청은 전송 전 요청 스키마로 `safeParse` 한다.
- 에러는 `ApiError` / `ApiValidationError` 로 정규화하고, 분기는 `isUnauthorizedError` / `isForbiddenError` 가드로 한다(`api.ts:75-102`).

`frontend/src/lib/api.ts:175-200`

```ts
async function handleResponse<TSchema extends z.ZodType>(
  response: Response,
  schema: TSchema,
): Promise<z.infer<TSchema>> {
  const data = await readJson(response);

  if (!response.ok) {
    const error = extractErrorPayload(data);
    throw new ApiError(/* ... */);
  }

  const parsed = schema.safeParse(parseEnvelopeData(data));

  if (!parsed.success) {
    throw new ApiValidationError(`Invalid API response data: ${parsed.error.message}`);
  }

  return parsed.data;
}
```

---

## 6. zod 스키마는 프론트에 만들지 않는다

- 도메인 스키마는 전부 `shared/src/schemas/` 에 있다. `frontend/src` 에서 `from 'zod'` 는 `lib/api.ts` 단 한 곳(`api.ts:66`)이고, 그것도 `handleResponse` 의 제네릭 타입과 `{ ok: boolean }` 수준의 즉석 봉투용이다.
- import 경로는 **서브패스 고정**: `@skincare-decision/shared/schemas`. 루트(`@skincare-decision/shared`) import, 딥 경로 import 모두 금지.
- 컴포넌트는 `import type` 만 한다. 런타임 스키마 값이 필요한 곳은 `lib/api.ts` 와 폼 뿐이다.

자세한 규칙은 [shared.md](./shared.md).

---

## 7. 폼은 TanStack Form + shared 스키마 직결

- 파일 내부에 **비공개 `useXxxForm` 팩토리**를 두고, shared 스키마를 `validators.onSubmit` / `onBlur` 에 **그대로** 넘긴다. 별도 validation 함수를 만들지 않는다.
- 폼 API 타입은 `ReturnType<typeof useXxxForm>` 으로 파생해 하위 필드 컴포넌트에 전달한다.
- 엔티티 → 폼 초깃값 변환 함수(`toModifyAdminRuleBody`)는 같은 파일에 둔다.

`frontend/src/components/admin/rules/AdminRuleDialogForm.tsx:98-112`

```ts
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
```

필드는 render-prop 방식(`<form.Field name="...">{(field) => ...}`)에 shadcn `Field` / `FieldLabel` / `FieldError` 3종을 조합하고, 유효성 표시는 `field.state.meta.isTouched && !field.state.meta.isValid` 로 판단한다. 배열 필드는 `mode="array"` + 템플릿 리터럴 `as const` 이름을 쓴다. submit 핸들러는 `event.preventDefault(); event.stopPropagation(); void form.handleSubmit();`.

---

## 8. 네이밍

| 대상              | 규칙                                                                 | 예                                                    |
| ----------------- | -------------------------------------------------------------------- | ----------------------------------------------------- |
| 라우트 폴더       | kebab-case                                                           | `app/priority-gate/`, `app/category-decision/`        |
| Next 파일         | 소문자 고정                                                          | `page.tsx`, `layout.tsx`, `route.ts`, `providers.tsx` |
| 도메인 컴포넌트   | PascalCase 파일 = PascalCase named export (1 파일 1 컴포넌트 계열)   | `PriorityGateResultCard.tsx`                          |
| shadcn 프리미티브 | kebab-case                                                           | `alert-dialog.tsx`, `radio-group.tsx`                 |
| 그룹 폴더         | 소문자, 도메인(`admin/rules`) 또는 역할(`common`, `icons`, `shadcn`) | —                                                     |
| 팩토리 파일       | export 이름과 동일 (camelCase)                                       | `createAdminRuleColumns.tsx`                          |
| 훅                | `use<Domain><Verb>` / 파사드는 `use<Domain>Actions`                  | `useUpdateAdminRuleStatus`                            |

- `app/` 안의 `page.tsx` 만 default export. 그 외에는 **named export만** 쓴다.
- **배럴 파일 금지.** `frontend/src` 에 `index.ts` 는 0개다. 모든 import는 `@/*` 절대 경로(`frontend/tsconfig.json` paths)로 쓰고, 상대 경로는 `lib/` 내부(`./api`)에서만 쓴다.
- 포맷은 루트 `.prettierrc.json` 이 강제한다(single quote, semi, trailing comma all, printWidth 100).

---

## 9. 새 화면 하나를 추가할 때의 체크리스트

1. `shared/src/schemas/<domain>.schema.ts` 에 요청/응답 스키마와 타입 추가 → `schemas/index.ts` 에 재수출 → shared 빌드
2. `lib/api.ts` 에 `<domain>Api` 객체(또는 메서드) 추가 — `credentials: 'include'` + `handleResponse(..., schema)`
3. `lib/hooks.ts` 의 `queryKeys` 에 키 추가
4. `lib/hooks.ts` 에 `useQuery` / `useMutation` 훅 추가 (mutation은 `onSuccess` 무효화 필수)
5. mutation이 2개 이상이면 `use<Domain>Actions()` 파사드 추가
6. `components/` 에 shadcn 조합 컴포넌트 추가 (쿼리 로직 없음)
7. `app/<kebab-route>/page.tsx` 에서 훅 + 컴포넌트를 조립

---

## 알려진 예외 (새 코드에서 따라 하지 말 것)

| 항목                                           | 현상                                                                                                                                                                                                     |
| ---------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `frontend/src/components.json`                 | 패키지 루트가 아니라 `src/` 에 있고, `ui` alias(`@/components/ui`)와 css 경로(`src/styles/globals.css`)가 **실존하지 않는 경로**를 가리킨다. 실제는 `@/components/shadcn/*` 과 `src/app/globals.css` 다. |
| `components/shadcn/bedge.tsx`, `seperator.tsx` | 오타 파일명이 실제로 import되고 있다. 새로 추가하는 프리미티브는 정확한 철자를 쓴다.                                                                                                                     |
| `components/shadcn/Table.tsx`                  | 이 폴더에서 유일한 PascalCase 파일. 신규 프리미티브는 kebab-case.                                                                                                                                        |
| `CLAUDE.md` 의 `Runtime(store)` 레이어         | Zustand는 설치되어 있지 않고 store 구현도 없다. 서버 상태는 TanStack Query 캐시가 사실상의 store다.                                                                                                      |
| `lib/api.ts` 의 `sleep`                        | 로딩 UI 확인용 인위적 지연이 3곳(`api.ts:357`, `:452`, `:546`)에 남아 있다. 새 API에 넣지 않는다.                                                                                                        |
