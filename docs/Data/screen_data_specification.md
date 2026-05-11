# Screen Data Specification — 화면별 데이터 흐름 명세

> Service Flow: **S01 Landing → S02 Priority Gate → S03~S05 Category Decision → S06 Product Matrix → S07 Product Detail → S08 Reaction Traceback**
>
> 각 화면이 어떤 테이블에서 무엇을 **읽고(Read)**, 어디에 **쓰고(Write)**, 무엇을 **계산(Computed)**하고, 다음 화면에 무엇을 **전달(Next)**하는지 정의한다.
>
> 기준 명세: [db_modeling.md](db_modeling.md) · [db_schema_validation.md](db_schema_validation.md) · [../ContentSpec/wireframe_summary.md](../ContentSpec/wireframe_summary.md) · [../ContentSpec/page_content_specification.md](../ContentSpec/page_content_specification.md)

---

## 0. 공통 데이터 규약

### 0.1 신원 컨텍스트 (모든 화면 공통)

모든 요청에는 다음 컨텍스트가 동반된다.

| 항목         | 출처                                          | 사용                                                            |
| ------------ | --------------------------------------------- | --------------------------------------------------------------- |
| `device_id`  | 브라우저 cookie / localStorage (영구)         | 비로그인 사용자 식별, 모든 자식 테이블의 NOT NULL FK            |
| `user_id`    | 로그인 세션 (NULLABLE)                        | 로그인 시 신원 병합, 이력 통합                                  |
| `session_id` | `user_sessions` (탭/유입 단위, 30분 timeout)  | 모든 이벤트·답변·결정 row에 매달리는 활동창 식별자             |

> 매 화면 진입 시 ① `devices.last_seen_at` touch, ② `user_sessions`이 만료됐으면 새 row insert, ③ `session_events`에 화면 진입 이벤트 기록은 **공통으로 발생**한다 (아래 표에서는 화면별 고유 이벤트만 명시).

### 0.2 항상 발생하는 쓰기

| 테이블           | 이벤트                                     | 비고                                                       |
| ---------------- | ------------------------------------------ | ---------------------------------------------------------- |
| `devices`        | UPDATE `last_seen_at = now()`              | 매 요청                                                    |
| `user_sessions`  | UPDATE `last_seen_at` 또는 신규 INSERT     | 30분 비활동 시 새 세션                                     |
| `session_events` | INSERT `{event_name: '<screen>_viewed'}`   | 화면 진입 시 기본 이벤트                                   |

### 0.3 `decision_runs` 저장 정책

사용자에게 **실제로 결과를 보여준 화면**에서만 row를 적재한다 — S02(Priority Gate), S05(Category Decision 결과), S06(Product Matrix), S08(Traceback). `input_snapshot` / `applied_filters_snapshot` / `result_snapshot`을 모두 JSONB로 보관하며, **재조회는 snapshot이 아니라 현재 데이터를 다시 쿼리**한다(이력·고객지원용).

### 0.4 데이터 흐름 한눈에

```
S01 Landing
   ├ device_id 발급/복원
   ├ user_sessions 시작
   └ (concern 클릭 시) flow.concern user_fact + preset_facts
        ↓
S02 Priority Gate
   ├ 누적 user_facts 평가 → priority_rules 매칭
   ├ decision_runs (PRIORITY_GATE)
   └ 결과 분기: HOLD / CAUTION / PASS / ROUTE_CATEGORY / STOP
        ↓ (PASS / ROUTE_CATEGORY)
S03~S05 Category Decision (Box1 → Box2 → Box3)
   ├ context user_facts 누적
   ├ Box3 CTA → product_matrix_filter_states (CATEGORY_DECISION_CTA)
   └ decision_runs (CATEGORY_DECISION)
        ↓
S06 Product Matrix
   ├ filter_state 기반 products 동적 조회
   ├ avoidance_rules 자동 적용
   ├ 사용자 필터 편집 → filter_state.filters 갱신 (MANUAL)
   └ decision_runs (PRODUCT_MATRIX)
        ↓
S07 Product Detail
   └ 적합도 사유 + 회피 성분 표시 (조회 전용)
        ↓ (실패 경험 시)
S08 Reaction Traceback
   ├ reaction_reports + reaction_report_products
   ├ suspected_causes (분석)
   └ avoidance_rules upsert → 이후 S06에 자동 반영
```

---

## 1. S01 Landing

