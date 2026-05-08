# 하네스 구축 실행 계획 (EXECUTION_PLAN)

> Skincare Decision MVP 백엔드(NestJS)와 프론트엔드(Next.js)를 처음부터 끝까지 구축하기 위한 단계별 명령서.
> AI Agent든 개발자든 본 문서를 위에서 아래로 따라가면 동일한 결과가 나오도록 설계됨.

---

## 0. 사전 준비

### 0.1 필요한 도구

| 도구           | 권장 버전     | 확인 명령                             |
| -------------- | ------------- | ------------------------------------- |
| Node.js        | 20.x LTS      | `node -v`                             |
| pnpm           | 9.x           | `pnpm -v` (없으면 `npm i -g pnpm@9`)  |
| Docker Desktop | 최신          | `docker -v` / `docker compose version`|
| Git            | 2.40+         | `git --version`                       |
| AWS CLI v2     | (Phase 7부터) | `aws --version`                       |


### 0.2 작업 흐름 요약

| Phase | 목적                             | 산출물                                                     |
| ----- | -------------------------------- | ---------------------------------------------------------- |
| 0     | 도구 확인 / 사전 정렬            | 본 절                                                       |
| 1     | 모노레포 셋업                    | 루트 `package.json`, `pnpm-workspace.yaml`, lint/format 통합 |
| 2     | Backend (NestJS + Prisma) init   | `backend/` 동작                                             |
| 3     | Frontend (Next.js) init          | `frontend/` 동작                                            |
| 4     | 도메인 구현 (BE/FE 동시)         | S01~S08 화면 + REST API                                      |
| 5     | 시드 데이터 / 테스트              | rule seed + toner catalog seed + e2e                        |
| 6     | 인프라 (Docker, GH Actions)      | 로컬 compose + CI 파이프라인                                |
| 7     | AWS 배포 (ECR/ECS/RDS/CloudFront)| 운영 환경                                                   |

각 Phase는 **이전 Phase가 끝난 뒤에만** 시작한다. 검증 명령이 통과하지 않으면 다음 Phase로 진행하지 않는다.

---

## Phase 1 — 모노레포 셋업

### 1.1 루트 package.json + pnpm workspace

```bash
# 루트에서
pnpm init
```

생성된 `package.json`을 다음과 같이 수정한다.

```json
{
  "name": "skincare-decision",
  "version": "0.1.0",
  "private": true,
  "packageManager": "pnpm@10.32.1",
  "engines": { "node": ">=20" },
  "scripts": {
    "dev:backend": "pnpm --filter backend run start:dev",
    "dev:frontend": "pnpm --filter frontend run dev",
    "build": "pnpm -r run build",
    "lint": "pnpm -r run lint",
    "typecheck": "pnpm -r run typecheck",
    "test": "pnpm -r run test",
    "format": "prettier . --write"
  },
  "devDependencies": {
    "prettier": "^3.8.3",
    "typescript": "^6.0.3"
  }
}
```

루트에 `pnpm-workspace.yaml`을 아래 내용으로 생성한다.

```yaml
packages:
  - "backend"
  - "frontend"
```

`packageManager` 필드는 `pnpm -v` 결과와 동일한 버전으로 맞춘다 (위 예시는 10.32.1 기준). workspace 전체를 같은 major로 고정한다.

> TypeScript 6.x는 신규 메이저라 Phase 2(NestJS) / Phase 3(Next.js) 의존성 설치 시 peer 충돌이 발생하면 `^5.9`로 일시 다운그레이드한 뒤 `memory/project_decisions.md`에 사유를 남긴다.

### 1.2 공통 .gitignore / .editorconfig / prettier

`.gitignore`가 이미 있으면 아래 항목만 병합한다.

```gitignore
node_modules/
dist/
.next/
.env
.env.local
*.log
.DS_Store
.pnpm-store/
coverage/
```

`.editorconfig`는 아래 내용으로 생성한다.

```ini
root = true
[*]
charset = utf-8
end_of_line = lf
indent_style = space
indent_size = 2
insert_final_newline = true
trim_trailing_whitespace = true
```

`.prettierrc.json`은 아래 내용으로 생성한다.

