# K-Beauty Decision MVP — Matching Rules (Revised)

> 목적: `page_content_specification_revised.md`와 `product_attribute_schema_revised.md`를 기준으로 사용자 답변을 제품 attribute 조건으로 변환하는 Rule을 정의한다.  
> 범위: Priority Gate, Concern Routing, Category Decision, Product Matrix, Product Detail, Reaction Traceback 반영 Rule  
> 작성일: 2026-05-01

---

## 0. 전체 흐름

| 단계 | 입력 | 처리 | 출력 |
|---|---|---|---|
| 1 | Segment / Concern 클릭 | 프론트 상수 매핑 | `flow.concern`, `route_target`, `preset_facts`, `suggested_category` |
| 2 | Concern preset 적용 | `source = concern` 초기 선택 상태 저장 또는 프론트 상태 유지 | Priority Gate 질문 우선순위 또는 Category Decision seed |
| 3 | Priority Gate 답변 | `priority_rules` 평가 | HOLD / CAUTION / PASS / ROUTE_CATEGORY |
| 4 | Category Decision 답변 | user_facts 저장 | category별 Context 완성 |
| 5 | Matching Rule 적용 | `product_filter_mappings` + application layer computed filter | filter_state 생성 |
| 6 | Product Matrix 조회 | `products.attributes` 조건 조회 | 제품 후보 + 태그 + 주의 사유 |
| 7 | Product Detail | 동일 filter_state 기준 사유 계산 | 적합도 상세 설명 |
| 8 | Reaction Traceback | 문제/괜찮은 제품 성분 비교 | avoidance_rules 생성 |
| 9 | 다음 Product Matrix | avoidance_rules 추가 적용 | 회피/주의 성분 반영 |

---

## 1. 공통 규칙

### 1.1 DB operator

`product_filter_mappings`, `priority_rule_conditions`, `question_visibility_conditions`에서 기본으로 사용할 operator는 아래로 제한한다.

| operator | 의미 |
|---|---|
| `EQ` | 값이 같음 |
| `NEQ` | 값이 같지 않음 |
| `IN` | 값이 배열 중 하나에 포함됨 |
| `CONTAINS` | 배열 attribute 또는 MULTI_ENUM fact가 특정 값을 포함함 |
| `GTE` | 숫자 이상 |
| `LTE` | 숫자 이하 |

### 1.2 Application layer computed operator

아래 조건은 DB 스키마의 기본 operator만으로는 표현이 어렵기 때문에 application layer에서 계산한다.

| computed operator | 사용처 | 계산 방식 |
|---|---|---|
| `CONTAINS_ANY` | active 성분, concern fit | 배열 중 하나라도 포함되면 true |
| `CONTAINS_ANY_N` | 기능성 제품 과다 사용 | 지정 배열 중 N개 이상 포함되면 true |
| `NOT_CONTAINS` | 세럼 병행 주의 inverse filter | `CONTAINS` 결과를 반대로 판단 |
| `COMPOSITE_AND` | `triple_moisture`, `balanced_moisture` | 여러 attribute 조건을 모두 만족해야 true |
| `COMPOSITE_OR` | `barrier_ingredients` | 여러 attribute 조건 중 하나 이상 만족하면 true |
| `HAS_LENGTH_GTE` | `clear_purpose` | 배열 길이가 N 이상이면 true |
| `PRICE_BAND_EQ` | 예산 필터 | `products.price_band` 직접 비교 |
| `DERIVED_BOOLEAN` | `routine.sunscreen_use` | 다른 fact에서 boolean 파생 |

### 1.3 filter_mode 의미

| filter_mode | 의미 | Product Matrix 처리 |
|---|---|---|
| `HARD_FILTER` | 조건 미충족 제품 제외 | WHERE 조건에 반영 |
| `EXCLUDE` | 제외 권장 | 기본 목록에서 숨기거나 하단 분리 |
| `CAUTION` | 제품은 남기되 주의 표시 | △ 주의 배지와 caution message 표시 |
| `SORT` | 조건 만족 제품 우선 노출 | 랭킹 점수 가산 |
| `TAG` | 조건 만족 제품에 정보성 태그 | 제품 카드 태그 표시 |

### 1.4 filter_type 의미

| filter_type | 의미 |
|---|---|
| `BASIC_CONDITION` | 카테고리별 좋은 제품의 기본 조건. 카테고리 진입 시 기본 선택 상태 |
| `PERSONALIZED` | 사용자 답변 또는 Concern에서 생성된 개인화 필터 |
| `TRACEBACK` | Reaction Traceback의 avoidance_rules에서 생성된 필터 |
| `MANUAL` | 사용자가 Product Matrix에서 직접 추가/삭제한 필터 |

### 1.5 boolean attribute 해석

| attribute | true | false | unknown/null |
|---|---|---|---|
| `fragrance` | 향료 포함 | 향료 없음 | 확인 불가 |
| `alcohol` | 자극 가능 알코올 포함 | 자극 가능 알코올 없음 | 확인 불가 |
| `oil_free` | 오일프리 | 오일프리 아님 | 확인 불가 |
| `non_comedogenic` | 논코메도제닉 근거 있음 | 근거 없음 | 확인 불가 |
| `portable` | 휴대형 | 휴대형 아님 | 확인 불가 |

HARD_FILTER에서 `fragrance = false`를 적용하면 `fragrance = null`인 제품은 통과하지 않는다.

---

## 2. Derived Facts

| derived_fact | source | 계산 |
|---|---|---|
| `routine.sunscreen_use` | `routine.sunscreen_frequency` | `daily`, `sometimes`이면 true. `rarely`, `never`이면 false |
| `routine.tool_hygiene_risk` | `routine.brush_wash_cycle`, `routine.puff_age` | 브러시 세척 시점이 `over_2_weeks`이거나 퍼프 사용 기간이 `over_3_months`이면 true |
| `routine.sleep_hygiene_risk` | `routine.pillowcase_change_cycle`, `routine.morning_face_condition`, `routine.bedtime_routine`, `routine.cleansing_before_sleep` | 배갯잎 교체 시점이 `over_7_days` 또는 `not_sure`이거나, 잠들기 전 세안을 하지 않거나, 잠들기 전 루틴이 없고 아침 얼굴 상태가 `oily_sticky` / `dry_tight` / `new_bumps` 중 하나면 true |
| `product.active_overload` | `product.owned_categories` | `retinol`, `vitamin_c`, `aha_bha`를 모두 포함하면 true |
| `product.functional_overlap` | `product.owned_categories` | `essence`, `serum`, `ampoule` 중 2개 이상 포함하면 true |
| `product.toner_overlap` | `product.owned_categories` | `toner`, `skin`, `toner_pad` 중 2개 이상 포함하면 true |
| `product.moisturizer_overlap` | `product.owned_categories` | `lotion`, `cream` 둘 다 포함하면 true |
| `flow.has_concern_preset` | `flow.concern` | Concern Mapper에서 들어왔으면 true |

---

# 3. Priority Gate Matching Rules

## 3.1 평가 방식

| 항목 | 규칙 |
|---|---|
| 정렬 | `priority` 오름차순 |
| 채택 | 첫 번째로 모든 REQUIRED 조건이 충족되는 Rule |
| 제외 | EXCLUDED 조건이 하나라도 충족되면 해당 Rule skip |
| fallback | 아무 Rule도 매칭되지 않으면 PASS Rule 적용 |
| 저장 | 결과는 `decision_runs.decision_type = PRIORITY_GATE`로 snapshot 저장 |

## 3.2 Priority Rule Seed

