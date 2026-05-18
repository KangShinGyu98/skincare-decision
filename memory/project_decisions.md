# 설계 결정 및 가정사항

> 새로운 결정이 생기면 이 파일에 추가하세요. 형식: `## [YYYY-MM-DD] 결정 제목` → 배경 → 결정 → 이유.

---

## [2026-05-07] 프로젝트 명칭을 `Skincare Decision` / `skincare-decision`으로 통일

**배경:** 사용자 요청으로 프로젝트 전반의 브랜드/슬러그 명칭을 `k-beauty-decision` 계열에서 `skincare-decision` 계열로 교체해야 했다.

**결정:**

- canonical display name은 `Skincare Decision`, slug는 `skincare-decision`으로 사용한다.
- 문서 제목, 목업/프리뷰 UI 텍스트, 디자인 스킬 메타데이터, 예시 package/resource 명칭, 샘플 CDN 도메인을 새 이름으로 갱신한다.
- 프로젝트명에 종속된 Python 스크립트 절대경로는 모두 제거하고, `Path(__file__).resolve().parents[1]` 기준의 repo-relative 경로로 바꾼다.
- 실제 체크아웃된 워크스페이스 폴더명(`K-Beauty Decision Project`)과 `.claude/settings.local.json`의 절대경로는 이번 변경에서 유지한다.

**이유:**

- 표시명과 슬러그가 혼재하면 이후 package/infra/resource naming이 다시 갈라진다.
- 절대경로 하드코딩은 폴더명 변경 때 가장 먼저 깨지는 지점이므로 이번에 함께 제거하는 것이 안전하다.
- `.claude/settings.local.json`은 현재 실존 경로를 가리키는 로컬 설정이라, 폴더를 실제로 rename하지 않은 상태에서 먼저 바꾸면 로컬 도구가 깨질 수 있다.

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

## [2026-05-06] Toner attribute schema 개편 (CSV 25+종 입력 결과 + Codex 분석 + 추가 판단)

**배경:** `docs/화장품 성분비교.CSV`에 토너 25+종을 입력하며 기존 `docs/product_attribute_schema.md` §2 Toner 정의의 한계가 드러남:

1. 사용자가 가장 중요시하는 "유분기/쫀쫀함/마무리감"을 표현할 attribute 없음 (`oil_control`은 피지 조절 효과지 유분 사용감이 아님)
2. `application_method`(닦토/흡토)는 거의 모든 제품이 겸용이라 Core 필터 가치 없음
3. `purposes`가 사용감(`hydration`/`oil_control`)과 식약처 기능성 주장(`brightening`/`anti_aging`)을 한 키에 섞음
4. `non_comedogenic`은 토너 25+종에서 명시 사례 거의 0
5. `ph: number` 단일이라 "약산성(추정)" 같은 출처 불명 표기 못 담음
6. `exfoliation_type`이 LHA(녹두), 효소(파파인) 표현 못 함
7. `essential_oil`이 별도 키로 없어 fragrance=false여도 티트리/유칼립투스 자극원 표시 불가

**결정:**

토너에 한해 다음 변경을 schema/admin spec/matching rules에 동시 반영:

- Core 추가: `role_tags`, `emollient_level`, `film_level`, `finish`(toner 전용 옵션 `fresh/moist/dewy/rich`), `essential_oil`, `exfoliation_strength`, `ph_value` + `ph_label`
- Core에서 제거: `application_method`, `purposes`, `ph`(단일), `non_comedogenic`
- Optional 추가: `application_methods`(MULTI_ENUM), `wipe_caution`, `cotton_pad_fit`, `cooling_feel`, `sun_caution`(ENUM), `functional_claims`
- Optional에서 제거: `photosensitive`(BOOLEAN) — `sun_caution` ENUM으로 교체
- `exfoliation_type` 옵션 확장: `+lha, +enzyme`
- `form` 옵션 확장: `+milky` (밀크토너/크림스킨)
- `role_tags` 옵션 5개 (`hydration / calming / exfoliation / oil_control / barrier`) — "결 정돈"은 단일 옵션 도입하지 않고 `exfoliation` + `hydration` 조합으로 해체 입력
- `functional_claims`는 식약처 기능성 인정 받은 항목만 입력 정책 (미인증은 비움)

**이유 / Codex 분석과의 분기점:**

