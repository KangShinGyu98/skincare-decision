# Skincare Decision MVP

> **"더 많은 추천이 아닌 더 적은 선택"** — 스킨케어 결정 도구.
> 사용자의 피부·루틴·고민에서 출발해 *지금 사야 하는지*부터 정리하고, 필요할 때만 6개 카테고리 안에서 후보를 좁혀 보여주는 웹 서비스.

---

## 프로젝트 설명

| 기능               | 설명                                                                                       |
| ------------------ | ------------------------------------------------------------------------------------------ |
| Priority Gate      | 최근 자극·루틴·보유 제품을 점검해 "지금 새 제품을 사도 될 상태"인지 HOLD/CAUTION/PASS 판정 |
| Concern Mapper     | 고민 키워드(예: 여드름·각질·갈라짐) → 우선순위 게이트 또는 추천 카테고리로 라우팅          |
| Category Decision  | 카테고리별 핵심 질문만 보여주고 답변을 자동 필터로 변환                                    |
| Product Matrix     | BASIC + PERSONALIZED + TRACEBACK 필터를 결합해 제품 비교, 가격대 띠 노출                   |
| Reaction Traceback | 문제 제품 / 괜찮은 제품 비교로 원인 후보 성분군 추적, `avoidance_rules` 자동 생성          |
| Anonymous Identity | `device_id` 기반 비로그인 → 로그인 시 자동 병합                                            |

대상 카테고리: `toner`, `sunscreen`, `serum`, `lipcare`, `moisturizer`, `cleanser` (6개).

---

## 기술 스택

| 영역           | 스택                                                                       |
| -------------- | -------------------------------------------------------------------------- |
| Backend API    | TypeScript · NestJS · Prisma                                               |
| Database       | AWS RDS PostgreSQL 16 (products.attributes는 JSONB)                        |
| Cache          | AWS ElastiCache Redis 7                                                    |
| Frontend Web   | Next.js App Router · React · TypeScript                                    |
| Rendering      | SSR · SSG · ISR                                                            |
| Validation     | Zod (FE 입력, BE DTO ↔ Prisma 모델 contract)                               |
| 상태 관리      | TanStack Query · Zustand                                                   |
| UI             | Tailwind CSS · shadcn/ui                                                   |
| Storage        | AWS S3                                                                     |
| CDN / Edge     | CloudFront                                                                 |
| Infra          | Docker · AWS ECS Fargate · ECR · ALB · RDS · ElastiCache · S3 · CloudFront |
| Domain / HTTPS | Route 53 · ACM                                                             |
| CI/CD          | GitHub Actions → ECR → ECS Fargate 배포                                    |

상세 디렉터리 매핑 / 레이어 규칙은 [CLAUDE.md](CLAUDE.md) 참조.

---

## 폴더 구조

```
skincare-decision/
├── README.md               # 사람용 진입점 (프로젝트 개요·폴더 구조·문서 링크)
├── AGENTS.md               # AI 세션 시작 시 읽는 문서 인덱스
├── CLAUDE.md               # AI 작업 규칙·워크플로우·레이어드 아키텍처·메모리 규칙
├── memory/
│   ├── ADR/                # 장기 설계 결정(ADR) 파일 모음 (작업당 1파일)
│   ├── external_apis.md    # 외부 API 인터페이스 계약 및 Provider 정보
│   └── task_plan.md        # 현재 작업의 임시 계획 / current state (작업 완료 후 삭제)
├── docs/                   # 명세 (DB·attribute·matching rule·page spec·wireframe)
├── design_system/          # Ant Design 기반 UI 토큰 + 프로토타입 컴포넌트
├── Assets/                 # 와이어프레임/UX 참고 이미지
├── scripts/                # 룰 추출용 크롤링/유틸 Python 스크립트
├── backend/                # NestJS 앱 (docs 기준 재구축 예정)
├── frontend/               # Next.js App Router 앱 (예정)
└── infra/                  # Docker / IaC / GitHub Actions (예정)
```

---

## 구성 요소

### 하네스 구성 요소