| rule_key | priority | result_type | result_title | cta_label | cta_target |
|---|---:|---|---|---|---|
| `recent_irritation_hold` | 1 | HOLD | 지금은 새 제품보다 피부 반응 안정화가 먼저예요. | 현재 루틴 점검하기 | `/routine-check` |
| `active_overload_hold` | 2 | HOLD | 자극 가능성이 높아 새 세럼이나 필링 제품은 보류하는 게 좋아요. | 병행 성분 정리하기 | `/routine-check?focus=active` |
| `functional_overlap_hold` | 3 | HOLD | 새 기능성 제품은 잠시 보류하고 루틴을 단순화하는 게 좋아요. | 기능성 제품 정리하기 | `/routine-check?focus=functional` |
| `cleansing_route` | 4 | ROUTE_CATEGORY | 메이크업이나 선크림 제거 방식부터 점검하는 게 좋아요. | 클렌저 보기 | `/category-decision?category=cleanser` |
| `outdoor_sunscreen_route` | 5 | ROUTE_CATEGORY | 세럼보다 선크림 루틴이 먼저예요. | 선크림 보기 | `/category-decision?category=sunscreen` |
| `sunscreen_daily_route` | 6 | ROUTE_CATEGORY | 외출할 때 바를 수 있는 선크림을 먼저 찾아야 해요. | 선크림 보기 | `/category-decision?category=sunscreen` |
| `dry_barrier_route` | 7 | ROUTE_CATEGORY | 기능성 제품보다 보습 루틴 고정이 먼저예요. | 로션/크림 보기 | `/category-decision?category=moisturizer` |
| `eye_irritation_caution` | 8 | CAUTION | 눈가 자극이 잦다면 저자극 세안/선크림 기준을 먼저 봐야 해요. | 눈 자극 기준으로 보기 | `/category-decision?category=cleanser` |
| `makeup_compat_caution` | 9 | CAUTION | 선크림, 보습제, 베이스 궁합을 같이 봐야 해요. | 궁합 기준으로 보기 | `/category-decision?category=sunscreen` |
| `tool_hygiene_caution` | 10 | CAUTION | 브러시와 퍼프 위생도 같이 점검해보세요. | 도구 위생 점검하기 | `/routine-check?focus=tool-hygiene` |
| `night_hygiene_caution` | 11 | CAUTION | 밤 루틴과 침구 위생도 같이 점검해보세요. | 밤 루틴 점검하기 | `/routine-check?focus=night-routine` |
| `duplicate_role_caution` | 12 | CAUTION | 새로 사기보다 기존 제품을 먼저 정리해요. | 보유 제품 정리하기 | `/routine-check?focus=duplicate` |
| `priority_pass` | 13 | PASS | 지금은 기능성 제품군을 봐도 괜찮아요. | 제품군 고르기 | `/category-decision` |

## 3.3 Priority Rule Conditions

| rule_key | conditions |
|---|---|
| `recent_irritation_hold` | REQUIRED `life.recent_irritation EQ true` |
| `active_overload_hold` | REQUIRED `product.active_overload EQ true` |
| `functional_overlap_hold` | REQUIRED `product.functional_overlap EQ true` |
| `cleansing_route` | REQUIRED `routine.cleansing_stable EQ false` OR `routine.foam_enough EQ false` |
| `outdoor_sunscreen_route` | REQUIRED `life.outdoor_activity IN [1_3h, over_3h]`; REQUIRED `routine.sunscreen_use EQ false`; EXCLUDED `life.recent_irritation EQ true` |
| `sunscreen_daily_route` | REQUIRED `routine.sunscreen_frequency IN [rarely, never]`; EXCLUDED `life.recent_irritation EQ true` |
| `dry_barrier_route` | REQUIRED `routine.recent_dry_tight EQ true`; EXCLUDED `life.recent_irritation EQ true` |
| `eye_irritation_caution` | REQUIRED `routine.eye_irritation_history EQ true` |
| `makeup_compat_caution` | REQUIRED `routine.makeup_frequent EQ true`; EXCLUDED `life.recent_irritation EQ true` |
| `tool_hygiene_caution` | REQUIRED `routine.tool_hygiene_risk EQ true` |
| `night_hygiene_caution` | REQUIRED `routine.sleep_hygiene_risk EQ true` |
| `duplicate_role_caution` | REQUIRED `product.toner_overlap EQ true` OR `product.moisturizer_overlap EQ true` OR `product.functional_overlap EQ true` |
| `priority_pass` | fallback |

## 3.4 Priority Rule Result Side Effects

| result_type | side effect |
|---|---|
| HOLD | Category Decision 진입 전 경고. 새 제품 추천 CTA보다 루틴 점검 CTA 우선 |
| CAUTION | Category Decision 진입 가능. Product Matrix에서 주의 필터 기본 포함 가능 |
| ROUTE_CATEGORY | `category.selected`를 추천 카테고리로 저장 |
| PASS | 사용자가 직접 카테고리 선택 |

---

# 4. Question Visibility Rules

## 4.1 공통 질문 visibility

| question fact_key | REQUIRED | EXCLUDED |
|---|---|---|
| `context.skin_type` | `category.selected IN [toner, sunscreen, serum, moisturizer, cleanser]` | `category.selected EQ lipcare` |
| `context.usage_place` | `category.selected IN [sunscreen, lipcare, moisturizer]` | - |
| `context.usage_time` | `category.selected IN [toner, sunscreen, serum, moisturizer, cleanser]` | - |
| `context.portable` | `category.selected IN [sunscreen, lipcare]` | - |
| `preference.fragrance_sensitive` | - | - |
| `preference.alcohol_sensitive` | `category.selected IN [toner, sunscreen, serum, moisturizer, cleanser]` | `category.selected EQ lipcare` |
| `context.avoid_texture` | `category.selected IN [sunscreen, serum, moisturizer, cleanser, lipcare]` | - |
| `context.past_failure` | - | - |

## 4.2 카테고리별 질문 visibility

| category | 질문 fact_key |
|---|---|
| `toner` | `context.exfoliation_sensitive`, `context.oil_control_need`, `context.daily_use`, `context.acne_prone` |
| `sunscreen` | `life.outdoor_activity`, `context.eye_sting`, `context.white_cast_sensitive`, `context.sunscreen_skip_reason`, `context.makeup_use`, `context.touch_up`, `context.water_sweat_exposure` |
| `serum` | `context.serum_purpose`, `life.recent_irritation`, `product.owned_actives`, `context.usage_time`, `context.expectation_speed`, `routine.sunscreen_frequency` |
| `lipcare` | `context.lip_severity`, `preference.menthol_sensitive`, `preference.fragrance_sensitive`, `context.lip_reapply`, `context.lip_outdoor`, `context.lip_form`, `context.lip_night_care` |
| `moisturizer` | `context.moisturizer_goal`, `routine.recent_dry_tight`, `context.prefer_lightweight`, `context.makeup_use`, `context.acne_prone`, `context.season`, `context.moisturizer_form` |
| `cleanser` | `context.cleanser_usage`, `context.makeup_sunscreen_level`, `routine.cleansing_stable`, `routine.recent_dry_tight`, `context.scrub_sensitive`, `context.cleanser_form`, `context.double_cleanse_needed` |

## 4.3 Conditional visibility details