- "결 정돈" 단일 옵션(Codex 안의 `texture_smoothing`)은 도입하지 않음. "결 정돈"은 각질 제거 + 수분 보습이 마케팅 용어로 묶인 것이므로 메커니즘 단위 해체가 의미 명확.
- 출처 메타데이터(`evidence_source` 공통 enum, `ph_source`, `claim_status`)는 도입하지 않음. 큐레이터가 직접 판단해 입력하므로 별도 키 불필요. 향후 외부 데이터 소스(Naver/식약처 API 등) 자동 수집 시 재검토.
- `humectant_level`은 토너에 추가하지 않음. 토너는 거의 전부 water + humectant 베이스라 `hydration_level`이 사실상 humectant 비중 표현.
- `oil_control`(피지 조절 효과 — witch_hazel, BHA)와 `emollient_level`(도포 시 유분감 — 오일, 시어버터)의 의미 차이를 schema 본문에 명시.

**영향 범위:**

- `docs/product_attribute_schema.md` §1.4, §2.1, §2.2, §2.3, §8, §9.1, §11, §12
- `docs/admin_product_input_spec.md` §3
- `docs/matching_rules_revised.md` §7.1, §8.1(toner를 acne_prone non_comedogenic에서 제외), §8.2(전면 갱신, `oily_skin_fit_toner`/`dry_skin_fit_toner`/`sensitive_skin_fit_toner`/`wipe_safe` 신규), §9.5
- 기존 토너 매핑 `non_comedogenic` HARD_FILTER → toner 전용으로 `oil_control` + `emollient_level` + `irritation_risk` 조합으로 대체

**후속:**

- 다른 카테고리(serum/sunscreen/lipcare/moisturizer/cleanser)에도 사용감 attribute(`emollient_level`/`film_level`) 일관성 검토는 별도 결정으로 분리
- `functional_claims` 옵션 후보(brightening/anti_aging/acne_relief)와 식약처 인정 기준의 정확한 매핑은 `docs/ingredient_efficacy_thresholds.md` 확장 검토
- 출처 메타데이터 도입은 외부 데이터 소스 자동 수집 시점에 재검토

---

## [2026-05-07] DB Seed 설계 — TS orchestrator + 도메인별 JSON, 토너만 카탈로그 시드

**배경:** 토너 1차 MVP 빌드 시작 전, DB 초기 상태를 어떤 명세에서 어떤 형식으로 채울지 결정 필요. 큐레이터가 직접 데이터 편집 가능해야 하고, 향후 카테고리 추가 시 점진 확장 가능해야 함.

**결정:**

- 형식: `prisma/seed.ts` orchestrator + `prisma/seed/*.json` 도메인별 데이터 파일.
- 멱등성: 모든 시드는 자연키(`key`, `filter_key`, `fact_key` 등) 기반 upsert. 재실행 안전.
- 분류:
  - **시스템 데이터** (categories/attribute_definitions/priority_rules/filter_mappings/fact_definitions/context_questions 등) — 6개 카테고리 모두 시드.
  - **카탈로그 데이터** (brands/products/ingredients/product_ingredients) — **토너만** 시드. 다른 카테고리는 admin UI로 점진 추가.
  - **런타임 데이터** (users/devices/sessions/decision_runs/reaction_reports 등) — 시드 안 함.
- 소스 매핑: [docs/db_seed_plan.md](../docs/db_seed_plan.md) §2 표 참조.
- CSV → JSON: `scripts/csv_to_seed.ts`로 토너 CSV(25+종)를 `products.toner.json` + `product_ingredients.toner.json`으로 변환. 큐레이터 갱신 시 재실행.
- 의존성 순서: categories → brands/ingredients → attribute_definitions → fact_definitions → priority_rules → context_questions → filter_mappings → products → product_ingredients.

**이유:**

- TS orchestrator는 Prisma 타입 활용·의존성 제어·upsert 보장에 유리.
- JSON 데이터는 큐레이터가 코드 변경 없이 직접 편집 가능. CSV 변환 결과를 그대로 export 가능.
- 카테고리별 파일 분리로 토너 작업 시 다른 카테고리 파일은 placeholder만 두면 됨. 카테고리 추가 시 해당 파일만 채우면 점진 확장.
- 자연키 기반 upsert로 시드 재실행이 데이터 손실 일으키지 않음.

