# 설계 결정 및 가정사항

> 새로운 결정이 생기면 이 파일에 추가하세요. 형식: `## [YYYY-MM-DD] 결정 제목` → 배경 → 결정 → 이유.

---

## [2026-05-02] 기술 스택 확정

**배경:** MVP 백엔드/프론트엔드 구축 직전. 명세 문서(`docs/`)는 6개 카테고리, JSONB 기반 attribute, Rule-based filter 구조를 가정.

**결정:**
- Backend: TypeScript + NestJS + Prisma + PostgreSQL 16 + Redis 7
- Frontend: Next.js (App Router) + TypeScript + Tailwind CSS + shadcn/ui
- 검증: Zod (FE 입력, BE DTO ↔ Prisma)
- 상태: TanStack Query (server state), Zustand (client state)
- 인프라: Docker, AWS ECS Fargate / ECR / RDS / S3 / CloudFront, GitHub Actions
- 패키지 매니저: pnpm (모노레포, workspace)

**이유:**
- Prisma + JSONB는 `products.attributes`의 카테고리별 가변 스키마와 잘 맞음 (`Json` 타입으로 받고 Zod로 카테고리별 검증).
- NestJS 모듈 구조 = `docs/db_modeling.md` 도메인 분리(사용자/Fact/Priority/Product/Filter/Traceback)와 1:1 매핑하기 좋음.
- App Router는 서버 액션 + 라우트 핸들러 조합으로 BFF 패턴이 단순.
- shadcn/ui = Tailwind 기반, design_system의 Ant Design 토큰을 colors_and_type.css 변수로 매핑해 사용.

---

## [2026-05-02] Concern Mapper / Filter 상수는 DB 미관리

**배경:** `docs/db_modeling.md`의 "MVP에서 제거된 테이블" 섹션 참고. concern_groups / concern_tags / concern_category_mappings은 DB가 아닌 프론트 상수로 관리한다.

**결정:**
- Concern 태그 → `route_target` / `preset_facts` / `suggested_category` / `suggested_filters` 매핑은 `frontend/src/config/concerns.ts` 같은 코드 상수로 관리한다.
- 태그 클릭은 `session_events`에 `concern_clicked`로 저장.
- `user_facts.source = concern`은 확정 답변이 아니라 초기 선택 상태이며, 이후 priority_gate / context 답변이 우선.

**이유:**
- 운영자가 즉시 변경하지 않아도 되는 영역. 코드 상수가 더 단순하고 재현 가능.
- 이력은 `session_events`로 충분히 추적 가능.

---

## [2026-05-02] product_filter_mappings는 룰 엔진이 아니라 "번역기"

**배경:** `docs/db_modeling.md` Section 5 및 `docs/matching_rules_revised.md` 1.1 참고.

**결정:**
- `product_filter_mappings`는 사용자 fact → product attribute 조건의 매핑만 담당한다.
- 실제 제품 조회는 application layer에서 매핑을 읽어 동적 SQL/Prisma `where`를 생성해 `products` 테이블을 직접 조회한다.
- 핵심 데이터는 `product.attributes` JSONB 입력 품질에 달려 있다.

**이유:**
- 룰 엔진을 만들면 디버깅·테스트 비용이 커짐.
- 동적 where 조합으로도 표현 가능한 단순한 조건 집합.
- `CONTAINS_ANY`, `COMPOSITE_AND` 등 application-layer computed operator는 Service에서 처리한다(`matching_rules_revised.md` 1.2).

---

## [2026-05-02] 신원 3계층 + 로그인 시 자동 병합 (Eager Merge)

**배경:** `docs/db_modeling.md` 신원 3계층 구조.

**결정:**
- 브라우저 cookie/localStorage `device_id` (영구) → `user_sessions` (30분 timeout) → `session_events`.
- 비로그인은 `device_id` 기준으로 모든 user_facts/decision_runs/avoidance_rules를 저장.
- 로그인 시 `devices.user_id` 연결 + 관련 테이블 5개 (user_facts, decision_runs, reaction_reports, avoidance_rules, product_matrix_filter_states)에 user_id 일괄 채우기.

**이유:**
- 사용자에게 "내 답변이 이어진다"는 자연스러운 기대 충족.
- 별도 머지 UI 불필요.
- 시크릿 모드 / cookie 초기화는 새 device 발급으로 처리(의도된 동작).

---

## [2026-05-02] decision_runs는 snapshot, 화면 재조회는 filter_state로

**배경:** `docs/db_modeling.md` Section 6 마지막 노트 참고.

**결정:**
- `decision_runs`에는 결과 snapshot(applied_filters, products 등)을 저장하지만, **재조회 시에는 snapshot을 재사용하지 않고** `product_matrix_filter_states`를 기준으로 현재 `products`를 다시 조회한다.
- snapshot은 이력/고객지원/A/B 분석용.

**이유:**
- 제품 정보 갱신 시 사용자에게는 최신 상태가 보여야 함.
- snapshot 재사용은 stale 결과 노출 위험.

---

<!-- 새 결정은 여기에 추가 -->
