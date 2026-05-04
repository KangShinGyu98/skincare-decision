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

## [2026-05-02] 기술 스택 표 세분화 및 AWS 매핑 명시화

**배경:** 초기 스택 표는 행이 9개로 압축되어 있어 (1) Next.js의 렌더링 전략, (2) 캐시·CDN·도메인이 어떤 AWS 리소스에 매핑되는지가 모호했다. Phase 6/7 인프라 작업 직전 명확히 하기 위해 표를 재구성한다.

**결정:**

| 영역            | 스택                                                                          |
| --------------- | ----------------------------------------------------------------------------- |
| Backend API     | TypeScript · NestJS · Prisma                                                  |
| Database        | AWS RDS PostgreSQL 16 (products.attributes는 JSONB)                           |
| Cache           | AWS ElastiCache Redis 7                                                       |
| Frontend Web    | Next.js App Router · React · TypeScript                                       |
| Rendering       | SSR · SSG · ISR                                                               |
| Validation      | Zod (FE 입력, BE DTO ↔ Prisma 모델 contract)                                  |
| 상태 관리       | TanStack Query · Zustand                                                      |
| UI              | Tailwind CSS · shadcn/ui                                                      |
| Storage         | AWS S3                                                                        |
| CDN / Edge      | CloudFront                                                                    |
| Infra           | Docker · AWS ECS Fargate · ECR · ALB · RDS · ElastiCache · S3 · CloudFront    |
| Domain / HTTPS  | Route 53 · ACM                                                                |
| CI/CD           | GitHub Actions → ECR → ECS Fargate 배포                                       |

핵심 변경:
- Backend 행에서 PostgreSQL 제거(중복) → "Backend API"로 라벨 변경.
- Cache: 자체 Redis가 아닌 **AWS ElastiCache Redis 7** 명시.
- Frontend: 라벨을 "Frontend Web"으로 바꾸고 React 명시. 별도 "Rendering" 행에 SSR/SSG/ISR 명시.
- Storage / CDN / Domain·HTTPS를 별도 행으로 분리하여 AWS 리소스 매핑을 표면화.
- Infra 행에 ALB와 ElastiCache 추가.
- CI/CD 흐름을 "GitHub Actions → ECR → ECS Fargate 배포"로 명시.

**이유:**
- SSR/SEO가 Next.js 채택의 1차 이유다 — 표에 명시해 추후 누군가 SPA로 바꾸려는 시도를 사전 차단.
- ALB는 ECS service 노출에 필수이고, ElastiCache는 자체 Redis와 운영 부담이 다름 — Phase 7 IaC 작업 시 혼란 없도록 표에 못 박는다.
- Route 53 + ACM은 도메인/HTTPS 발급 경로를 단일 출처로 고정.
- 동기화 대상: [README.md](../README.md), [CLAUDE.md](../CLAUDE.md), 본 파일.

---

## [2026-05-02] 결정 2 확정 — 성분 유효 농도 기준 출처 + 시드 범위

**배경:** Product Matrix가 P0 화면이고, 세럼 카테고리의 `effective_dose_met` BOOLEAN attribute가 BASIC_CONDITION 필터 `effective_dose`로 직결된다. 이 BOOLEAN을 누가/무엇을 근거로 판정할지 정하지 않으면 관리자 화면 작업 시 "관리자 임의 판단"으로 빠지면서 일관성이 깨진다.

**결정:**
- 성분 유효 농도 기준의 1차 출처는 **식약처 「기능성화장품 기준 및 시험방법」 별표4** (자료 제출 면제 성분·함량).
- MVP 1차 시드 범위 = **식약처 기능성 화장품 인정 11개 항목 중 MVP 6개 카테고리에 적용 가능한 6개 항목 전체**: 미백 / 주름개선 / 자외선 차단 / 여드름성 피부 완화 / 피부장벽 기능 회복 / 건조함·갈라짐.
- 출처 우선순위: `MFDS_FUNCTIONAL_NOTICE` > `MFDS_FUNCTIONAL_REPORT` > `CIR_OPINION` / `SCCS_OPINION` > `PEER_REVIEWED` > `INTERNAL_REVIEW`.
- 저장 형식: MVP는 코드 상수(`backend/src/services/efficacy/thresholds.ts`) + 명세 단일 진실 [docs/ingredient_efficacy_thresholds.md](../docs/ingredient_efficacy_thresholds.md). entry 30+ 누적 시 `ingredient_efficacy_thresholds` 테이블로 마이그레이션 (Phase 6+).
- `effective_dose_met` 자동 판정 + 관리자 override(`attributes.effective_dose_met_override_reason` 메모) 모두 허용.