```json
{
  "semi": true,
  "singleQuote": true,
  "trailingComma": "all",
  "printWidth": 100,
  "arrowParens": "always"
}
```

`.prettierignore`는 아래 내용으로 생성한다.

```text
node_modules
dist
.next
build
coverage
pnpm-lock.yaml
```

### 1.3 검증

```bash
pnpm -v        # package.json의 packageManager 필드와 동일한 버전 출력 (현재 기준 10.32.1)
pnpm install   # 락파일 생성
```

`memory/project_progress.md`에 "Phase 1 완료" 추가.

---

## Phase 2 — Backend (NestJS + Prisma)

### 2.1 NestJS init

`backend/`는 이미 `AGENTS.md`, `CLAUDE.md`, `README.md`, `prisma/AGENTS.md`로 채워져 있으므로, 빈 폴더를 전제로 하는 `nest new backend` 또는 `nest new .`를 바로 실행하면 실패한다. 임시 scaffold를 만든 뒤 런타임 파일만 병합한다.

```bash
# 루트에서
pnpm dlx @nestjs/cli@latest new backend-scaffold --package-manager pnpm --skip-git
```

병합 원칙:

1. `backend-scaffold/`에서 생성된 Nest 런타임 파일만 기존 `backend/`로 옮긴다.
2. 기존 `backend/AGENTS.md`, `backend/CLAUDE.md`, `backend/README.md`, `backend/prisma/AGENTS.md`는 보존한다.
3. 병합이 끝나면 `backend-scaffold/`는 삭제한다.

```bash
cd backend
```

### 2.2 의존성 추가

```bash
# 핵심
pnpm add @nestjs/config @nestjs/cache-manager cache-manager
pnpm add @nestjs/throttler @nestjs/swagger
pnpm add prisma @prisma/client
pnpm add zod nestjs-zod
pnpm add ioredis cache-manager-ioredis-yet
pnpm add nestjs-pino pino-http pino pino-pretty
pnpm add cookie-parser helmet
pnpm add uuid

# 개발 의존성
pnpm add -D @types/cookie-parser
pnpm add -D vitest @vitest/coverage-v8 supertest @types/supertest
```

`uuid`는 자체 타입을 포함하므로 `@types/uuid`는 추가하지 않는다.

### 2.3 Prisma 초기화

```bash
pnpm prisma init --datasource-provider postgresql
```

`backend/.env` 작성:

```bash
DATABASE_URL="postgresql://skincare_decision:skincare_decision@localhost:5432/skincare_decision?schema=public"
REDIS_URL="redis://localhost:6379"
COOKIE_SECRET="dev-only-change-me"
CORS_ORIGIN="http://localhost:3000"
PORT=4000
NODE_ENV=local
```

`.env.example` 작성 (값 없는 키 목록만):

```bash
DATABASE_URL=
REDIS_URL=
COOKIE_SECRET=
CORS_ORIGIN=
PORT=
NODE_ENV=
```

### 2.4 Prisma schema 작성

`prisma/schema.prisma`를 [docs/db_modeling.md](docs/db_modeling.md)의 25개 테이블 기준으로 작성한다. 작성 순서:

1. enum 정의 먼저 (`UserRole`, `SessionStatus`, `FactValueType`, `PriorityResultType`, `FilterMode`, `FilterType` 등)
2. 사용자 / 신원 (users → devices → user_sessions → session_events)
3. Fact / 질문 (fact_definitions → context_questions → question_visibility_conditions → user_facts)
4. Priority (priority_rules → priority_rule_conditions → decision_runs)
5. Catalog (brands → product_categories → category_attribute_definitions → products → ingredients → product_ingredients → ingredient_groups → ingredient_group_members)
6. Filter / Matrix (product_filter_mappings → product_matrix_filter_states)
7. Traceback (reaction_reports → reaction_report_products → suspected_causes → avoidance_rules)

각 모델에 `@@map("snake_case_table")`를 명시한다. JSONB는 `Json` 타입.

### 2.5 docker compose (로컬 DB/Redis)

`backend/docker-compose.yml`:

```yaml
services:
  postgres:
    image: postgres:16
    environment:
      POSTGRES_USER: skincare_decision
      POSTGRES_PASSWORD: skincare_decision
      POSTGRES_DB: skincare_decision
    ports: ["5432:5432"]
    volumes: ["pg_data:/var/lib/postgresql/data"]
  redis:
    image: redis:7
    ports: ["6379:6379"]
volumes:
  pg_data:
```

### 2.6 마이그레이션 + GIN 인덱스

```bash
docker compose up -d
pnpm prisma migrate dev --name init
```

JSONB 인덱스 추가용 raw 마이그레이션:

```bash
pnpm prisma migrate dev --create-only --name add_jsonb_indexes
# 생성된 .sql 파일에 아래 추가:
#   CREATE INDEX products_attributes_gin ON products USING GIN (attributes);
#   CREATE INDEX user_facts_value_gin ON user_facts USING GIN (value);
#   CREATE INDEX session_events_payload_gin ON session_events USING GIN (payload);
pnpm prisma migrate dev
```

### 2.7 NestJS 모듈 구현 (스켈레톤)

레이어 순서: **types → config → repositories → services → providers → controllers → modules.**

폴더 구조는 아래 기준으로 수동 생성한다.

```text
src/
  lib/
  types/
  config/
  repositories/
  services/
  providers/
  controllers/
  modules/
```

도메인 모듈 7개 (`Identity`, `Facts`, `Priority`, `Catalog`, `Matrix`, `Traceback`, `Events`)를 각각 `src/modules/<name>/<name>.module.ts`로 생성하고 `app.module.ts`에 등록.

각 모듈은 다음 파일을 갖는다:
- `*.controller.ts` (HTTP 라우팅, Zod로 입력 파싱)
- `*.service.ts` (도메인 로직)
- `*.repository.ts` (Prisma 호출)
- `dto.ts` 또는 `*.schema.ts` (Zod schema + 추론 타입)

### 2.8 공통 인프라

- `src/lib/prisma.service.ts`: PrismaClient를 nest scope에 등록
- `src/lib/redis.module.ts`: ioredis cache provider
- `src/lib/logger.module.ts`: nestjs-pino
- `src/lib/zod-validation.pipe.ts`: 글로벌 ValidationPipe 대체
- `src/modules/health/health.controller.ts`: `GET /health` 200 응답용 최소 헬스 체크
- `src/main.ts`: cookie-parser, helmet, `app.enableCors()`, validation pipe, swagger

### 2.9 검증

```bash
pnpm run start:dev
# PowerShell
Invoke-WebRequest http://localhost:4000/health

pnpm prisma studio
```

`memory/project_progress.md`에 "Phase 2 완료, 모듈 7개 스켈레톤 + Prisma migration init 완료" 기록.

---

## Phase 3 — Frontend (Next.js App Router)

### 3.1 Next.js init

`frontend/`도 이미 문서 파일이 들어 있는 비어 있지 않은 폴더이므로, `create-next-app frontend`를 바로 실행하지 않는다. 임시 scaffold를 만든 뒤 런타임 파일만 병합한다.

```bash
# 루트에서
pnpm dlx create-next-app@latest frontend-scaffold --ts --tailwind --eslint --app --src-dir --import-alias "@/*" --use-pnpm
```

병합 원칙:

1. `frontend-scaffold/`에서 생성된 Next 런타임 파일만 기존 `frontend/`로 옮긴다.
2. 기존 `frontend/AGENTS.md`, `frontend/CLAUDE.md`, `frontend/README.md`는 보존한다.
3. 병합이 끝나면 `frontend-scaffold/`는 삭제한다.

`lint`는 루트 워크스페이스 검증에 포함되므로 `--no-eslint`는 사용하지 않는다.

```bash
cd frontend
```

### 3.2 의존성 추가

```bash
pnpm add @tanstack/react-query @tanstack/react-query-devtools
pnpm add zustand
pnpm add zod react-hook-form @hookform/resolvers
pnpm add ky      # fetch wrapper (또는 axios)
pnpm add clsx tailwind-merge class-variance-authority lucide-react
pnpm add @radix-ui/react-slot
pnpm add date-fns

pnpm add -D @types/node
pnpm add -D vitest @vitest/coverage-v8 @testing-library/react @testing-library/jest-dom jsdom
```