| question | 추가 노출 조건 |
|---|---|
| `context.touch_up` | `category.selected EQ sunscreen` AND `context.usage_place IN [outdoor, both]` |
| `context.water_sweat_exposure` | `category.selected EQ sunscreen` AND `life.outdoor_activity IN [1_3h, over_3h]` |
| `routine.sunscreen_frequency` for serum | `category.selected EQ serum` AND `context.serum_purpose IN [brightening, anti_aging, acne, texture]` |
| `context.lip_outdoor` | `category.selected EQ lipcare` AND `context.usage_place IN [outdoor, both]` |
| `context.lip_night_care` | `category.selected EQ lipcare` AND `context.lip_severity EQ true` |
| `context.makeup_use` for moisturizer | `category.selected EQ moisturizer` AND `routine.makeup_frequent EQ true` OR `context.usage_time IN [morning, morning (출근 전)]` |
| `context.double_cleanse_needed` | `category.selected EQ cleanser` AND `context.makeup_sunscreen_level IN [sunscreen, light_makeup, heavy_makeup, waterproof]` |

---

# 5. Concern Routing Rules

## 5.1 처리 방식

| 단계 | 처리 |
|---|---|
| 1 | Concern 태그 클릭 |
| 2 | `session_events`에 `concern_clicked` 저장 |
| 3 | `flow.concern` 저장 |
| 4 | `preset_facts`를 `source = concern` 초기 선택 상태로 저장하거나 프론트 상태에 유지 |
| 5 | `route_target = priority_gate`면 Priority Gate로 이동하고 관련 질문을 우선 노출 |
| 6 | `route_target = category_decision`면 `category.selected = suggested_category`를 seed한 뒤 Category Decision으로 이동 |
| 7 | `suggested_filters`는 즉시 Product Matrix를 만들지 않고, 최종 category가 `suggested_category`와 일치할 때만 `CONCERN_PRESET` source_type으로 합성 |

## 5.2 Concern Mapping Seed

| concern | flow.concern | route_target | preset_facts | suggested_category | suggested_filters |
|---|---|---|---|---|---|
| 뾰루지 | `acne_spot` | `priority_gate` | `flow.concern = acne_spot` | `serum` | `low_irritation`, `acne_fit` |
| 여드름 | `acne` | `priority_gate` | `flow.concern = acne` | `cleanser` | `mild_ph`, `low_sls`, `non_comedogenic` |
| 붉어짐 | `redness` | `priority_gate` | `flow.concern = redness`, `life.recent_irritation = true 후보` | `toner` | `low_irritation`, `mild_ph`, `no_fragrance` |
| 뒤집힘 | `breakout_reaction` | `priority_gate` | `flow.concern = breakout_reaction`, `life.recent_irritation = true 후보` | `moisturizer` | `barrier_ingredients`, `low_irritation`, `no_fragrance` |
| 트러블 반복 | `recurring_trouble` | `priority_gate` | `flow.concern = recurring_trouble` | `cleanser` | `mild_ph`, `low_sls`, `non_comedogenic` |
| 민감 반응 | `sensitivity_reaction` | `priority_gate` | `flow.concern = sensitivity_reaction`, `life.recent_irritation = true 후보` | `moisturizer` | `barrier_ingredients`, `low_irritation`, `no_fragrance` |
| 건조 | `dryness` | `priority_gate` | `flow.concern = dryness`, `routine.recent_dry_tight = true 후보` | `moisturizer` | `triple_moisture`, `barrier_ingredients` |
| 당김 | `tightness` | `priority_gate` | `flow.concern = tightness`, `routine.recent_dry_tight = true 후보` | `moisturizer` | `triple_moisture`, `barrier_ingredients` |
| 각질 | `flaky_texture` | `priority_gate` | `flow.concern = flaky_texture`, `routine.recent_dry_tight = true 후보` | `toner` | `low_irritation`, `mild_ph`, `gentle_exfoliation` |
| 번들거림 | `oiliness` | `priority_gate` | `flow.concern = oiliness` | `toner` | `oil_control`, `low_irritation`, `mild_ph` |
| 눈가 건조 | `eye_area_dryness` | `priority_gate` | `flow.concern = eye_area_dryness`, `routine.recent_dry_tight = true 후보` | `moisturizer` | `high_hydration`, `barrier_ingredients`, `low_irritation` |
| 입술 트임 | `lip_chapped` | `category_decision` | `flow.concern = lip_chapped`, `context.lip_severity = true 후보` | `lipcare` | `high_moisture`, `no_menthol` |
| 화장 뜸 | `makeup_floating` | `category_decision` | `flow.concern = makeup_floating`, `context.makeup_use = true 후보` | `moisturizer` | `makeup_compat_good`, `low_sticky` |
| 밀림 | `pilling` | `category_decision` | `flow.concern = pilling`, `context.makeup_use = true 후보` | `sunscreen` | `makeup_compat_good`, `low_sticky` |
| 쿠션 추천 | `cushion_help` | `category_decision` | `flow.concern = cushion_help`, `context.makeup_use = true 후보` | `moisturizer` | `makeup_compat_good`, `low_sticky`, `high_hydration` |
| 파운데이션 고민 | `foundation_help` | `category_decision` | `flow.concern = foundation_help`, `context.makeup_use = true 후보` | `moisturizer` | `makeup_compat_good`, `low_sticky`, `high_hydration` |
| 선크림 추천 | `sunscreen_need` | `category_decision` | `flow.concern = sunscreen_need` | `sunscreen` | `spf_50_plus`, `pa_4_plus` |
| 립 제품 | `lipcare_need` | `category_decision` | `flow.concern = lipcare_need` | `lipcare` | `high_moisture`, `balanced_moisture` |
| 잡티 | `pigmentation` | `priority_gate` | `flow.concern = pigmentation` | `serum` | `effective_dose`, `clear_purpose`, `morning_use` |
| 다크서클 | `dark_circle` | `priority_gate` | `flow.concern = dark_circle` | `serum` | `low_irritation`, `clear_purpose`, `effective_dose` |
| 홍조 | `redness_chronic` | `priority_gate` | `flow.concern = redness_chronic`, `life.recent_irritation = true 후보` | `serum` | `low_irritation`, `no_fragrance`, `calming_fit` |
| 모공 | `pore` | `priority_gate` | `flow.concern = pore` | `serum` | `clear_purpose`, `pore_fit`, `low_irritation` |
| 피부톤 | `tone` | `priority_gate` | `flow.concern = tone` | `serum` | `effective_dose`, `clear_purpose`, `morning_use` |
| 탄력 | `elasticity` | `priority_gate` | `flow.concern = elasticity` | `serum` | `effective_dose`, `clear_purpose`, `night_use` |

`preset_facts`는 확정 답변이 아니라 초기 선택 상태와 질문 우선순위 힌트다. 이후 사용자가 직접 입력한 Priority Gate / Context 답변이 있으면 그 값이 우선한다.

---

# 6. Product Matrix Filter Generation

## 6.1 기본 생성 순서

| 순서 | 처리 |
|---|---|
| 1 | `category.selected` 확인 |
| 2 | 해당 카테고리 BASIC_CONDITION 필터 추가 |
| 3 | concern preset이 있고 최종 category가 `suggested_category`와 일치하면 `suggested_filters`를 `CONCERN_PRESET`으로 추가 |
| 4 | Category Decision 답변을 `product_filter_mappings`로 변환 |
| 5 | Reaction Traceback 회피 규칙이 있으면 TRACEBACK 필터 추가 |
| 6 | `product_matrix_filter_states.filters`에 저장 |
| 7 | products 조회 |
| 8 | `decision_runs`에 snapshot 저장 |

## 6.2 기본 BASIC_CONDITION 필터

| category | default BASIC_CONDITION filters |
|---|---|
| `toner` | `hydrating_toner`, `low_irritation`, `mild_ph` |
| `sunscreen` | `spf_50_plus`, `pa_4_plus`, `broad_spectrum`, `eye_sting_low`, `white_cast_low`, `makeup_compat_good` |
| `serum` | `effective_dose`, `low_irritation`, `clear_purpose` |
| `lipcare` | `high_moisture`, `balanced_moisture`, `no_menthol`, `low_fragrance` |
| `moisturizer` | `barrier_ingredients`, `triple_moisture`, `mild_ph`, `low_irritation` |
| `cleanser` | `mild_ph`, `low_sls`, `low_irritation` |