| 파일 / 폴더               | 역할                                                           | 유지 정책                |
| ------------------------- | -------------------------------------------------------------- | ------------------------ |
| `README.md`               | 사람용 진입점. 개요·폴더 구조·문서 링크                        | 영구                     |
| `AGENTS.md`               | AI 세션 시작 시 읽는 문서 인덱스 (파일명 + 최소 설명)          | 영구                     |
| `CLAUDE.md`               | AI 작업 규칙·워크플로우·아키텍처·메모리 관리 규칙              | 영구                     |
| `memory/ADR/`             | 장기적으로 유지할 설계 결정만 ADR 형식으로 기록 (작업당 1파일) | 영구                     |
| `memory/external_apis.md` | 외부 API 인터페이스 계약만 기록                                | 영구                     |
| `memory/task_plan.md`     | 현재 작업의 임시 계획 + current state                          | 임시 (작업 완료 후 삭제) |

### 프로젝트 구성 요소

| 폴더 / 파일      | 역할                                                | 유지 정책 |
| ---------------- | --------------------------------------------------- | --------- |
| `docs/`          | DB·attribute·matching rule·page spec·wireframe 명세 | 영구      |
| `design_system/` | Ant Design 기반 UI 토큰 + 프로토타입 컴포넌트       | 영구      |
| `Assets/`        | 와이어프레임/UX 참고 이미지                         | 영구      |
| `scripts/`       | 룰 추출용 크롤링/유틸 Python 스크립트               | 영구      |
| `backend/`       | NestJS 앱 (docs 기준 재구축 예정)                   | 영구      |
| `frontend/`      | Next.js App Router 앱 (예정)                        | 영구      |
| `infra/`         | Docker / IaC / GitHub Actions (예정)                | 영구      |

---

## 작업 워크플로우

사람이 새 채팅과 시작 프롬프트로 작업을 열고, AI는 다음 순서로 진행합니다.

1. `git branch` 생성 (목적 단위)
2. `AGENTS.md`, `CLAUDE.md` 확인
3. 관련 코드 및 문서 탐색
4. `memory/task_plan.md` 초안 작성 → 사람이 검토
5. 코드 작성 및 작은 단위 commit
6. 필요 시 `memory/ADR/`에 새 ADR 작성 (사람 승인)
7. 사람이 diff·commit 흐름 검토 후 branch merge 승인

자세한 규칙과 레이어드 아키텍처는 [CLAUDE.md](CLAUDE.md)를 참고하세요.

### 작업 단위 시작 프롬프트 예시

```text
[목적] 랜딩페이지에서 사용할 API를 구축해야 해.

AGENTS.md 와 CLAUDE.md 파일을 먼저 확인하고, 워크플로우에 따라서:

1. git branch 생성
2. 관련 코드 및 문서 탐색
3. task_plan.md 초안 작성

을 먼저 진행해줘.

task_plan 에는 목표 / 범위 / 파일 범위(read·write) / current state 를 포함해줘.
구현은 내가 task_plan 을 검토한 이후 시작해.
```

---

## 명령어

root의 env 파일 4개는 모두 git에 올리지 않습니다.

- `.env.example`
- `.env.development`
- `.env.test`
- `.env.production`

### Development

```bash
# 1) 인프라 (Postgres 5432, Redis 6379)
docker compose --env-file .env.development -f infra/docker/docker-compose.dev.yml up -d postgres redis

# 2) 백엔드
pnpm install
pnpm --filter backend exec prisma migrate deploy
pnpm --filter backend run prisma:seed
pnpm --filter backend run start:dev   # http://localhost:4000

# zod 스키마 추가했을 때
pnpm --filter @skincare-decision/shared run build
```

```bash
# 3) 프론트엔드 (별도 터미널)
cd frontend
pnpm install
pnpm run dev         # http://localhost:3000
```

### Test

```bash
# 테스트 인프라 (Postgres 5433, Redis 6380)
docker compose --env-file .env.test -f infra/docker/docker-compose.test.yml up -d postgres redis

# 백엔드 테스트
cd backend
pnpm install
NODE_ENV=test pnpm prisma migrate deploy
NODE_ENV=test pnpm test

# 테스트 DB 초기화: test DB를 drop/recreate 하고 migration 재적용
NODE_ENV=test pnpm exec prisma migrate reset --force --skip-seed


# unit + integration 전체 실행
NODE_ENV=test pnpm test

# unit만 실행
NODE_ENV=test pnpm run test:unit

# integration만 실행
NODE_ENV=test pnpm run test:integration

# Prisma studio
NODE_ENV=development pnpm --filter backend exec prisma studio --browser none --port 5555

```

### Production

