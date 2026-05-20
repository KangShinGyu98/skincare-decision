# Product Attribute Schema (MVP Revised)

> 목적: Product Matrix, Product Filter Mapping, Product DB 관리 화면에서 사용할 제품군별 attribute 정의  
> 반영 기준: skincare_rules_from_articles, product_attribute_schema, product_taxonomy, db_modeling, page_content_specification  
> 작성일: 2026-05-01

---

## 0. 적용 범위

MVP 제품군은 아래 6개로 제한한다.

| category_key  | label       | 포함 범위                                               |
| ------------- | ----------- | ------------------------------------------------------- |
| `toner`       | 토너        | 스킨, 토너, 화장수                                      |
| `sunscreen`   | 선크림      | 선크림, 선로션, 선스틱, 톤업 선크림                     |
| `serum`       | 세럼        | 에센스, 세럼, 앰플                                      |
| `lipcare`     | 립케어      | 립밤, 립마스크, 립에센스                                |
| `moisturizer` | 로션 / 크림 | 로션, 크림, 수분크림, 젤크림                            |
| `cleanser`    | 클렌저      | 클렌징폼, 젤클렌저, 클렌징 오일, 클렌징 밤, 클렌징 워터 |

제외:

- 립스틱, 틴트, 색조 립 제품
- 페이셜 마스크, 바디 케어, 남성 전용 케어, 베이비 케어 등 MVP 외 카테고리

---

## 1. 설계 원칙

### 1.1 Core / Optional 기준

| 구분     | 의미                                                                | DB 입력 기준                                                                                                            |
| -------- | ------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| Core     | Product Matrix 필터, BASIC_CONDITION, PERSONALIZED 필터에 직접 사용 | `category_attribute_definitions.is_required = true` 권장. 필터 노출 여부는 `product_matrix_filter_definitions`에서 관리 |
| Optional | 상세 태그, 정렬, 설명, 보조 판단에 사용                             | `is_required = false`. 필요 시 Matrix 필터 정의를 별도로 추가                                                           |

### 1.2 공통 key 규칙

| 목적             | 사용할 key      | 사용하지 않을 key |
| ---------------- | --------------- | ----------------- | ----- |
| PA 등급          | `pa`            | `pa_level`        |
| 향료 포함 여부   | `fragrance`     | `fragrance_free`  |
| 알코올 포함 여부 | `alcohol`       | `alcohol_free`    |
| pH 수치          | `ph`            | `ph_level`        |
| 클렌저 제형      | `cleanser_type` | `type`            |
| 립케어 SPF       | `spf: number`   | `spf: number      | none` |

### 1.3 boolean 값 해석

| key               | true                               | false                 | unknown 처리           |
| ----------------- | ---------------------------------- | --------------------- | ---------------------- |
| `fragrance`       | 향료 포함                          | 향료 없음             | `null` 또는 key 미입력 |
| `alcohol`         | 자극 가능 알코올 포함              | 자극 가능 알코올 없음 | `null` 또는 key 미입력 |
| `oil_free`        | 오일프리 표기 또는 오일프리로 판단 | 오일프리 아님         | `null` 또는 key 미입력 |
| `non_comedogenic` | 논코메도제닉 표기 또는 근거 있음   | 해당 근거 없음        | `null` 또는 key 미입력 |
| `portable`        | 휴대형                             | 휴대형 아님           | `null` 또는 key 미입력 |

주의:

- `false`는 확인된 부재를 의미한다.
- 불명확한 경우 `false`로 저장하지 않는다.
- Product Matrix에서 `fragrance = false` 같은 HARD_FILTER를 적용하면 `unknown` 제품은 통과하지 않는다.

### 1.4 공통 enum

| 이름             | 값                                                                                                                  |
| ---------------- | ------------------------------------------------------------------------------------------------------------------- |
| level            | `low` / `medium` / `high`                                                                                           |
| risk             | `low` / `medium` / `high`                                                                                           |
| degree           | `none` / `low` / `medium` / `high`                                                                                  |
| compatibility    | `good` / `fair` / `poor`                                                                                            |
| usage_time       | `morning` / `night` / `both`                                                                                        |
| absorption_speed | `slow` / `medium` / `fast`                                                                                          |
| texture_weight   | `light` / `medium` / `rich`                                                                                         |
| ph_label         | `strong_acidic` (pH ≤ 4.5) / `weak_acidic` (pH 4.5~5.5) / `mild_acidic` (pH 5.5~7) / `neutral` (pH = 7) / `unknown` |

주의:

- `finish`는 카테고리별로 옵션이 다르다. sunscreen/moisturizer는 `matte / natural / dewy`, lipcare는 `matte / natural / glossy`, toner는 `fresh / moist / dewy / rich`. 키 이름이 같아도 의미와 옵션이 다르므로, 코드 단계에서 카테고리별 enum으로 분리하거나 카테고리 정의 기반으로 검증한다.

### 1.5 피부 타입은 product attribute가 아니다

피부 타입은 제품 속성이 아니라 사용자 입력값이다.  
`user_responses` 또는 Context 답변에서 받은 뒤, product attribute 조건으로 변환한다.

예시:

| 사용자 상태 | attribute 조건 예시                                                                                                          |
| ----------- | ---------------------------------------------------------------------------------------------------------------------------- |
| 건성        | `hydration_level = high`, `irritation_risk = low`, `humectant_level >= medium`, `occlusive_level >= medium`                  |
| 지성        | `oil_free = true`, `oiliness = low`, `texture = light`, `non_comedogenic = true`                                             |
| 민감성      | `irritation_risk = low`, `fragrance = false`, `alcohol = false`, `ph` 약산성 범위 우선                                       |
| 복합성      | `hydration_level >= medium`, `oiliness <= medium`, `texture IN [light, medium]`                                              |
| 여드름성    | `non_comedogenic = true`, `oil_free = true`, `active_ingredients CONTAINS bha 또는 niacinamide`, `irritation_risk <= medium` |
| 노화 고민   | `active_ingredients CONTAINS retinol 또는 peptide 또는 vitamin_c`, `barrier_repair >= medium`, `hydration_level >= medium`   |

---

## 2. Toner — 토너

### 2.1 Core attributes