**범위 밖 (Rejected/와 동일):**

- `ingredient_efficacy_thresholds` 시드는 serum 작업 시점에 활성화.
- 외부 데이터 자동 수집(Naver/식약처)은 향후 도입 시점에 활성화.

**상세 설계:** [docs/db_seed_plan.md](../docs/db_seed_plan.md)

---

## [2026-05-07] docs/AGENTS.md 재작성 — 실제 파일 구조 반영 + Rejected/ 명시

**배경:** 기존 `docs/AGENTS.md`가 존재하지 않는 파일(`page_content_specification_revised.md`, `data_source_catalog.md`, `ingredient_efficacy_thresholds.md`, `product_scope_and_limits.md`)을 참조 중. 일부는 `docs/Rejected/`로 이동돼 보류 상태였음.

**결정:**

- `docs/AGENTS.md`를 실제 파일 구조 기준으로 재작성.
- 활성 명세 / Rejected 보류 명세 / 참고 폴더(Codex_Research/ClaudeProtype/crawl)를 명시적으로 분리.
- Rejected/는 "삭제 아님, 토너 1차 MVP 범위 밖" 의미로 정의. 활성 명세가 Rejected 키를 참조하면 그 영역은 토너 MVP에서 비활성화된 부분으로 이해한다.
- 작성일·키 명명 규칙·Rejected 이동 정책을 §4 기여 규칙에 정리.

**이유:**

- 새 AI Agent가 진입할 때 실제 파일과 명세가 일치해야 컨텍스트 충돌이 안 일어남.
- "삭제하지 말고 Rejected/로 이동" 정책으로 보류 명세의 추적 가능성을 유지.

---

## [2026-05-08] EXECUTION_PLAN 실행 문법 정리 + 비어 있지 않은 앱 폴더 scaffold 규칙

**배경:** `EXECUTION_PLAN.md`가 bash 전용 heredoc/`mkdir -p` 예시, 존재하지 않는 명세 경로, 그리고 이미 `AGENTS.md`/`CLAUDE.md`/`README.md`가 들어 있는 `backend/`·`frontend/` 폴더에 CLI scaffold를 바로 생성하는 절차를 함께 포함하고 있었다. 이 상태로 따르면 PowerShell 환경과 현재 저장소 구조에서 복붙 실행이 깨질 가능성이 높았다.

**결정:**

- `EXECUTION_PLAN.md`의 파일 생성 예시는 shell-neutral 코드 블록으로 적고, PowerShell 기본 환경에서 그대로 읽을 수 있게 유지한다.
- `backend/`와 `frontend/` 초기화는 대상 폴더에 직접 scaffold하지 않고, `backend-scaffold` / `frontend-scaffold` 같은 임시 폴더를 만든 뒤 런타임 파일만 병합한다.
- Phase 4/5의 활성 범위는 `docs/AGENTS.md`와 `docs/db_seed_plan.md` 기준으로 **토너 우선 + 수동 입력(X) + toner catalog seed only** 로 맞춘다. 외부 데이터 연동과 `effective_dose_met` 자동 판정은 `docs/Rejected/` 재활성화 이후 단계로 남긴다.
- Docker / GitHub Actions / ECS 배포 예시는 현재 워크스페이스 명령 체계에 맞게 `pnpm --filter ... exec prisma ...`, sha 태그 기반 task definition 갱신 방식으로 적는다.

**이유:**

- 현재 저장소의 기본 셸은 PowerShell이며, bash 문법을 전제로 한 문서는 그대로 실행하다가 가장 먼저 깨진다.
- `backend/`·`frontend/`는 이미 협업 문서가 들어 있는 비어 있지 않은 폴더라서, 공식 CLI가 기대하는 "새 빈 디렉터리" 흐름과 맞지 않는다.
- 활성/보류 명세 경계를 EXECUTION_PLAN에도 반영해야 다른 Agent가 현재 MVP 범위를 잘못 확장하지 않는다.

## [2026-05-08] TypeScript 라인을 `^5.9`로 고정 + 워크스페이스 단일 관리

**배경:** Phase 1 진행 중 루트 devDep을 TypeScript 6.0.3으로 깔았으나, Phase 2.1에서 NestJS 11 scaffold가 `typescript@^5.7.3`을 가져왔고, 실제 NestJS 11 / Next 15는 5.x 라인을 공식 지원 라인으로 명시한다.

