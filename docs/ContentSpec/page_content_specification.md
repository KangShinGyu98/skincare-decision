# Skincare Decision MVP — Page Content Specification (Revised)

> 목적: `product_attribute_schema_revised.md`와 `matching_rules_revised.md` 기준으로 실제 화면에 노출되는 텍스트, 질문, 데이터 슬롯, CTA, 동적 결과를 정의한다.  
> 범위: MVP 6개 카테고리 — `toner`, `sunscreen`, `serum`, `lipcare`, `moisturizer`, `cleanser`  
> 작성일: 2026-05-01

---

## 0. 기준 문서

| 기준                             | 반영 내용                                                                 |
| -------------------------------- | ------------------------------------------------------------------------- |
| Product Taxonomy                 | 6개 MVP 제품군과 포함/제외 범위                                           |
| Product Attribute Schema Revised | Product Matrix에서 사용할 attribute key                                   |
| DB Modeling                      | fact, question, filter mapping, decision snapshot 구조                    |
| Wireframe Summary                | Landing, Priority Gate, Category Decision, Product Matrix, Traceback 흐름 |
| skincare_rules_from_articles     | 제품군별 선택 기준, 피해야 할 성분, 사용 맥락                             |
| Matching Rules Revised           | 사용자 답변 → product attribute 조건 변환                                 |

---

## 1. 표기 규칙

| 마크 | 의미                                        |
| ---- | ------------------------------------------- |
| ✅   | 정적 콘텐츠                                 |
| 🔗   | DB 조회 데이터                              |
| 📐   | Rule 기반 동적 출력                         |
| 🧩   | 프론트엔드 상수 또는 application layer 계산 |
| ⏳   | 카피/디자인 추후 보정 가능                  |

---

## 2. MVP 카테고리

| category_key  | 화면 라벨   | 포함                                           | 제외 / 주의                          |
| ------------- | ----------- | ---------------------------------------------- | ------------------------------------ |
| `toner`       | 토너        | 스킨, 토너, 화장수                             | 토너패드는 `form = pad`로 처리       |
| `sunscreen`   | 선크림      | 선크림, 선로션, 선스틱, 톤업 선크림            | 쿠션, 파운데이션 제외                |
| `serum`       | 세럼        | 에센스, 세럼, 앰플                             | 기능성 집중 케어 통합                |
| `lipcare`     | 립케어      | 립밤, 립마스크, 립에센스                       | 립스틱, 틴트, 색조 립 제외           |
| `moisturizer` | 로션 / 크림 | 로션, 크림, 수분크림, 젤크림                   | 바디 로션 제외                       |
| `cleanser`    | 클렌저      | 클렌징폼, 젤클렌저, 오일, 밤, 워터, 크림, 밀크 | 전용 리무버는 cleanser 속성으로 처리 |

---

## 3. 화면 목록

| ID  | 화면                      | 우선순위 | 핵심 역할                                  |
| --- | ------------------------- | -------- | ------------------------------------------ |
| S01 | Landing / Intent Entry    | P1       | 진입 세그먼트, 고민 태그, 제품군 빠른 진입 |
| S02 | Priority Gate             | P1       | 새 제품 구매 가능 여부와 우선 제품군 판단  |
| S03 | Category Decision — Box 1 | P1       | 기본 사용 맥락 확인                        |
| S04 | Category Decision — Box 2 | P1       | 제품군별 핵심 질문                         |
| S05 | Category Decision — Box 3 | P1       | 조건 요약 + 자동 필터 + 제품 후보 CTA      |
| S06 | Product Matrix            | P0       | 필터 기반 제품 비교                        |
| S07 | Product Detail            | P2       | 제품별 적합도 사유, attribute, 성분 확인   |
| S08 | Reaction Traceback        | P3       | 문제/괜찮은 제품 비교로 원인 후보 추적     |

---

# S01 — Landing / Intent Entry

## 콘텐츠 슬롯

| 슬롯                  | 타입                       | 상태 |
| --------------------- | -------------------------- | ---- |
| Nav Bar 메뉴          | 정적                       | ✅   |
| Hero Title / Subtitle | 정적                       | ✅   |
| 4-Segment 카드        | 정적 + 이벤트              | ✅   |
| 제품군 Fast Lane 칩   | 정적 + 이벤트              | ✅   |
| 기능 소개 섹션        | 정적                       | ✅   |
| Concern Mapper 캐러셀 | 프론트 상수                | ✅   |
| Concern route preset  | 프론트 상수 + preset facts | ✅   |

## 1. Nav Bar

| 라벨      | 링크                  |
| --------- | --------------------- |
| 홈        | `/`                   |
| 루틴 점검 | `/priority-gate`      |
| 제품 비교 | `/product-matrix`     |
| 실패 추적 | `/reaction-traceback` |
| 시작하기  | `/priority-gate`      |

## 2. Hero

### Title

지금 필요한 건 제품 추천이 아니라 루틴 점검입니다

### Subtitle

브러시는 1년째 안 빨면서, 저자극 세럼을 검색하고 있지는 않나요?  
토너가 4개나 쌓여 있는데, 장바구니에는 또 토너가 들어 있지는 않나요?  
로션 하나 고르는데도, 성분·제형·끈적임·휴대성까지 따지고 있지는 않나요?

## 3. Segment 카드

| ID          | 제목                          | 설명                                                                      | 이동                  | 저장                  |
| ----------- | ----------------------------- | ------------------------------------------------------------------------- | --------------------- | --------------------- |
| `segment_A` | 전체 루틴 점검하기            | 필요한 건 제품이 아닐지도 몰라요. 루틴부터 확인해보세요.                  | `/priority-gate`      | `session.segment = A` |
| `segment_B` | 고민은 있는데 카테고리를 모름 | [여드름]/[뒤집힘]/[건조]처럼 상태는 아는데 무엇부터 봐야 할지 모르겠어요. | `/concern-mapper`     | `session.segment = B` |
| `segment_C` | 이미 찾는 제품군이 있음       | [썬크림]/[로션]을 찾으러 왔어요.                                          | `/category-decision`  | `session.segment = C` |
| `segment_D` | 실패 원인 추적형              | 특정 제품 사용 후 문제가 있었다면 원인 후보를 좁혀봐요.                   | `/reaction-traceback` | `session.segment = D` |

> 해당 부분 html select 태그를 사용해서 바뀌는 UI 작성

## 4. 제품군 Fast Lane

| category_key  | 라벨        | 이동                                      |
| ------------- | ----------- | ----------------------------------------- |
| `toner`       | 토너        | `/category-decision?category=toner`       |
| `sunscreen`   | 선크림      | `/category-decision?category=sunscreen`   |
| `serum`       | 세럼        | `/category-decision?category=serum`       |
| `lipcare`     | 립케어      | `/category-decision?category=lipcare`     |
| `moisturizer` | 로션 / 크림 | `/category-decision?category=moisturizer` |
| `cleanser`    | 클렌저      | `/category-decision?category=cleanser`    |