> Hero / Segment Entry · Priority Gate 소개 · Context 소개 · Product Matrix 소개 · Reaction Traceback 소개 · **Concern Mapper 캐러셀**

### 1.1 읽기 데이터 (Read)

| 데이터                            | 소스 테이블 / 출처            | 용도                                                  |
| --------------------------------- | ----------------------------- | ----------------------------------------------------- |
| Fast Lane 카테고리 칩 후보        | `product_categories`          | "이미 찾는 제품군 있음" 세그먼트 칩 노출              |
| Concern 태그 목록 / 매핑          | **프론트엔드 코드 상수**      | DB 비저장 — `concern_key → {route_target, preset_facts, suggested_category, suggested_filters}` |
| 기존 device 활성 세션             | `user_sessions WHERE device_id=? AND status='ACTIVE' AND expires_at>now()` | 만료 시 새 세션 시작 판단                              |

### 1.2 쓰기 데이터 (Write)

| 데이터                            | 대상 테이블           | 트리거 / 조건                                              |
| --------------------------------- | --------------------- | ---------------------------------------------------------- |
| device row (upsert)               | `devices`             | 진입 시 cookie의 `device_id` 없으면 새로 발급 INSERT       |
| 신규 활성 세션                    | `user_sessions`       | 활성 세션 없거나 만료 시 INSERT (`entry_path`, `referrer`) |
| `landing_viewed` 이벤트           | `session_events`      | 화면 진입                                                  |
| `segment_clicked` 이벤트          | `session_events`      | 4개 세그먼트 카드 중 하나 클릭                             |
| `concern_clicked` 이벤트          | `session_events`      | Concern 캐러셀 태그 클릭 (payload: `{concern:"acne"}`)     |
| `fast_lane_chip_clicked` 이벤트   | `session_events`      | Fast Lane 카테고리 칩 클릭                                 |
| `flow.concern` user_fact          | `user_facts`          | Concern 클릭 시 (`source='concern'`, value=concern key)    |
| preset_facts (concern 종속)       | `user_facts` (다수)   | 프론트 상수의 `preset_facts`를 `source='concern'`으로 INSERT |

### 1.3 계산 데이터 (Computed)

| 계산 항목                  | 입력                              | 로직                                                                 |
| -------------------------- | --------------------------------- | -------------------------------------------------------------------- |
| `device_id` 발급/복원      | cookie / localStorage             | 없으면 v4 UUID 발급 → cookie 저장 + `devices` INSERT                 |
| 세션 만료 판정             | `user_sessions.expires_at`        | `now() > expires_at`이면 새 세션 시작                                |
| Concern 라우팅 분기        | 클릭한 `concern_key` + 프론트 상수| `route_target` 값에 따라 `priority_gate` / `category_decision` 결정 |
| 진입 경로 메타             | `window.location`, `document.referrer` | `entry_path`, `referrer` 컬럼에 저장                                 |

### 1.4 다음 화면으로 전달 (Pass to Next)

| 데이터                  | 전달 방식           | 다음 화면 (세그먼트별)                                          |
| ----------------------- | ------------------- | --------------------------------------------------------------- |
| `device_id`             | cookie 유지         | 모든 후속 화면                                                  |
| `session_id`            | 서버 상태 / SWR     | 모든 후속 화면                                                  |
| `flow.concern` + preset | `user_facts` 저장   | S02 (concern 진입 시) / S03 (route_target='category_decision')  |
| 라우팅 대상 카테고리    | URL 쿼리            | S03 (Fast Lane 칩 → 해당 category로 점프)                       |

세그먼트별 다음 화면:

| 세그먼트                       | 다음                        |
| ------------------------------ | --------------------------- |
| 어디서부터 손댈지 모름         | S02 Priority Gate           |
| 고민은 있는데 카테고리를 모름  | S02 Priority Gate (concern preset 포함) |
| 이미 찾는 제품군이 있음 (Fast Lane) | S03 Category Decision  |
| 실패 원인 추적형               | S02 Priority Gate (→ S08)   |

---

## 2. S02 Priority Gate

> Life / 루틴 + 보유 제품 체크리스트로 "지금 새 제품을 사도 되는 상태인지" 판정.

### 2.1 읽기 데이터 (Read)