**결정:**

- 루트 `package.json` devDep `typescript`를 `^5.9.3`으로 고정.
- backend / frontend 워크스페이스의 package.json에는 `typescript`, `prettier`를 넣지 않는다 (루트 devDeps로 일원화). scaffold가 추가하면 즉시 제거.
- TS 6 도입은 NestJS / Next.js가 공식 지원 라인을 6.x로 올린 뒤 재논의.

**이유:**

- 워크스페이스 간 TS 버전이 갈라지면 IDE / `tsc` / `ts-node` / `ts-jest` 동작이 패키지마다 달라져 디버깅 비용이 커진다.
- NestJS 11 스캐폴드 기본 핀이 5.7.x인데 6을 강제하면 `peerOptional` 경고와 빌드러너 호환성 문제를 떠안게 된다.

---

## [2026-05-08] Backend 테스트 러너를 jest로 통일 (vitest 도입 보류)

**배경:** 초기 EXECUTION_PLAN 2.2는 vitest를 추가하는 것으로 적혀 있었으나, NestJS 11 scaffold는 jest + ts-jest + supertest + jest-e2e config + `app.controller.spec.ts` 샘플을 기본 제공한다. 두 러너를 섞으면 e2e config·jest expect API·`@nestjs/testing` 호환성을 모두 별도로 다뤄야 한다.

**결정:**

- backend는 NestJS 기본 jest 스택(jest, @types/jest, ts-jest, supertest, @types/supertest)을 그대로 유지.
- vitest는 backend에서 도입하지 않는다. frontend(Phase 3)는 별개로 vitest 사용 가능.
- EXECUTION_PLAN 2.2의 vitest 추가 명령은 제거하고, jest 그대로 사용한다는 메모로 대체.

**이유:**

- NestJS testing 모듈은 jest 기준 매트릭스가 가장 안정적이고, `@nestjs/testing` 예제·문서가 jest 위주.
- vitest 마이그레이션 비용 > 이번 MVP에서 얻는 이득.
- frontend는 jsdom·React Testing Library 호환 측면에서 vitest가 유리해 향후 도입 여지를 남긴다.

## [2026-05-08] Prisma 버전을 `^6.19.3`으로 고정 (Prisma 7 미도입)

**배경:** Phase 2.2에서 `pnpm --filter backend add prisma`로 의존성을 추가했더니 자동으로 Prisma 7.8.0이 설치됐다. Phase 2.3에서 `prisma init` + 수동 schema 작성을 시도했더니 `error P1012: The datasource property 'url' is no longer supported in schema files. Move connection URLs ... to 'prisma.config.ts'`로 검증 실패. Prisma 7은 schema의 `datasource.url` 자리를 제거하고 `prisma.config.ts` + `PrismaClient(adapter)` 패턴으로 옮기는 breaking change 도입.

**결정:**

- backend의 `prisma`, `@prisma/client`을 `^6.19.3`(2026-05 시점 6.x 최신)으로 고정.
- schema에서 `url = env("DATABASE_URL")`을 그대로 사용. `prisma.config.ts`는 만들지 않음 (6.x에선 optional).
- 6.19가 기본 generator를 신규 `prisma-client`(`output = "../generated/prisma"`)로 바꿨으나, 본 프로젝트는 클래식 `prisma-client-js`로 되돌려 `@prisma/client` import 경로를 유지.
- Prisma 7로의 업그레이드는 별도 결정 사안: `prisma.config.ts` 도입 + adapter 패키지(`@prisma/adapter-pg` 등) 추가 + PrismaClient 인스턴스화 코드 변경 + dotenv devDep 추가가 함께 와야 함.

**이유:**

- EXECUTION_PLAN과 본 프로젝트의 모든 코드 위치 가이드(예: `services/.../`에서 `@prisma/client` import)가 클래식 패턴을 전제.
- Prisma 7은 출시 직후라 NestJS 11 / nestjs-pino / cache-manager 등 본 스택과의 운영 검증 자료가 부족.
- 6.19는 LTS급 안정 라인이고, 본 MVP가 필요로 하는 PostgreSQL 16 + JSONB + GIN 인덱스 기능을 모두 지원.
- 7 마이그레이션 비용은 코드/스키마/CI 전부에 걸쳐 있어, 그만한 이익(adapter 다양성, edge runtime 등)이 본 MVP에는 없음.

