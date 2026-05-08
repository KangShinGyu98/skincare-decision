# DB Seed 계획 — 토너 MVP

> 목적: 토너 1차 MVP의 DB 초기 상태를 어떤 명세에서, 어떤 형식으로, 어떤 순서로 채울지 결정한다.
> 작성일: 2026-05-07

---

## 0. 결론 요약

- **형식:** TypeScript orchestrator (`prisma/seed.ts`) + 도메인별 JSON 데이터 파일 (`prisma/seed/*.json`).
- **원칙:** 모든 seed는 자연키(`key`, `filter_key`, `fact_key` 등) 기반 **idempotent upsert**. 재실행 안전.
- **MVP 범위:** 시스템 룰/스키마/카테고리는 6개 카테고리 모두 시드. **제품 카탈로그(brands/products/ingredients)는 토너만** 시드하고, 나머지 카테고리는 admin UI로 점진 추가.
- **소스:** 활성 명세 docs/ + `화장품 성분비교.CSV` (토너 25+종 큐레이터 입력).

---

## 1. 테이블 분류

[docs/db_modeling.md](db_modeling.md)의 25개 테이블을 다음 3종으로 분류한다.

| 분류 | 테이블 | 처리 |
|---|---|---|
| **시스템 데이터** (룰/스키마/카테고리) | `product_categories`, `category_attribute_definitions`, `fact_definitions`, `context_questions`, `question_visibility_conditions`, `priority_rules`, `priority_rule_conditions`, `product_filter_mappings`, `ingredient_groups`, `ingredient_group_members` | **seed 필수**. 명세 docs에서 변환 |
| **카탈로그 데이터** (브랜드/제품/성분) | `brands`, `products`, `ingredients`, `product_ingredients` | **토너만 seed**, 그 외는 admin UI로 추가 |
| **런타임 데이터** | `users`, `devices`, `user_sessions`, `session_events`, `user_facts`, `decision_runs`, `product_matrix_filter_states`, `reaction_reports`, `reaction_report_products`, `suspected_causes`, `avoidance_rules` | seed 안 함. 사용 중 자동 생성 |

---

## 2. 소스 문서 매핑

### 2.1 시스템 데이터

| 테이블 | 소스 문서 | 추출 위치 |
|---|---|---|
| `product_categories` | [product_taxonomy.md](product_taxonomy.md) | 6개 카테고리 (toner/sunscreen/serum/lipcare/moisturizer/cleanser)와 한글 라벨 |
| `category_attribute_definitions` | [product_attribute_schema.md](product_attribute_schema.md) | §2~§7 (카테고리별 Core/Optional 표). value_type, options, is_required, is_filterable 컬럼 채움 |
| `fact_definitions` | [matching_rules_revised.md](matching_rules_revised.md) | §1 (Fact 정의 표) + §2 (Derived facts) |
| `context_questions` | [matching_rules_revised.md](matching_rules_revised.md) | §4 (질문 정의) + [page_content_specification.md](page_content_specification.md) (실제 카피) |
| `question_visibility_conditions` | [matching_rules_revised.md](matching_rules_revised.md) | §5 (REQUIRED/EXCLUDED 표) |
| `priority_rules` + `priority_rule_conditions` | [matching_rules_revised.md](matching_rules_revised.md) | §3 (HOLD/CAUTION/PASS/ROUTE 룰 본문 + 조건) + §10 (advice block) |
| `product_filter_mappings` | [matching_rules_revised.md](matching_rules_revised.md) | §7 (BASIC_CONDITION) + §8 (PERSONALIZED) + §9 (개별 필터 명세) |
| `ingredient_groups` + `ingredient_group_members` | [matching_rules_revised.md](matching_rules_revised.md) (있는 경우) | active group, conflict group 등 |

### 2.2 카탈로그 데이터 (토너만)