### 3.3 shadcn/ui 셋업

```bash
pnpm dlx shadcn@latest init
# - Style: Default
# - Base color: Slate (이후 design_system 토큰으로 덮어쓸 예정)
# - CSS variables: yes
```

설치 후 자주 쓰는 컴포넌트:

```bash
pnpm dlx shadcn@latest add button card input label badge dialog select tabs tooltip
```

### 3.4 Tailwind ↔ Ant Design 토큰 매핑

`design_system/colors_and_type.css`의 변수를 `frontend/src/styles/tokens.css`로 복사하고 `globals.css`에서 import. `tailwind.config.ts`의 `theme.extend.colors`에 다음을 매핑:

```ts
// 예시 (실제 값은 design_system/colors_and_type.css 참조)
colors: {
  primary: {
    1: 'var(--color-primary-1)',
    DEFAULT: 'var(--color-primary-6)',
    hover: 'var(--color-primary-5)',
    active: 'var(--color-primary-7)',
  },
  // success / warning / danger / neutral 동일 패턴
}
```

`borderRadius.DEFAULT: '2px'`, `fontFamily.sans: ['Noto Sans KR', 'Roboto', ...]`로 설정.

### 3.5 환경변수

`frontend/.env.local`:

```bash
NEXT_PUBLIC_API_BASE_URL=http://localhost:4000
NEXT_PUBLIC_APP_ENV=local
```

`.env.local.example`도 동일한 키 + 빈 값으로 커밋.

### 3.6 폴더 스켈레톤

```text
src/
  lib/
  types/
  config/
  api/
  hooks/
  store/
  components/
    ui/
    landing/
    priority-gate/
    category/
    product/
    traceback/
  app/
    priority-gate/
    category-decision/
      [category]/
    product-matrix/
    products/
      [id]/
    reaction-traceback/
```

`src/app/layout.tsx`에 TanStack Query Provider, Zustand devtools, fonts 등록.

### 3.7 핵심 모듈 작성 순서

1. `src/lib/fetcher.ts` — `x-device-id` 자동 첨부 + Problem Details 파싱
2. `src/lib/cookies.ts` — device_id cookie helper
3. `src/types/api.ts` — Backend DTO Zod schema (memory/api_contracts.md 기준)
4. `src/config/{env,concerns,design-tokens}.ts`
5. `src/api/*.ts` — endpoint별 wrapper
6. `src/hooks/*.ts` — TanStack Query hook
7. `src/store/{useSessionStore,useFilterStore}.ts`
8. `src/components/ui/` — shadcn 기본 + custom
9. `src/app/page.tsx` (S01) → priority-gate (S02) → category-decision (S03~S05) → product-matrix (S06) → products/[id] (S07) → reaction-traceback (S08)

### 3.8 검증

```bash
pnpm run dev
# http://localhost:3000 접속해 layout이 그려지는지 확인
pnpm run build  # 타입 에러 0인지 확인
```

`memory/project_progress.md`에 "Phase 3 완료" 기록.

---

## Phase 4 — 도메인 구현 (BE/FE 동시)

화면별로 BE 엔드포인트와 FE 컴포넌트를 짝지어 구현한다.

### 4.1 구현 순서 (P0 → P3)

| 우선순위 | 화면              | 핵심 BE                                                  | 핵심 FE                                                  |
| -------- | ----------------- | -------------------------------------------------------- | -------------------------------------------------------- |
| P0       | 관리자 — 제품 등록 | `POST /admin/products`, `POST /admin/upload-image` | `/admin/products/new` 동적 폼 ([admin_product_input_spec.md](docs/admin_product_input_spec.md) 기준, 토너 우선) |
| P0       | S06 Product Matrix | `GET /product-matrix`, `POST /product-matrix/filter-state` | `/product-matrix` 페이지 + filter chip + product card    |
| P1       | S01 Landing       | (없음, 정적 + 캐러셀)                                    | `/` 4-segment + concern carousel + fast lane             |
| P1       | S02 Priority Gate | `POST /priority-gate/evaluate`                           | `/priority-gate` 폼 + 결과 카드                          |
| P1       | S03~S05 Category Decision | `POST /category-decision/seed`, `GET /facts/questions` | `/category-decision/[category]` 3-step wizard           |
| P2       | S07 Product Detail | `GET /products/:id`                                      | `/products/[id]` 상세                                    |
| P3       | S08 Traceback     | `POST /reactions/reports`, `POST /reactions/avoidance-rules` | `/reaction-traceback` 폼 + 결과                       |