## 5. 기능 소개 섹션 카피

| 섹션               | Heading                                                    | Body                                                                                              |
| ------------------ | ---------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| Priority Gate      | 제품을 고르기 전에, 지금 사도 되는 상태인지 먼저 확인해요. | 최근 자극, 선크림 사용, 클렌징, 밤 루틴, 침구/도구 위생을 확인해 새 제품을 사야 할지 알려줍니다.  |
| Context            | 제품마다 점검할 기준이 다릅니다.                           | 립밤을 고르는데 피부 타입을 묻지 않고, 선크림을 고를 때는 눈시림, 백탁, 메이크업 궁합을 묻습니다. |
| Product Matrix     | 제품을 끝없이 나열하지 않아요.                             | 좋은 제품의 조건과 개인화 필터를 기준으로 가격대별 추천 후보를 비교합니다.                        |
| Reaction Traceback | 어떤 제품 때문에 뒤집어졌는지 모르겠다면                   | 문제 상품과 괜찮았던 상품을 함께 등록해 원인 후보 성분군을 추측합니다.                            |

## 6. Concern Mapper

### Heading

고민부터 시작해도 돼요

### Subtitle

어떤 제품이 필요한지 몰라도 괜찮아요.  
고민 유형을 고르면 무엇을 먼저 점검해야 하는지부터 정리해드려요.

### Concern Group

| group_key          | 라벨          | 태그                                                            |
| ------------------ | ------------- | --------------------------------------------------------------- |
| `acute_trouble`    | 일회성 트러블 | 뾰루지, 여드름, 붉어짐, 뒤집힘, 트러블 반복, 민감 반응          |
| `daily_discomfort` | 일상 불편     | 건조, 당김, 각질, 번들거림, 눈가 건조, 입술 트임                |
| `makeup`           | 화장 / 꾸미기 | 화장 뜸, 밀림, 쿠션 추천, 파운데이션 고민, 선크림 추천, 립 제품 |
| `complex`          | 컴플렉스      | 잡티, 다크서클, 홍조, 모공, 피부톤, 탄력                        |

### Concern Routing Preset

| concern         | route_target        | preset_facts                                                                  | suggested_category | suggested_filters                                         |
| --------------- | ------------------- | ----------------------------------------------------------------------------- | ------------------ | --------------------------------------------------------- |
| 뾰루지          | `priority_gate`     | `flow.concern = acne_spot`                                                    | `serum`            | `low_irritation`, `acne_fit`                              |
| 여드름          | `priority_gate`     | `flow.concern = acne`                                                         | `cleanser`         | `mild_ph`, `low_sls`, `non_comedogenic`                   |
| 붉어짐          | `priority_gate`     | `flow.concern = redness`<br>`life.recent_irritation = true 후보`              | `toner`            | `low_irritation`, `mild_ph`, `no_fragrance`               |
| 뒤집힘          | `priority_gate`     | `flow.concern = breakout_reaction`<br>`life.recent_irritation = true 후보`    | `moisturizer`      | `barrier_ingredients`, `low_irritation`, `no_fragrance`   |
| 트러블 반복     | `priority_gate`     | `flow.concern = recurring_trouble`                                            | `cleanser`         | `mild_ph`, `low_sls`, `non_comedogenic`                   |
| 민감 반응       | `priority_gate`     | `flow.concern = sensitivity_reaction`<br>`life.recent_irritation = true 후보` | `moisturizer`      | `barrier_ingredients`, `low_irritation`, `no_fragrance`   |
| 건조            | `priority_gate`     | `flow.concern = dryness`<br>`routine.recent_dry_tight = true 후보`            | `moisturizer`      | `triple_moisture`, `barrier_ingredients`                  |
| 당김            | `priority_gate`     | `flow.concern = tightness`<br>`routine.recent_dry_tight = true 후보`          | `moisturizer`      | `triple_moisture`, `barrier_ingredients`                  |
| 각질            | `priority_gate`     | `flow.concern = flaky_texture`<br>`routine.recent_dry_tight = true 후보`      | `toner`            | `low_irritation`, `mild_ph`, `gentle_exfoliation`         |
| 번들거림        | `priority_gate`     | `flow.concern = oiliness`                                                     | `toner`            | `oil_control`, `low_irritation`, `mild_ph`                |
| 눈가 건조       | `priority_gate`     | `flow.concern = eye_area_dryness`<br>`routine.recent_dry_tight = true 후보`   | `moisturizer`      | `high_hydration`, `barrier_ingredients`, `low_irritation` |
| 입술 트임       | `category_decision` | `flow.concern = lip_chapped`<br>`context.lip_severity = true 후보`            | `lipcare`          | `high_moisture`, `no_menthol`                             |
| 화장 뜸         | `category_decision` | `flow.concern = makeup_floating`<br>`context.makeup_use = true 후보`          | `moisturizer`      | `makeup_compat_good`, `low_sticky`                        |
| 밀림            | `category_decision` | `flow.concern = pilling`<br>`context.makeup_use = true 후보`                  | `sunscreen`        | `makeup_compat_good`, `low_sticky`                        |
| 쿠션 추천       | `category_decision` | `flow.concern = cushion_help`<br>`context.makeup_use = true 후보`             | `moisturizer`      | `makeup_compat_good`, `low_sticky`, `high_hydration`      |
| 파운데이션 고민 | `category_decision` | `flow.concern = foundation_help`<br>`context.makeup_use = true 후보`          | `moisturizer`      | `makeup_compat_good`, `low_sticky`, `high_hydration`      |
| 선크림 추천     | `category_decision` | `flow.concern = sunscreen_need`                                               | `sunscreen`        | `spf_50_plus`, `pa_4_plus`                                |
| 립 제품         | `category_decision` | `flow.concern = lipcare_need`                                                 | `lipcare`          | `high_moisture`, `balanced_moisture`                      |
| 잡티            | `priority_gate`     | `flow.concern = pigmentation`                                                 | `serum`            | `effective_dose`, `clear_purpose`, `morning_use`          |
| 다크서클        | `priority_gate`     | `flow.concern = dark_circle`                                                  | `serum`            | `low_irritation`, `clear_purpose`, `effective_dose`       |
| 홍조            | `priority_gate`     | `flow.concern = redness_chronic`<br>`life.recent_irritation = true 후보`      | `serum`            | `low_irritation`, `no_fragrance`, `calming_fit`           |
| 모공            | `priority_gate`     | `flow.concern = pore`                                                         | `serum`            | `clear_purpose`, `pore_fit`, `low_irritation`             |
| 피부톤          | `priority_gate`     | `flow.concern = tone`                                                         | `serum`            | `effective_dose`, `clear_purpose`, `morning_use`          |
| 탄력            | `priority_gate`     | `flow.concern = elasticity`                                                   | `serum`            | `effective_dose`, `clear_purpose`, `night_use`            |

