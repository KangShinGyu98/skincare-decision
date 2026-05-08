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

<!-- 새 결정은 여기에 추가 -->