```bash
# production DB는 AWS RDS를 사용합니다. Docker Compose는 Redis만 실행합니다.
# 실행 전 .env.production 의 DATABASE_URL과 CHANGE_ME 값을 실제 운영 값으로 교체합니다.
docker compose --env-file .env.production -f infra/docker/docker-compose.prod.yml up -d redis

# 백엔드 production 실행
cd backend
pnpm install
NODE_ENV=production pnpm prisma migrate deploy
NODE_ENV=production pnpm run build
NODE_ENV=production pnpm run start:prod
```

### 공통

```bash
# shared 빌드
pnpm --filter @skincare-decision/shared run build

# schema.prisma 만든 뒤 generate
pnpm --filter backend exec prisma generate

# 환경별 인프라 종료
docker compose --env-file .env.development -f infra/docker/docker-compose.dev.yml down
docker compose --env-file .env.test -f infra/docker/docker-compose.test.yml down
docker compose --env-file .env.production -f infra/docker/docker-compose.prod.yml down
```

---

## 참고

- README에는 긴 프로젝트 배경이나 세부 결정 이력을 넣지 않습니다.
- 장기 설계 결정은 `memory/ADR/`에 ADR로 남기며, 기존 파일에 append 하지 않고 항상 새 파일로 작성합니다.
- 진행 중 작업 상태는 `memory/task_plan.md`에 두고, 작업이 끝나면 삭제합니다.
- AI 작업 규칙은 `CLAUDE.md`, 문서 위치 안내는 `AGENTS.md`에 둡니다.

---

## 라이선스 / 기여

내부 MVP 단계. 외부 공개 전까지 라이선스 미정.

---

## Git Commit Message Rules

형식: `<type>(<scope>): <subject>` — Conventional Commits 기반. **subject 와 body 는 한국어로 작성한다** (type / scope 는 영문 키워드 그대로).

### Type

| Type       | 설명                                         |
| ---------- | -------------------------------------------- |
| `feat`     | 새로운 기능 추가                             |
| `fix`      | 버그 수정                                    |
| `docs`     | 문서 변경                                    |
| `style`    | 코드 포맷, 세미콜론 누락 등 (로직 변경 없음) |
| `refactor` | 기능 변경 없는 코드 리팩토링                 |
| `test`     | 테스트 코드 추가 또는 수정                   |
| `chore`    | 빌드, 설정, 패키지 관련 변경                 |
| `perf`     | 성능 개선                                    |
| `ci`       | CI/CD 설정 변경                              |
| `revert`   | 이전 커밋 되돌리기                           |

### Scope (모노레포 영역 구분)

모노레포이므로 `backend` / `frontend`를 별도 type으로 늘리지 않고 **scope 자리**로 표시한다.

| Scope      | 쓰임                                                                             |
| ---------- | -------------------------------------------------------------------------------- |
| `backend`  | `backend/` 코드·설정 변경                                                        |
| `frontend` | `frontend/` 코드·설정 변경                                                       |
| `infra`    | `infra/`, Docker, GitHub Actions, AWS 리소스                                     |
| `db`       | `backend/prisma/`, 마이그레이션, seed 스크립트                                   |
| `docs`     | `docs/` 명세 (커밋 type `docs`와 별개. 예: `docs(db): …`는 DB 명세 문서 변경)    |
| `memory`   | `memory/` 결정·진행·계약·이슈 기록                                               |
| `deps`     | 의존성 추가/제거/bump (`chore(deps): …`)                                         |
| `repo`     | 루트 설정 (`.gitignore`, 루트 `package.json`, workspace, prettier·editor config) |
| `design`   | `design_system/`, `Assets/`, `ClaudeProtype/` 등 디자인/목업 자산                |

여러 영역을 한 커밋에 섞지 않는 게 원칙. 부득이하면 가장 큰 영향 영역 하나만 scope로 적거나 `repo`로 묶는다.

### 예시

```
feat(backend): POST /priority-gate/evaluate 추가
feat(frontend): S02 우선순위 게이트 결과 카드 연결
fix(backend): user_facts 소스 우선순위 정렬 오류 수정
chore(repo): 워크스페이스 typescript ^5.9.3로 정렬
chore(deps): @nestjs/* 11 버전으로 bump
docs(db): 토너 attribute 스키마 문서화
test(backend): priority rule HOLD/CAUTION 분기 테스트 추가
ci(infra): ECR push 워크플로 추가
```

### 브랜치 명 규약 (참고)

`<type>/<scope>-<short-slug>` — 예: `feat/backend-priority-gate`, `chore/repo-tsconfig`.
