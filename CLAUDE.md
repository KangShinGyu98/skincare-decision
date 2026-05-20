# CLAUDE.md — Skincare Decision MVP 프로젝트 컨텍스트

> **본 파일은 프로젝트의 본체 컨텍스트(개요·황금 원칙·폴더 구조·기술 스택·범위)를 담습니다.**
> Claude와 Codex를 번갈아 사용하므로, 어느 Agent든 본 파일을 작업 전 필독합니다.

---

## ⛔ 작업 시작 전 필수 행동 (Claude / Codex 공통)

1. **[AGENTS.md](AGENTS.md)** — AI Agent 시작점, 행동 규칙, 폴더 진입 인덱스. **본 파일보다 먼저 읽기**.
2. **본 파일 (CLAUDE.md)** — 프로젝트 개요·구조·원칙. 코드 작성의 기준.
3. **[memory/MEMORY.md](memory/MEMORY.md)** — 누적된 결정·진행·계약·이슈 인덱스.

> 이 순서를 건너뛴 채 코드를 수정하면 Claude/Codex 사이의 컨텍스트가 어긋납니다.

### 두 파일의 역할 분담

| 파일      | 담는 것                                                                 |
| --------- | ----------------------------------------------------------------------- |
| AGENTS.md | **시작점 + AI Agent 지시사항** (어디서 시작하고, 무엇을 하면 안 되는지) |
| CLAUDE.md | **프로젝트 개요·폴더 구조·기술 스택·황금 원칙·범위** (본 파일)          |

충돌 시: AGENTS.md 행동 규칙 우선, 프로젝트 정의는 본 파일을 신뢰.

---

## 목적

스킨케어 제품을 **추천하는 서비스가 아니라, "지금 사지 않아도 되는지"부터 정리해주는 결정 도구**.
사용자의 피부 상태·루틴·고민에 따라 **무엇을 먼저 해야 하는지** 가이드하고, 필요할 때만 6개 카테고리(토너/선크림/세럼/립케어/로션·크림/클렌저) 안에서 후보를 좁힌다.

핵심 슬로건: **"더 많은 추천이 아닌 더 적은 선택"**

## 핵심 화면 (MVP)

| ID  | 화면               | 역할                                                        |
| --- | ------------------ | ----------------------------------------------------------- |
| S01 | Landing            | 4개 세그먼트 진입 + Concern Mapper 캐러셀 + Fast Lane       |
| S02 | Priority Gate      | 새 제품을 사도 되는 상태인지 판정 (HOLD/CAUTION/PASS/ROUTE) |
| S03 | Category Decision  | 카테고리별 핵심 질문 → 자동 필터 생성                       |
| S06 | Product Matrix     | 필터 기반 제품 비교 (BASIC + PERSONALIZED + TRACEBACK 필터) |
| S07 | Product Detail     | 적합도 사유, attribute, 성분 노출                           |
| S08 | Reaction Traceback | 문제/괜찮은 제품 비교 → avoidance_rules 생성                |

상세 명세는 [docs/ContentSpec/page_content_specification.md](docs/ContentSpec/page_content_specification.md)와 [docs/ContentSpec/wireframe_summary.md](docs/ContentSpec/wireframe_summary.md)를 참조한다.

## 기술 스택

| 영역           | 스택                                                                       |
| -------------- | -------------------------------------------------------------------------- |
| Backend API    | TypeScript · NestJS · Prisma                                               |
| Database       | AWS RDS PostgreSQL 16 (가변 제품 속성은 `products.attributes` JSONB)       |
| Cache          | AWS ElastiCache Redis 7 (priority rule, filter mapping, matrix snapshot)   |
| Frontend Web   | Next.js App Router · React · TypeScript                                    |
| Rendering      | SSR · SSG · ISR (SEO 및 LCP 최적화 목적)                                   |
| Validation     | Zod (FE 입력 검증, BE DTO ↔ Prisma 모델 contract)                          |
| 상태 관리      | TanStack Query (server state) · Zustand (client state)                     |
| UI             | Tailwind CSS · shadcn/ui                                                   |
| Storage        | AWS S3 (제품 이미지, 정적 자산)                                            |
| CDN / Edge     | CloudFront (정적 자산 + Next.js 캐시 가속)                                 |
| Infra          | Docker · AWS ECS Fargate · ECR · ALB · RDS · ElastiCache · S3 · CloudFront |
| Domain / HTTPS | Route 53 · ACM                                                             |
| CI/CD          | GitHub Actions → ECR → ECS Fargate 배포                                    |

## 황금 원칙 (Golden Rules)