| 데이터                          | 소스 테이블                                                                                            | 용도                                                  |
| ------------------------------- | ------------------------------------------------------------------------------------------------------ | ----------------------------------------------------- |
| 노출 후보 질문 목록             | `context_questions WHERE screen='priority_gate' AND is_active=true ORDER BY ui_section, sort_order`    | 화면 박스에 그릴 질문 카드                            |
| 질문 노출 조건                  | `question_visibility_conditions WHERE question_id IN (...)`                                            | REQUIRED/EXCLUDED로 조건부 숨김 평가                  |
| fact 정의 (value_type, options) | `fact_definitions` (위 질문의 `fact_key`)                                                              | UI 입력 컨트롤 렌더링 (BOOLEAN/ENUM/MULTI_ENUM 등)    |
| 기존 답변 복원                  | `user_facts` (최신 row per `fact_key`, `device_id`/`user_id` 기준)                                     | 재진입 시 이전 선택값 복원                            |
| Priority Rule 목록              | `priority_rules WHERE is_active=true ORDER BY priority ASC`                                            | 평가 후보                                             |
| Rule 조건                       | `priority_rule_conditions WHERE rule_id IN (...)`                                                      | 각 Rule의 REQUIRED/EXCLUDED 조건                      |
| 추천 카테고리 해석              | `product_categories` (`recommend_category_id`)                                                         | ROUTE_CATEGORY 결과 시 카테고리명·key 노출            |

### 2.2 쓰기 데이터 (Write)

| 데이터                              | 대상 테이블        | 트리거                                                              |
| ----------------------------------- | ------------------ | ------------------------------------------------------------------- |
| 사용자 답변 (`fact_key`+`value`)    | `user_facts`       | 각 질문 응답 시 (`source='priority_gate'`, append-only)             |
| `priority_question_answered` 이벤트 | `session_events`   | 질문 답변마다                                                       |
| `priority_gate_submitted` 이벤트    | `session_events`   | "다음" CTA 클릭                                                     |
| 결과 snapshot                       | `decision_runs`    | 평가 완료 시 (`decision_type='PRIORITY_GATE'`, `result_*` snapshot) |

### 2.3 계산 데이터 (Computed)

| 계산 항목                | 입력                                                                  | 로직                                                                                                       |
| ------------------------ | --------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| 질문 노출 결정           | 현재 `user_facts` 최신값 + `question_visibility_conditions`           | REQUIRED는 AND, EXCLUDED는 OR-NOT. 조건 없으면 항상 노출.                                                  |
| Rule 매칭                | 누적 `user_facts` + `priority_rule_conditions`                        | priority ASC 순회. 모든 REQUIRED 충족 AND 모든 EXCLUDED 불충족인 첫 Rule 발동.                              |
| 결과 페이로드            | 매칭된 `priority_rules` row                                            | `result_type`, `result_title`, `result_description`, `hold_categories`/`recommend_category_id`, `cta_*` 추출 |
| `input_snapshot`         | 평가에 사용된 user_facts 묶음                                          | JSONB로 보존 (Rule 변경 후 재현용)                                                                          |

### 2.4 다음 화면으로 전달 (Pass to Next)

| 데이터                       | 전달 방식         | 다음 화면 (`result_type`별)                            |
| ---------------------------- | ----------------- | ------------------------------------------------------ |
| `decision_run.id`            | URL / state       | 결과 화면 (이력 추적)                                  |
| `result_type` / `result_*`   | 응답 페이로드     | 결과 카드 렌더링                                       |
| `recommend_category_id`      | 응답 페이로드     | S03 (ROUTE_CATEGORY 시)                                |
| `hold_categories[]`          | 응답 페이로드     | 보류 안내 화면 (HOLD 시)                               |
| 누적 `user_facts`            | 다음 화면이 재조회| S03 visibility 평가에 사용                             |

| `result_type`     | 다음 행동                                  |
| ----------------- | ------------------------------------------ |
| `STOP`            | 진단형 안내 화면 (제품 추천 없음)          |
| `HOLD`            | 보류 안내 (제품군 추천 보류)               |
| `CAUTION`         | △ 주의 후 S03                              |
| `PASS`            | S03 Category Decision (사용자가 카테고리 선택) |
| `ROUTE_CATEGORY`  | S03 (`recommend_category_id`로 점프)       |

---

## 3. S03 ~ S05 Category Decision (Box 1 → Box 2 → Box 3)

> Box 1 기본 확인 → Box 2 카테고리 기준 → Box 3 판단 결과(상위 제품 N개 + CTA).

### 3.1 읽기 데이터 (Read)