# 7. Product Filter Mapping Seed — BASIC_CONDITION

## 7.1 Toner BASIC_CONDITION

| filter_key | label | attribute condition | mode | 비고 |
|---|---|---|---|---|
| `hydrating_toner` | 수분 공급 | `hydration_level IN [medium, high]` | SORT | 좋은 토너 기본 조건. 목적이 각질이어도 수분감 우선순위 부여 |
| `low_irritation` | 저자극 | `irritation_risk EQ low` | HARD_FILTER | 매일 쓰는 첫 단계 제품 기준 |
| `mild_ph` | 약산성 | `ph GTE 4.5` AND `ph LTE 6.0` | SORT | pH 미기재 제품은 제외하지 않고 점수만 낮춤 |

## 7.2 Sunscreen BASIC_CONDITION

| filter_key | label | attribute condition | mode | 비고 |
|---|---|---|---|---|
| `spf_50_plus` | SPF 50 이상 | `spf GTE 50` | HARD_FILTER | 야외/일상 기본 스펙으로 채택 |
| `pa_4_plus` | PA++++ | `pa EQ ++++` | HARD_FILTER | UVA 차단 기준 |
| `broad_spectrum` | 광범위 차단 | `broad_spectrum EQ true` | HARD_FILTER | UVA/UVB 동시 차단 |
| `eye_sting_low` | 눈시림 낮음 | `eye_sting IN [none, low]` | SORT | 개인화에서 눈시림 경험이 있으면 HARD_FILTER로 승격 |
| `white_cast_low` | 백탁 적음 | `white_cast IN [none, low]` | SORT | 개인화에서 백탁 민감이면 HARD_FILTER로 승격 |
| `makeup_compat_good` | 메이크업 궁합 | `makeup_compatibility EQ good` | TAG | 메이크업 사용자가 아니면 정보 태그 |

## 7.3 Serum BASIC_CONDITION

| filter_key | label | attribute condition | mode | 비고 |
|---|---|---|---|---|
| `effective_dose` | 유효 함량 충족 | `effective_dose_met EQ true` | TAG | 목적별 성분이 명확할 때 가산 |
| `low_irritation` | 자극 가능성 낮음 | `irritation_risk EQ low` | SORT | 최근 자극 있으면 HARD_FILTER로 승격 |
| `clear_purpose` | 목적 성분 명확 | `active_ingredients HAS_LENGTH_GTE 1` AND `target_concerns HAS_LENGTH_GTE 1` | HARD_FILTER | 세럼 카테고리의 최소 기준 |

## 7.4 Lipcare BASIC_CONDITION

| filter_key | label | attribute condition | mode | 비고 |
|---|---|---|---|---|
| `high_moisture` | 보습 지속력 높음 | `moisture_lasting EQ high` | SORT | 갈라짐 있으면 HARD_FILTER로 승격 가능 |
| `balanced_moisture` | 보습+보호 균형 | `humectant_level GTE medium` AND `occlusive_level GTE medium` | HARD_FILTER | 보습 성분과 보호 성분 조합 |
| `no_menthol` | 멘톨 없음 | `menthol EQ false` | HARD_FILTER | 립케어 기본 저자극 조건 |
| `low_fragrance` | 향료 적음 | `fragrance EQ false` | SORT | 향료 민감이면 HARD_FILTER로 승격 |

## 7.5 Moisturizer BASIC_CONDITION

| filter_key | label | attribute condition | mode | 비고 |
|---|---|---|---|---|
| `barrier_ingredients` | 장벽 성분 | `barrier_repair IN [medium, high]` OR `active_ingredients CONTAINS_ANY [ceramide, panthenol, squalane]` | SORT | 장벽 보강 기준 |
| `triple_moisture` | 다층 보습 | `humectant_level GTE medium` AND `emollient_level GTE medium` AND `occlusive_level GTE medium` | SORT | 건조/당김이면 HARD_FILTER로 승격 가능 |
| `mild_ph` | 약산성 | `ph GTE 5.0` AND `ph LTE 6.0` | TAG | pH 미기재 제품은 제외하지 않음 |
| `low_irritation` | 저자극 | `irritation_risk EQ low` | SORT | 민감/자극 있으면 HARD_FILTER로 승격 |

## 7.6 Cleanser BASIC_CONDITION

| filter_key | label | attribute condition | mode | 비고 |
|---|---|---|---|---|
| `mild_ph` | 약산성 | `ph GTE 5.0` AND `ph LTE 6.5` | SORT | 세안 후 당김 있으면 HARD_FILTER로 승격 가능 |
| `low_sls` | 저자극 계면활성제 | `sulfate_free EQ true` | HARD_FILTER | SLS/SLES 회피 기준 |
| `low_irritation` | 저자극 | `irritation_risk EQ low` | SORT | 민감/당김 있으면 HARD_FILTER로 승격 |

---

# 8. Product Filter Mapping Seed — PERSONALIZED

## 8.1 공통 PERSONALIZED

| source_fact_key | source condition | category | attribute condition | mode | filter_key | label |
|---|---|---|---|---|---|---|
| `preference.fragrance_sensitive` | `EQ true` | all | `fragrance EQ false` | HARD_FILTER | `no_fragrance` | 향료 회피 |
| `preference.alcohol_sensitive` | `EQ true` | toner, sunscreen, serum, moisturizer, cleanser | `alcohol EQ false` | HARD_FILTER | `no_alcohol` | 알코올 회피 |
| `context.skin_type` | `EQ sensitive` | toner, sunscreen, serum, moisturizer, cleanser | `irritation_risk EQ low` | HARD_FILTER | `sensitive_low_irritation` | 민감 피부 저자극 |
| `context.skin_type` | `EQ acne_prone` | sunscreen, serum, moisturizer, cleanser, toner | `non_comedogenic EQ true` | HARD_FILTER | `non_comedogenic` | 논코메도제닉 |

## 8.2 Toner PERSONALIZED

| source_fact_key | source condition | attribute condition | mode | filter_key | label |
|---|---|---|---|---|---|
| `context.skin_type` | `IN [dry, combination_uzone_dry]` | `hydration_level EQ high` | SORT | `dry_skin_hydration` | 건성 수분 토너 |
| `context.skin_type` | `IN [oily, combination_tzone_oily]` | `oil_control IN [medium, high]` | SORT | `oil_control` | 피지 조절 |
| `context.skin_type` | `EQ sensitive` | `fragrance EQ false` AND `alcohol EQ false` | HARD_FILTER | `sensitive_toner` | 민감 토너 |
| `flow.concern` | `EQ flaky_texture` | `exfoliation_type IN [aha, bha, pha, mixed]` | HARD_FILTER | `gentle_exfoliation` | 각질 케어 |
| `context.exfoliation_sensitive` | `EQ true` | `exfoliation_type IN [none, pha]` AND `irritation_risk EQ low` | HARD_FILTER | `gentle_exfoliation_sensitive` | 저자극 각질 |
| `context.oil_control_need` | `EQ true` | `oil_control IN [medium, high]` | SORT | `oil_control` | 피지 조절 |
| `context.acne_prone` | `EQ true` | `non_comedogenic EQ true` | HARD_FILTER | `non_comedogenic` | 모공 막힘 주의 |
| `context.daily_use` | `EQ true` | `irritation_risk EQ low` AND `recommended_frequency IN [daily, as_needed]` | HARD_FILTER | `daily_toner` | 매일 사용 |