`preset_facts`는 확정 답변이 아니라 초기 선택 상태와 우선 질문 노출 조건이다. 이후 사용자가 직접 답한 Priority Gate / Context 답변이 최종값으로 취급된다.

### 클릭 처리

| 단계 | 처리                                                                                                                              |
| ---- | --------------------------------------------------------------------------------------------------------------------------------- |
| 1    | `session_events.event_name = concern_clicked` 저장                                                                                |
| 2    | `user_responses.flow.concern` 저장 (`question_id=<flow.concern>`, `question_variant_id=null`)                                     |
| 3    | preset responses를 `source = concern`인 초기 선택 상태로 저장하거나 프론트 상태에 유지                                            |
| 4    | `route_target = priority_gate`면 `/priority-gate`로 이동하고 관련 질문을 우선 노출                                                |
| 5    | `route_target = category_decision`면 `category.selected = suggested_category`를 seed한 뒤 `/category-decision`으로 이동           |
| 6    | `suggested_filters`는 즉시 `question_filter_mappings`를 만들지 않고, 최종 category가 일치할 때만 `CONCERN_PRESET` 힌트로 반영 |

---

# S02 — Priority Gate

## 1. 화면 제목

### Heading

지금 새 제품을 사도 되는 상태인지 먼저 확인해요

### Subtitle

최근 피부 상태와 사용 중인 제품을 알려주시면,  
무엇부터 정리해야 할지 알려드릴게요.

## 2. Box 1 — Life / 루틴 체크리스트

| #   | fact_key                          | 질문                                                                          | input_type    | options                                                                |
| --- | --------------------------------- | ----------------------------------------------------------------------------- | ------------- | ---------------------------------------------------------------------- |
| 1   | `life.recent_irritation`          | 최근 따가움, 붉어짐, 가려움 같은 문제가 있나요?                               | BOOLEAN       | 예 / 아니오                                                            |
| 2   | `life.outdoor_activity`           | 하루 기준, 낮에 밖에 있는 시간은 어느 정도인가요?                             | SINGLE_SELECT | `under_1h` / `1_3h` / `over_3h`                                        |
| 3   | `routine.sunscreen_frequency`     | 외출할 때 선크림을 바르나요?                                                  | SINGLE_SELECT | `daily (외출할 때 거의 항상)` / `sometimes` / `rarely` / `never`       |
| 4   | `routine.sunscreen_reapply`       | 선크림을 가지고 다니면서 덧바르나요?                                          | BOOLEAN       | 예 / 아니오                                                            |
| 5   | `routine.cleansing_stable`        | 선크림이나 메이크업을 지울 때 1차 세안 제품(오일/밤/워터/패드)을 따로 쓰나요? | BOOLEAN       | 예 / 아니오                                                            |
| 6   | `routine.foam_enough`             | 클렌징 폼을 쓸 때 거품을 충분히 내서 쓰는 편인가요?                           | BOOLEAN       | 예 / 아니오                                                            |
| 7   | `routine.eye_irritation_history`  | 화장이나 세안 중 눈이 따갑거나 눈에 들어가는 경험이 자주 있나요?              | BOOLEAN       | 예 / 아니오                                                            |
| 8   | `routine.recent_dry_tight`        | 세안 후 당김, 건조, 따가움 같은 문제가 있나요?                                | BOOLEAN       | 예 / 아니오                                                            |
| 9   | `routine.makeup_frequent`         | 선크림 위에 베이스 메이크업을 자주 올리는 편인가요?                           | BOOLEAN       | 예 / 아니오                                                            |
| 10  | `routine.brush_wash_cycle`        | 브러시 세척한 지 얼마나 됐나요?                                               | SINGLE_SELECT | `under_1_week` / `1_to_2_weeks` / `over_2_weeks` / `not_applicable`    |
| 11  | `routine.puff_age`                | 퍼프는 산 지 얼마나 됐나요?                                                   | SINGLE_SELECT | `under_1_month` / `1_to_3_months` / `over_3_months` / `not_applicable` |
| 12  | `routine.pillowcase_change_cycle` | 배갯잎은 마지막으로 바꾼 지 얼마나 됐나요?                                    | SINGLE_SELECT | `under_3_days` / `3_to_7_days` / `over_7_days` / `not_sure`            |
| 13  | `routine.morning_face_condition`  | 아침에 일어났을 때 얼굴 상태는 어떤 편인가요?                                 | SINGLE_SELECT | `comfortable` / `oily_sticky` / `dry_tight` / `new_bumps`              |
| 14  | `routine.bedtime_routine`         | 잠들기 전에 스킨케어 루틴을 하고 자는 편인가요?                               | BOOLEAN       | 예 / 아니오                                                            |
| 15  | `routine.cleansing_before_sleep`  | 잠들기 전에 세안은 하고 자는 편인가요?                                        | BOOLEAN       | 예 / 아니오                                                            |
| 16  | `flow.current_concern`            | 지금 가장 해결하고 싶은 고민은 무엇인가요?                                    | SINGLE_SELECT | 트러블 / 건조 / 잡티 / 주름 / 모공 / 입술 / 기타                       |

Concern preset으로 진입한 경우에는 관련 질문을 먼저 보여준다.  
예: `acne`, `recurring_trouble`, `breakout_reaction`, `sensitivity_reaction`은 `life.recent_irritation`, `routine.cleansing_stable`, `routine.eye_irritation_history`, `routine.cleansing_before_sleep`, `routine.pillowcase_change_cycle`, `routine.morning_face_condition`을 먼저 확인하고, `dryness`, `tightness`, `flaky_texture`는 `routine.recent_dry_tight`, `life.outdoor_activity`, `routine.sunscreen_frequency`, `routine.bedtime_routine`을 먼저 확인한다.

## 3. Box 2 — 사용 중인 Skin Care 제품

`product.owned_categories`에 MULTI_ENUM으로 저장한다.

| value           | 라벨                    | 역할 그룹       |
| --------------- | ----------------------- | --------------- |
| `cleansing_oil` | 클렌징 오일 / 밤 / 워터 | cleanser_first  |
| `foam_cleanser` | 폼클렌저 / 젤클렌저     | cleanser_second |
| `toner`         | 토너                    | toner           |
| `skin`          | 스킨                    | toner           |
| `toner_pad`     | 토너패드                | toner           |
| `essence`       | 에센스                  | serum           |
| `serum`         | 세럼                    | serum           |
| `ampoule`       | 앰플                    | serum           |
| `lotion`        | 로션                    | moisturizer     |
| `cream`         | 크림                    | moisturizer     |
| `sunscreen`     | 선크림                  | sunscreen       |
| `exfoliator`    | 각질 제거제 / 필링 제품 | active          |
| `retinol`       | 레티놀 제품             | active          |
| `vitamin_c`     | 비타민C 제품            | active          |
| `aha_bha`       | AHA / BHA 제품          | active          |
| `mask_pack`     | 마스크팩                | mask            |
| `lipcare`       | 립케어 제품             | lipcare         |