| key                    | value_type | options / range                                                     | 설명                                                                                                         |
| ---------------------- | ---------- | ------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| `form`                 | ENUM       | `water` / `viscous` / `milky` / `pad` / `mist`                      | 제품 형태. `milky`는 밀크토너/크림스킨                                                                       |
| `role_tags`            | MULTI_ENUM | `hydration` / `calming` / `exfoliation` / `oil_control` / `barrier` | 실사용 역할. 1개 이상. "결 정돈" 같은 마케팅 용어는 메커니즘 단위(`exfoliation` + `hydration`)로 해체해 표기 |
| `hydration_level`      | ENUM       | `low` / `medium` / `high`                                           | 수분감                                                                                                       |
| `emollient_level`      | ENUM       | `none` / `low` / `medium` / `high`                                  | 유분감/영양감. **`oil_control`과 다름** — 도포 시 느껴지는 오일/시어버터/스쿠알란 등 유분 정도               |
| `film_level`           | ENUM       | `none` / `low` / `medium` / `high`                                  | 쫀쫀함, 막 형성감                                                                                            |
| `finish`               | ENUM       | `fresh` / `moist` / `dewy` / `rich`                                 | 마무리감 (toner 전용 옵션 — 다른 카테고리의 `finish`와 다름)                                                 |
| `exfoliation_type`     | ENUM       | `none` / `aha` / `bha` / `pha` / `lha` / `enzyme` / `mixed`         | 각질 케어 성격                                                                                               |
| `exfoliation_strength` | ENUM       | `none` / `low` / `medium` / `high`                                  | 각질 케어 강도                                                                                               |
| `oil_control`          | ENUM       | `none` / `low` / `medium` / `high`                                  | 피지 분비 조절 효과. **`emollient_level`과 다름** — witch_hazel, BHA 등으로 사용 후 피지를 줄이는 성격       |
| `irritation_risk`      | ENUM       | `low` / `medium` / `high`                                           | 자극 가능성                                                                                                  |
| `alcohol`              | BOOLEAN    | `true` / `false`                                                    | 변성알코올, 에탄올 등 자극 가능 알코올 포함 여부                                                             |
| `fragrance`            | BOOLEAN    | `true` / `false`                                                    | 향료 포함 여부                                                                                               |
| `essential_oil`        | BOOLEAN    | `true` / `false`                                                    | 티트리오일, 스피어민트오일, 유칼립투스오일 등. **`fragrance = false`여도 자극원**이 될 수 있어 별도로 표기   |
| `ph_value`             | NUMBER     | 예: `5.5`                                                           | 실제 pH 수치. 불명확하면 null                                                                                |
| `ph_label`             | ENUM       | `ph_label` 참조                                                     | pH 구간. `ph_value`가 null일 때 폴백. 큐레이터가 직접 판단해 입력                                            |
| `astringent_level`     | ENUM       | `none` / `low` / `medium` / `high`                                  | 수렴 성격. 위치하젤 등 포함 시 판단                                                                          |

### 2.2 Optional attributes

| key                     | value_type | options / range                                                                                                                                                                                   | 설명                                                                        |
| ----------------------- | ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| `application_methods`   | MULTI_ENUM | `wipe` / `press` / `pack` / `mist`                                                                                                                                                                | 사용 방식. 대부분 토너가 겸용이므로 Core 필터로는 가치가 낮아 Optional로 둠 |
| `wipe_caution`          | BOOLEAN    | `true` / `false`                                                                                                                                                                                  | 닦토 사용 시 주의 필요 여부 (자극성 또는 마찰 비권장)                       |
| `cotton_pad_fit`        | ENUM       | `good` / `fair` / `poor`                                                                                                                                                                          | 화장솜 사용 적합도                                                          |
| `cooling_feel`          | ENUM       | `none` / `low` / `medium` / `high`                                                                                                                                                                | 화한 느낌. 멘톨/에센셜오일/알코올 등에서 발생                               |
| `sun_caution`           | ENUM       | `none` / `low` / `medium` / `high`                                                                                                                                                                | 산 성분 등으로 인한 낮 사용 주의 강도. (기존 `photosensitive` BOOLEAN 대체) |
| `functional_claims`     | MULTI_ENUM | `brightening` / `anti_aging` / `acne_relief`                                                                                                                                                      | 기능성 주장. **식약처 기능성 인정 받은 항목만 입력** (미인증 제품은 비움)   |
| `active_ingredients`    | MULTI_ENUM | `hyaluronic_acid` / `glycerin` / `niacinamide` / `witch_hazel` / `tea_tree` / `centella` / `panthenol` / `aloe` / `chamomile` / `rose_water` / `ceramide` / `vitamin_c` / `peptide` / `green_tea` | 주요 성분                                                                   |
| `absorption_speed`      | ENUM       | `slow` / `medium` / `fast`                                                                                                                                                                        | 흡수 속도                                                                   |
| `layer_compatibility`   | ENUM       | `good` / `fair` / `poor`                                                                                                                                                                          | 다음 단계 제품과의 궁합                                                     |
| `recommended_frequency` | ENUM       | `daily` / `weekly_1_3` / `as_needed`                                                                                                                                                              | 권장 사용 빈도                                                              |

### 2.3 Toner filter mapping 후보

| filter_key                 | attribute condition                                                                                                                                                           | filter_type     |
| -------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------- |
| `hydrating_toner`          | `hydration_level IN [medium, high]`                                                                                                                                           | BASIC_CONDITION |
| `low_irritation`           | `irritation_risk = low`                                                                                                                                                       | BASIC_CONDITION |
| `mild_ph`                  | `ph_value >= 4.5 AND ph_value <= 6.0` (1차) / `ph_label IN [weak_acidic, mild_acidic]` (폴백)                                                                                 | BASIC_CONDITION |
| `no_alcohol`               | `alcohol = false`                                                                                                                                                             | PERSONALIZED    |
| `no_fragrance`             | `fragrance = false`                                                                                                                                                           | PERSONALIZED    |
| `oil_control`              | `oil_control IN [medium, high]`                                                                                                                                               | PERSONALIZED    |
| `bha_exfoliation`          | `exfoliation_type IN [bha, mixed]`                                                                                                                                            | PERSONALIZED    |
| `oily_skin_fit_toner`      | `emollient_level IN [none, low]` AND `film_level IN [none, low]` AND `finish IN [fresh, moist]` AND `hydration_level >= medium`                                               | PERSONALIZED    |
| `dry_skin_fit_toner`       | `hydration_level = high` AND `film_level >= medium` AND `emollient_level IN [low, medium]`                                                                                    | PERSONALIZED    |
| `sensitive_skin_fit_toner` | `alcohol = false` AND `fragrance = false` AND `essential_oil = false` AND `exfoliation_strength IN [none, low]` AND `irritation_risk = low` AND `cooling_feel IN [none, low]` | PERSONALIZED    |
| `wipe_safe`                | `wipe_caution = false`                                                                                                                                                        | PERSONALIZED    |