> **관리자 제품 등록(P0)**은 Product Matrix가 표시할 데이터를 채우기 위한 선행 작업이다. 현재 활성 범위는 `docs/db_seed_plan.md`와 `docs/AGENTS.md` 기준의 **토너 우선 + 수동 입력(X)** 이다. 외부 데이터 연동(Y/Z)과 serum의 `effective_dose_met` 자동 판정은 `docs/Rejected/` 명세를 다시 활성화한 뒤 추가한다.

### 4.2 화면별 작업 체크리스트

각 화면 작업 전 다음 항목을 확인:

- [ ] `docs/page_content_specification.md`의 해당 섹션 (카피/CTA/슬롯)
- [ ] `docs/wireframe_summary.md`의 해당 섹션 (흐름)
- [ ] `docs/matching_rules_revised.md`의 해당 룰 (FE/BE 어디에 두는지)
- [ ] `memory/api_contracts.md`의 endpoint 시그니처
- [ ] (관리자 화면 한정) `docs/admin_product_input_spec.md`의 해당 카테고리 attribute 표

작업 완료 후:

- [ ] `memory/api_contracts.md` 시그니처 갱신
- [ ] `memory/project_decisions.md`에 비표준 결정 기록
- [ ] BE: 단위 테스트 + e2e 1개 추가
- [ ] FE: 화면을 브라우저에서 실제 사용하며 골든패스 확인

### 4.2.1 관리자 제품 등록(P0) 작업 체크리스트

- [ ] `docs/admin_product_input_spec.md` 전체 정독 (필드/업로드/검증 절차 포함)
- [ ] `docs/db_seed_plan.md`에서 토너 seed 범위와 admin 입력 경계를 확인
- [ ] (외부 데이터 재활성화 시에만) `docs/Rejected/data_source_catalog.md` 검토
- [ ] (serum 기능성 재활성화 시에만) `docs/Rejected/ingredient_efficacy_thresholds.md` 검토
- [ ] BE: `POST /admin/products` Zod schema (초기 범위: toner, 이후 카테고리 확장)
- [ ] BE: `POST /admin/upload-image` (S3 presigned URL — 외부 URL은 reject)
- [ ] BE (serum 기능성 재활성화 시): `services/efficacy/thresholds.ts` 코드 상수 + `effective-dose-met.spec.ts`
- [ ] BE (외부 데이터 재활성화 시): `providers/external/naver-shopping.ts` + `providers/external/mfds-functional.ts`
- [ ] FE: 카테고리 선택 → 동적 attribute 폼 렌더링 (초기 범위: toner)
- [ ] FE: 이미지 드래그&드롭 + presigned URL 업로드
- [ ] FE (외부 데이터 재활성화 시): "Naver에서 가져오기" / "식약처에서 검증" 버튼 + 후보 미리보기
- [ ] FE (serum 기능성 재활성화 시): `effective_dose_met` 자동 판정 배지 + override 입력 UI
- [ ] e2e: toner 1건 등록 → Product Matrix에 노출되는지 확인

### 4.3 공통 결정 로직 위치 가이드

| 로직                                        | 위치                                          |
| ------------------------------------------- | --------------------------------------------- |
| Concern 태그 → preset_facts                 | FE `src/config/concerns.ts`                   |
| Priority Rule 평가                          | BE `services/priority/priority.service.ts`    |
| Question visibility 조건 평가               | BE `services/facts/visibility.service.ts`     |
| product_filter_mappings → 동적 where        | BE `services/matrix/filter-builder.service.ts`|
| application-layer computed operator         | BE `services/matrix/computed-operators.ts`    |
| avoidance_rules 적용 (제외/주의 분기)       | BE `services/matrix/avoidance.service.ts`     |
| filter chip 렌더링 / 추가·삭제 UI            | FE `components/product/FilterChips.tsx`       |
| 가격대 띠 (price_band)                      | FE `components/product/PriceBandRow.tsx`      |