**부산물 정리 규약(향후 동일 init 재실행 시):**

- `prisma init`이 만든 `backend/prisma.config.ts` 삭제.
- `backend/.gitignore` 삭제 (루트 `.gitignore`로 이미 커버).
- `backend/prisma/schema.prisma`의 generator를 `prisma-client-js`로 되돌리고 `output` 라인 제거.

<!-- 새 결정은 여기에 추가 -->

## [2026-05-14] 질문 모델을 `dim_questions` + `questions` 2테이블 구조로 단순화

**배경:** 기존 `fact_definitions` / `context_questions` 구조는 내부 판단값과 화면별 질문 표현이 분리되어 있었지만, 선택지/입력 타입이 양쪽에 걸쳐 있어 같은 질문 기준을 화면마다 다르게 묻는 경우 답변 개수와 내부 값 정합성을 강하게 보장하기 어려웠다. 사용자는 화면별 문구는 달라도 내부 로직은 동일한 `value` 기준으로 평가되기를 원했다.

**결정:**

- `fact_definitions`는 `dim_questions`로, `context_questions`는 `questions`로 개념/테이블명을 변경한다.
- `dim_questions.answer_values INTEGER[]`를 내부 판단값의 단일 출처로 둔다. `score` 용어는 쓰지 않고 `value`로 통일한다.
- `questions.answers TEXT[]`는 화면별 사용자/관리자 노출 라벨만 가진다.
- 사용자가 답하면 `user_facts`에는 `question_id`, `dim_question_key`, `answer_index`, `value`를 저장한다. `answer_value` 문자열은 저장하지 않는다.
- `questions.answers[n]`과 `dim_questions.answer_values[n]`의 길이 일치는 `answer_count` 생성 컬럼 + `(dim_question_id, answer_count)` 복합 FK로 DB에서 강제한다.

**이유:**

- 질문 정의 depth를 늘리지 않고 2테이블로 유지하면서, 같은 기준 질문의 화면별 표현 차이를 허용할 수 있다.
- 내부 평가는 표시 라벨이나 문자열 enum이 아니라 숫자 `value`만 보면 되므로 Priority Rule / Product Filter Mapping이 단순해진다.
- PostgreSQL `CHECK`는 부모 테이블 값을 직접 참조할 수 없으므로, 생성 컬럼과 복합 FK가 가장 단순한 DB 레벨 제약이다.

## [2026-05-09] Backend Jest 실행은 로컬 `jest-cli` 직접 호출로 고정

**배경:** 이 워크스페이스는 상위 경로 `C:\Users\rkdtl\node_modules`에 오래된 Jest 27 계열 패키지가 존재해, 일반 `jest` / `pnpm exec jest` 실행 시 backend의 Jest 29 설정과 섞이는 문제가 발생했다. 증상은 `testEnvironmentOptions` 관련 예외, `0 of 1 total` 같은 비정상 실행, 잘못된 runner path 해석이었다.

**결정:**

- backend 테스트 스크립트는 `jest` 바이너리를 직접 호출하지 않고 `backend/run-local-jest.cjs`를 통해 로컬 pnpm store의 `jest-cli` 29를 직접 실행한다.
- backend Jest 설정은 `package.json` 인라인 설정 대신 `jest.config.js`, `test/jest-e2e.config.js`로 분리해 runner / testRunner / testSequencer / testEnvironment를 workspace-local 경로로 명시한다.
- backend devDependencies에 `jest-environment-node`, `jest-runner`, `jest-circus`, `@jest/test-sequencer`를 직접 선언해 상위 경로 패키지로의 fallback을 막는다.

**이유:**

- 현재 머신의 상위 `node_modules` 상태를 바꾸지 않고도 저장소 내부에서 재현 가능한 테스트 실행 경로를 확보할 수 있다.
- Jest 29 단일 라인으로 unit / e2e 설정을 고정하면 이후 다른 Agent도 같은 명령으로 같은 결과를 얻을 수 있다.

## [2026-05-15] 질문 관계 기준을 `dim_question_id`로 정리