---

## 3. Sunscreen — 선크림

### 3.1 Core attributes

| key                    | value_type | options / range                    | 설명                         |
| ---------------------- | ---------- | ---------------------------------- | ---------------------------- |
| `spf`                  | NUMBER     | 예: `30`, `50`                     | SPF 수치                     |
| `pa`                   | ENUM       | `+` / `++` / `+++` / `++++`        | PA 등급                      |
| `broad_spectrum`       | BOOLEAN    | `true` / `false`                   | UVA/UVB 광범위 차단 여부     |
| `filter_type`          | ENUM       | `physical` / `chemical` / `hybrid` | 무기자차, 유기자차, 혼합자차 |
| `eye_sting`            | ENUM       | `none` / `low` / `medium` / `high` | 눈시림 위험                  |
| `white_cast`           | ENUM       | `none` / `low` / `medium` / `high` | 백탁 정도                    |
| `texture`              | ENUM       | `light` / `medium` / `rich`        | 제형 무게감                  |
| `sticky`               | ENUM       | `none` / `low` / `medium` / `high` | 끈적임 정도                  |
| `finish`               | ENUM       | `matte` / `natural` / `dewy`       | 마무리감                     |
| `makeup_compatibility` | ENUM       | `good` / `fair` / `poor`           | 베이스 메이크업 궁합         |
| `portable`             | BOOLEAN    | `true` / `false`                   | 휴대 및 덧바르기 적합 여부   |
| `water_resistant`      | BOOLEAN    | `true` / `false`                   | 물, 땀 저항성                |
| `fragrance`            | BOOLEAN    | `true` / `false`                   | 향료 포함 여부               |
| `alcohol`              | BOOLEAN    | `true` / `false`                   | 자극 가능 알코올 포함 여부   |
| `oil_free`             | BOOLEAN    | `true` / `false`                   | 오일프리 여부                |
| `non_comedogenic`      | BOOLEAN    | `true` / `false`                   | 논코메도제닉 여부            |
| `hydration_level`      | ENUM       | `low` / `medium` / `high`          | 보습감                       |

### 3.2 Optional attributes

| key                        | value_type | options / range                                                                                                                                 | 설명                                                      |
| -------------------------- | ---------- | ----------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------- |
| `tone_up`                  | BOOLEAN    | `true` / `false`                                                                                                                                | 톤업 기능 여부                                            |
| `reapplication_fit`        | ENUM       | `low` / `medium` / `high`                                                                                                                       | 덧바르기 쉬움                                             |
| `sweat_resistant`          | BOOLEAN    | `true` / `false`                                                                                                                                | 땀 저항성. `water_resistant`와 별도 판단이 필요할 때 사용 |
| `uv_filters`               | MULTI_ENUM | `zinc_oxide` / `titanium_dioxide` / `avobenzone` / `octocrylene` / `octinoxate` / `oxybenzone` / `tinosorb_s` / `uvinul_a_plus` / `uvinul_t150` | 주요 자외선 차단 필터                                     |
| `moisturizing_ingredients` | MULTI_ENUM | `hyaluronic_acid` / `glycerin` / `panthenol` / `ceramide` / `squalane` / `aloe`                                                                 | 보습 성분                                                 |

### 3.3 Sunscreen filter mapping 후보

| filter_key           | attribute condition                                                    | filter_type     |
| -------------------- | ---------------------------------------------------------------------- | --------------- |
| `spf_50_plus`        | `spf >= 50`                                                            | BASIC_CONDITION |
| `pa_4_plus`          | `pa = ++++`                                                            | BASIC_CONDITION |
| `broad_spectrum`     | `broad_spectrum = true`                                                | BASIC_CONDITION |
| `eye_sting_low`      | `eye_sting IN [none, low]`                                             | BASIC_CONDITION |
| `white_cast_low`     | `white_cast IN [none, low]`                                            | BASIC_CONDITION |
| `makeup_compat_good` | `makeup_compatibility = good`                                          | BASIC_CONDITION |
| `low_sticky`         | `sticky IN [none, low]`                                                | PERSONALIZED    |
| `outdoor_use`        | `spf >= 50` AND `water_resistant = true`                               | PERSONALIZED    |
| `no_eye_sting`       | `eye_sting IN [none, low]`                                             | PERSONALIZED    |
| `no_white_cast`      | `white_cast IN [none, low]`                                            | PERSONALIZED    |
| `no_fragrance`       | `fragrance = false`                                                    | PERSONALIZED    |
| `portable`           | `portable = true`                                                      | PERSONALIZED    |
| `oily_skin_fit`      | `oil_free = true` AND `non_comedogenic = true` AND `finish = matte`    | PERSONALIZED    |
| `sensitive_skin_fit` | `filter_type = physical` AND `fragrance = false` AND `alcohol = false` | PERSONALIZED    |

---

## 4. Serum — 에센스 / 세럼 / 앰플

### 4.1 Core attributes