| 데이터                            | 소스 테이블                                                                                            | 용도                                                      |
| --------------------------------- | ------------------------------------------------------------------------------------------------------ | --------------------------------------------------------- |
| 선택 카테고리 메타                | `product_categories WHERE id=?`                                                                        | 카테고리명, key 노출                                      |
| context 질문 목록                 | `context_questions WHERE screen='context' AND is_active=true ORDER BY ui_section, sort_order`          | Box 1 (공통) + Box 2 (카테고리별) 질문                    |
| 질문 노출 조건                    | `question_visibility_conditions WHERE question_id IN (...)`                                            | 카테고리 의존 / 다른 fact 의존 노출 평가                  |
| fact 정의                         | `fact_definitions`                                                                                     | UI 입력 컨트롤 렌더링                                     |
| 누적 답변 복원                    | `user_facts` (`device_id`/`user_id` 최신)                                                              | Priority Gate에서 답한 fact 재사용 + 재진입 복원          |
| 카테고리 attribute 정의           | `category_attribute_definitions WHERE category_id=? AND is_filterable=true`                            | Box 3 필터 후보, Box 3 결과 카드 라벨                     |
| Filter Mapping 시드               | `product_filter_mappings WHERE category_id=? OR category_id IS NULL`                                   | 사용자 답변 → attribute 조건 변환 규칙                    |
| Box 3 미리보기 제품               | `products WHERE category_id=? AND is_active=true AND <attribute 조건> ORDER BY sort_order LIMIT N`     | 동적 SQL로 상위 N개 후보                                  |
| 회피 규칙                         | `avoidance_rules WHERE device_id=?/user_id=? AND is_active=true`                                       | 미리보기에 AVOID 제외 / CAUTION 태그 적용                 |
| Concern preset (있을 시)          | `user_facts WHERE source='concern'` + 프론트 상수의 `suggested_filters`                                | 카테고리가 `suggested_category`와 일치하면 힌트 필터로 합성 |

### 3.2 쓰기 데이터 (Write)

| 데이터                                 | 대상 테이블                      | 트리거                                                                            |
| -------------------------------------- | -------------------------------- | --------------------------------------------------------------------------------- |
| context 답변                           | `user_facts`                     | Box 1/Box 2 응답 시 (`source='context'`, append-only)                             |
| `category.selected` user_fact          | `user_facts`                     | 카테고리 진입 시 (Fast Lane / ROUTE_CATEGORY로 들어온 경우 포함)                  |
| 질문/카테고리 이벤트                   | `session_events`                 | `context_question_answered`, `category_box_advanced`, `category_decision_cta_clicked` |
| 신규 filter_state                      | `product_matrix_filter_states`   | Box 3 "제품 보러가기" CTA 클릭 시 (`source='CATEGORY_DECISION_CTA'`, filters JSONB) |
| 결과 snapshot                          | `decision_runs`                  | Box 3 진입 시 (`decision_type='CATEGORY_DECISION'`, `filter_state_id` 연결)        |

### 3.3 계산 데이터 (Computed)

| 계산 항목                       | 입력                                                                                          | 로직                                                                                                                                |
| ------------------------------- | --------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| 질문 노출 결정                  | `user_facts` 최신값 + `question_visibility_conditions`                                        | 동일 (REQUIRED AND / EXCLUDED OR-NOT). `category.selected EQ "sunscreen"` 같은 카테고리 의존 조건이 많음                            |
| 필터 후보 산출                  | `user_facts` (Priority Gate + context) + `product_filter_mappings`                            | 매칭되는 mapping row → `(attribute_key, attribute_operator, attribute_value, filter_mode, source_type)` 형태로 변환                  |
| 기본 필터 시드                  | `product_filter_mappings WHERE filter_type='BASIC_CONDITION' AND category_id=?`               | 카테고리 진입 시 자동 선택 (사용자 답변과 무관)                                                                                     |
| 개인화 필터 시드                | `product_filter_mappings WHERE filter_type='PERSONALIZED'`                                    | 사용자 답변에서 source 조건이 매칭되는 row만 자동 선택                                                                              |
| Concern preset 필터 합성        | `user_facts.source='concern'` + 프론트 상수 `suggested_filters` + `category.selected` 일치 여부 | 일치하면 `source_type='CONCERN_PRESET'`으로 filters에 추가                                                                            |
| Box 3 미리보기 제품             | category_id + attribute 조건들                                                                | 동적 SQL: `WHERE category_id=? AND is_active=true AND (attributes->>'k')::T <op> ?`. avoidance_rules 후처리.                          |