**배경:** `dim_questions` + `questions` 2테이블 구조로 단순화한 뒤에도 일부 관계 테이블과 인덱스가 `dim_question_key` / `source_dim_question_key` 기준으로 남아 있었다. 내부 판단 기준이 `id`로 바뀐 상황에서 FK를 slug에 걸면 key rename, seed 재정렬, 운영 수정 시 관계 안정성이 떨어진다.

**결정:**

- `dim_questions.key`는 삭제하지 않고 seed/admin/debug용 고유 slug로 유지한다.
- DB 관계, FK, 조회 인덱스는 `dim_questions.id` 기준으로 통일한다.
- `question_visibility_conditions.condition_dim_question_id`, `priority_rule_conditions.dim_question_id`, `product_filter_mappings.source_dim_question_id`, `user_facts.dim_question_id`를 사용한다.
- `user_facts`는 `question_id`, `dim_question_id`, `answer_index`, `value`를 저장한다.
- `question_id`가 있는 답변은 `(question_id, dim_question_id)` 복합 FK로 실제 노출 질문과 기준 질문 불일치를 막는다.
- seed JSON은 사람이 읽기 쉽게 key를 받아도 되지만, import 단계에서 id로 resolve해 DB에 저장한다.

**이유:**

- 관계 안정성은 UUID PK가 맡고, 사람이 읽는 식별자는 slug가 맡도록 책임을 분리한다.
- `key` rename이 발생해도 사용자 답변, 조건, 필터 매핑 FK가 흔들리지 않는다.
- 화면별 질문 라벨이 달라도 동일 기준 질문을 id로 묶으면 내부 로직은 `value`만 비교하면 된다.

## [2026-05-15] 질문 테이블명을 `question` + `question_variants`로 정리하고 답변 제약 단순화

**배경:** `dim_questions` / `questions` 명칭은 기준 질문과 화면별 질문의 관계를 표현하지만, 실제 의도는 "질문 정의 1개 + 화면별 변형 N개"에 가깝다. 또한 `answer_type`별 선택지 개수를 DB CHECK로 모두 나열하면 타입 추가/정책 변경 때마다 migration이 필요하다.

**결정:**

- `dim_questions`는 `question`으로, `questions`는 `question_variants`로 rename한다.
- `question_variants.question_id`가 기준 질문 `question.id`를 참조한다.
- `user_facts.question_id`는 nullable FK로 `question_variants.id`를 참조한다.
- `user_facts`는 더 이상 기준 질문 ID를 직접 저장하지 않는다. 기준 질문 단위 집계가 필요하면 `user_facts.question_id → question_variants.id → question_variants.question_id`로 JOIN한다.
- `question_variants`의 `(id, question_id)` UNIQUE와 `user_facts(question_id, question_id)` 형태의 복합 FK 구상은 제거한다.
- DB는 `question.answer_values` 개수와 `question_variants.answers` 라벨 개수가 같은지만 `answer_count` 생성 컬럼 + 복합 FK로 강제한다.
- `answer_type`별 개수 정책은 DB CHECK가 아니라 admin/service validation에서 처리한다.

**이유:**

- `question_variants`를 사용자 답변의 직접 참조 대상으로 두면 실제 사용자가 본 문구와 답변 라벨을 추적하기 쉽다.
- 기준 질문은 variant를 통해 추론 가능하므로 `user_facts`에 중복 저장하지 않는다.
- 선택지 타입별 개수 제한을 DB에 하드코딩하지 않으면 운영 정책 변경과 신규 타입 추가가 가벼워진다.

## [2026-05-15] `question`에서 `label` / `group` 메타데이터 제거

**배경:** `question`은 내부 판단 기준과 `value` 배열만 보관하는 테이블로 단순화하기로 했다. 관리자용 표시명은 `key`와 `question_variants.title`로 충분하고, 그룹 분류는 현재 DB 관계나 평가 로직에 직접 쓰이지 않는다.

**결정:**

- `question.label`과 `question.group` 컬럼을 제거한다.
- `question_group_enum`도 함께 제거한다.
- MVP 질문 사전은 `key`, `answer_type`, `answer_values`, 설명만 유지한다.

**이유:** 기준 질문 테이블의 책임을 "동일 결론을 내리기 위한 내부 value 정의"로 제한하면 화면 문구/관리자 문구/분류가 섞이지 않는다. 필요 시 그룹핑은 seed 파일, 관리자 UI 필터, 또는 별도 운영 메타데이터로 다시 둘 수 있다.