| key                    | value_type | options / range                                                                                                                                                                                                                                                                                                                                                                                                                                                   | 설명                                         |
| ---------------------- | ---------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------- |
| `active_ingredients`   | MULTI_ENUM | `retinol` / `retinal` / `bakuchiol` / `vitamin_c` / `vitamin_c_derivative` / `niacinamide` / `peptide` / `hyaluronic_acid` / `glycerin` / `ceramide` / `squalane` / `aha` / `bha` / `pha` / `salicylic_acid` / `glycolic_acid` / `lactic_acid` / `azelaic_acid` / `tranexamic_acid` / `arbutin` / `licorice` / `centella` / `madecassoside` / `panthenol` / `aloe` / `chamomile` / `green_tea` / `tea_tree` / `vitamin_e` / `ferulic_acid` / `pdrn` / `adenosine` | 주요 활성 성분. `calming` 같은 목적어는 제외 |
| `target_concerns`      | MULTI_ENUM | `brightening` / `anti_aging` / `acne` / `hydration` / `calming` / `pore_care` / `barrier` / `texture` / `pigmentation`                                                                                                                                                                                                                                                                                                                                            | 타겟 고민                                    |
| `irritation_risk`      | ENUM       | `low` / `medium` / `high`                                                                                                                                                                                                                                                                                                                                                                                                                                         | 자극 가능성                                  |
| `conflict_ingredients` | MULTI_ENUM | `retinol` / `vitamin_c` / `aha` / `bha` / `benzoyl_peroxide` / `peeling`                                                                                                                                                                                                                                                                                                                                                                                          | 병행 주의 성분                               |
| `usage_time`           | ENUM       | `morning` / `night` / `both`                                                                                                                                                                                                                                                                                                                                                                                                                                      | 권장 사용 시간대                             |
| `effective_dose_met`   | BOOLEAN    | `true` / `false`                                                                                                                                                                                                                                                                                                                                                                                                                                                  | 주요 기능 성분이 유효 함량 기준을 충족하는지 |
| `fragrance`            | BOOLEAN    | `true` / `false`                                                                                                                                                                                                                                                                                                                                                                                                                                                  | 향료 포함 여부                               |
| `alcohol`              | BOOLEAN    | `true` / `false`                                                                                                                                                                                                                                                                                                                                                                                                                                                  | 자극 가능 알코올 포함 여부                   |
| `oil_free`             | BOOLEAN    | `true` / `false`                                                                                                                                                                                                                                                                                                                                                                                                                                                  | 오일프리 여부                                |
| `non_comedogenic`      | BOOLEAN    | `true` / `false`                                                                                                                                                                                                                                                                                                                                                                                                                                                  | 논코메도제닉 여부                            |

### 4.2 Optional attributes

| key                         | value_type | options / range                                           | 설명                                                                  |
| --------------------------- | ---------- | --------------------------------------------------------- | --------------------------------------------------------------------- |
| `texture`                   | ENUM       | `water` / `gel` / `oil` / `cream`                         | 제형                                                                  |
| `concentration_level`       | ENUM       | `low` / `medium` / `high`                                 | 활성 성분 농도 체감 수준                                              |
| `ingredient_concentrations` | JSON       | 예: `{ niacinamide: 5, retinol: 0.1 }`                    | 성분별 농도 metadata. Product Matrix 필터는 `effective_dose_met` 사용 |
| `packaging`                 | ENUM       | `opaque` / `transparent` / `airless` / `dropper` / `tube` | 용기 형태                                                             |
| `stability_packaging`       | ENUM       | `good` / `fair` / `poor`                                  | 산화/빛 취약 성분 보호 적합도                                         |
| `photosensitive`            | BOOLEAN    | `true` / `false`                                          | 사용 후 자외선 민감성 주의 필요 여부                                  |
| `effect_timeline`           | ENUM       | `fast` / `gradual`                                        | 기대 시차                                                             |

주의:

- `ingredient_concentrations`는 `products.attributes` JSONB 안에서 metadata로 저장한다.
- 현재 `category_attribute_definitions.value_type`에 JSON을 추가하지 않을 경우, 이 key는 관리자 입력 UI에서 별도 raw metadata 영역으로 관리한다.

### 4.3 Serum filter mapping 후보

| filter_key              | attribute condition                                                                                         | filter_type     |
| ----------------------- | ----------------------------------------------------------------------------------------------------------- | --------------- |
| `effective_dose`        | `effective_dose_met = true`                                                                                 | BASIC_CONDITION |
| `low_irritation`        | `irritation_risk = low`                                                                                     | BASIC_CONDITION |
| `clear_purpose`         | `active_ingredients` length >= 1 AND `target_concerns` length >= 1                                          | BASIC_CONDITION |
| `no_fragrance`          | `fragrance = false`                                                                                         | PERSONALIZED    |
| `morning_use`           | `usage_time IN [morning, both]`                                                                             | PERSONALIZED    |
| `night_use`             | `usage_time IN [night, both]`                                                                               | PERSONALIZED    |
| `no_conflict_retinol`   | `conflict_ingredients NOT CONTAINS retinol`                                                                 | PERSONALIZED    |
| `no_conflict_vitamin_c` | `conflict_ingredients NOT CONTAINS vitamin_c`                                                               | PERSONALIZED    |
| `oily_skin_fit`         | `oil_free = true` AND `non_comedogenic = true`                                                              | PERSONALIZED    |
| `acne_fit`              | `non_comedogenic = true` AND `active_ingredients CONTAINS_ANY [bha, salicylic_acid, niacinamide, tea_tree]` | PERSONALIZED    |

---

## 5. Lipcare — 립케어

### 5.1 Core attributes

| key                | value_type | options / range                                | 설명                     |
| ------------------ | ---------- | ---------------------------------------------- | ------------------------ |
| `moisture_lasting` | ENUM       | `low` / `medium` / `high`                      | 보습 지속력              |
| `humectant_level`  | ENUM       | `low` / `medium` / `high`                      | 수분 끌어당김 성분 수준  |
| `occlusive_level`  | ENUM       | `low` / `medium` / `high`                      | 수분 증발 방지 성분 수준 |
| `irritation_risk`  | ENUM       | `low` / `medium` / `high`                      | 자극 가능성              |
| `menthol`          | BOOLEAN    | `true` / `false`                               | 멘톨 포함 여부           |
| `fragrance`        | BOOLEAN    | `true` / `false`                               | 향료 포함 여부           |
| `alcohol`          | BOOLEAN    | `true` / `false`                               | 알코올 포함 여부         |
| `camphor`          | BOOLEAN    | `true` / `false`                               | 캠퍼 포함 여부           |
| `salicylic_acid`   | BOOLEAN    | `true` / `false`                               | 살리실산 포함 여부       |
| `colorant`         | BOOLEAN    | `true` / `false`                               | 색소 포함 여부           |
| `spf`              | NUMBER     | `0` 이상                                       | SPF 수치. 없음은 `0`     |
| `form`             | ENUM       | `stick` / `tube` / `balm` / `mask` / `essence` | 제품 형태. `tint` 제외   |
| `portable`         | BOOLEAN    | `true` / `false`                               | 휴대 편의성              |

### 5.2 Optional attributes

| key                | value_type | options / range                                                                                                                                                                                             | 설명                         |
| ------------------ | ---------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------- |
| `night_care`       | BOOLEAN    | `true` / `false`                                                                                                                                                                                            | 야간 집중 케어 적합 여부     |
| `makeup_base_fit`  | ENUM       | `good` / `fair` / `poor`                                                                                                                                                                                    | 립 메이크업 전 베이스 적합도 |
| `key_ingredients`  | MULTI_ENUM | `shea_butter` / `hyaluronic_acid` / `glycerin` / `aloe` / `vitamin_e` / `beeswax` / `petrolatum` / `lanolin` / `ceramide` / `panthenol` / `squalane` / `jojoba_oil` / `argan_oil` / `coconut_oil` / `honey` | 주요 성분                    |
| `absorption_speed` | ENUM       | `slow` / `medium` / `fast`                                                                                                                                                                                  | 흡수 속도                    |
| `finish`           | ENUM       | `matte` / `natural` / `glossy`                                                                                                                                                                              | 마무리감                     |