## 8.3 Sunscreen PERSONALIZED

| source_fact_key | source condition | attribute condition | mode | filter_key | label |
|---|---|---|---|---|---|
| `life.outdoor_activity` | `IN [1_3h, over_3h]` | `spf GTE 50` AND `pa EQ ++++` | HARD_FILTER | `outdoor_use` | 야외 사용 |
| `context.usage_place` | `EQ outdoor` | `spf GTE 50` | HARD_FILTER | `outdoor_use` | 야외 사용 |
| `context.water_sweat_exposure` | `EQ true` | `water_resistant EQ true` | HARD_FILTER | `water_resistant` | 물·땀 저항 |
| `context.eye_sting` | `EQ true` | `eye_sting IN [none, low]` | HARD_FILTER | `no_eye_sting` | 눈시림 회피 |
| `context.white_cast_sensitive` | `EQ true` | `white_cast IN [none, low]` | HARD_FILTER | `no_white_cast` | 백탁 회피 |
| `context.sunscreen_skip_reason` | `EQ true` | `sticky IN [none, low]` | HARD_FILTER | `low_sticky` | 끈적임 낮음 |
| `context.sunscreen_skip_reason` | `EQ true` | `texture EQ light` | SORT | `light_texture` | 가벼운 제형 |
| `context.makeup_use` | `EQ true` | `makeup_compatibility EQ good` | HARD_FILTER | `makeup_compat_good` | 메이크업 궁합 |
| `context.touch_up` | `EQ true` | `portable EQ true` | SORT | `portable` | 덧바르기 쉬움 |
| `context.portable` | `EQ true` | `portable EQ true` | SORT | `portable` | 휴대형 |
| `context.skin_type` | `IN [oily, combination_tzone_oily]` | `oil_free EQ true` AND `non_comedogenic EQ true` AND `finish EQ matte` | SORT | `oily_skin_fit` | 지성 피부 적합 |
| `context.skin_type` | `IN [dry, combination_uzone_dry]` | `hydration_level IN [medium, high]` | SORT | `dry_skin_sunscreen` | 건성 보습감 |
| `context.skin_type` | `EQ sensitive` | `filter_type EQ physical` AND `fragrance EQ false` AND `alcohol EQ false` | SORT | `sensitive_skin_fit` | 민감 피부 적합 |

## 8.4 Serum PERSONALIZED

| source_fact_key | source condition | attribute condition | mode | filter_key | label |
|---|---|---|---|---|---|
| `context.serum_purpose` | `EQ brightening` | `target_concerns CONTAINS brightening` | HARD_FILTER | `brightening_fit` | 브라이트닝 |
| `context.serum_purpose` | `EQ brightening` | `active_ingredients CONTAINS_ANY [vitamin_c, vitamin_c_derivative, niacinamide, arbutin, tranexamic_acid, licorice]` | SORT | `brightening_active` | 미백 성분 |
| `context.serum_purpose` | `EQ anti_aging` | `target_concerns CONTAINS anti_aging` | HARD_FILTER | `anti_aging_fit` | 주름·탄력 |
| `context.serum_purpose` | `EQ anti_aging` | `active_ingredients CONTAINS_ANY [retinol, retinal, bakuchiol, peptide, adenosine, vitamin_c]` | SORT | `anti_aging_active` | 탄력 성분 |
| `context.serum_purpose` | `EQ calming` | `target_concerns CONTAINS calming` | HARD_FILTER | `calming_fit` | 진정 |
| `context.serum_purpose` | `EQ calming` | `active_ingredients CONTAINS_ANY [centella, madecassoside, panthenol, aloe, chamomile, green_tea]` | SORT | `calming_active` | 진정 성분 |
| `context.serum_purpose` | `EQ pore_care` | `target_concerns CONTAINS pore_care` | HARD_FILTER | `pore_fit` | 모공·피지 |
| `context.serum_purpose` | `EQ acne` | `target_concerns CONTAINS acne` | HARD_FILTER | `acne_fit` | 트러블 케어 |
| `context.serum_purpose` | `EQ hydration` | `target_concerns CONTAINS hydration` | HARD_FILTER | `hydration_fit` | 보습 세럼 |
| `context.serum_purpose` | `EQ barrier` | `target_concerns CONTAINS barrier` | HARD_FILTER | `barrier_fit` | 장벽 케어 |
| `life.recent_irritation` | `EQ true` | `irritation_risk EQ low` | HARD_FILTER | `low_irritation` | 자극 낮음 |
| `life.recent_irritation` | `EQ true` | `fragrance EQ false` AND `alcohol EQ false` | HARD_FILTER | `no_irritant_base` | 향료/알코올 회피 |
| `context.usage_time` | `IN [morning, morning (출근 전)]` | `usage_time IN [morning, both]` | HARD_FILTER | `morning_use` | 아침 사용 |
| `context.usage_time` | `IN [night, night (퇴근 후)]` | `usage_time IN [night, both]` | HARD_FILTER | `night_use` | 밤 사용 |
| `context.expectation_speed` | `EQ true` | `irritation_risk IN [low, medium]` AND `effect_timeline EQ gradual` | SORT | `gradual_safe` | 안정적 변화 |
| `product.owned_actives` | `CONTAINS retinol` | `conflict_ingredients CONTAINS retinol` | CAUTION | `retinol_conflict_caution` | 레티놀 병행 주의 |
| `product.owned_actives` | `CONTAINS vitamin_c` | `conflict_ingredients CONTAINS vitamin_c` | CAUTION | `vitamin_c_conflict_caution` | 비타민C 병행 주의 |
| `product.owned_actives` | `CONTAINS aha` | `conflict_ingredients CONTAINS aha` | CAUTION | `aha_conflict_caution` | AHA 병행 주의 |
| `product.owned_actives` | `CONTAINS bha` | `conflict_ingredients CONTAINS bha` | CAUTION | `bha_conflict_caution` | BHA 병행 주의 |
| `context.skin_type` | `IN [oily, combination_tzone_oily]` | `oil_free EQ true` AND `non_comedogenic EQ true` | SORT | `oily_skin_fit` | 지성 피부 적합 |
| `context.skin_type` | `EQ acne_prone` | `non_comedogenic EQ true` | HARD_FILTER | `acne_non_comedogenic` | 트러블 피부 |

## 8.5 Lipcare PERSONALIZED

| source_fact_key | source condition | attribute condition | mode | filter_key | label |
|---|---|---|---|---|---|
| `context.lip_severity` | `EQ true` | `moisture_lasting EQ high` | HARD_FILTER | `high_moisture` | 보습 지속력 |
| `context.lip_severity` | `EQ true` | `occlusive_level EQ high` | SORT | `strong_occlusive` | 보호막 형성 |
| `preference.menthol_sensitive` | `EQ true` | `menthol EQ false` | HARD_FILTER | `no_menthol_sensitive` | 멘톨 회피 |
| `preference.menthol_sensitive` | `EQ true` | `camphor EQ false` | HARD_FILTER | `no_camphor` | 캠퍼 회피 |
| `preference.fragrance_sensitive` | `EQ true` | `fragrance EQ false` | HARD_FILTER | `no_fragrance` | 향료 회피 |
| `context.lip_reapply` | `EQ true` | `moisture_lasting EQ high` AND `occlusive_level IN [medium, high]` | SORT | `long_lasting_lip` | 오래가는 보습 |
| `context.lip_outdoor` | `EQ true` | `spf GTE 15` | HARD_FILTER | `spf_included` | SPF 포함 |
| `context.lip_form` | `EQ stick` | `form EQ stick` | SORT | `lip_form_stick` | 스틱형 |
| `context.lip_form` | `EQ tube` | `form EQ tube` | SORT | `lip_form_tube` | 튜브형 |
| `context.lip_form` | `EQ balm` | `form EQ balm` | SORT | `lip_form_balm` | 밤 타입 |
| `context.lip_night_care` | `EQ true` | `night_care EQ true` AND `occlusive_level EQ high` | SORT | `night_repair` | 야간 케어 |
| `context.portable` | `EQ true` | `portable EQ true` | SORT | `portable` | 휴대형 |