## 4. Box 3 — 결과 출력

| 영역           | 설명                             |
| -------------- | -------------------------------- |
| 결과 타입 배지 | 보류 / 주의 / 가능 / 제품군 추천 |
| 결과 제목      | Priority Rule 결과 title         |
| 결과 설명      | Priority Rule 결과 description   |
| CTA            | Rule별 CTA                       |

상세 Rule은 `matching_rules_revised.md`의 Priority Gate Matching Rules를 사용한다.

---

# S03 — Category Decision Box 1: 기본 확인

## 1. 화면 제목

### Heading

어떤 상황에서 사용하실 건가요?

### Subtitle

제품군에 맞는 질문만 보여드리고, 답변은 이후 필터에 반영할게요.

## 2. 기본 질문

| #   | fact_key                         | 질문                                      | input_type    | options                                                                                                                                                    | 노출 제품군                                      |
| --- | -------------------------------- | ----------------------------------------- | ------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------ |
| 1   | `context.skin_type`              | 피부 타입에 가장 가까운 것은 무엇인가요?  | SINGLE_SELECT | `dry` / `oily` / `combination_tzone_oily` / `combination_uzone_dry` / `combination_balanced` / `sensitive` / `normal` / `acne_prone` / `aging` / `unknown` | toner, sunscreen, serum, moisturizer, cleanser   |
| 2   | `context.usage_place`            | 주로 어디서 사용할 건가요?                | SINGLE_SELECT | `indoor` / `outdoor` / `both`                                                                                                                              | sunscreen, lipcare, moisturizer                  |
| 3   | `context.usage_time`             | 이 제품을 주로 언제 바를 예정인가요?      | SINGLE_SELECT | `morning (출근 전)` / `night (퇴근 후)` / `both (아침/저녁 둘 다)`                                                                                         | toner, sunscreen, serum, moisturizer, cleanser   |
| 4   | `context.portable`               | 외출 시 들고 다니며 사용할 예정인가요?    | BOOLEAN       | 예 / 아니오                                                                                                                                                | sunscreen, lipcare                               |
| 5   | `preference.fragrance_sensitive` | 향이 강한 제품이 불편한가요?              | BOOLEAN       | 예 / 아니오                                                                                                                                                | all                                              |
| 6   | `preference.alcohol_sensitive`   | 알코올감이 있는 제품이 불편한가요?        | BOOLEAN       | 예 / 아니오                                                                                                                                                | toner, sunscreen, serum, moisturizer, cleanser   |
| 7   | `context.avoid_texture`          | 피하고 싶은 사용감이 있나요?              | MULTI_SELECT  | 끈적임 / 답답함 / 무거움 / 건조함 / 화한 느낌 / 없음                                                                                                       | sunscreen, serum, moisturizer, cleanser, lipcare |
| 8   | `context.past_failure`           | 이전에 불편했던 사용감이나 성분이 있나요? | TAG           | 향 / 화한 느낌 / 따가움 / 백탁 / 눈시림 / 밀림 / 없음                                                                                                      | all                                              |

## 3. 노출 원칙

| 원칙                                                      | 설명                       |
| --------------------------------------------------------- | -------------------------- |
| 립케어에는 피부 타입 질문을 노출하지 않음                 | 입술 상태와 사용 상황 중심 |
| 선크림에는 눈시림, 백탁, 메이크업 궁합을 별도 질문        | 사용감과 차단 기준 중요    |
| 세럼에는 병행 성분과 최근 자극을 별도 질문                | 활성 성분 충돌 중요        |
| 클렌저에는 메이크업 제거력과 세안 후 당김을 별도 질문     | 세정력과 자극 균형 중요    |
| 보습제에는 보습 3요소와 메이크업 전 사용 여부를 별도 질문 | 장벽과 레이어링 중요       |

---

# S04 — Category Decision Box 2: 카테고리 기준

## 1. 동적 헤더

| category      | Heading                        |
| ------------- | ------------------------------ |
| `toner`       | 토너 고를 때 봐야 할 것        |
| `sunscreen`   | 선크림 고를 때 봐야 할 것      |
| `serum`       | 세럼 고를 때 봐야 할 것        |
| `lipcare`     | 립케어 고를 때 봐야 할 것      |
| `moisturizer` | 로션 / 크림 고를 때 봐야 할 것 |
| `cleanser`    | 클렌저 고를 때 봐야 할 것      |

## 2. Toner 질문

| #   | fact_key                        | 질문                                                | input_type | options     |
| --- | ------------------------------- | --------------------------------------------------- | ---------- | ----------- |
| 1   | `context.exfoliation_sensitive` | 각질 케어 제품을 쓰면 따갑거나 건조해지는 편인가요? | BOOLEAN    | 예 / 아니오 |
| 2   | `context.oil_control_need`      | 번들거림이나 피지 조절이 필요하신가요?              | BOOLEAN    | 예 / 아니오 |
| 3   | `context.daily_use`             | 매일 아침저녁으로 사용할 제품을 찾고 있나요?        | BOOLEAN    | 예 / 아니오 |
| 4   | `context.acne_prone`            | 모공 막힘이나 트러블을 경험한 적이 있나요?          | BOOLEAN    | 예 / 아니오 |

## 3. Sunscreen 질문

| #   | fact_key                        | 질문                                                  | input_type    | options                         |
| --- | ------------------------------- | ----------------------------------------------------- | ------------- | ------------------------------- |
| 1   | `life.outdoor_activity`         | 하루 기준, 낮에 밖에 있는 시간은 어느 정도인가요?     | SINGLE_SELECT | `under_1h` / `1_3h` / `over_3h` |
| 2   | `context.eye_sting`             | 선크림을 바르면 눈이 시린 편인가요?                   | BOOLEAN       | 예 / 아니오                     |
| 3   | `context.white_cast_sensitive`  | 백탁이 있으면 사용하기 어려운가요?                    | BOOLEAN       | 예 / 아니오                     |
| 4   | `context.sunscreen_skip_reason` | 끈적임이나 답답함 때문에 선크림을 생략한 적이 있나요? | BOOLEAN       | 예 / 아니오                     |
| 5   | `context.makeup_use`            | 선크림 위에 베이스 메이크업을 덧바르나요?             | BOOLEAN       | 예 / 아니오                     |
| 6   | `context.touch_up`              | 선크림을 가지고 다니면서 덧바를 계획인가요?           | BOOLEAN       | 예 / 아니오                     |
| 7   | `context.water_sweat_exposure`  | 수영, 운동, 땀 나는 활동이 있나요?                    | BOOLEAN       | 예 / 아니오                     |

## 4. Serum 질문