### 5.3 Lipcare filter mapping 후보

| filter_key             | attribute condition                                         | filter_type     |
| ---------------------- | ----------------------------------------------------------- | --------------- |
| `high_moisture`        | `moisture_lasting = high`                                   | BASIC_CONDITION |
| `balanced_moisture`    | `humectant_level >= medium` AND `occlusive_level >= medium` | BASIC_CONDITION |
| `no_menthol`           | `menthol = false`                                           | BASIC_CONDITION |
| `low_fragrance`        | `fragrance = false`                                         | BASIC_CONDITION |
| `no_menthol_sensitive` | `menthol = false`                                           | PERSONALIZED    |
| `no_fragrance`         | `fragrance = false`                                         | PERSONALIZED    |
| `no_cooling_irritants` | `menthol = false` AND `camphor = false`                     | PERSONALIZED    |
| `spf_included`         | `spf >= 15`                                                 | PERSONALIZED    |
| `portable`             | `portable = true`                                           | PERSONALIZED    |
| `night_repair`         | `night_care = true` AND `occlusive_level = high`            | PERSONALIZED    |

---

## 6. Moisturizer — 로션 / 크림

### 6.1 Core attributes

| key                    | value_type | options / range                                  | 설명                       |
| ---------------------- | ---------- | ------------------------------------------------ | -------------------------- |
| `form`                 | ENUM       | `lotion` / `gel_cream` / `water_cream` / `cream` | 제품 형태                  |
| `hydration_level`      | ENUM       | `low` / `medium` / `high`                        | 수분 공급 수준             |
| `humectant_level`      | ENUM       | `low` / `medium` / `high`                        | 습윤제 수준                |
| `emollient_level`      | ENUM       | `low` / `medium` / `high`                        | 유연제 수준                |
| `occlusive_level`      | ENUM       | `low` / `medium` / `high`                        | 교착제 수준                |
| `oiliness`             | ENUM       | `low` / `medium` / `high`                        | 유분감                     |
| `texture`              | ENUM       | `light` / `medium` / `rich`                      | 제형 무게감                |
| `barrier_repair`       | ENUM       | `low` / `medium` / `high`                        | 장벽 보강 성격             |
| `irritation_risk`      | ENUM       | `low` / `medium` / `high`                        | 자극 가능성                |
| `fragrance`            | BOOLEAN    | `true` / `false`                                 | 향료 포함 여부             |
| `alcohol`              | BOOLEAN    | `true` / `false`                                 | 자극 가능 알코올 포함 여부 |
| `oil_free`             | BOOLEAN    | `true` / `false`                                 | 오일프리 여부              |
| `non_comedogenic`      | BOOLEAN    | `true` / `false`                                 | 논코메도제닉 여부          |
| `ph`                   | NUMBER     | 예: `5.5`                                        | pH 수치. 불명확하면 null   |
| `sticky`               | ENUM       | `none` / `low` / `medium` / `high`               | 끈적임 정도                |
| `makeup_compatibility` | ENUM       | `good` / `fair` / `poor`                         | 베이스 메이크업 궁합       |

### 6.2 Optional attributes

| key                   | value_type | options / range                                                                                                                                                                                                  | 설명                          |
| --------------------- | ---------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------- |
| `absorption_speed`    | ENUM       | `slow` / `medium` / `fast`                                                                                                                                                                                       | 흡수 속도                     |
| `seasonal_fit`        | MULTI_ENUM | `spring` / `summer` / `autumn` / `winter` / `all_season`                                                                                                                                                         | 계절 적합도                   |
| `active_ingredients`  | MULTI_ENUM | `retinol` / `vitamin_c` / `niacinamide` / `peptide` / `ceramide` / `hyaluronic_acid` / `glycerin` / `centella` / `panthenol` / `squalane` / `shea_butter` / `petrolatum` / `urea` / `aloe` / `chamomile` / `oat` | 주요 성분                     |
| `finish`              | ENUM       | `matte` / `natural` / `dewy`                                                                                                                                                                                     | 마무리감                      |
| `layer_compatibility` | ENUM       | `good` / `fair` / `poor`                                                                                                                                                                                         | 선크림/세럼과의 레이어링 궁합 |

### 6.3 Moisturizer filter mapping 후보

| filter_key            | attribute condition                                                                                     | filter_type     |
| --------------------- | ------------------------------------------------------------------------------------------------------- | --------------- |
| `barrier_ingredients` | `barrier_repair IN [medium, high]` OR `active_ingredients CONTAINS_ANY [ceramide, panthenol, squalane]` | BASIC_CONDITION |
| `triple_moisture`     | `humectant_level >= medium` AND `emollient_level >= medium` AND `occlusive_level >= medium`             | BASIC_CONDITION |
| `mild_ph`             | `ph >= 5.0 AND ph <= 6.0`                                                                               | BASIC_CONDITION |
| `high_hydration`      | `hydration_level = high`                                                                                | PERSONALIZED    |
| `lightweight`         | `texture = light` AND `oiliness IN [low, medium]`                                                       | PERSONALIZED    |
| `oil_free`            | `oil_free = true`                                                                                       | PERSONALIZED    |
| `non_comedogenic`     | `non_comedogenic = true`                                                                                | PERSONALIZED    |
| `no_fragrance`        | `fragrance = false`                                                                                     | PERSONALIZED    |
| `makeup_compat_good`  | `makeup_compatibility = good`                                                                           | PERSONALIZED    |
| `low_sticky`          | `sticky IN [none, low]`                                                                                 | PERSONALIZED    |

---

## 7. Cleanser — 클렌저

### 7.1 Core attributes