## 8.6 Moisturizer PERSONALIZED

| source_fact_key | source condition | attribute condition | mode | filter_key | label |
|---|---|---|---|---|---|
| `routine.recent_dry_tight` | `EQ true` | `humectant_level IN [medium, high]` AND `occlusive_level IN [medium, high]` | HARD_FILTER | `triple_moisture` | 다층 보습 |
| `routine.recent_dry_tight` | `EQ true` | `barrier_repair IN [medium, high]` | SORT | `barrier_ingredients` | 장벽 성분 |
| `context.moisturizer_goal` | `EQ hydration` | `hydration_level EQ high` | HARD_FILTER | `high_hydration` | 고보습 |
| `context.moisturizer_goal` | `EQ barrier` | `barrier_repair IN [medium, high]` | HARD_FILTER | `barrier_ingredients` | 장벽 케어 |
| `context.moisturizer_goal` | `EQ oil_control` | `oil_free EQ true` AND `oiliness IN [low, medium]` | HARD_FILTER | `oil_free` | 오일프리 |
| `context.prefer_lightweight` | `EQ true` | `texture EQ light` AND `oiliness IN [low, medium]` | HARD_FILTER | `lightweight` | 가벼운 제형 |
| `context.makeup_use` | `EQ true` | `makeup_compatibility EQ good` | HARD_FILTER | `makeup_compat_good` | 메이크업 궁합 |
| `context.makeup_use` | `EQ true` | `sticky IN [none, low]` | SORT | `low_sticky` | 끈적임 낮음 |
| `context.acne_prone` | `EQ true` | `non_comedogenic EQ true` | HARD_FILTER | `non_comedogenic` | 논코메도제닉 |
| `context.acne_prone` | `EQ true` | `oil_free EQ true` | SORT | `oil_free` | 오일프리 |
| `context.skin_type` | `IN [dry, combination_uzone_dry]` | `hydration_level EQ high` AND `occlusive_level IN [medium, high]` | SORT | `dry_skin_moisturizer` | 건성 보습 |
| `context.skin_type` | `IN [oily, combination_tzone_oily]` | `texture EQ light` AND `oiliness EQ low` | SORT | `oily_skin_moisturizer` | 지성 산뜻함 |
| `context.skin_type` | `EQ sensitive` | `irritation_risk EQ low` AND `fragrance EQ false` AND `alcohol EQ false` | HARD_FILTER | `sensitive_moisturizer` | 민감 피부 |
| `context.season` | `EQ summer` | `form IN [lotion, gel_cream, water_cream]` AND `texture EQ light` | SORT | `summer_lightweight` | 여름 산뜻함 |
| `context.season` | `EQ winter` | `occlusive_level IN [medium, high]` AND `texture IN [medium, rich]` | SORT | `winter_rich` | 겨울 보습 |
| `context.moisturizer_form` | `EQ lotion` | `form EQ lotion` | SORT | `form_lotion` | 로션 |
| `context.moisturizer_form` | `EQ gel_cream` | `form EQ gel_cream` | SORT | `form_gel_cream` | 젤크림 |
| `context.moisturizer_form` | `EQ cream` | `form EQ cream` | SORT | `form_cream` | 크림 |

## 8.7 Cleanser PERSONALIZED

| source_fact_key | source condition | attribute condition | mode | filter_key | label |
|---|---|---|---|---|---|
| `context.cleanser_usage` | `IN [morning, morning (출근 전)]` | `cleansing_power IN [low, medium]` AND `after_feel IN [moist, neutral]` | HARD_FILTER | `morning_cleanser` | 아침 세안 |
| `context.makeup_sunscreen_level` | `EQ sunscreen` | `makeup_removal_power IN [low, medium, high]` | SORT | `sunscreen_removal` | 선크림 세정 |
| `context.makeup_sunscreen_level` | `EQ light_makeup` | `makeup_removal_power IN [medium, high]` | HARD_FILTER | `makeup_removal` | 메이크업 세정 |
| `context.makeup_sunscreen_level` | `EQ heavy_makeup` | `makeup_removal_power EQ high` | HARD_FILTER | `heavy_makeup_removal` | 진한 메이크업 세정 |
| `context.makeup_sunscreen_level` | `EQ waterproof` | `waterproof_makeup_fit EQ good` | HARD_FILTER | `waterproof_makeup` | 워터프루프 세정 |
| `context.double_cleanse_needed` | `EQ true` | `double_cleanse_role IN [first, both]` | SORT | `first_cleanse` | 1차 세안 |
| `routine.recent_dry_tight` | `EQ true` | `after_feel IN [moist, neutral]` | HARD_FILTER | `moist_after_feel` | 당김 적음 |
| `routine.recent_dry_tight` | `EQ true` | `ph GTE 5.0` AND `ph LTE 6.5` | SORT | `mild_ph` | 약산성 |
| `context.scrub_sensitive` | `EQ true` | `physical_scrub_risk IN [none, low]` | HARD_FILTER | `no_physical_scrub` | 스크럽 회피 |
| `context.skin_type` | `IN [dry, combination_uzone_dry]` | `cleanser_type IN [cream, milk, lotion, oil]` AND `after_feel EQ moist` | SORT | `dry_skin_cleanser` | 건성 클렌저 |
| `context.skin_type` | `IN [oily, combination_tzone_oily]` | `cleanser_type IN [gel, foam]` AND `cleansing_power IN [medium, high]` | SORT | `oily_skin_cleanser` | 지성 클렌저 |
| `context.skin_type` | `EQ sensitive` | `sulfate_free EQ true` AND `fragrance EQ false` AND `alcohol EQ false` AND `soap_free EQ true` | HARD_FILTER | `sensitive_cleanser` | 민감 클렌저 |
| `context.acne_prone` | `EQ true` | `non_comedogenic EQ true` | HARD_FILTER | `non_comedogenic` | 논코메도제닉 |
| `context.cleanser_form` | `EQ foam` | `cleanser_type EQ foam` | SORT | `form_foam` | 폼 |
| `context.cleanser_form` | `EQ gel` | `cleanser_type EQ gel` | SORT | `form_gel` | 젤 |
| `context.cleanser_form` | `EQ oil` | `cleanser_type EQ oil` | SORT | `form_oil` | 오일 |
| `context.cleanser_form` | `EQ balm` | `cleanser_type EQ balm` | SORT | `form_balm` | 밤 |
| `context.cleanser_form` | `EQ water` | `cleanser_type EQ water` | SORT | `form_water` | 워터 |
| `context.cleanser_form` | `EQ cream` | `cleanser_type EQ cream` | SORT | `form_cream` | 크림 |
| `context.cleanser_form` | `EQ milk` | `cleanser_type IN [milk, lotion]` | SORT | `form_milk` | 밀크/로션 |

---

# 9. Computed Filter Definitions

## 9.1 `clear_purpose`

| 항목 | 조건 |
|---|---|
| category | `serum` |
| pass | `active_ingredients` length >= 1 AND `target_concerns` length >= 1 |
| fail | 주요 성분 또는 목적 고민이 비어 있음 |
| mode | HARD_FILTER |