| 테이블 | 소스 | 추출 방법 |
|---|---|---|
| `brands` | [화장품 성분비교.CSV](./화장품%20성분비교.CSV) 1열 (브랜드) | CSV의 unique 브랜드 ~15개. 영문/한글 명을 같이 매핑 |
| `products` | [화장품 성분비교.CSV](./화장품%20성분비교.CSV) | 토너 25+종 전체. attribute는 [product_attribute_schema.md](product_attribute_schema.md) §2의 Core/Optional 키로 매핑 |
| `ingredients` | CSV의 전성분 컬럼 (unique 토큰) | 자주 등장하는 50~100개를 INCI 영문명과 매핑해 1차 시드. 나머지는 admin UI에서 신규 등록 경로 사용 |
| `product_ingredients` | CSV의 전성분 컬럼 (제품별 순서) | 각 제품의 전성분을 토큰화해 `(product_id, ingredient_id, order_index, raw_text)` 행으로 |

### 2.3 시드 안 함 (Rejected/ 영역)

- 식약처 기능성 임계값 ([Rejected/ingredient_efficacy_thresholds.md](Rejected/ingredient_efficacy_thresholds.md)) — serum 작업 시점에 활성화
- 외부 데이터 자동 수집 ([Rejected/data_source_catalog.md](Rejected/data_source_catalog.md)) — 향후 도입 시점에 활성화

---

## 3. 형식과 위치

```
backend/
└─ prisma/
   ├─ schema.prisma
   ├─ seed.ts                              ← orchestrator (재실행 안전)
   └─ seed/
      ├─ product_categories.json
      ├─ brands.json
      ├─ ingredients.json
      ├─ category_attribute_definitions.toner.json
      ├─ category_attribute_definitions.sunscreen.json   (P1)
      ├─ category_attribute_definitions.serum.json       (P1)
      ├─ category_attribute_definitions.lipcare.json     (P1)
      ├─ category_attribute_definitions.moisturizer.json (P1)
      ├─ category_attribute_definitions.cleanser.json    (P1)
      ├─ fact_definitions.json
      ├─ context_questions.json
      ├─ question_visibility_conditions.json
      ├─ priority_rules.json
      ├─ product_filter_mappings.toner.json
      ├─ product_filter_mappings.common.json
      ├─ products.toner.json               ← CSV 변환 결과
      └─ product_ingredients.toner.json    ← CSV 변환 결과
```

### 3.1 왜 TS + JSON인가
- **TS orchestrator**: 의존성 순서 제어, Prisma 타입 사용, upsert 보장.
- **JSON 데이터**: 큐레이터가 직접 편집 가능하고, CSV 변환 결과를 그대로 export 가능. 도메인별 분리로 PR diff가 깔끔함.
- 카테고리 단위로 파일을 쪼개면 토너 작업 시 다른 카테고리 파일은 비워두거나 placeholder만 둘 수 있다.

### 3.2 멱등성 (idempotent)
모든 시드는 자연키 기반 upsert.

| 테이블 | 자연키 |
|---|---|
| `product_categories` | `key` |
| `brands` | `slug` 또는 `name_ko` |
| `category_attribute_definitions` | `(category_id, key)` |
| `fact_definitions` | `key` |
| `context_questions` | `fact_key` |
| `priority_rules` | `key` |
| `product_filter_mappings` | `(category_id, filter_key, source_fact_key, source_condition_hash)` |
| `ingredients` | `inci_name` |
| `products` | `(brand_id, name)` |

기존 행이 있으면 update, 없으면 insert. 시드 재실행이 데이터 손실을 일으키지 않는다.

---

## 4. 실행 순서 (의존성 그래프)

```
1. product_categories          (의존성 없음)
2. brands                      (의존성 없음)
3. ingredients                 (의존성 없음)
4. ingredient_groups           ← ingredients
5. category_attribute_defs     ← product_categories
6. fact_definitions            (의존성 없음)
7. priority_rules + conditions ← fact_definitions
8. context_questions           ← fact_definitions
9. question_visibility_conds   ← context_questions
10. product_filter_mappings    ← product_categories, category_attribute_defs, fact_definitions
11. products                   ← product_categories, brands
12. product_ingredients        ← products, ingredients
```