| #   | fact_key                      | 질문                                                 | input_type    | options                                                                                   |
| --- | ----------------------------- | ---------------------------------------------------- | ------------- | ----------------------------------------------------------------------------------------- |
| 1   | `context.serum_purpose`       | 세럼으로 해결하고 싶은 고민은 무엇인가요?            | SINGLE_SELECT | `brightening` / `anti_aging` / `calming` / `pore_care` / `acne` / `hydration` / `barrier` |
| 2   | `life.recent_irritation`      | 최근 따가움, 붉어짐, 가려움 같은 문제가 있었나요?    | BOOLEAN       | 예 / 아니오                                                                               |
| 3   | `product.owned_actives`       | 현재 레티놀, 비타민C, AHA/BHA 제품을 사용 중인가요?  | MULTI_SELECT  | `retinol` / `vitamin_c` / `aha` / `bha` / `none`                                          |
| 4   | `context.usage_time`          | 언제 사용할 제품인가요?                              | SINGLE_SELECT | `morning (출근 전)` / `night (퇴근 후)` / `both (아침/저녁 둘 다)`                        |
| 5   | `context.expectation_speed`   | 빠른 변화보다 천천히 안정적인 변화를 원하나요?       | BOOLEAN       | 예 / 아니오                                                                               |
| 6   | `routine.sunscreen_frequency` | 세럼을 쓰는 날, 외출할 때 선크림까지 바를 수 있나요? | SINGLE_SELECT | `daily (대부분 가능)` / `sometimes` / `rarely` / `never`                                  |

## 5. Lipcare 질문

| #   | fact_key                         | 질문                                         | input_type    | options                                                |
| --- | -------------------------------- | -------------------------------------------- | ------------- | ------------------------------------------------------ |
| 1   | `context.lip_severity`           | 입술 갈라짐이나 벗겨짐이 반복되나요?         | BOOLEAN       | 예 / 아니오                                            |
| 2   | `preference.menthol_sensitive`   | 화한 립밤을 쓰면 불편한가요?                 | BOOLEAN       | 예 / 아니오                                            |
| 3   | `preference.fragrance_sensitive` | 향이 강한 립 제품이 불편한가요?              | BOOLEAN       | 예 / 아니오                                            |
| 4   | `context.lip_reapply`            | 자주 덧바르기 어려운 상황인가요?             | BOOLEAN       | 예 / 아니오                                            |
| 5   | `context.lip_outdoor`            | 야외에서 사용할 립케어가 필요한가요?         | BOOLEAN       | 예 / 아니오                                            |
| 6   | `context.lip_form`               | 선호하는 형태가 있나요?                      | SINGLE_SELECT | `stick` / `tube` / `balm` / `mask` / `essence` / `any` |
| 7   | `context.lip_night_care`         | 밤에 두껍게 바르는 집중 케어가 필요하신가요? | BOOLEAN       | 예 / 아니오                                            |

## 6. Moisturizer 질문

| #   | fact_key                     | 질문                                                     | input_type    | options                                                                                                                                                                                            |
| --- | ---------------------------- | -------------------------------------------------------- | ------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | `context.moisturizer_goal`   | 로션/크림에서 가장 먼저 해결하고 싶은 상황은 무엇인가요? | SINGLE_SELECT | `hydration (세안 후 당김 줄이기)` / `barrier (예민함 진정)` / `oil_control (번들거림 줄이기)` / `makeup_base (메이크업 전에 가볍게)` / `winter_rich (겨울철 진한 보습)` / `anti_aging (탄력 보조)` |
| 2   | `routine.recent_dry_tight`   | 세안 후 당김이나 건조가 자주 있나요?                     | BOOLEAN       | 예 / 아니오                                                                                                                                                                                        |
| 3   | `context.prefer_lightweight` | 무겁거나 답답한 크림이 불편한가요?                       | BOOLEAN       | 예 / 아니오                                                                                                                                                                                        |
| 4   | `context.makeup_use`         | 보습제 위에 베이스 메이크업을 하나요?                    | BOOLEAN       | 예 / 아니오                                                                                                                                                                                        |
| 5   | `context.acne_prone`         | 모공 막힘이나 트러블을 경험한 적이 있나요?               | BOOLEAN       | 예 / 아니오                                                                                                                                                                                        |
| 6   | `context.season`             | 주로 어느 계절에 사용할 제품인가요?                      | SINGLE_SELECT | `spring` / `summer` / `autumn` / `winter` / `all_season`                                                                                                                                           |
| 7   | `context.moisturizer_form`   | 선호하는 제형이 있나요?                                  | SINGLE_SELECT | `lotion` / `gel_cream` / `water_cream` / `cream` / `any`                                                                                                                                           |

## 7. Cleanser 질문

| #   | fact_key                         | 질문                                                 | input_type    | options                                                               |
| --- | -------------------------------- | ---------------------------------------------------- | ------------- | --------------------------------------------------------------------- |
| 1   | `context.cleanser_usage`         | 언제 사용할 클렌저인가요?                            | SINGLE_SELECT | `morning (출근 전)` / `night (퇴근 후)` / `both (아침/저녁 둘 다)`    |
| 2   | `context.makeup_sunscreen_level` | 평소 지우는 제품은 어느 정도인가요?                  | SINGLE_SELECT | `none` / `sunscreen` / `light_makeup` / `heavy_makeup` / `waterproof` |
| 3   | `routine.cleansing_stable`       | 현재 1차 세안 제품(오일/밤/워터/패드)을 따로 쓰나요? | BOOLEAN       | 예 / 아니오                                                           |
| 4   | `routine.recent_dry_tight`       | 세안 후 당김, 건조, 따가움이 자주 있나요?            | BOOLEAN       | 예 / 아니오                                                           |
| 5   | `context.scrub_sensitive`        | 알갱이 스크럽이나 강한 세안감이 불편한가요?          | BOOLEAN       | 예 / 아니오                                                           |
| 6   | `context.cleanser_form`          | 선호하는 클렌저 형태가 있나요?                       | SINGLE_SELECT | `foam` / `gel` / `oil` / `balm` / `water` / `cream` / `milk` / `any`  |
| 7   | `context.double_cleanse_needed`  | 세안을 두 번에 나눠서 할 수 있나요?                  | BOOLEAN       | 예 / 아니오                                                           |

---

# S05 — Category Decision Box 3: 판단 결과

## 1. 출력 구조

| 영역           | 설명                                      |
| -------------- | ----------------------------------------- |
| 결과 요약      | 입력 조건을 1~3문장으로 요약              |
| 자동 적용 필터 | Product Matrix 진입 시 선택될 filter chip |
| 상위 제품 후보 | 현재 조건으로 미리 조회한 3~5개 제품      |
| CTA            | Product Matrix로 이동                     |

## 2. 메시지 노출 원칙