## 9.2 `balanced_moisture`

| 항목 | 조건 |
|---|---|
| category | `lipcare` |
| pass | `humectant_level IN [medium, high]` AND `occlusive_level IN [medium, high]` |
| mode | HARD_FILTER |

## 9.3 `triple_moisture`

| 항목 | 조건 |
|---|---|
| category | `moisturizer` |
| pass | `humectant_level IN [medium, high]` AND `emollient_level IN [medium, high]` AND `occlusive_level IN [medium, high]` |
| mode 기본 | SORT |
| mode 승격 | `routine.recent_dry_tight = true`이면 HARD_FILTER |

## 9.4 `barrier_ingredients`

| 항목 | 조건 |
|---|---|
| category | `moisturizer` |
| pass | `barrier_repair IN [medium, high]` OR `active_ingredients CONTAINS_ANY [ceramide, panthenol, squalane]` |
| mode 기본 | SORT |
| mode 승격 | `context.skin_type = sensitive` 또는 `routine.recent_dry_tight = true`이면 HARD_FILTER 가능 |

## 9.5 `gentle_exfoliation`

| 항목 | 조건 |
|---|---|
| category | `toner` |
| pass | `exfoliation_type IN [pha, mixed]` AND `irritation_risk IN [low, medium]` |
| sensitive pass | `exfoliation_type EQ pha` AND `irritation_risk EQ low` |
| caution | `exfoliation_type IN [aha, bha, mixed]` AND `context.exfoliation_sensitive = true` |

## 9.6 `outdoor_use`

| 항목 | 조건 |
|---|---|
| category | `sunscreen` |
| pass | `spf >= 50` AND `pa = ++++` |
| extra sort | `water_resistant = true`, `portable = true` |
| mode | HARD_FILTER for SPF/PA, SORT for water/portable unless explicitly requested |

## 9.7 `conflict caution`

| 항목 | 조건 |
|---|---|
| category | `serum` |
| source | `product.owned_actives` |
| pass | 제품의 `conflict_ingredients`가 현재 사용 중인 active를 포함하지 않음 |
| caution | 제품의 `conflict_ingredients`가 현재 사용 중인 active를 포함함 |
| mode | CAUTION |

## 9.8 `avoidance ingredient match`

| 항목 | 조건 |
|---|---|
| source | `avoidance_rules` |
| action `AVOID` | 해당 ingredient_group 포함 제품 제외 |
| action `CAUTION` | 해당 ingredient_group 포함 제품에 △ 주의 표시 |
| 적용 위치 | Product Matrix, Product Detail |

---

# 10. Product Fit Badge Rule

## 10.1 Product Matrix 계산

| 단계 | 처리 |
|---|---|
| 1 | HARD_FILTER 조건을 모두 확인 |
| 2 | 하나라도 실패하면 기본 목록에서 제외 |
| 3 | CAUTION 조건을 계산 |
| 4 | SORT 조건 만족 개수로 ranking score 계산 |
| 5 | TAG 조건을 제품 카드에 표시 |
| 6 | avoidance_rules 적용 |
| 7 | 가격대별로 그룹화 |
| 8 | `products.sort_order`, score 순서로 정렬 |

## 10.2 배지 기준

| 조건 | badge | 설명 |
|---|---|---|
| HARD_FILTER 통과 + CAUTION 0 | ✓ 적합 | 사용 조건에 잘 맞음 |
| HARD_FILTER 통과 + CAUTION 1개 이상 | △ 주의 | 사용 전 확인 필요 |
| HARD_FILTER 실패 | ✕ 비추 | 기본 목록에서 제거 |

## 10.3 ranking score

| 항목 | 점수 |
|---|---:|
| 기본 점수 | 100 |
| SORT 조건 만족 1개 | +5 |
| TAG 조건 만족 1개 | +2 |
| CAUTION 1개 | -15 |
| TRACEBACK CAUTION 1개 | -25 |
| 관리자 `products.sort_order` | 낮을수록 우선. score 동률 시 사용 |

---

# 11. Category Decision Result Message Rules

## 11.1 메시지 선택 원칙

| 원칙 | 설명 |
|---|---|
| 최대 노출 | 3개 메시지만 표시 |
| 우선순위 | 자극/안전 > 루틴 안정 > 제품군 핵심 기준 > 사용감 |
| 중복 제거 | 같은 의미의 메시지는 하나만 표시 |
| CTA | 항상 Product Matrix로 연결 |

## 11.2 메시지 Rule

| priority | condition | message |
|---:|---|---|
| 1 | `life.recent_irritation EQ true` | 최근 자극이 있어 자극 가능성이 높은 제품은 제외하거나 주의 태그를 붙여요. |
| 2 | `context.skin_type EQ sensitive` | 민감한 피부 기준으로 향료, 알코올, 자극 가능성을 낮게 잡아요. |
| 3 | `preference.fragrance_sensitive EQ true` | 향료가 있는 제품은 주의하거나 제외해요. |
| 4 | `preference.alcohol_sensitive EQ true` | 알코올감이 있는 제품은 제외해요. |
| 5 | `routine.sunscreen_frequency IN [rarely, never]` AND `category.selected EQ serum` | 선크림 루틴이 불안정하면 기능성 세럼은 조심해서 골라야 해요. |
| 6 | `context.eye_sting EQ true` | 눈시림 위험이 높은 선크림은 제외해요. |
| 7 | `context.white_cast_sensitive EQ true` | 백탁이 강한 선크림은 제외하거나 주의 태그를 붙여요. |
| 8 | `context.sunscreen_skip_reason EQ true` | 최고 스펙보다 매일 쓸 수 있는 사용감을 우선해요. |
| 9 | `product.owned_actives HAS_LENGTH_GTE 1` | 세럼은 병행 주의 성분을 확인한 뒤 후보를 줄여요. |
| 10 | `context.lip_severity EQ true` | 립케어는 보습 지속력과 보호막 형성을 우선해요. |
| 11 | `preference.menthol_sensitive EQ true` | 멘톨이나 화한 성분이 있는 립케어는 제외해요. |
| 12 | `routine.recent_dry_tight EQ true` | 당김이 반복되면 보습제는 수분 공급보다 장벽과 수분 잠금까지 같이 봐야 해요. |
| 13 | `context.makeup_use EQ true` | 베이스 메이크업 전 사용할 제품이라 밀림과 끈적임을 같이 봐요. |
| 14 | `routine.eye_irritation_history EQ true` | 눈가 자극 경험이 잦다면 저자극 세안과 눈시림 기준을 같이 봐요. |
| 15 | `context.makeup_sunscreen_level IN [heavy_makeup, waterproof]` | 진한 메이크업이나 워터프루프 제품은 세정력과 이중 세안 역할을 같이 봐요. |
| 16 | `context.scrub_sensitive EQ true` | 굵은 물리적 스크럽이나 강한 세안감은 피해서 봐요. |

---

# 12. Product Detail Matching Reason

## 12.1 충족 사유 생성

| filter_mode | Product Detail 표시 |
|---|---|
| HARD_FILTER 만족 | 충족 조건에 표시 |
| SORT 만족 | 잘 맞는 이유에 표시 |
| TAG 만족 | 제품 특징 태그로 표시 |
| CAUTION 매칭 | 주의 조건에 표시 |
| TRACEBACK CAUTION | 회피 목록 관련 주의로 표시 |

## 12.2 카테고리별 사유 예시

