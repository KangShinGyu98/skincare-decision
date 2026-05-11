# Skincare Decision MVP

> **"더 많은 추천이 아닌 더 적은 선택"** — 스킨케어 결정 도구.
> 사용자의 피부·루틴·고민에서 출발해 *지금 사야 하는지*부터 정리하고, 필요할 때만 6개 카테고리 안에서 후보를 좁혀 보여주는 웹 서비스.

---

## 0. AI Agent (Claude / Codex)에게 — 작업 전 필수 읽기

본 저장소는 **Claude와 Codex를 번갈아 사용**합니다. 두 Agent가 동일한 컨텍스트를 공유하도록, 어느 Agent든 작업 시작 전 다음 순서로 읽습니다.

| 순서 | 파일                                 | 역할                                                                   |
| ---- | ------------------------------------ | ---------------------------------------------------------------------- |
| 1    | [AGENTS.md](AGENTS.md)               | **시작점 + AI Agent 지시사항** — 어디서 시작하고 무엇을 하면 안 되는지 |
| 2    | [CLAUDE.md](CLAUDE.md)               | **프로젝트 개요 + 폴더 구조 + 황금 원칙 + 기술 스택 + 범위**           |
| 3    | [memory/MEMORY.md](memory/MEMORY.md) | 누적된 결정·진행·계약·이슈 인덱스 (필요한 메모리 파일을 따라 들어감)   |

세션 종료 전에는 [memory/project_progress.md](memory/project_progress.md)에 변경 요약을 남겨, 다음 세션의 Agent가 이어받을 수 있도록 합니다.
새 결정/리스크는 [memory/project_decisions.md](memory/project_decisions.md)에 append-only로 추가합니다.

> ⛔ 위 순서를 건너뛴 채 코드를 수정하면 Claude/Codex 컨텍스트가 어긋납니다.
> 폴더 진입 시에는 해당 폴더의 `AGENTS.md`를 먼저 엽니다.

---

## 1. 프로젝트 설명

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

## 2. 기술 스택

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

## 3. 빠른 시작

> 본격 셋업은 [EXECUTION_PLAN.md](EXECUTION_PLAN.md)를 따른다.

```bash
# 1) 인프라 (Postgres, Redis)
docker compose up -d postgres redis

# 2) 백엔드
cd backend
pnpm install
pnpm prisma migrate dev
pnpm prisma db seed
pnpm run start:dev   # http://localhost:4000

# 3) 프론트엔드 (별도 터미널)
cd frontend
pnpm install
pnpm run dev         # http://localhost:3000
```

---

## 4. 디렉터리 한 줄 요약

```
docs/                # 명세 (DB, attribute, matching rule, page spec)
design_system/       # Ant Design 기반 UI 토큰 + 프로토타입 컴포넌트
Codex_Research/      # 시장·UX·결정 여정 조사 (배경 컨텍스트)
Assets/              # 와이어프레임 이미지
ClaudeProtype/       # HTML mockup
crawl/, scripts/     # 룰 추출용 크롤링 산출물 (완료)
memory/              # AI Agent 결정/진행/계약/이슈 메모리
backend/             # NestJS 앱 (Phase 2부터 init)
frontend/            # Next.js App Router 앱 (Phase 3부터 init)
infra/               # Docker/IaC/GH Actions (Phase 6)
```

폴더별 상세 역할은 각 폴더의 `AGENTS.md`에 있다.

---

## 5. AI Agent (Claude / Codex) 협업 절차 상세

위 0번 섹션이 진입 규칙이고, 본 절은 작업 단계별 상세 약속입니다.

| 시점                       | 행동                                                                                                                                          |
| -------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| 세션 시작                  | [AGENTS.md](AGENTS.md) → [CLAUDE.md](CLAUDE.md) → [memory/MEMORY.md](memory/MEMORY.md) 순독                                                   |
| 폴더 진입                  | 해당 폴더의 `AGENTS.md`를 먼저 연다 (없으면 만들고 작업)                                                                                      |
| 새 결정/리스크             | [memory/project_decisions.md](memory/project_decisions.md)에 append-only로 기록                                                               |
| API 변경                   | [memory/api_contracts.md](memory/api_contracts.md)를 먼저 갱신, 그 다음 코드                                                                  |
| 버그 해결                  | [memory/known_issues.md](memory/known_issues.md)에 증상 → 원인 → 해결책 기록                                                                  |
| 명세 ↔ 코드 충돌           | `docs/`를 먼저 갱신한 뒤 코드를 수정                                                                                                          |
| **폴더 구조 / 문서 이동**  | **`/sync-structure` skill 호출.** 구조-진실 문서(README §4 · `AGENTS.md` · `CLAUDE.md` · 각 `AGENTS.md`)만 갱신하고 깨진 경로를 일괄 치환한다. |
| 세션 종료                  | [memory/project_progress.md](memory/project_progress.md)에 변경 요약 + 다음 우선순위 기록                                                     |

### Claude ↔ Codex 컨텍스트 공유 원칙

- 두 Agent는 동일한 `AGENTS.md` / `CLAUDE.md` / `memory/`를 진실로 삼는다.
- 어느 Agent도 다른 Agent의 결정 기록을 **수정·삭제하지 않는다** — 새 결정으로 덮어쓴다(append-only).
- 폴더 구조 변경은 [`/sync-structure` skill](.claude/skills/sync-structure/SKILL.md)을 호출해 처리한다. 이 skill은 **구조-진실 문서(README · AGENTS.md · CLAUDE.md · 각 폴더 AGENTS.md)만 정밀 갱신**하고, 콘텐츠 파일은 절대 읽지 않아 토큰을 최소화한다. 직접 수동 수정은 권장하지 않는다 — 누락 / 깨진 경로 위험.
- 모든 폴더에는 `AGENTS.md`, 모든 코드 파일 최상단에는 한 줄 헤더 주석을 유지한다.

---

## 6. 라이선스 / 기여

내부 MVP 단계. 외부 공개 전까지 라이선스 미정.

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