`prisma/seed.ts`는 위 순서를 그대로 함수 호출로 표현한다.

---

## 5. CSV → JSON 변환

토너 25+종은 [화장품 성분비교.CSV](./화장품%20성분비교.CSV)에 큐레이터 형식으로 입력돼 있다. 이를 `products.toner.json` + `product_ingredients.toner.json`으로 변환하는 1회용 스크립트가 필요하다.

위치: `scripts/csv_to_seed.ts` (또는 `.py`).

처리 순서:
1. CSV를 UTF-8로 정규화 (현재 cp949/euc-kr 추정).
2. 각 행을 `product_attribute_schema.md` §2 Core/Optional 키로 매핑.
3. boolean 컬럼은 `TRUE/FALSE/x/공백`을 표준화 (공백 = `null`).
4. 전성분 컬럼은 쉼표/개행 split 후 토큰화.
5. `products.toner.json` + `product_ingredients.toner.json` 산출.

이 스크립트는 큐레이터가 CSV를 갱신하면 다시 돌려 JSON을 갱신한다.

---

## 6. MVP 단계별 시드 범위

### Phase A (토너만, 어드민 미리보기 단계)
- 시스템 데이터 전체 (6개 카테고리 룰/매핑)
- 카탈로그 데이터: 토너만

### Phase B (사용자 흐름 검증 단계)
- 동일. 변경 없음.

### Phase C (다른 카테고리 추가 시)
- 카테고리별 `category_attribute_definitions.{cat}.json`을 채운다.
- 카테고리별 `product_filter_mappings.{cat}.json`을 채운다.
- 카탈로그는 admin UI로 추가 (시드 갱신 X).

---

## 7. 명령

```bash
# 최초 1회
pnpm --filter backend exec prisma migrate dev

# 시드 실행 (재실행 안전)
pnpm --filter backend exec prisma db seed

# CSV 갱신 후 재시드
pnpm --filter backend exec tsx scripts/csv_to_seed.ts \
  && pnpm --filter backend exec prisma db seed

# 처음부터 다시 (개발용)
pnpm --filter backend exec prisma migrate reset
```

---

## 8. 검증 체크리스트

- [ ] `prisma studio`에서 6개 카테고리 모두 등록 확인.
- [ ] `category_attribute_definitions`에서 토너 키가 [product_attribute_schema.md](product_attribute_schema.md) §2.1/§2.2와 일치.
- [ ] `priority_rules`에 HOLD/CAUTION/PASS/ROUTE 룰이 모두 있고, 각 룰의 조건이 `priority_rule_conditions`에 정상 연결.
- [ ] `product_filter_mappings`에서 토너 행이 [matching_rules_revised.md](matching_rules_revised.md) §7.1 + §8.2의 행 수와 일치.
- [ ] `products`에서 토너 25+종 모두 등록, 각 제품의 `attributes` JSONB가 schema 검증 통과.
- [ ] `product_ingredients`에서 각 제품의 전성분 행이 비어있지 않음.
- [ ] 어드민 미리보기 화면에서 토너 BASIC_CONDITION 필터가 모든 제품에 정상 적용 (의도된 통과/제외 spot-check).

---

## 9. 다음 작업

1. `backend/` 초기화 후 위 디렉터리 구조 생성.
2. `scripts/csv_to_seed.ts` 작성 (CSV 인코딩 정규화 + attribute 키 매핑).
3. `prisma/seed/` 도메인별 JSON 채움 (시스템 데이터 먼저, 카탈로그 나중).
4. `prisma/seed.ts` orchestrator 작성 후 의존성 순서대로 호출.
5. 시드 1회 실행 + §8 체크리스트 검증.
6. 결과를 [memory/project_progress.md](../memory/project_progress.md)에 기록.