1. **공유 유틸 우선**: 직접 만든 헬퍼보다 `backend/src/lib`, `frontend/src/lib` 공유 패키지 사용. 불변 조건은 한 곳에서 관리.
2. **YOLO-style 데이터 탐색 금지**: Prisma 모델, Zod 스키마로 경계에서 검증. `any` 사용 금지.
3. **레이어 경계 준수**: NestJS Controller는 Service만 호출, Service는 Repository만 호출. DB 직접 쿼리는 Repository 안에서만.
4. **UI 컴포넌트에 비즈니스 로직 금지**: 결정 로직은 hooks/store/server action 경유. 컴포넌트는 표시만.
5. **메모리는 .md로 관리**: 결정/진행/계약/이슈 기록은 [memory/](memory/)에 누적.
6. **폴더에는 AGENTS.md, 파일에는 헤더 주석**:
   - 모든 폴더 최상단에 `AGENTS.md` (해당 폴더의 역할, 하위 항목, 진입 규칙)
   - 모든 코드 파일 최상단에 한 줄 주석으로 AI Agent에게 파일 의도 설명
7. **Concern/Filter 상수는 프론트 코드 상수**: DB로 관리하지 않는다. (`docs/Data/db_modeling.md` MVP 제거 테이블 참고)
8. **product.attributes JSONB**가 진짜 데이터다: `category_attribute_definitions`는 attribute schema, `product_filter_definitions`는 attribute-backed 원자 필터, `product_matrix_filter_definitions`는 Product Matrix 노출/시스템 필터 카탈로그, `question_filter_mappings`는 사용자 답변 → matrix filter 자동 선택 룰이다.

## RPI 워크플로우 (모든 구현 작업의 기본 순서)

Research → Plan → Implementation

- **R (Research)**: 관련 docs/, memory/project_decisions.md, 기존 코드 패턴 확인
- **P (Plan)**: 변경 레이어 정의, 작업 목록 작성, 리스크·가정 → `memory/project_decisions.md`에 기록
- **I (Implementation)**: 아래 레이어 순서로 구현

## 레이어드 아키텍처 (OpenAI code layer 기반)

```
[Backend — NestJS]
lib(공유 유틸) → types(Zod/DTO) → config → repositories(Prisma) → services(도메인 로직)
  → providers(외부 API/Redis) → controllers(HTTP 라우팅)

[Frontend — Next.js App Router]
lib(공유 유틸) → types(Zod/DTO) → config → api(server actions / fetcher)
  → hooks(TanStack Query) → store(Zustand) → components(shadcn) → app(라우팅)
```

상세 폴더 매핑은 [backend/AGENTS.md](backend/AGENTS.md), [frontend/AGENTS.md](frontend/AGENTS.md) 참조.

## 디렉터리 맵 (한 눈에 보기)

```
.
├─ docs/                  # 명세 (DB, attribute, matching rule, page spec, wireframe)
├─ design_system/         # Ant Design 기반 토큰/프리뷰 (color/type/CSS)
├─ Codex_Research/        # 시장·경쟁사·결정 여정 조사 (00~23)
├─ Assets/                # 와이어프레임/UX 참고 이미지
├─ ClaudeProtype/         # HTML mockup (mobile, web)
├─ crawl/                 # 스킨케어 룰 추출용 크롤링 데이터 (기 종료된 P0 산출물)
├─ scripts/               # 크롤링/유틸 Python 스크립트
├─ memory/                # AI Agent 결정/진행/계약/이슈 메모리
├─ backend/               # NestJS 앱 (재구축 예정)
├─ frontend/              # Next.js App Router 앱 (예정)
├─ infra/                 # Docker / IaC / GH Actions (예정)
└─ AGENTS.md              # 파일 네비게이션 인덱스
```

## 범위 밖 (구현 금지)

- 색조 화장품 (립스틱, 틴트, 쿠션, 파운데이션) — `docs/ContentSpec/product_taxonomy.md` 제외 항목
- 슬리핑팩, 아이크림, 마스크 시트 (MVP 외 카테고리)
- 자체 결제/주문 기능 — 외부 구매 링크만 노출
- AI/LLM 기반 추천 — 모든 추천은 Rule + filter 조회로 결정 (재현성/감사 가능성 우선)
- 실시간 채팅, SNS, 리뷰 (별도 단계)
- 회원 추적/광고 ID 연결 — 익명 `device_id` 기반이 1차

## 커밋 규칙

[README.md — Git Commit Message Rules](README.md#git-commit-message-rules) 단일 소스. 형식 / Type / Scope / 예시 / 브랜치 명 규약 모두 그쪽에서 관리.

## 환경 실행

- OS: Windows 10 (PowerShell 또는 git-bash)
- Node.js: 20 LTS, pnpm 9 권장
- Python: 3.11+ (scripts/ 한정)
- DB: 로컬은 Docker compose, 원격은 AWS RDS PostgreSQL 16
- Cache: Docker Redis 7

상세 init/run 명령은 [README.md](README.md)의 빠른 시작 참조.

```bash
# 일반적인 실행 진입점 (앱 구축 후)
pnpm --filter backend run start:dev
pnpm --filter frontend run dev
docker compose up -d postgres redis
```