| 원칙      | 설명                                                     |
| --------- | -------------------------------------------------------- |
| 최대 노출 | 3개 메시지                                               |
| 우선순위  | 자극/안전 > 루틴 안정 > 제품군 핵심 기준 > 사용감 > 예산 |
| 중복 제거 | 같은 의미의 메시지는 하나만 표시                         |
| CTA       | 항상 Product Matrix로 연결                               |

## 3. 대표 메시지

| 조건                                                           | 메시지                                                                   |
| -------------------------------------------------------------- | ------------------------------------------------------------------------ |
| `context.skin_type = sensitive`                                | 민감한 피부 기준으로 향료, 알코올, 자극 가능성을 낮게 잡아요.            |
| `context.eye_sting = true`                                     | 눈시림 위험이 높은 선크림은 제외해요.                                    |
| `context.white_cast_sensitive = true`                          | 백탁이 강한 선크림은 제외하거나 주의 태그를 붙여요.                      |
| `product.owned_actives` 포함                                   | 세럼은 병행 주의 성분을 확인한 뒤 후보를 줄여요.                         |
| `context.lip_severity = true`                                  | 립케어는 보습 지속력과 보호막 형성을 우선해요.                           |
| `preference.menthol_sensitive = true`                          | 멘톨이나 화한 성분이 있는 립케어는 제외해요.                             |
| `routine.recent_dry_tight = true`                              | 당김이 반복되면 수분 공급보다 장벽과 수분 잠금까지 같이 봐야 해요.       |
| `context.makeup_sunscreen_level IN [heavy_makeup, waterproof]` | 진한 메이크업이나 워터프루프 제품은 세정력과 이중 세안 역할을 같이 봐요. |

전체 메시지 조건은 `matching_rules_revised.md`의 Category Decision Result Message Rules를 사용한다.

## 4. 제품 카드

| 영역   | 데이터                |
| ------ | --------------------- |
| 이미지 | `products.image_url`  |
| 브랜드 | `brands.name`         |
| 제품명 | `products.name`       |
| 가격   | `products.price`      |
| 가격대 | `products.price_band` |
| 적합도 | ✓ 적합 / △ 주의       |
| 태그   | 적용 필터 중 최대 3개 |

## 5. CTA

| 라벨          | 동작                                                        |
| ------------- | ----------------------------------------------------------- |
| 제품 보러가기 | `/product-matrix?category=<category_key>&filter_state=<id>` |

---

# S06 — Product Matrix

## 1. 제품군 Select

| value         | 라벨        |
| ------------- | ----------- |
| `toner`       | 토너        |
| `sunscreen`   | 선크림      |
| `serum`       | 세럼        |
| `lipcare`     | 립케어      |
| `moisturizer` | 로션 / 크림 |
| `cleanser`    | 클렌저      |

## 2. BASIC_CONDITION 태그

| category      | filter_key            | 표시 라벨         | 기준                                                      |
| ------------- | --------------------- | ----------------- | --------------------------------------------------------- |
| `toner`       | `hydrating_toner`     | 수분 공급         | `hydration_level IN [medium, high]`                       |
| `toner`       | `low_irritation`      | 저자극            | `irritation_risk = low`                                   |
| `toner`       | `mild_ph`             | 약산성            | `ph >= 4.5 AND ph <= 6.0`                                 |
| `sunscreen`   | `spf_50_plus`         | SPF 50 이상       | `spf >= 50`                                               |
| `sunscreen`   | `pa_4_plus`           | PA++++            | `pa = ++++`                                               |
| `sunscreen`   | `broad_spectrum`      | 광범위 차단       | `broad_spectrum = true`                                   |
| `sunscreen`   | `eye_sting_low`       | 눈시림 낮음       | `eye_sting IN [none, low]`                                |
| `sunscreen`   | `white_cast_low`      | 백탁 적음         | `white_cast IN [none, low]`                               |
| `sunscreen`   | `makeup_compat_good`  | 메이크업 궁합     | `makeup_compatibility = good`                             |
| `serum`       | `effective_dose`      | 유효 함량 충족    | `effective_dose_met = true`                               |
| `serum`       | `low_irritation`      | 자극 가능성 낮음  | `irritation_risk = low`                                   |
| `serum`       | `clear_purpose`       | 목적 성분 명확    | 성분/목적 둘 다 존재                                      |
| `lipcare`     | `high_moisture`       | 보습 지속력 높음  | `moisture_lasting = high`                                 |
| `lipcare`     | `balanced_moisture`   | 보습+보호 균형    | `humectant_level >= medium AND occlusive_level >= medium` |
| `lipcare`     | `no_menthol`          | 멘톨 없음         | `menthol = false`                                         |
| `lipcare`     | `low_fragrance`       | 향료 적음         | `fragrance = false`                                       |
| `moisturizer` | `barrier_ingredients` | 장벽 성분         | `barrier_repair IN [medium, high]` 또는 장벽 성분 포함    |
| `moisturizer` | `triple_moisture`     | 다층 보습         | 습윤제+유연제+교착제 모두 medium 이상                     |
| `moisturizer` | `mild_ph`             | 약산성            | `ph >= 5.0 AND ph <= 6.0`                                 |
| `moisturizer` | `low_irritation`      | 저자극            | `irritation_risk = low`                                   |
| `cleanser`    | `mild_ph`             | 약산성            | `ph >= 5.0 AND ph <= 6.5`                                 |
| `cleanser`    | `low_sls`             | 저자극 계면활성제 | `sulfate_free = true`                                     |
| `cleanser`    | `low_irritation`      | 저자극            | `irritation_risk = low`                                   |

## 3. PERSONALIZED 필터

| source fact                                   | category                    | filter_key                 | 표시 라벨        |
| --------------------------------------------- | --------------------------- | -------------------------- | ---------------- |
| `context.skin_type = oily`                    | toner                       | `oil_control`              | 피지 조절        |
| `flow.concern = flaky_texture`                | toner                       | `gentle_exfoliation`       | 각질 케어        |
| `context.eye_sting = true`                    | sunscreen                   | `no_eye_sting`             | 눈시림 회피      |
| `context.white_cast_sensitive = true`         | sunscreen                   | `no_white_cast`            | 백탁 회피        |
| `context.sunscreen_skip_reason = true`        | sunscreen                   | `low_sticky`               | 끈적임 낮음      |
| `context.water_sweat_exposure = true`         | sunscreen                   | `water_resistant`          | 물·땀 저항       |
| `context.serum_purpose = brightening`         | serum                       | `brightening_fit`          | 브라이트닝       |
| `context.serum_purpose = anti_aging`          | serum                       | `anti_aging_fit`           | 주름·탄력        |
| `context.usage_time = morning`                | serum                       | `morning_use`              | 아침 사용        |
| `product.owned_actives CONTAINS retinol`      | serum                       | `retinol_conflict_caution` | 레티놀 병행 주의 |
| `context.lip_severity = true`                 | lipcare                     | `high_moisture`            | 보습 지속력      |
| `preference.menthol_sensitive = true`         | lipcare                     | `no_menthol_sensitive`     | 멘톨 회피        |
| `context.lip_outdoor = true`                  | lipcare                     | `spf_included`             | SPF 포함         |
| `routine.recent_dry_tight = true`             | moisturizer                 | `triple_moisture`          | 다층 보습        |
| `context.prefer_lightweight = true`           | moisturizer                 | `lightweight`              | 가벼운 제형      |
| `context.acne_prone = true`                   | moisturizer                 | `non_comedogenic`          | 논코메도제닉     |
| `context.makeup_sunscreen_level = waterproof` | cleanser                    | `waterproof_makeup`        | 워터프루프 세정  |
| `routine.recent_dry_tight = true`             | cleanser                    | `moist_after_feel`         | 당김 적음        |
| `context.scrub_sensitive = true`              | cleanser                    | `no_physical_scrub`        | 스크럽 회피      |
| `preference.fragrance_sensitive = true`       | all                         | `no_fragrance`             | 향료 회피        |
| `preference.alcohol_sensitive = true`         | all except lipcare optional | `no_alcohol`               | 알코올 회피      |