| category | 사유 예시 |
|---|---|
| `toner` | 약산성 범위에 가깝고, 향료/알코올이 없어 민감 조건에 맞아요. |
| `sunscreen` | SPF50+와 PA++++를 충족하고, 눈시림 위험이 낮은 제품이에요. |
| `serum` | 목적 성분이 명확하고, 현재 사용 중인 active와 병행 주의가 적어요. |
| `lipcare` | 보습 성분과 보호막 성분이 함께 있어 오래가는 보습에 적합해요. |
| `moisturizer` | 습윤제, 유연제, 교착제 균형이 있어 당김 완화에 적합해요. |
| `cleanser` | 약산성 범위에 가깝고, 설페이트가 없어 세안 후 당김을 줄이는 데 유리해요. |

---

# 13. Reaction Traceback Matching Rules

## 13.1 성분군 seed

| ingredient_group.key | label | Product Matrix 반영 |
|---|---|---|
| `fragrance` | 향료 / Fragrance 계열 | `fragrance = false`와 함께 적용 가능 |
| `essential_oils` | 에센셜오일 계열 | 성분군 포함 제품 CAUTION 또는 AVOID |
| `menthol_cooling` | 멘톨 / 화한 사용감 | 립케어 `menthol`, `camphor`와 함께 적용 |
| `uv_filters` | 자외선 차단 필터 | sunscreen의 `uv_filters`와 함께 적용 |
| `high_dose_actives` | 고함량 액티브 | serum의 `active_ingredients`, `ingredient_concentrations`와 함께 적용 |

## 13.2 confidence 계산

| condition | confidence |
|---|---|
| 문제 상품에 포함되고 괜찮은 상품에는 없음 | HIGH |
| 문제 상품에 포함되고 괜찮은 상품보다 더 자주 등장 | MEDIUM |
| 문제 상품과 괜찮은 상품에 비슷하게 등장 | LOW |
| 문제 상품에 없음 | skip |

## 13.3 avoidance_rules 생성

| 사용자 선택 | 저장 action | 다음 Product Matrix 처리 |
|---|---|---|
| 다음 선택에서 회피하기 | `AVOID` | 해당 성분군 포함 제품 제외 |
| 다음 선택에서 주의로 보기 | `CAUTION` | 해당 성분군 포함 제품 △ 주의 |
| 무시하기 | 저장하지 않음 | 반영 없음 |

## 13.4 Traceback filter priority

| action | priority |
|---|---:|
| `AVOID` | HARD_FILTER보다 강함. product_id 단위 제외 |
| `CAUTION` | 일반 CAUTION보다 강함. ranking score -25 |

---

# 14. Product Query Assembly

## 14.1 Query 생성 순서

| 순서 | 설명 |
|---|---|
| 1 | category_id 조건 추가 |
| 2 | `products.is_active = true` 조건 추가 |
| 3 | HARD_FILTER attribute 조건 추가 |
| 4 | 가격대 HARD_FILTER 조건 추가 |
| 5 | avoidance_rules `AVOID` product_id 제외 |
| 6 | 남은 product에 CAUTION/TAG/SORT 계산 |
| 7 | price_band별 그룹화 |
| 8 | score DESC, sort_order ASC 정렬 |
| 9 | `decision_runs` snapshot 저장 |

## 14.2 filter_state 저장 예시 구조

| field | 예시 |
|---|---|
| `source` | `CATEGORY_DECISION_CTA` |
| `category_id` | `cat_sunscreen` |
| `filters[].filter_key` | `spf_50_plus` |
| `filters[].source_type` | `BASIC_CONDITION` |
| `filters[].attribute_key` | `spf` |
| `filters[].operator` | `GTE` |
| `filters[].value` | `50` |
| `filters[].mode` | `HARD_FILTER` |

---

# 15. Seed 등록 순서

| 순서 | 작업 |
|---:|---|
| 1 | `product_categories` 6개 등록 |
| 2 | `category_attribute_definitions` P0 key 등록 |
| 3 | `fact_definitions` 기본 + 추가 key 등록 |
| 4 | `context_questions` S02~S04 질문 등록 |
| 5 | `question_visibility_conditions` 등록 |
| 6 | `priority_rules` 13개 등록 |
| 7 | `priority_rule_conditions` 등록 |
| 8 | `product_filter_mappings` BASIC_CONDITION 등록 |
| 9 | `product_filter_mappings` PERSONALIZED 등록 |
| 10 | Concern route preset 프론트 상수 등록 |
| 11 | ingredient_groups 5개 등록 |
| 12 | Product seed 등록 |
| 13 | Rule Test 화면에서 시나리오 검증 |

---

# 16. Rule Test 시나리오

## 16.1 선크림

| 입력 | 기대 결과 |
|---|---|
| `category.selected = sunscreen`, `context.eye_sting = true`, `context.makeup_use = true`, `life.outdoor_activity = over_3h` | `spf_50_plus`, `pa_4_plus`, `broad_spectrum`, `no_eye_sting`, `makeup_compat_good`, `outdoor_use` 적용 |

## 16.2 세럼

| 입력 | 기대 결과 |
|---|---|
| `category.selected = serum`, `context.serum_purpose = brightening`, `product.owned_actives CONTAINS retinol`, `context.usage_time = morning` | `clear_purpose`, `brightening_fit`, `morning_use`, `retinol_conflict_caution` 적용 |

## 16.3 립케어

| 입력 | 기대 결과 |
|---|---|
| `category.selected = lipcare`, `context.lip_severity = true`, `preference.menthol_sensitive = true`, `context.lip_outdoor = true` | `high_moisture`, `balanced_moisture`, `no_menthol_sensitive`, `spf_included` 적용 |

## 16.4 로션 / 크림

| 입력 | 기대 결과 |
|---|---|
| `category.selected = moisturizer`, `routine.recent_dry_tight = true`, `context.makeup_use = true`, `context.acne_prone = true` | `triple_moisture`, `barrier_ingredients`, `makeup_compat_good`, `non_comedogenic` 적용 |

## 16.5 클렌저

| 입력 | 기대 결과 |
|---|---|
| `category.selected = cleanser`, `context.makeup_sunscreen_level = waterproof`, `routine.recent_dry_tight = true`, `context.scrub_sensitive = true` | `waterproof_makeup`, `moist_after_feel`, `mild_ph`, `no_physical_scrub` 적용 |

## 16.6 토너

| 입력 | 기대 결과 |
|---|---|
| `category.selected = toner`, `flow.concern = flaky_texture`, `context.exfoliation_sensitive = true`, `preference.alcohol_sensitive = true` | `gentle_exfoliation`, `gentle_exfoliation_sensitive`, `no_alcohol`, `low_irritation` 적용 |

---

# 17. 구현 주의사항

1. `pa` 값은 `++++`처럼 plus 문자만 저장한다. `PA++++`로 저장하지 않는다.
2. 립케어 SPF 없음은 `spf = 0`으로 저장한다.
3. `fragrance = false`, `alcohol = false`는 확인된 무향/무알코올일 때만 저장한다.
4. `unknown` 제품은 HARD_FILTER에서 통과시키지 않는다.
5. Product Matrix snapshot은 `decision_runs`에 저장하되, 재조회는 `product_matrix_filter_states` 기준으로 현재 제품 DB를 다시 조회한다.
6. Concern 태그는 DB가 아니라 프론트 상수로 관리한다.
7. `CONTAINS_ANY`, `COMPOSITE_AND`, `COMPOSITE_OR`는 application layer에서 계산한다.
8. BASIC_CONDITION이 모두 HARD_FILTER가 되면 후보가 과도하게 줄어들 수 있으므로, 사용감 조건은 기본적으로 SORT/TAG로 시작하고 개인화 답변이 있을 때 HARD_FILTER로 승격한다.
9. Reaction Traceback은 확정 진단이 아니라 다음 선택에서 피할 가능성을 줄이는 도구로 표시한다.