**이유:**
- 식약처 별표4는 한국 시장에서 법적 근거를 갖는 유일한 출처 — 분쟁 시 방어 가능.
- 자료 면제 성분 목록은 이미 검증된 농도 범위를 제시(예: 알부틴 2~5%, 닥나무추출물 2%, 레티놀 2,500 IU/g, 살리실산 0.5% 인체세정용).
- 6개 항목 전체 시드는 MVP에서 모든 기능성 카테고리의 `effective_dose_met`을 기계적으로 판정 가능하게 만든다.
- 코드 상수 우선은 Phase 4의 변경 비용(배포 1회)이 DB UI(어드민 CRUD 화면) 비용보다 압도적으로 작기 때문.

**관련 산출물:**
- [docs/ingredient_efficacy_thresholds.md](../docs/ingredient_efficacy_thresholds.md) — 시드 entry 표
- [docs/admin_product_input_spec.md §10](../docs/admin_product_input_spec.md#10) — 자동 판정 알고리즘
- (Phase 4) `backend/src/services/efficacy/thresholds.ts` 코드 상수
- (Phase 4) `backend/src/services/efficacy/__tests__/effective-dose-met.spec.ts` 단위 테스트

---

## [2026-05-02] 결정 1 보류 — 데이터 출처 조합은 카탈로그 검토 후 확정

**배경:** 사용자가 "어떤 필드를 채워야 하고 API가 어떤 형태인지 모르는 상태에서는 조합을 못 정한다"고 판단. 결정을 카탈로그 산출물 이후로 미루기로 합의.

**결정:**
- **이미지 저장 정책**: S3 직접 업로드 강제 (외부 hot-link 금지). 이는 즉시 확정.
- **데이터 출처 조합 X / Y / Z**: 보류. 아래 카탈로그를 본 뒤 별도 entry로 확정.
- 카탈로그 산출물 3종을 즉시 작성:
  - [docs/admin_product_input_spec.md](../docs/admin_product_input_spec.md) — 카테고리별 필드 체크리스트
  - [docs/data_source_catalog.md](../docs/data_source_catalog.md) — 출처별 응답 샘플 + 필드 매핑
  - [docs/ingredient_efficacy_thresholds.md](../docs/ingredient_efficacy_thresholds.md) — 결정 2 시드
- 조합 후보:
  - **X (Lean)**: 100% 수동, 외부 API 0개. 즉시 시작.
  - **Y (Hybrid)**: Naver 쇼핑 API + 식약처 기능성 보고 API. 가격/이미지/효능 자동 채움. 1~2주 추가.
  - **Z (Full)**: Y + 식약처 화장품 원료성분 OpenAPI로 `ingredients` 마스터 일괄 시드. 2~3주 추가.

**이유:**
- "필드 명세 + 응답 샘플 + 임계값"이 한 페이지로 보여야 운영자/개발자가 ROI를 합리적으로 판단 가능.
- 이미지 hot-link는 약관과 무관하게 운영 위험(Naver 이미지 URL이 차단/변경되면 전체 카탈로그 깨짐) — 즉시 확정.
- 조합 결정이 보류되어도 §S3 업로드 강제는 결정 1과 독립이므로 관리자 화면 설계에 즉시 반영 가능.

**다음 작업:**
- 사용자 카탈로그 검토 → 조합 X/Y/Z 중 하나 선택 → 본 파일에 새 entry append.
- (조합 Y/Z 선택 시) `backend/src/providers/external/{naver-shopping,mfds-functional}.ts` Phase 4에 추가.

---

<!-- 새 결정은 여기에 추가 -->