---

## Phase 5 — 시드 데이터 & 테스트

### 5.1 Seed 스크립트

`backend/prisma/seed.ts` 작성. 데이터 출처:

| seed 항목                            | 출처                                                        |
| ------------------------------------ | ----------------------------------------------------------- |
| product_categories (6개)             | `docs/product_taxonomy.md`                                  |
| category_attribute_definitions       | `docs/product_attribute_schema.md`                          |
| fact_definitions                     | `docs/db_modeling.md` 8장 + `matching_rules_revised.md`     |
| context_questions + visibility       | `docs/page_content_specification.md` + `matching_rules_revised.md` 4장 |
| priority_rules + conditions          | `docs/matching_rules_revised.md` 3.2 / 3.3                  |
| product_filter_mappings              | `docs/matching_rules_revised.md` 5장 (있다면)               |
| brands + products (toner 25+종)      | `docs/db_seed_plan.md` + `docs/화장품 성분비교.CSV`         |
| ingredients + product_ingredients    | `docs/db_seed_plan.md` + `docs/화장품 성분비교.CSV`         |

시드 구조와 의존성 순서는 [docs/db_seed_plan.md](docs/db_seed_plan.md)를 단일 진실로 사용한다. 토너 MVP 기준으로 카탈로그 seed는 toner만 넣고, 나머지 카테고리 제품은 admin UI로 점진 추가한다.

```bash
# backend/package.json에 추가
# "prisma": { "seed": "tsx prisma/seed.ts" }
pnpm --filter backend add -D tsx
pnpm --filter backend exec prisma db seed
```

### 5.2 테스트

```bash
# Backend
pnpm --filter backend run test
pnpm --filter backend run test:e2e

# Frontend
pnpm --filter frontend run test
pnpm --filter frontend run lint
pnpm --filter frontend run build
```

체크리스트:

- [ ] BE: Priority 평가 단위 테스트 (`recent_irritation_hold`, `outdoor_sunscreen_route`, `priority_pass` 시나리오)
- [ ] BE: Matrix filter builder 단위 테스트 (BASIC + PERSONALIZED 조합)
- [ ] BE: e2e — `/priority-gate/evaluate` → `/category-decision/seed` → `/product-matrix` 흐름
- [ ] FE: Landing → Priority Gate → Product Matrix 골든패스를 브라우저에서 1회 수동 검증

---

## Phase 6 — 인프라 (Docker + GitHub Actions)

### 6.1 production Dockerfile

`infra/docker/Dockerfile.backend` (multi-stage):

```dockerfile
FROM node:20-alpine AS base
ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH
RUN corepack enable
WORKDIR /app

FROM base AS deps
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./
COPY backend/package.json backend/package.json
RUN pnpm install --frozen-lockfile

FROM deps AS build
COPY --from=deps /app /app
COPY backend/ backend/
RUN pnpm --filter backend exec prisma generate
RUN pnpm --filter backend run build
RUN pnpm deploy --filter backend --prod /out/backend

FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /out/backend ./
EXPOSE 4000
CMD ["node", "dist/main.js"]
```

`infra/docker/Dockerfile.frontend`도 동일 패턴으로 작성하되, `next.config.mjs`에 `output: 'standalone'`을 먼저 설정한다.

### 6.2 docker-compose (운영 가까운 로컬)

`infra/docker/docker-compose.yml`에 backend + frontend + postgres + redis 4개 서비스 통합. Phase 2의 `backend/docker-compose.yml`은 dev DB/Redis만 유지.

### 6.3 GitHub Actions

`.github/workflows/ci.yml`:

```yaml
name: CI
on:
  pull_request:
  push:
    branches: [main]
jobs:
  test:
    runs-on: ubuntu-latest
    services:
      postgres: {image: postgres:16, env: {POSTGRES_PASSWORD: skincare_decision, POSTGRES_USER: skincare_decision, POSTGRES_DB: skincare_decision}, ports: ['5432:5432'], options: '--health-cmd="pg_isready" --health-interval=10s'}
      redis: {image: redis:7, ports: ['6379:6379']}
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v3
        with: { version: 9 }
      - uses: actions/setup-node@v4
        with: { node-version: 20, cache: pnpm }
      - run: pnpm install --frozen-lockfile
      - run: pnpm --filter backend exec prisma migrate deploy
      - run: pnpm -r run lint
      - run: pnpm -r run typecheck
      - run: pnpm -r run test
      - run: pnpm -r run build
```

