# 프로젝트 진행 상태

> 세션 종료 전 현재 구현 상태와 다음 작업 우선순위를 기록합니다.
> 형식: 날짜별 요약 + 남은 작업 + 검증 결과.

---

## [2026-05-07] 프로젝트 명칭 리네이밍 정리

### 변경 내용

- 프로젝트 표시명을 `Skincare Decision`, slug를 `skincare-decision`으로 통일.
- README / CLAUDE / EXECUTION_PLAN / backend·frontend README / design_system / docs / mockup / research header 등 프로젝트 브랜딩 문구를 새 이름으로 갱신.
- EXECUTION_PLAN 및 infra 예시의 package/ECR/Secrets Manager/ECS naming sample을 `skincare-decision` 기준으로 재정렬.
- `.idea` 모듈 파일을 `skincare-decision.iml`로 정리.
- `scripts/{crawl_titles,crawl_articles,organize_articles}.py`의 프로젝트명 하드코딩 절대경로 제거 → repo-relative 경로로 변경.

### 검증 결과

- `rg "K-Beauty Decision|k-beauty-decision|kbeauty|kb-" .` 재검색 결과, 의도적으로 남긴 `.claude/settings.local.json`의 실제 워크스페이스 경로만 old name 잔존.
- 실행 테스트: N/A (문서/설정/스크립트 경로 리팩터 수준, 런타임 미실행).

### 아직 남은 작업 / 리스크

- 실제 폴더명 `C:\Users\rkdtl\Desktop\K-Beauty Decision Project`는 아직 그대로라, 물리적 디렉터리 rename을 원하면 `.claude/settings.local.json`과 함께 후속 정리 필요.
- `.claude/settings.local.json`은 현재 경로를 보존하려고 의도적으로 수정하지 않음.

### 다음 작업 우선순위

1. (선택) 실제 워크스페이스 폴더명까지 `skincare-decision` 계열로 rename할지 결정.
2. EXECUTION_PLAN.md Phase 1 실행 (pnpm workspace + 공통 toolchain).
3. Phase 2: NestJS init + Prisma schema 1차 작성.

---

## [2026-05-02] 하네스 구축 완료, 백엔드/프론트엔드 init 직전

### 현재 구현 상태

- 명세 문서 (`docs/`) 모두 작성 완료 (db_modeling, attribute schema, matching rules revised, page spec revised, wireframe summary, taxonomy, content plan).
- 디자인 시스템 (`design_system/`) 토큰 + HTML 프리뷰 준비 완료.
- 조사 자료 (`Codex_Research/`, `crawl/`) 동결 — 추가 크롤링은 필요 시에만.
- AI Agent 하네스(루트 `CLAUDE.md`, `AGENTS.md`, `README.md`, `memory/*.md`, 폴더별 `AGENTS.md`) 작성 완료.
- `EXECUTION_PLAN.md`에 Phase 0~7 단계별 CLI 명령 정리.

### 이번에 변경한 내용

- 루트 CLAUDE.md / AGENTS.md / README.md 채움 (프로젝트 정의, 황금 원칙, 디렉터리 맵)
- memory/{MEMORY, project_decisions, project_progress, api_contracts, known_issues}.md 초기 콘텐츠 작성
- 모든 기존 폴더(`docs/`, `design_system/`, `Codex_Research/`, `Assets/`, `ClaudeProtype/`, `crawl/`, `scripts/`)에 `AGENTS.md` 추가
- backend/, frontend/, infra/ 폴더 스캐폴딩(`AGENTS.md`만) 추가
- EXECUTION_PLAN.md에 Phase 0(준비) → Phase 7(배포)까지 명령 정리

### 검증 결과

- Backend 테스트: N/A (아직 init 전)
- Frontend 테스트: N/A (아직 init 전)
- 타입 체크: N/A
- 린트: N/A

### 아직 남은 작업 / 리스크

- Phase 1: pnpm 모노레포 셋업 (workspace 정의)
- Phase 2: NestJS init + Prisma schema (`docs/db_modeling.md` 25개 테이블 변환)
- Phase 3: Next.js init + shadcn/ui 셋업
- Phase 4: 시드 데이터 (priority_rules, product_filter_mappings, fact_definitions, context_questions, products 일부)
- Phase 5: 화면별 구현 (S01 → S08, P0/P1 우선)
- Phase 6: Docker compose, GH Actions
- Phase 7: AWS 배포

리스크:

- `products.attributes` JSONB Zod 검증을 카테고리별로 분기해야 함 — Service 레이어에서 discriminated union으로 처리 필요.
- Prisma의 PostgreSQL `Json` 타입은 부분 인덱싱이 필요 (GIN 인덱스 직접 마이그레이션 추가).
- Concern 상수 변경이 잦으면 FE 재배포가 필요 — 운영 단계에서 admin UI 도입 검토.

### 다음 작업 우선순위

1. EXECUTION_PLAN.md Phase 1 실행 (pnpm workspace + 공통 toolchain)
2. Phase 2: NestJS init + Prisma schema 1차 작성 (`docs/db_modeling.md` 기준)
3. Phase 3: Next.js init + shadcn/ui + Tailwind 토큰 매핑 (design_system 변수 → tailwind.config)

---

## [2026-05-02] 기술 스택 표 세분화 동기화

### 변경 내용