## [2026-05-15] 사용자 답변 테이블을 `user_responses`로 정리하고 canonical question 기준으로 복원

**배경:** 이전 결정에서는 사용자 답변이 `question_variants.id`를 직접 참조하도록 뒀지만, 그러면 같은 canonical question을 화면마다 다르게 물었을 때 복원 기준이 variant에 묶인다. 사용자가 다시 들어왔을 때는 "현재 화면 variant"가 무엇이든 같은 canonical question의 최신 답변을 복원해야 한다.

**결정:**

- `user_facts`를 `user_responses`로 rename한다.
- `user_responses.question_id`는 NOT NULL FK로 canonical `question.id`를 참조한다.
- `user_responses.question_variant_id`는 NULLABLE FK로 사용자가 실제로 본 `question_variants.id`를 참조한다.
- `answer_index`는 저장하지 않는다. 복원 시 `question.answer_values`에서 저장된 `value`의 위치를 찾고, 현재 화면의 `question_variants.answers` 같은 index를 선택 상태로 표시한다.
- `question_variant_id`가 있을 때 canonical question과 불일치하지 않도록 `question_variants(id, question_id)` UNIQUE와 `user_responses(question_variant_id, question_id)` 복합 FK를 둔다.

**이유:** 평가/복원/필터 매핑의 기준은 항상 canonical question이어야 한다. variant는 "사용자가 실제로 본 문구"를 추적하는 감사/분석 정보로 남기되, 응답의 의미와 최신값 조회는 `question_id` 하나로 안정화한다.

## [2026-05-15] `question_variants(id, question_id)` UNIQUE와 응답 복합 FK 제거

**배경:** `user_responses.question_id`가 canonical `question.id`를 직접 참조하도록 정리했기 때문에, `question_variants`에 `(id, question_id)` UNIQUE를 추가하고 `user_responses(question_variant_id, question_id)` 복합 FK를 거는 것은 제약 depth를 다시 높인다.

**결정:**

- `uq_question_variants_id_question_id`를 두지 않는다.
- `user_responses.question_variant_id`는 `question_variants.id`에 대한 nullable 단순 FK로 둔다.
- variant와 canonical question의 쌍 일치는 DB 복합 FK가 아니라 Service insert 로직에서 보장한다. 응답 INSERT 시 `question_variant_id`가 있으면 해당 `question_variants.question_id`를 읽어 `user_responses.question_id`에 저장한다.

**이유:** 복원/평가 기준은 `user_responses.question_id` 하나로 충분하다. `question_variant_id`는 사용자가 실제로 본 문구 추적용이므로, DB 제약은 존재 여부만 확인하고 의미 정합성은 쓰기 경로에서 관리하는 편이 테이블/제약 복잡도를 낮춘다.

## [2026-05-15] `user_responses`를 append-only가 아닌 question별 current-state로 변경

**배경:** 사용자 답변은 화면 복원과 rule 평가를 위한 현재 상태가 핵심이다. 사용자가 답할 수 있는 질문이 30개라면, 입력한 질문마다 1 row만 있으면 충분하며 답하지 않은 질문 row는 만들지 않는다. 변경 이력은 이미 이벤트 로그(`session_events`)로 남길 수 있고, 결과 산출 이력은 `decision_runs` snapshot으로 보존한다.

**결정:**

- `user_responses`는 append-only 이력 테이블이 아니라 UPDATE/UPSERT 기반 current-state 테이블이다.
- 같은 identity + `question_id` 조합은 1 row만 유지한다.
- 비로그인 상태는 `UNIQUE(device_id, question_id) WHERE user_id IS NULL`, 로그인 상태는 `UNIQUE(user_id, question_id) WHERE user_id IS NOT NULL` partial unique index로 보장한다.
- 답변 변경 시 같은 row의 `value`, `source`, `session_id`, `question_variant_id`, `updated_at`을 갱신한다.
- `user_responses`는 `updated_at`을 두지만 `deleted_at`은 두지 않는다. 답변 해제는 row 삭제로 처리한다.
- 질문 클릭/답변 변경 이력은 `session_events` payload에 남기고, 결과 산출 당시 입력 묶음은 `decision_runs.input_snapshot`에 남긴다.