### 3.4 다음 화면으로 전달 (Pass to Next)

| 데이터                | 전달 방식                                | 다음 화면              |
| --------------------- | ---------------------------------------- | ---------------------- |
| `filter_state_id`     | URL / state                              | S06 Product Matrix     |
| `category_id`         | URL                                      | S06                    |
| `decision_run.id`     | 이력 표시 / 분석                         | (소비처 다양)          |
| 누적 `user_facts`     | DB에 이미 저장됨, 다음 화면이 재조회     | S06에서 필터 재구성 시 |

---

## 4. S06 Product Matrix

> 가격대 Tier List + BASIC + PERSONALIZED + TRACEBACK 필터 + 제품 카드.

### 4.1 읽기 데이터 (Read)

| 데이터                        | 소스 테이블                                                                                                  | 용도                                                                          |
| ----------------------------- | ------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------- |
| 활성 filter_state             | `product_matrix_filter_states WHERE (user_id=? OR device_id=?) AND category_id=? AND is_active=true ORDER BY updated_at DESC LIMIT 1` | 직접 진입 시 복원, CTA 진입 시 방금 만든 row |
| 카테고리 메타                 | `product_categories`                                                                                         | 페이지 헤더 + Select                                                          |
| 필터 추가 후보                | `category_attribute_definitions WHERE category_id=? AND is_filterable=true ORDER BY sort_order`              | "필터 추가" 버튼 드롭다운                                                     |
| 필터 라벨 변환                | `product_filter_mappings`                                                                                    | 수동 추가 필터의 표시 이름 / tag_label / caution_message 해석                 |
| 제품 후보                     | `products WHERE category_id=? AND is_active=true AND <dynamic attribute WHERE>`                              | filter_state.filters 기반 동적 조회                                           |
| 브랜드 정보                   | `brands`                                                                                                     | 제품 카드 브랜드명                                                            |
| 회피 규칙                     | `avoidance_rules WHERE (user_id=? OR device_id=?) AND is_active=true`                                        | AVOID/CAUTION 적용                                                            |
| 회피 → 제품 매핑              | `ingredient_group_members JOIN product_ingredients` (`ingredient_group_id` IN avoidance 목록)               | 어떤 product_id가 회피 대상인지 산출                                          |

### 4.2 쓰기 데이터 (Write)

| 데이터                                       | 대상 테이블                       | 트리거                                                                  |
| -------------------------------------------- | --------------------------------- | ----------------------------------------------------------------------- |
| filter_state.filters 갱신                    | `product_matrix_filter_states`    | 사용자가 필터 추가/제거 시 UPDATE (`source='MANUAL'`, `updated_at` 갱신) |
| `filter_added` / `filter_removed`            | `session_events`                  | 필터 편집                                                               |
| `product_card_clicked`                       | `session_events`                  | 제품 카드 클릭                                                          |
| 결과 snapshot                                | `decision_runs`                   | 페이지 로드/필터 변경 시 (`decision_type='PRODUCT_MATRIX'`)             |

### 4.3 계산 데이터 (Computed)

| 계산 항목                | 입력                                            | 로직                                                                                                                              |
| ------------------------ | ----------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| WHERE 절 생성            | `filter_state.filters[]` JSONB                  | 각 항목의 `attribute_key`/`operator`/`value`를 `attributes->>'k'` 캐스팅 + 비교로 변환                                            |
| HARD_FILTER 적용         | filter_mode='HARD_FILTER'                       | WHERE에 직접 추가 → 후보에서 제외                                                                                                  |
| EXCLUDE/CAUTION/SORT/TAG | 동일 mapping의 filter_mode                      | 후보는 유지하고 ① EXCLUDE: 별도 노출 ② CAUTION: △ 태그 ③ SORT: 상위 정렬 ④ TAG: 정보성 태그                                          |
| avoidance 적용           | `avoidance_rules` + ingredient_groups → products | AVOID: 결과 set에서 제거 / CAUTION: △ 태그 부여                                                                                     |
| 가격대 Tier 그루핑       | `products.price_band`                           | `UNDER_20000` / `BETWEEN_20000_50000` / `OVER_50000` 3그룹                                                                          |
| 적합도 태그              | user_facts vs product.attributes                | "눈시림 낮음" 등 시각 태그 산출 (`product_filter_mappings.tag_label` 활용)                                                          |
| 정렬                     | `products.sort_order`                           | 큐레이션 순서 우선, SORT 모드 필터 매칭 시 상위로                                                                                  |

