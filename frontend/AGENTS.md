# frontend/ — Next.js App Router 프론트엔드 (구조 사양)

> 본 폴더는 EXECUTION_PLAN.md Phase 3에서 `pnpm dlx create-next-app@latest .`으로 초기화된다.
> **이 파일은 init 이전의 사양 문서이자, init 이후에도 유지되는 진입 규칙**이다.

## 기술 스택

- Next.js 14+ (App Router) + React 18+ + TypeScript 5
- Tailwind CSS + shadcn/ui (Ant Design 토큰을 Tailwind 변수로 매핑)
- TanStack Query (server state) + Zustand (client state)
- Zod (입력/응답 검증)
- React Hook Form (form 기본)

## 폴더 구조 (목표)

```
frontend/
├─ AGENTS.md
├─ CLAUDE.md
├─ README.md
├─ src/
│  ├─ app/                ← 라우팅 (App Router)
│  │  ├─ AGENTS.md
│  │  ├─ layout.tsx
│  │  ├─ page.tsx                  ← S01 Landing
│  │  ├─ priority-gate/page.tsx    ← S02
│  │  ├─ category-decision/[category]/page.tsx  ← S03~S05
│  │  ├─ product-matrix/page.tsx   ← S06
│  │  ├─ products/[id]/page.tsx    ← S07
│  │  ├─ reaction-traceback/page.tsx  ← S08
│  │  └─ api/                      ← BFF 라우트(필요 시)
│  ├─ components/         ← shadcn/ui + 화면 단위 components
│  │  ├─ AGENTS.md
│  │  ├─ ui/              ← shadcn 컴포넌트 (Button, Card, Tag, Dialog…)
│  │  ├─ landing/         ← S01 전용
│  │  ├─ priority-gate/   ← S02 전용
│  │  ├─ category/        ← S03~S05
│  │  ├─ product/         ← S06, S07
│  │  └─ traceback/       ← S08
│  ├─ lib/                ← fetcher, cookie, date, format, classnames
│  ├─ types/              ← Zod schema, API DTO, fact key 상수 타입
│  ├─ config/
│  │  ├─ env.ts
│  │  ├─ concerns.ts      ← Concern Mapper 상수 (route_target, preset_facts, suggested_filters)
│  │  └─ design-tokens.ts ← Tailwind ↔ Ant Design 토큰 매핑
│  ├─ api/                ← server action 또는 fetch wrapper
│  ├─ hooks/              ← TanStack Query hook (useFacts, usePriorityGate, useProductMatrix…)
│  ├─ store/              ← Zustand store (sessionStore, filterStore)
│  └─ styles/
│     ├─ globals.css      ← Tailwind base + design_system/colors_and_type.css 변수
│     └─ tokens.css
├─ public/
├─ tailwind.config.ts
├─ next.config.mjs
├─ tsconfig.json
├─ .env.local.example
└─ package.json
```

## 화면 ↔ 라우트 ↔ API 매핑

| 화면 | 경로                                | 핵심 API                                                            |
| ---- | ----------------------------------- | ------------------------------------------------------------------- |
| S01  | `/`                                 | `GET /facts/definitions`(prefetch)                                  |
| S02  | `/priority-gate`                    | `POST /facts/answers` → `POST /priority-gate/evaluate`              |
| S03~S05 | `/category-decision/[category]`  | `GET /facts/questions?screen=context` + `POST /facts/answers` + `POST /category-decision/seed` |
| S06  | `/product-matrix?category=...`      | `GET /product-matrix?...` + `POST /product-matrix/filter-state`     |
| S07  | `/products/[id]`                    | `GET /products/:id`                                                 |
| S08  | `/reaction-traceback`               | `POST /reactions/reports` + `POST /reactions/avoidance-rules`       |

## 황금 원칙 (프론트엔드)

1. **컴포넌트는 표시만**. 데이터 fetch는 hook, 상태는 Zustand store, 결정 로직은 server action.
2. **API 응답은 Zod로 parse 후 사용**. `as any` 금지.
3. **Concern/Filter 상수는 `src/config/`** — DB 호출 금지(루트 결정).
4. **device_id**는 client에서 cookie로 관리, fetcher가 항상 `x-device-id` 헤더 동봉.
5. **shadcn/ui 컴포넌트는 design_system 토큰 매핑 후 사용**. 하드코딩 색상 금지(Tailwind 변수만).
6. **App Router server component 우선** — 인터랙션이 있을 때만 `"use client"`.
7. **i18n 미적용**(MVP는 한국어만). 모든 사용자 노출 텍스트는 `docs/page_content_specification_revised.md` 카피와 일치.
8. **에러 표시는 RFC 7807 Problem Details 파싱 후 표시**.

## 진입 규칙

1. 새 화면 작업 전 `docs/page_content_specification_revised.md`의 해당 화면 섹션을 읽는다.
2. 새 컴포넌트는 `src/components/<도메인>/`에 두고, 재사용성이 명확하면 `ui/`로 승격.
3. Tailwind config에 새 색을 추가하면 `design_system/colors_and_type.css`와 일치시킨다.
4. 새 hook/store는 본 파일의 매핑 표 갱신.
5. 의존성 추가 사유는 `../memory/project_decisions.md`에 기록.