| key                    | value_type | options / range                                                         | 설명                                 |
| ---------------------- | ---------- | ----------------------------------------------------------------------- | ------------------------------------ |
| `cleanser_type`        | ENUM       | `foam` / `gel` / `oil` / `balm` / `water` / `cream` / `milk` / `lotion` | 클렌저 제형. 기존 `type` 대체        |
| `cleansing_power`      | ENUM       | `low` / `medium` / `high`                                               | 세정력                               |
| `after_feel`           | ENUM       | `moist` / `neutral` / `dry`                                             | 세안 후 느낌                         |
| `irritation_risk`      | ENUM       | `low` / `medium` / `high`                                               | 자극 가능성                          |
| `ph`                   | NUMBER     | 예: `5.5`                                                               | pH 수치. 기존 `ph_level` 대체        |
| `sulfate_free`         | BOOLEAN    | `true` / `false`                                                        | SLS/SLES 등 설페이트 미함유 여부     |
| `fragrance`            | BOOLEAN    | `true` / `false`                                                        | 향료 포함 여부                       |
| `alcohol`              | BOOLEAN    | `true` / `false`                                                        | 자극 가능 알코올 포함 여부           |
| `colorant`             | BOOLEAN    | `true` / `false`                                                        | 색소 포함 여부                       |
| `soap_free`            | BOOLEAN    | `true` / `false`                                                        | 비누 성분/알칼리 비누 기반 회피 여부 |
| `non_comedogenic`      | BOOLEAN    | `true` / `false`                                                        | 논코메도제닉 여부                    |
| `makeup_removal_power` | ENUM       | `none` / `low` / `medium` / `high`                                      | 메이크업 제거력                      |
| `double_cleanse_role`  | ENUM       | `first` / `second` / `both`                                             | 이중 세안 내 역할                    |
| `physical_scrub_risk`  | ENUM       | `none` / `low` / `medium` / `high`                                      | 굵은 물리적 스크럽 자극 위험         |

### 7.2 Optional attributes

| key                     | value_type | options / range                                                                                                                                                                          | 설명                            |
| ----------------------- | ---------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------- |
| `exfoliation`           | ENUM       | `none` / `physical` / `chemical` / `mixed`                                                                                                                                               | 각질 케어 방식                  |
| `active_ingredients`    | MULTI_ENUM | `salicylic_acid` / `charcoal` / `ceramide` / `niacinamide` / `tea_tree` / `centella` / `clay` / `benzoyl_peroxide` / `aloe` / `chamomile` / `calendula` / `glycerin` / `hyaluronic_acid` | 주요 성분                       |
| `surfactant_type`       | ENUM       | `amino_acid` / `amphoteric` / `sulfate` / `soap` / `mixed` / `unknown`                                                                                                                   | 계면활성제 성격                 |
| `morning_fit`           | ENUM       | `good` / `fair` / `poor`                                                                                                                                                                 | 아침 세안 적합도                |
| `waterproof_makeup_fit` | ENUM       | `good` / `fair` / `poor`                                                                                                                                                                 | 워터프루프 메이크업 제거 적합도 |

### 7.3 Cleanser filter mapping 후보

| filter_key          | attribute condition                                                     | filter_type     |
| ------------------- | ----------------------------------------------------------------------- | --------------- |
| `mild_ph`           | `ph >= 5.0 AND ph <= 6.5`                                               | BASIC_CONDITION |
| `low_sls`           | `sulfate_free = true`                                                   | BASIC_CONDITION |
| `low_irritation`    | `irritation_risk = low`                                                 | BASIC_CONDITION |
| `no_fragrance`      | `fragrance = false`                                                     | PERSONALIZED    |
| `no_alcohol`        | `alcohol = false`                                                       | PERSONALIZED    |
| `soap_free`         | `soap_free = true`                                                      | PERSONALIZED    |
| `non_comedogenic`   | `non_comedogenic = true`                                                | PERSONALIZED    |
| `makeup_removal`    | `makeup_removal_power IN [medium, high]`                                | PERSONALIZED    |
| `morning_cleanser`  | `cleansing_power IN [low, medium]` AND `after_feel IN [moist, neutral]` | PERSONALIZED    |
| `no_physical_scrub` | `physical_scrub_risk IN [none, low]`                                    | PERSONALIZED    |

---

## 8. Legacy key migration

기존 `product_attribute_schema.md`에서 아래처럼 변경한다.

| 기존 key / 값                                                  | 신규 key / 값                                                                    | 이유                                                                                                                                        |
| -------------------------------------------------------------- | -------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| `pa_level`                                                     | `pa`                                                                             | DB 예시와 Product Matrix filter_key `pa_4_plus`에 맞춤                                                                                      |
| `PA+`, `PA++`, `PA+++`, `PA++++`                               | `+`, `++`, `+++`, `++++`                                                         | 값 비교 단순화                                                                                                                              |
| `alcohol_free: true`                                           | `alcohol: false`                                                                 | 포함 여부 기준으로 통일                                                                                                                     |
| `fragrance_free: true`                                         | `fragrance: false`                                                               | Product Filter Mapping의 `fragrance = false`와 일치                                                                                         |
| `ph_level: acidic / neutral / alkaline`                        | `ph_value: number` + `ph_label: enum`                                            | `mild_ph` 필터를 수치 우선·구간 폴백으로 판단                                                                                               |
| `type` in cleanser                                             | `cleanser_type`                                                                  | 제품 type, category type과 의미 충돌 방지                                                                                                   |
| `spf: none` in lipcare                                         | `spf: 0`                                                                         | number 타입 통일                                                                                                                            |
| `form: tint` in lipcare                                        | 제거                                                                             | 색조 립 제품은 MVP 립케어 범위에서 제외                                                                                                     |
| `purpose` in toner                                             | `purposes`                                                                       | 토너는 수분+진정, 피지+각질처럼 복합 목적이 많음                                                                                            |
| `ingredient_role` in moisturizer                               | `humectant_level`, `emollient_level`, `occlusive_level`                          | 보습 3요소를 필터링 가능하게 분리                                                                                                           |
| `application_method` in toner (Core ENUM)                      | `application_methods` (Optional MULTI_ENUM, `wipe / press / pack / mist`)        | 대부분 토너가 겸용이므로 Core 필터 가치 낮음. 닦토 안전성은 별도 `wipe_caution` BOOLEAN로 표현                                              |
| `purposes` in toner (단일 MULTI_ENUM)                          | `role_tags` (실사용 역할) + `functional_claims` (식약처 기능성 인정 받은 항목만) | 사용감 필터와 기능성 주장이 섞여 있어 분리. 출처 메타데이터(`claim_status`)는 도입하지 않고 "비어 있음 = 미인증" 정책으로 운영              |
| `ph: number` in toner                                          | `ph_value: number` + `ph_label: enum`                                            | "약산성(추정)"만 있는 제품 다수. ph_value 폴백으로 ph_label을 둠. 출처(`ph_source`)는 도입하지 않음                                         |
| `photosensitive: boolean` in toner                             | `sun_caution: enum (none/low/medium/high)`                                       | 광민감성 정도를 단계로 표현해 SORT/HARD_FILTER 양쪽 활용 가능                                                                               |
| `exfoliation_type` in toner (`none / aha / bha / pha / mixed`) | `exfoliation_type` (`+ lha + enzyme`) + `exfoliation_strength` 신규              | LHA(녹두), 효소(파파인) 사례 다수. 강도 분리로 민감 사용자 대응                                                                             |
| `non_comedogenic` in toner                                     | 제거                                                                             | CSV 25+종 검토 결과 토너에서 명시 사례 거의 0. 토너의 acne_prone 매핑은 `oil_control` + `emollient_level` + `irritation_risk` 조합으로 대체 |