### 4.4 다음 화면으로 전달 (Pass to Next)

| 데이터                | 전달 방식                | 다음 화면                            |
| --------------------- | ------------------------ | ------------------------------------ |
| `product_id`          | URL `/products/:id`      | S07 Product Detail                   |
| `filter_state_id`     | state                    | S07 (적합도 사유 계산용)             |

---

## 5. S07 Product Detail

> 제품 상세 + 적합도 사유 + 회피/주의 성분 + 외부 구매 링크. **조회 중심 화면** (write 거의 없음).

### 5.1 읽기 데이터 (Read)

| 데이터                       | 소스 테이블                                                                              | 용도                                              |
| ---------------------------- | ---------------------------------------------------------------------------------------- | ------------------------------------------------- |
| 제품 본체                    | `products WHERE id=?`                                                                    | 제품 정보 (name, price, image_url, attributes …) |
| 브랜드                       | `brands`                                                                                 | 브랜드명 표시                                     |
| 카테고리                     | `product_categories`                                                                     | 카테고리 라벨                                     |
| attribute 라벨/정렬          | `category_attribute_definitions WHERE category_id=? ORDER BY sort_order`                 | JSONB attributes → 한글 라벨 매핑 + 노출 순서     |
| 전성분                       | `product_ingredients JOIN ingredients WHERE product_id=? ORDER BY order_index`           | 전성분 목록                                       |
| 적합도 비교 근거             | `product_filter_mappings` (해당 카테고리)                                                | 어떤 attribute가 어떤 사용자 답변과 매칭하는지   |
| 사용자 답변                  | `user_facts` (최신)                                                                      | 적합/주의 사유 텍스트 생성                        |
| 사용자 회피                  | `avoidance_rules` + `ingredient_group_members`                                           | 회피/주의 성분 강조                               |

### 5.2 쓰기 데이터 (Write)

| 데이터                       | 대상 테이블        | 트리거                                                                |
| ---------------------------- | ------------------ | --------------------------------------------------------------------- |
| `product_detail_viewed`      | `session_events`   | 화면 진입                                                             |
| `purchase_link_clicked`      | `session_events`   | "구매하러 가기" 클릭 (`payload.purchase_url` 포함)                    |
| `traceback_started_from_detail` | `session_events` | 상세에서 Traceback CTA로 이동 시                                      |

> `decision_runs` 적재 없음 — Product Matrix가 이미 카드 단위 결과를 snapshot 했고, 상세는 그 안의 한 카드를 확대한 화면.

### 5.3 계산 데이터 (Computed)

| 계산 항목                | 입력                                                        | 로직                                                                                                              |
| ------------------------ | ----------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| 적합 사유 텍스트         | `user_facts` ∩ `product_filter_mappings` ∩ `product.attributes` | 매칭되는 filter_mapping에서 `tag_label`/`caution_message` 추출 후 자연어 문장 조립 ("눈시림 낮음 — 사용자 답변과 일치") |
| 회피 성분 하이라이트     | `avoidance_rules.ingredient_group_id` → `ingredient_group_members.ingredient_id` ∩ 제품 전성분 | 해당 ingredient_id에 AVOID 적색 / CAUTION 황색 마크 부여                                                            |
| attribute 렌더링         | `product.attributes` JSONB + `category_attribute_definitions` | `sort_order` 순으로 정렬, `label` 한글 표시, `value_type`에 맞는 포맷                                              |
| 가격대 배지              | `product.price_band`                                        | "~2만원" / "2~5만원" / "5만원+" 라벨                                                                              |

### 5.4 다음 화면으로 전달 (Pass to Next)

| 데이터                | 전달 방식                          | 다음 화면 / 외부                              |
| --------------------- | ---------------------------------- | --------------------------------------------- |
| `product.purchase_url`| `window.open` 외부 이동            | 외부 커머스 (올리브영 등)                     |
| `product_id`          | URL state                          | S08 Traceback (이 제품으로 문제/OK 후보 등록) |

---

## 6. S08 Reaction Traceback

> 문제 제품 + 괜찮은 제품 등록 → 성분 비교로 의심 성분군 추출 → 사용자 확정 시 `avoidance_rules` 영속 저장.

### 6.1 읽기 데이터 (Read)