- README.md / CLAUDE.md / memory/project_decisions.md / EXECUTION_PLAN.md / infra/AGENTS.md에서 스택 표·인프라 리소스 목록을 동일한 기준으로 갱신.
- 핵심: ElastiCache Redis 7 명시, Route 53 + ACM, ALB, S3, CloudFront 분리. Next.js Rendering 행에 SSR · SSG · ISR 명시.
- EXECUTION_PLAN Phase 7 사전 셋업에서 "ElastiCache 또는 self-hosted EC2" 옵션 제거 → ElastiCache 단일.
- infra/AGENTS.md aws/ 하위에 `elasticache/`, `route53-acm/` 폴더 추가.

### 다음 작업 우선순위 (변동 없음)

1. EXECUTION_PLAN.md Phase 1 실행 (pnpm workspace + 공통 toolchain)
2. Phase 2: NestJS init + Prisma schema 1차 작성
3. Phase 3: Next.js init + shadcn/ui + Tailwind 토큰 매핑

---

## [2026-05-02] 관리자 화면 착수 전 결정 카탈로그 3종 + 결정 2 확정

### 변경 내용

- 신규 docs 3종:
  - [docs/admin_product_input_spec.md](../docs/admin_product_input_spec.md) — 카테고리별 필드 체크리스트 (공통 + 6개 카테고리 attribute + S3 업로드 흐름 + 자동 판정 로직)
  - [docs/data_source_catalog.md](../docs/data_source_catalog.md) — 출처별 응답 샘플 + 필드 매핑 매트릭스 (식약처 3개 API + Naver 쇼핑 + AIHub OCR + 브랜드 공식)
  - [docs/ingredient_efficacy_thresholds.md](../docs/ingredient_efficacy_thresholds.md) — 식약처 기능성 6개 항목 1차 시드 (미백 8 / 주름 4 / 자외선 10+ / 여드름 3 / 장벽 4 / 건조 4 entry)
- memory/project_decisions.md에 결정 2 확정 + 결정 1 보류 2건 append.

### 다음 작업 우선순위

1. **사용자 카탈로그 검토** → 결정 1 (조합 X/Y/Z) 확정.
2. EXECUTION_PLAN Phase 1 (pnpm workspace) 실행.
3. Phase 2 NestJS init 시 `backend/src/services/efficacy/thresholds.ts` 시드 작성.

### 미해결 TODO

- `docs/ingredient_efficacy_thresholds.md`의 폴리에톡실레이티드레틴아마이드 정확 함량 — 식약처 PDF 별표4 직접 확인 필요.
- 자외선 차단 성분 전체 목록 — 식약처 「화장품 안전기준 등에 관한 규정」 별표7 옮겨야 함.
- 피부장벽/건조 카테고리 INTERNAL_REVIEW entry → 식약처 별표4 자료 면제 항목으로 승격 검토.

---

## [2026-05-08] EXECUTION_PLAN 오류 소지 정리

### 변경 내용

- [EXECUTION_PLAN.md](../EXECUTION_PLAN.md)를 현재 저장소 구조와 문서 상태에 맞게 정리.
- bash 전용 heredoc / `mkdir -p` 예시를 shell-neutral 설명으로 바꾸고, PowerShell 기본 환경 기준으로 읽히도록 수정.
- `backend/` / `frontend/`가 이미 비어 있지 않은 폴더라는 점을 반영해 `backend-scaffold` / `frontend-scaffold` 임시 생성 후 병합 절차로 수정.
- Phase 4/5를 `docs/AGENTS.md`, `docs/db_seed_plan.md`와 맞춰 토너 우선 / 수동 입력 / toner catalog seed 기준으로 정렬.
- `page_content_specification.md` 등 실제 활성 명세 경로로 참조를 교정하고, `docs/Rejected/`에 있는 범위는 조건부 후속 작업으로 표기.
- Dockerfile / GitHub Actions / ECS 배포 예시에서 실행되지 않는 `pnpm --filter ... prisma ...` 형태와 sha 태그 배포 누락 문제를 수정.

### 검증 결과

- `rg` 재검색으로 `page_content_specification_revised`, `docs/data_source_catalog.md`, `pnpm --filter backend prisma`, `pnpm --filter frontend dlx`, `tag` 컴포넌트 등 잘못된 패턴이 본문에서 제거된 것을 확인.
- 실행 테스트: N/A (문서 수정만 수행).

### 아직 남은 작업 / 리스크

- `backend/AGENTS.md`, `frontend/AGENTS.md`, `infra/AGENTS.md`에도 일부 구형 경로/초기화 표현이 남아 있을 수 있어, 실제 Phase 2/3/6 착수 전에 한 번 더 동기화하는 편이 안전함.
- 인프라 예시는 여전히 샘플 수준이므로 실제 ECS task definition / Next standalone / Secrets wiring 구현 시 세부 보정 필요.

### 다음 작업 우선순위

1. 필요하면 `backend/AGENTS.md`, `frontend/AGENTS.md`, `infra/AGENTS.md`도 EXECUTION_PLAN과 같은 기준으로 동기화.
2. 업데이트된 EXECUTION_PLAN 기준으로 Phase 1 실제 실행.
3. Phase 2 scaffold 병합 방식으로 NestJS init 착수.

<!-- 새 세션 요약은 여기에 추가 -->