상세 mapping row는 `matching_rules_revised.md`의 Product Filter Mapping Seed를 사용한다.

## 4. 가격대

| price_band            | 라벨    | 범위                |
| --------------------- | ------- | ------------------- |
| `UNDER_20000`         | ~2만원  | 0원 ~ 19,999원      |
| `BETWEEN_20000_50000` | 2~5만원 | 20,000원 ~ 49,999원 |
| `OVER_50000`          | 5만원+  | 50,000원 이상       |

## 5. 적합도 배지

| 조건                                     | 배지   | 노출               |
| ---------------------------------------- | ------ | ------------------ |
| HARD_FILTER 모두 통과 + CAUTION 0개      | ✓ 적합 | 노출               |
| HARD_FILTER 모두 통과 + CAUTION 1개 이상 | △ 주의 | 노출               |
| HARD_FILTER 1개 이상 미통과              | ✕ 비추 | 기본 목록에서 제거 |

## 6. 빈 상태 카피

| 상황          | 메시지                                                                              |
| ------------- | ----------------------------------------------------------------------------------- |
| 필터 결과 0건 | 조건에 맞는 제품이 없어요. 필터를 한두 개 줄여보시거나, 다른 가격대를 확인해보세요. |
| 제품 없음     | 곧 제품이 추가될 예정이에요. 다른 제품군을 확인해보세요.                            |
| 가격대만 0건  | 이 가격대에는 조건에 맞는 제품이 없어요. 전체 가격대로 다시 볼 수 있어요.           |

---

# S07 — Product Detail

## 1. 콘텐츠 슬롯

| 슬롯                      | 타입                                    |
| ------------------------- | --------------------------------------- |
| 제품 기본 정보            | 🔗 `products`, `brands`                 |
| 적합도 배지 + 사유        | 📐 Matching Rule                        |
| BASIC_CONDITION 충족 표시 | 📐 Matching Rule                        |
| PERSONALIZED 매칭 표시    | 📐 Matching Rule                        |
| 제품군별 attribute 요약   | 🔗 `products.attributes`                |
| 전성분 표                 | 🔗 `ingredients`, `product_ingredients` |
| 주의 성분 하이라이트      | 📐 `avoidance_rules`                    |
| 구매 링크                 | 🔗 `products.purchase_url`              |
| Disclaimer                | 정적                                    |

## 2. 적합도 사유 문구

| 상태           | 문구                                                          |
| -------------- | ------------------------------------------------------------- |
| ✓ 적합         | 회원님 조건에 잘 맞는 제품이에요. 충족한 조건을 확인해보세요. |
| △ 주의         | 다음 조건은 확인하고 사용하세요.                              |
| TRACEBACK 주의 | 회원님의 회피/주의 목록과 관련된 성분이 있어요.               |

## 3. 카테고리별 attribute 요약

| category      | 노출 항목                                                          |
| ------------- | ------------------------------------------------------------------ |
| `toner`       | 사용법, 목적, 수분감, 각질 타입, pH, 향료/알코올 여부              |
| `sunscreen`   | SPF, PA, 필터 타입, 눈시림, 백탁, 끈적임, 메이크업 궁합            |
| `serum`       | 목적 성분, 타겟 고민, 유효 함량, 자극 가능성, 사용 시간, 병행 주의 |
| `lipcare`     | 보습 지속력, 보습+보호 균형, 멘톨, 향료, SPF, 제형                 |
| `moisturizer` | 보습 3요소, 장벽, 유분감, 제형, 끈적임, 메이크업 궁합              |
| `cleanser`    | 제형, 세정력, pH, 설페이트, 세안 후 느낌, 메이크업 제거력          |

## 4. Disclaimer

추천은 회원님이 입력한 조건과 제품 데이터를 기반으로 자동 계산됩니다.  
피부 반응은 개인차가 있으니 참고용으로 활용하세요.  
성분에 알레르기가 있다면 사용 전 반드시 확인하세요.

---

# S08 — Reaction Traceback

## 1. 화면 제목

### Heading

어떤 성분이 문제였을까요?

### Subtitle

문제 있었던 제품과 괜찮았던 제품을 함께 등록하면,  
공통 성분과 차이점을 비교해 원인 후보를 알려드려요.

## 2. 등록 CTA

| 라벨               | 타입      |
| ------------------ | --------- |
| + 문제 상품 등록   | `PROBLEM` |
| + 괜찮은 상품 등록 | `OK`      |

## 3. 반응 기록 입력

| field            | input_type    | options                                                        |
| ---------------- | ------------- | -------------------------------------------------------------- |
| `symptoms`       | MULTI_SELECT  | 가려움 / 따가움 / 붉어짐 / 뾰루지 / 부어오름 / 건조 / 따끔거림 |
| `affected_areas` | MULTI_SELECT  | 이마 / 볼 / 코 / 입가 / 턱 / 눈가 / 전체                       |
| `onset_timing`   | SINGLE_SELECT | 즉시 / 1시간 이내 / 당일 / 다음 날 / 며칠 후                   |
| `memo`           | TEXTAREA      | 자유 입력                                                      |

## 4. 성분 그룹

| ingredient_group.key | 표시 라벨             | 포함 성분 예시                                           |
| -------------------- | --------------------- | -------------------------------------------------------- |
| `fragrance`          | 향료 / Fragrance 계열 | Parfum, Fragrance, Limonene, Linalool                    |
| `essential_oils`     | 에센셜오일 계열       | Lavender Oil, Tea Tree Oil, Rosemary Oil, Peppermint Oil |
| `menthol_cooling`    | 멘톨 / 화한 사용감    | Menthol, Camphor, Eucalyptol, Methyl Lactate             |
| `uv_filters`         | 자외선 차단 필터      | Oxybenzone, Avobenzone, Octocrylene, Octinoxate          |
| `high_dose_actives`  | 고함량 액티브         | Retinol 고함량, Vitamin C 고함량, AHA 고함량             |