---

## 9. Product Matrix BASIC_CONDITION 권장 세트

### 9.1 Toner

| filter_key        | label     | attribute condition                                                                           |
| ----------------- | --------- | --------------------------------------------------------------------------------------------- |
| `hydrating_toner` | 수분 공급 | `hydration_level IN [medium, high]`                                                           |
| `low_irritation`  | 저자극    | `irritation_risk = low`                                                                       |
| `mild_ph`         | 약산성    | `ph_value >= 4.5 AND ph_value <= 6.0` (1차) / `ph_label IN [weak_acidic, mild_acidic]` (폴백) |

### 9.2 Sunscreen

| filter_key           | label         | attribute condition           |
| -------------------- | ------------- | ----------------------------- |
| `spf_50_plus`        | SPF 50 이상   | `spf >= 50`                   |
| `pa_4_plus`          | PA++++        | `pa = ++++`                   |
| `eye_sting_low`      | 눈시림 낮음   | `eye_sting IN [none, low]`    |
| `white_cast_low`     | 백탁 적음     | `white_cast IN [none, low]`   |
| `makeup_compat_good` | 메이크업 궁합 | `makeup_compatibility = good` |

### 9.3 Serum

| filter_key       | label            | attribute condition                                                |
| ---------------- | ---------------- | ------------------------------------------------------------------ |
| `effective_dose` | 유효 함량 충족   | `effective_dose_met = true`                                        |
| `low_irritation` | 자극 가능성 낮음 | `irritation_risk = low`                                            |
| `clear_purpose`  | 목적 성분 명확   | `active_ingredients length >= 1` AND `target_concerns length >= 1` |

### 9.4 Lipcare

| filter_key          | label            | attribute condition                                         |
| ------------------- | ---------------- | ----------------------------------------------------------- |
| `high_moisture`     | 보습 지속력 높음 | `moisture_lasting = high`                                   |
| `balanced_moisture` | 보습+보호 균형   | `humectant_level >= medium` AND `occlusive_level >= medium` |
| `no_menthol`        | 멘톨 없음        | `menthol = false`                                           |
| `low_fragrance`     | 향료 적음        | `fragrance = false`                                         |

### 9.5 Moisturizer

| filter_key            | label     | attribute condition                                                                                     |
| --------------------- | --------- | ------------------------------------------------------------------------------------------------------- |
| `barrier_ingredients` | 장벽 성분 | `barrier_repair IN [medium, high]` OR `active_ingredients CONTAINS_ANY [ceramide, panthenol, squalane]` |
| `triple_moisture`     | 다층 보습 | `humectant_level >= medium` AND `emollient_level >= medium` AND `occlusive_level >= medium`             |
| `mild_ph`             | 약산성    | `ph >= 5.0 AND ph <= 6.0`                                                                               |

### 9.6 Cleanser

| filter_key       | label             | attribute condition       |
| ---------------- | ----------------- | ------------------------- |
| `mild_ph`        | 약산성            | `ph >= 5.0 AND ph <= 6.5` |
| `low_sls`        | 저자극 계면활성제 | `sulfate_free = true`     |
| `low_irritation` | 저자극            | `irritation_risk = low`   |

---

## 10. Product Filter / Matrix Filter / Question Mapping 예시

| trigger_question_key             | trigger 조건       | category      | attribute_or_computed_key | 기본 조건              | service_policy | matrix_filter_key      |
| -------------------------------- | ------------------ | ------------- | ------------------------- | ---------------------- | -------------- | ---------------------- |
| `context.eye_sting`              | `EQ true`          | `sunscreen`   | `eye_sting`               | `IN [none, low]`       | `HARD_FILTER`  | `no_eye_sting`         |
| `context.white_cast_sensitive`   | `EQ true`          | `sunscreen`   | `white_cast`              | `IN [none, low]`       | `HARD_FILTER`  | `no_white_cast`        |
| `context.makeup_use`             | `EQ true`          | `sunscreen`   | `makeup_compatibility`    | `EQ good`              | `TAG`          | `makeup_compat_good`   |
| `life.outdoor_activity`          | `EQ high`          | `sunscreen`   | `spf`                     | `GTE 50`               | `HARD_FILTER`  | `outdoor_use`          |
| `context.portable`               | `EQ true`          | `sunscreen`   | `portable`                | `EQ true`              | `SORT`         | `portable`             |
| `preference.fragrance_sensitive` | `EQ true`          | all           | `fragrance`               | `EQ false`             | `HARD_FILTER`  | `no_fragrance`         |
| `preference.menthol_sensitive`   | `EQ true`          | `lipcare`     | `menthol`                 | `EQ false`             | `HARD_FILTER`  | `no_menthol_sensitive` |
| `context.lip_outdoor`            | `EQ true`          | `lipcare`     | `spf`                     | `GTE 15`               | `TAG`          | `spf_included`         |
| `context.lip_reapply`            | `EQ true`          | `lipcare`     | `moisture_lasting`        | `EQ high`              | `SORT`         | `high_moisture`        |
| `life.recent_irritation`         | `EQ true`          | `serum`       | `irritation_risk`         | `EQ low`               | `HARD_FILTER`  | `low_irritation`       |
| `product.owned_actives`          | `CONTAINS retinol` | `serum`       | `conflict_ingredients`    | `NOT_CONTAINS retinol` | `CAUTION`      | `no_conflict_retinol`  |
| `context.usage_time`             | `EQ morning`       | `serum`       | `usage_time`              | `IN [morning, both]`   | `HARD_FILTER`  | `morning_use`          |
| `context.usage_time`             | `EQ night`         | `serum`       | `usage_time`              | `IN [night, both]`     | `HARD_FILTER`  | `night_use`            |
| `routine.recent_dry_tight`       | `EQ true`          | `moisturizer` | `triple_moisture`         | computed               | `SORT`         | `triple_moisture`      |
| `routine.makeup_frequent`        | `EQ true`          | `moisturizer` | `makeup_compatibility`    | `EQ good`              | `TAG`          | `makeup_compat_good`   |
| `routine.cleansing_stable`       | `EQ false`         | `cleanser`    | `mild_ph`                 | computed               | `SORT`         | `mild_ph`              |