| 데이터                           | 소스 테이블                                                                                  | 용도                                                              |
| -------------------------------- | -------------------------------------------------------------------------------------------- | ----------------------------------------------------------------- |
| 제품 검색                        | `products + brands + product_categories` (이름/브랜드/바코드 검색)                           | 문제/OK 제품 선택 입력                                            |
| 후보 제품 성분                   | `product_ingredients JOIN ingredients WHERE product_id IN (PROBLEM 목록 ∪ OK 목록)`          | 성분 비교 입력                                                    |
| 성분군 매핑                      | `ingredient_group_members JOIN ingredient_groups`                                            | 의심 그룹 후보 산출                                               |
| 기존 회피 규칙                   | `avoidance_rules WHERE (user_id=? OR device_id=?) AND is_active=true`                        | 중복 추가 방지 / 기존 규칙 노출                                   |
| 진입 컨텍스트 (있을 시)          | URL의 `product_id` (S07에서 진입)                                                            | PROBLEM 후보 초기값                                                |

### 6.2 쓰기 데이터 (Write)

| 데이터                           | 대상 테이블                | 트리거                                                                          |
| -------------------------------- | -------------------------- | ------------------------------------------------------------------------------- |
| 리포트 메타                      | `reaction_reports`         | "리포트 시작" 시 INSERT (symptoms, affected_areas, onset_timing, memo)          |
| 문제/괜찮은 제품                 | `reaction_report_products` | 제품 추가마다 INSERT (`type='PROBLEM'`/`'OK'`, used_period, used_count)         |
| 분석 출력                        | `suspected_causes`         | 분석 단계에서 INSERT (`ingredient_group_id`, `confidence`, `reason`)            |
| 영속 회피 규칙                   | `avoidance_rules`          | 사용자가 의심 그룹을 확정 시 UPSERT (`device_id`+`ingredient_group_id` 기준)    |
| `traceback_started` 등 이벤트    | `session_events`           | `traceback_started`, `problem_product_added`, `ok_product_added`, `suspected_cause_confirmed` |
| 결과 snapshot                    | `decision_runs`            | 분석 결과 노출 시 (`decision_type='REACTION_TRACEBACK'`, `result_snapshot`)     |

### 6.3 계산 데이터 (Computed)

| 계산 항목                  | 입력                                                                        | 로직                                                                                                                                                       |
| -------------------------- | --------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| PROBLEM 그룹 후보          | PROBLEM 제품들의 성분 → `ingredient_group_members.ingredient_group_id`      | UNION 후 그룹 목록                                                                                                                                          |
| OK 그룹 (무죄 처리)        | OK 제품들의 성분 → 동일 그룹 매핑                                            | 위 후보에서 차집합 → 의심 그룹                                                                                                                              |
| confidence 산정            | PROBLEM 내 등장 빈도, `used_period`, `used_count`, OK 제외 강도              | 휴리스틱: 모든 PROBLEM에 등장 + 어느 OK에도 없음 → `HIGH` / 일부 PROBLEM → `MEDIUM` / 단일 등장 → `LOW`                                                       |
| 사유 텍스트                | 등장 빈도 + 그룹 정보                                                       | "문제 제품 3개 모두에 향료 계열이 포함되어 있고 괜찮은 제품에는 없습니다" 형식                                                                                |
| avoidance upsert           | `(device_id, ingredient_group_id)`                                          | 동일 키 row 있으면 UPDATE (`action` 갱신, `is_active=true`) / 없으면 INSERT                                                                                  |

### 6.4 다음 화면으로 전달 (Pass to Next)

| 데이터                                   | 전달 방식                                                              | 다음 화면 / 효과                                                       |
| ---------------------------------------- | ---------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| 신규 `avoidance_rules` row               | DB 영속 → 모든 후속 S06/S07 조회에 자동 반영                            | S06 Product Matrix (TRACEBACK 필터 자동 적용 + AVOID 제외 / CAUTION 태그) |
| filter_state.filters의 TRACEBACK 항목    | `product_matrix_filter_states` 업데이트 (CTA 클릭 시)                  | S06 진입 시 자동 선택 상태                                              |
| `report.id`                              | URL / 사용자 이력 화면                                                  | 리포트 재조회                                                          |

---

## 7. 부록 A — 로그인 자동 병합 (cross-screen)

