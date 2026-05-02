# 프로젝트 진행 상태

> 세션 종료 전 현재 구현 상태와 다음 작업 우선순위를 기록합니다.
> 형식: 날짜별 요약 + 남은 작업 + 검증 결과.

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

<!-- 새 세션 요약은 여기에 추가 -->
