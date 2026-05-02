# frontend/CLAUDE.md — 프론트엔드 전용 컨텍스트

> 루트 [../CLAUDE.md](../CLAUDE.md)의 황금 원칙을 우선하고, 본 파일은 프론트 추가 규칙만 담는다.

## 레이어 호출 규약

```
Component → hook (TanStack Query) → api (server action / fetch) → Backend REST
                ↘ Zustand store (UI/세션 일시 상태)
```

- Component: 받은 props/hook 결과를 표시만. 입력 처리는 React Hook Form + Zod resolver.
- hook: `useQuery` / `useMutation` 단위. server state는 캐시 키로 관리.
- api: fetcher wrapper. `x-device-id` 헤더 자동 첨부, Problem Details 파싱.
- store: 임시 client state (예: 현재 선택된 카테고리, 임시 필터 토글 등). server state는 Zustand에 두지 않는다.

## 명명 규칙

- 컴포넌트 파일: `PascalCase.tsx` (예: `PriorityGateForm.tsx`)
- hook: `useXxx.ts`
- store: `useXxxStore.ts`
- 라우트 폴더: `kebab-case`
- Zod schema: `xxxSchema` + 추론 타입 `Xxx`
- 환경변수: `NEXT_PUBLIC_*`만 클라이언트 노출. 서버 전용은 prefix 없음.

## App Router 사용 규칙

- 기본은 server component. 데이터는 `await`로 fetch (server action 또는 Backend 직접).
- "use client" 선언은 인터랙션(폼/모달/토글) 단위 컴포넌트에만.
- Loading/Error는 `loading.tsx`, `error.tsx`로 처리.
- Streaming/Suspense는 Product Matrix 같은 큰 화면에서 적극 사용.

## 디자인 토큰 매핑

- `design_system/colors_and_type.css`의 CSS 변수를 Tailwind config에 1:1로 매핑.
- 색상 변수 예: `--color-primary-6: #1890FF` → Tailwind `colors.primary.DEFAULT`.
- border-radius 기본 2px, font-family Noto Sans KR + Roboto.
- shadcn/ui 컴포넌트는 base 설치 후 `components/ui/`에 두고, 토큰을 우리 변수로 교체한 뒤 사용.

## 절대 하지 말 것

- API 응답을 `as any`로 캐스팅
- 컴포넌트 안에서 직접 Backend `fetch` (반드시 hook/api 경유)
- Zustand에 server state 저장 (오로지 client state)
- `docs/page_content_specification_revised.md`와 다른 카피 사용
- Concern/Filter 상수를 Backend로 가져오기 (FE 상수만 사용)
- 클라이언트에서 시크릿 env (`NEXT_PUBLIC_*` prefix 없는 키) 접근