`.github/workflows/build-and-push.yml` (main 머지 시 ECR push):

```yaml
name: Build & Push
on:
  push:
    branches: [main]
permissions: { id-token: write, contents: read }
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: aws-actions/configure-aws-credentials@v4
        with:
          role-to-assume: arn:aws:iam::<acct>:role/github-actions
          aws-region: ap-northeast-2
      - uses: aws-actions/amazon-ecr-login@v2
        id: ecr
      - name: Build & push backend
        env:
          ECR_REGISTRY: ${{ steps.ecr.outputs.registry }}
          BACKEND_REPO: skincare-decision-backend
        run: |
          IMAGE_URI="$ECR_REGISTRY/$BACKEND_REPO:${{ github.sha }}"
          docker build -f infra/docker/Dockerfile.backend -t "$IMAGE_URI" .
          docker push "$IMAGE_URI"
      # frontend도 동일 패턴
```

`github.sha` 태그를 사용할 경우, deploy 단계는 `force-new-deployment`만으로 끝내지 말고 **새 task definition revision에 새 이미지 URI를 주입**해야 한다.

### 6.4 검증

```bash
# 로컬 운영 시뮬레이션
cd infra/docker
docker compose up --build
# http://localhost:3000 접속 확인
```

---

## Phase 7 — AWS 배포

### 7.1 사전 셋업 (Console 또는 IaC)

- AWS 계정 + ap-northeast-2 region
- VPC + 2 public + 2 private subnet
- ECR repo 2개 (`skincare-decision-backend`, `skincare-decision-frontend`)
- RDS Postgres 16 (private subnet, t4g.micro for dev)
- ElastiCache Redis 7 (cluster mode disabled, single-AZ for dev / multi-AZ for prod)
- S3 bucket (frontend 정적 자산 + CloudFront origin)
- CloudFront distribution
- Route 53 hosted zone + ACM 인증서 (도메인 보유 시)
- ALB + ECS Fargate cluster
- Secrets Manager: `skincare-decision/prod/database`, `skincare-decision/prod/app`
- IAM OIDC role for GitHub Actions

### 7.2 ECS Task Definition (요지)

- `skincare-decision-backend-task`: container 1개, port 4000, env from Secrets Manager, CPU 0.5 / Mem 1GB.
- `skincare-decision-frontend-task`: container 1개, port 3000, env로 `NEXT_PUBLIC_API_BASE_URL` 주입.
- 두 service 모두 ALB target group 연결.

### 7.3 RDS migration

```bash
# CI/CD에서 deploy 직전 step
DATABASE_URL="..." pnpm --filter backend exec prisma migrate deploy
```

### 7.4 deploy.yml (수동 또는 main 자동)

```yaml
name: Deploy
on:
  workflow_dispatch:
    inputs:
      env: { description: dev|prod, required: true }
      image_tag: { description: 'ECR image tag (예: git SHA)', required: true }
jobs:
  deploy:
    runs-on: ubuntu-latest
    permissions: { id-token: write, contents: read }
    steps:
      - uses: actions/checkout@v4
      - uses: aws-actions/configure-aws-credentials@v4
        with:
          role-to-assume: arn:aws:iam::<acct>:role/github-actions
          aws-region: ap-northeast-2
      - name: Render backend task definition
        id: render-backend
        uses: aws-actions/amazon-ecs-render-task-definition@v1
        with:
          task-definition: infra/aws/ecs/backend-task-definition.json
          container-name: backend
          image: <acct>.dkr.ecr.ap-northeast-2.amazonaws.com/skincare-decision-backend:${{ inputs.image_tag }}
      - name: Deploy backend service
        uses: aws-actions/amazon-ecs-deploy-task-definition@v2
        with:
          task-definition: ${{ steps.render-backend.outputs.task-definition }}
          service: skincare-decision-backend
          cluster: skincare-decision
          wait-for-service-stability: true
      # frontend도 동일 패턴으로 task definition render/deploy
      - name: CloudFront invalidation
        run: aws cloudfront create-invalidation --distribution-id <id> --paths "/*"
```