로그인 이벤트가 발생하면 **현재 화면과 무관하게** 다음 트랜잭션을 단일 단위로 실행한다 ([db_modeling.md:85](db_modeling.md#L85), [backend/CLAUDE.md](../../backend/CLAUDE.md) 트랜잭션 가이드).

```sql
UPDATE devices                       SET user_id = :user_id WHERE id = :device_id;
UPDATE user_sessions                 SET user_id = :user_id WHERE device_id = :device_id AND user_id IS NULL;
UPDATE user_facts                    SET user_id = :user_id WHERE device_id = :device_id AND user_id IS NULL;
UPDATE decision_runs                 SET user_id = :user_id WHERE device_id = :device_id AND user_id IS NULL;
UPDATE reaction_reports              SET user_id = :user_id WHERE device_id = :device_id AND user_id IS NULL;
UPDATE avoidance_rules               SET user_id = :user_id WHERE device_id = :device_id AND user_id IS NULL;
UPDATE product_matrix_filter_states  SET user_id = :user_id WHERE device_id = :device_id AND user_id IS NULL;
```

> 사용자에게 병합 UI를 보이지 않는다. 다음 요청부터 `WHERE user_id = ?` 기반 조회로 자연스럽게 이어진다.

---

## 8. 부록 B — 테이블별 read/write 발생 화면 매트릭스

| 테이블                              | S01 | S02 | S03~S05 | S06 | S07 | S08 |
| ----------------------------------- | --- | --- | ------- | --- | --- | --- |
| `users`                             | —   | —   | —       | —   | —   | —   |
| `devices`                           | W   | W   | W       | W   | W   | W   |
| `user_sessions`                     | W   | W   | W       | W   | W   | W   |
| `session_events`                    | W   | W   | W       | W   | W   | W   |
| `fact_definitions`                  | —   | R   | R       | —   | —   | —   |
| `context_questions`                 | —   | R   | R       | —   | —   | —   |
| `question_visibility_conditions`    | —   | R   | R       | —   | —   | —   |
| `user_facts`                        | W   | R/W | R/W     | R   | R   | —   |
| `priority_rules`                    | —   | R   | —       | —   | —   | —   |
| `priority_rule_conditions`          | —   | R   | —       | —   | —   | —   |
| `decision_runs`                     | —   | W   | W       | W   | —   | W   |
| `product_categories`                | R   | R   | R       | R   | R   | R   |
| `brands`                            | —   | —   | —       | R   | R   | R   |
| `category_attribute_definitions`    | —   | —   | R       | R   | R   | —   |
| `products`                          | —   | —   | R       | R   | R   | R   |
| `product_filter_mappings`           | —   | —   | R       | R   | R   | —   |
| `product_matrix_filter_states`      | —   | —   | W       | R/W | R   | (W) |
| `ingredients`                       | —   | —   | —       | —   | R   | R   |
| `product_ingredients`               | —   | —   | (R)     | (R) | R   | R   |
| `ingredient_groups`                 | —   | —   | —       | (R) | (R) | R   |
| `ingredient_group_members`          | —   | —   | (R)     | R   | R   | R   |
| `reaction_reports`                  | —   | —   | —       | —   | —   | W   |
| `reaction_report_products`          | —   | —   | —       | —   | —   | W   |
| `suspected_causes`                  | —   | —   | —       | —   | —   | W   |
| `avoidance_rules`                   | —   | —   | R       | R   | R   | R/W |

> 괄호 `(R)`는 회피 규칙 적용 시 등 **부수적 조회**. `W` 옆 괄호 표시는 다른 화면 동작의 부수 효과로 갱신되는 경우.

---

## 9. 변경 / 확장 시 갱신할 곳

| 변화                              | 동기화 대상                                                                                                  |
| --------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| 신규 fact_key 도입                | `fact_definitions` 시드 + 본 문서 §2/§3 Read 표 + 관련 visibility 조건                                       |
| 신규 카테고리 추가                | `product_categories`, `category_attribute_definitions`, `product_filter_mappings`, `product_attribute_schema.md` |
| 신규 Priority Rule 추가           | `priority_rules`/`priority_rule_conditions` 시드 + 본 문서 §2.4 결과 분기                                    |
| 신규 화면 추가                    | 본 문서에 새 §, [wireframe_summary.md](../ContentSpec/wireframe_summary.md), [page_content_specification.md](../ContentSpec/page_content_specification.md) |
| FE 라우팅 변경                    | 본 문서의 "다음 화면으로 전달" 표                                                                            |