**이유:** 현재 상태 테이블에 `created_at` 기반 최신 row 조회 인덱스를 둘 필요가 없다. question별 단일 row 보장 인덱스가 화면 복원/평가 쿼리에 더 직접적이며, 이력 책임을 `session_events`와 `decision_runs`로 분리하면 응답 테이블의 row 수와 조회 복잡도가 낮아진다.

## [2026-05-18] 세션/이벤트 테이블의 보조 인덱스와 비정규화 컬럼 제거

**배경:** `user_sessions`는 dimension/transaction 테이블로 단순화하면서 런타임 상태 컬럼을 모두 뺐고, `session_events`는 fact 측에 `device_id`를 비정규화로 들고 있었다. 이벤트 fact 가 자체 dimension 컬럼을 또 들고 있으면 별표(star) join 의도와 어긋난다. 또 한 번의 로그인-병합과 활성 세션 판정 외에는 `devices`/`user_sessions` 보조 인덱스가 실제 조회에 쓰이지 않는다.

**결정:**

- `session_events.device_id` 컬럼을 제거한다. device/user 추적은 `session_id → user_sessions.device_id / .user_id` JOIN 으로 일원화한다.
- `session_events`는 `pk_session_events` 외 보조 인덱스(`idx_session_events_device_id`, `idx_session_events_session_id`)를 두지 않는다.
- `user_sessions`는 `pk_user_sessions` 외 보조 인덱스(`idx_user_sessions_device_id`, `idx_user_sessions_user_id`, `idx_user_sessions_created_at`)를 두지 않는다. 활성 세션 판정은 `session_events.session_id` → `user_sessions.id` PK 로 join 하고, 로그인-병합은 `device_id` 조건 UPDATE 단발성 트랜잭션이다.
- `devices`는 `pk_devices` 외 보조 인덱스(`idx_devices_user_id`)를 두지 않는다. 로그인-병합은 `devices.id` PK 로 row 를 잡고 `user_id` 역검색은 발생하지 않는다.
- `user_sessions`에서 제거할 컬럼은 `status / started_at / last_seen_at / completed_at / expires_at / updated_at`. 로그인 연결 시각은 `logged_in_at TIMESTAMPTZ NULL` 컬럼으로 명시.

**이유:** 사용자 활동 fact 는 한 곳(`session_events`)에 모으고, dimension 은 `user_sessions` 하나로 모으는 별표 구조를 유지한다. 보조 인덱스가 실제 쿼리 경로에 필요 없으면 미리 만들지 않고, 필요해지면 그때 추가한다. 인덱스 적게 둔 만큼 대량 이벤트 INSERT 비용이 낮아진다.

## [2026-05-18] 기준 질문 테이블 이름을 `questions`로 정정

**배경:** 명명 규칙은 모든 테이블이 `snake_case + 복수형`이지만, 기준 질문 테이블만 단수형 `question`으로 남아 있었다. seed 시점에서 사람이 읽기 쉬운 slug 가 `questions.key` 로 들어가야 자연스럽다.

**결정:**

- 기준 질문 테이블명을 `question` → `questions`로 변경.
- 관련 제약 이름도 같이 변경: `pk_question` → `pk_questions`, `uq_question_key` → `uq_questions_key`, `uq_question_id_answer_count` → `uq_questions_id_answer_count`.
- enum 이름은 `question_answer_type_enum` → `questions_answer_type_enum`.
- FK 컬럼 이름은 `question_id` (단수)로 그대로 둔다 — convention `<참조 테이블 단수>_id`.
- `question_variants`, `question_visibility_conditions` 등 다른 테이블 이름은 이미 plural 또는 plural-tail 형태라 변경하지 않는다.
- `uq_questions_id_answer_count` 복합 UNIQUE 제약은 그대로 유지한다. `question_variants.answers` 라벨 수와 `questions.answer_values` 값 수가 일치한다는 invariant 는 여전히 DB 수준에서 강제할 가치가 있다 (index → value 매핑이 깨지면 평가 결과 자체가 무너진다).

**이유:** 단수/복수 혼용을 없애서 이후 read 표/seed loader/Prisma `@@map` 작성이 일관된다. 제약은 같은 이유로 이름만 정렬한다.