### 7.5 검증

- `https://api.<도메인>/health` 200
- `https://<도메인>/` 정상 렌더
- CloudWatch logs에 backend/frontend 로그 출력
- RDS Performance Insights에 connection 1~2개 확인

`memory/project_progress.md`에 배포 일자 / 환경 / 커밋 SHA 기록.

---

## 부록 A — 명령 치트시트

```bash
# 모노레포
pnpm install
pnpm -r run build
pnpm -r run typecheck

# Backend
pnpm --filter backend run start:dev
pnpm --filter backend exec prisma migrate dev --name <이름>
pnpm --filter backend exec prisma db seed
pnpm --filter backend exec prisma studio
pnpm --filter backend run test:e2e

# Frontend
pnpm --filter frontend run dev
pnpm -C frontend dlx shadcn@latest add <component>
pnpm --filter frontend run build

# Infra
docker compose -f backend/docker-compose.yml up -d
docker compose -f infra/docker/docker-compose.yml up --build
```

---

## 부록 B — 자주 부딪히는 함정

| 증상                                                                  | 원인                                          | 해결                                                                                                       |
| --------------------------------------------------------------------- | --------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| Prisma `Json` 컬럼에 임의 값이 들어감                                 | Service에서 Zod 검증 누락                     | `backend/src/types/product-attributes.ts` discriminated union으로 검증 후 Repository 호출                   |
| `user_facts` 최신 값이 source 우선순위와 다름                         | 단순 `created_at` 정렬                         | Repository에서 `traceback > context > priority_gate > concern` 우선순위 정렬                                |
| Next.js Hydration mismatch                                            | Server에서 device_id 읽고 client에서 다른 값  | device_id를 cookie에서만 읽고, client mount 후 부재 시 새로 발급                                           |
| Tailwind 색이 design_system과 어긋남                                  | Tailwind config에 직접 hex 입력               | `colors_and_type.css` CSS 변수 → `tailwind.config.ts`에서 `var(--...)`로 참조                              |
| GH Actions에서 `prisma migrate deploy` 실패                           | DATABASE_URL secret 누락 또는 RDS 보안그룹 차단 | OIDC role + Secrets Manager 사용, RDS SG에 GH runner egress IP 없으면 임시 EC2 bastion 또는 SSM session    |
| ECS task가 즉시 stop                                                  | ENV 누락 / Secrets Manager 권한 부족          | task role IAM에 `secretsmanager:GetSecretValue` (`skincare-decision/*` resource) 추가                     |

---

## 부록 C — Phase 별 완료 기준

각 Phase는 다음 조건 모두 만족 시 다음으로 넘어간다.

- Phase 1: `pnpm install` 성공, `pnpm-workspace.yaml` 인식.
- Phase 2: `pnpm --filter backend run start:dev` 실행 + `prisma studio`로 25개 테이블 표시.
- Phase 3: `pnpm --filter frontend run dev`로 layout 표시 + `pnpm run build` 통과.
- Phase 4: 화면별 e2e 골든패스 통과 + `memory/api_contracts.md` 시그니처 일치.
- Phase 5: `pnpm --filter backend exec prisma db seed` 멱등 + `pnpm -r run test` 통과.
- Phase 6: `infra/docker/docker-compose.yml`로 운영 시뮬레이션 성공 + GH Actions CI green.
- Phase 7: prod ALB → backend health 200 + 프론트 도메인 렌더 성공.

---

## 부록 D — AI Agent 운용 메모

- 본 문서는 **명령서**다. 변경하려면 PR 단위로 `memory/project_decisions.md`에 사유를 남기고 본 문서를 갱신.
- Phase 단위로 한 번에 한 PR. 여러 Phase를 한 PR에 섞지 말 것.
- 각 Phase 완료 시 `memory/project_progress.md`에 다음 형식으로 기록:
  ```
  ## [YYYY-MM-DD] Phase X 완료
  - 산출물: ...
  - 검증: ...
  - 다음: Phase X+1
  ```