주의:

- `NOT_CONTAINS`, `CONTAINS_ANY`, `computed`는 현재 DB operator에 없으므로 application layer에서 처리하거나, 기존 operator 조합으로 분해한다.
- DB operator만 사용할 경우 `CONTAINS_ANY`는 여러 mapping row로 분해한다.

---

## 11. category_attribute_definitions 등록 우선순위

### P0 — Product Matrix 필수

| category      | keys                                                                                                                                                                                                                                                 |
| ------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `sunscreen`   | `spf`, `pa`, `broad_spectrum`, `filter_type`, `eye_sting`, `white_cast`, `texture`, `sticky`, `makeup_compatibility`, `portable`, `water_resistant`, `finish`, `fragrance`, `alcohol`, `oil_free`, `non_comedogenic`                                 |
| `serum`       | `active_ingredients`, `target_concerns`, `irritation_risk`, `conflict_ingredients`, `usage_time`, `effective_dose_met`, `fragrance`, `alcohol`, `oil_free`, `non_comedogenic`                                                                        |
| `lipcare`     | `moisture_lasting`, `humectant_level`, `occlusive_level`, `irritation_risk`, `menthol`, `fragrance`, `alcohol`, `camphor`, `salicylic_acid`, `colorant`, `spf`, `form`, `portable`                                                                   |
| `moisturizer` | `form`, `hydration_level`, `humectant_level`, `emollient_level`, `occlusive_level`, `oiliness`, `texture`, `barrier_repair`, `irritation_risk`, `fragrance`, `alcohol`, `oil_free`, `non_comedogenic`, `ph`, `sticky`, `makeup_compatibility`        |
| `cleanser`    | `cleanser_type`, `cleansing_power`, `after_feel`, `irritation_risk`, `ph`, `sulfate_free`, `fragrance`, `alcohol`, `colorant`, `soap_free`, `non_comedogenic`, `makeup_removal_power`, `double_cleanse_role`, `physical_scrub_risk`                  |
| `toner`       | `form`, `role_tags`, `hydration_level`, `emollient_level`, `film_level`, `finish`, `exfoliation_type`, `exfoliation_strength`, `oil_control`, `irritation_risk`, `alcohol`, `fragrance`, `essential_oil`, `ph_value`, `ph_label`, `astringent_level` |

### P1 — Product Detail / 태그 / 정렬 보조

| category      | keys                                                                                                                                                                                                  |
| ------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `sunscreen`   | `tone_up`, `reapplication_fit`, `sweat_resistant`, `uv_filters`, `moisturizing_ingredients`                                                                                                           |
| `serum`       | `texture`, `concentration_level`, `packaging`, `stability_packaging`, `photosensitive`, `effect_timeline`, `ingredient_concentrations`                                                                |
| `lipcare`     | `night_care`, `makeup_base_fit`, `key_ingredients`, `absorption_speed`, `finish`                                                                                                                      |
| `moisturizer` | `absorption_speed`, `seasonal_fit`, `active_ingredients`, `finish`, `layer_compatibility`                                                                                                             |
| `cleanser`    | `exfoliation`, `active_ingredients`, `surfactant_type`, `morning_fit`, `waterproof_makeup_fit`                                                                                                        |
| `toner`       | `application_methods`, `wipe_caution`, `cotton_pad_fit`, `cooling_feel`, `sun_caution`, `functional_claims`, `active_ingredients`, `absorption_speed`, `layer_compatibility`, `recommended_frequency` |

---

## 12. 최종 정리

이 schema의 핵심 변경점은 다음과 같다.

1. `pa_level`, `fragrance_free`, `alcohol_free`, `ph_level`, `type` 같은 불일치 key를 제거했다.
2. Product Matrix 필터에 직접 쓰이는 값을 Optional이 아니라 Core로 올렸다.
3. 향료, 알코올, pH, 논코메도제닉, 오일프리, 휴대성 등 개인화 필터에 필요한 공통 축을 보강했다.
4. 립케어에서 `tint`를 제거하고 SPF 없음은 `spf = 0`으로 통일했다.
5. 모이스처라이저는 `ingredient_role` 단일값 대신 `humectant_level`, `emollient_level`, `occlusive_level`로 분리했다.
6. 클렌저는 `ph`를 숫자형으로 바꾸고 `cleanser_type`을 사용한다.
7. 세럼은 `effective_dose_met`을 추가해 유효 함량 필터를 실제로 적용할 수 있게 했다.
8. 피부 타입은 product attribute가 아니라 user_responses 기반 매칭 로직으로 유지한다.
9. 토너는 사용자가 가장 많이 언급하는 "유분기/쫀쫀함/마무리감"을 표현하기 위해 `emollient_level`, `film_level`, `finish`를 Core에 추가했다. `oil_control`(피지 분비 조절 효과)와 `emollient_level`(도포 시 유분감)의 의미를 분리해 Core에 명시했다.
10. 토너의 `application_method`(닦토/흡토)는 거의 모든 제품이 겸용이라 Core 필터 가치가 없어 `application_methods`(MULTI_ENUM) Optional로 내렸고, 닦토 안전성은 `wipe_caution` BOOLEAN으로 분리했다.
11. 토너의 `purposes`는 사용감 필터(`role_tags`)와 식약처 기능성 주장(`functional_claims`)으로 분리했다. 출처/근거 메타데이터(claim_status, ph_source 등)는 큐레이터가 직접 판단해 입력하는 운영 정책으로 갈음하고 별도 키로 도입하지 않는다.
12. 토너의 `exfoliation_type`에 LHA·효소(enzyme)를 추가하고, 강도는 `exfoliation_strength`로 분리해 민감 사용자 매핑을 정밀화했다.
13. 토너의 `essential_oil` BOOLEAN은 `fragrance = false`여도 자극원이 될 수 있는 티트리/유칼립투스/스피어민트 등 에센셜오일을 별도 표기하기 위함이다.