## 5. 결과 표시

| 조건                                          | confidence | 표시        |
| --------------------------------------------- | ---------- | ----------- |
| 문제 상품에 있고 괜찮은 상품에는 없음         | HIGH       | 가능성 높음 |
| 문제 상품에 있고 괜찮은 상품보다 더 자주 등장 | MEDIUM     | 가능성 있음 |
| 문제 상품과 괜찮은 상품에 모두 비슷하게 등장  | LOW        | 가능성 낮음 |

## 6. 다음 액션

| 상황               | 카피                                                           | CTA                  |
| ------------------ | -------------------------------------------------------------- | -------------------- |
| 원인 후보 있음     | 이 결과를 회피 목록에 추가하면 다음 제품 추천에 반영돼요.      | 회피 목록에 추가하기 |
| 괜찮은 상품 미등록 | 괜찮았던 상품도 함께 등록하면 더 정확한 원인을 찾을 수 있어요. | 괜찮은 상품 등록 +   |
| 원인 후보 없음     | 현재 등록한 제품만으로는 뚜렷한 차이를 찾기 어려워요.          | 제품 더 등록하기     |

### 확정 진단 아님 명시

이 결과는 등록한 제품의 성분 비교에 기반한 추정이에요.  
실제 알레르기나 피부 질환은 피부과 전문의 진단이 필요합니다.

---

# 부록 A. 추가 Fact Key

| fact_key                          | value_type | 설명                               |
| --------------------------------- | ---------- | ---------------------------------- |
| `context.skin_type`               | ENUM       | 피부 타입                          |
| `preference.alcohol_sensitive`    | BOOLEAN    | 알코올감 민감 여부                 |
| `context.avoid_texture`           | MULTI_ENUM | 피하고 싶은 사용감                 |
| `context.past_failure`            | MULTI_ENUM | 과거 불편 경험                     |
| `routine.sunscreen_reapply`       | BOOLEAN    | 선크림 덧바름 여부                 |
| `routine.foam_enough`             | BOOLEAN    | 클렌징 폼 거품 충분히 사용 여부    |
| `routine.eye_irritation_history`  | BOOLEAN    | 화장/세안 중 눈 자극 경험          |
| `routine.brush_wash_cycle`        | ENUM       | 브러시 마지막 세척 시점            |
| `routine.puff_age`                | ENUM       | 퍼프 사용 기간                     |
| `routine.pillowcase_change_cycle` | ENUM       | 배갯잎 마지막 교체 시점            |
| `routine.morning_face_condition`  | ENUM       | 기상 직후 얼굴 상태                |
| `routine.bedtime_routine`         | BOOLEAN    | 취침 전 스킨케어 루틴 여부         |
| `routine.cleansing_before_sleep`  | BOOLEAN    | 취침 전 세안 여부                  |
| `context.exfoliation_sensitive`   | BOOLEAN    | 각질 케어 자극 민감                |
| `context.oil_control_need`        | BOOLEAN    | 피지 조절 필요                     |
| `context.daily_use`               | BOOLEAN    | 매일 사용 목적                     |
| `context.acne_prone`              | BOOLEAN    | 트러블/모공 막힘 경험              |
| `context.sunscreen_skip_reason`   | BOOLEAN    | 사용감 때문에 선크림 생략 경험     |
| `context.touch_up`                | BOOLEAN    | 덧바르기 필요                      |
| `context.water_sweat_exposure`    | BOOLEAN    | 물·땀 노출 여부                    |
| `context.serum_purpose`           | ENUM       | 세럼 목적 고민                     |
| `product.owned_actives`           | MULTI_ENUM | 사용 중인 액티브 제품              |
| `context.expectation_speed`       | BOOLEAN    | 안정적 변화 선호                   |
| `context.lip_severity`            | BOOLEAN    | 입술 갈라짐 반복                   |
| `context.lip_reapply`             | BOOLEAN    | 자주 덧바르기 어려움               |
| `context.lip_outdoor`             | BOOLEAN    | 야외 립케어 필요                   |
| `context.lip_form`                | ENUM       | 립케어 선호 형태                   |
| `context.lip_night_care`          | BOOLEAN    | 야간 립케어 필요                   |
| `context.moisturizer_goal`        | ENUM       | 보습제에서 먼저 해결하고 싶은 상황 |
| `context.prefer_lightweight`      | BOOLEAN    | 가벼운 제형 선호                   |
| `context.season`                  | ENUM       | 사용 계절                          |
| `context.moisturizer_form`        | ENUM       | 보습제 선호 제형                   |
| `context.cleanser_usage`          | ENUM       | 클렌저 사용 시간                   |
| `context.makeup_sunscreen_level`  | ENUM       | 지워야 할 제품 강도                |
| `context.scrub_sensitive`         | BOOLEAN    | 물리 스크럽 민감                   |
| `context.cleanser_form`           | ENUM       | 클렌저 선호 제형                   |
| `context.double_cleanse_needed`   | BOOLEAN    | 세안을 두 번에 나눠서 할 수 있는지 |
| `flow.concern`                    | ENUM       | Concern Mapper 진입 태그           |

---

# 부록 B. 에러 / 로딩 / 빈 상태 카피

| 상황           | 메시지                                                 |
| -------------- | ------------------------------------------------------ |
| 네트워크 오류  | 일시적인 오류가 발생했어요. 잠시 후 다시 시도해주세요. |
| 필수값 미입력  | 답변을 선택해주세요.                                   |
| 제품 없음      | 조건에 맞는 제품이 없어요. 필터를 줄여보세요.          |
| 검색 결과 없음 | 검색 결과가 없어요. 다른 키워드로 시도해보세요.        |
| 제품 조회 중   | 조건에 맞는 제품을 찾고 있어요...                      |
| 결과 계산 중   | 답변을 정리하고 있어요...                              |
| 원인 분석 중   | 성분을 비교하고 있어요...                              |

---

# 부록 C. 구현 우선순위

| 우선순위 | 작업                                                  |
| -------- | ----------------------------------------------------- |
| P0       | Product Matrix 6개 카테고리 BASIC_CONDITION seed      |
| P0       | `category_attribute_definitions` P0 key 등록          |
| P0       | `product_filter_mappings` BASIC/PERSONALIZED seed     |
| P1       | Priority Gate 13개 Rule seed                          |
| P1       | Category Decision 질문 + visibility condition seed    |
| P1       | Concern route_target + preset_facts 24개 mapping 상수 |
| P2       | Product Detail attribute 요약 UI                      |
| P2       | Reaction Traceback ingredient group seed              |
| P3       | 제품 seed 6개 카테고리 × 최소 6개                     |
