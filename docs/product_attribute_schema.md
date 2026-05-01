# Product Attributes (MVP)

> 목적: Product Matrix에서 사용할 attribute 정의
> 원칙:
>
> - 개수 제한 없음
> - "선택에 영향 주는 것만" Core로 사용
> - 나머지는 Optional
> - 스킨/토너(toner로 통일), 선크림(sunscreen), 에센스/세럼/앰플(serum), 립케어(lipcare), 로션,크림(moisturizer/보습제), 클렌저(cleanser)

---

## 1. 스킨 / 토너

### Core

hydration_level: low | medium | high
texture: water | viscous
purpose: hydration | exfoliation | balancing
exfoliation_type: none | aha | bha | pha
irritation_risk: low | medium | high
alcohol_free: true | false

### Optional

absorption_speed: slow | medium | fast
layer_compatibility: good | fair | poor
application_method: wipe | press | both
key_ingredients: [hyaluronic_acid, glycerin, niacinamide, witch_hazel, tea_tree, centella, panthenol]

---

## 2. 선크림

### Core

spf: number
pa: PA+ | PA++ | PA+++ | PA++++
filter_type: physical | chemical | hybrid
broad_spectrum: true | false
eye_sting: none | low | medium | high
white_cast: none | low | medium | high
texture: light | medium | rich

### Optional

makeup_compatibility: good | fair | poor
water_resistant: true | false
tone_up: true | false
finish: matte | dewy | natural
portable: true | false

---

## 3. 에센스 / 세럼 / 앰플

### Core

active_ingredients: [retinol, vitamin_c, niacinamide, peptide, hyaluronic_acid, aha, bha, pha, calming, ceramide]
target_concern: brightening | anti_aging | acne | hydration | calming | pore_care | barrier
irritation_risk: low | medium | high
conflict_ingredients: [retinol, vitamin_c, aha, bha]
usage_time: morning | night | both

### Optional

texture: water | gel | oil | cream
concentration_level: low | medium | high
packaging: opaque | transparent
photosensitive: true | false

---

## 4. 립케어

### Core

moisture_lasting: low | medium | high
occlusive_level: low | medium | high
irritation_risk: low | medium | high

### Optional

spf: number
menthol: true | false
fragrance: true | false
form: stick | tube | balm | tint
night_care: true | false
key_ingredients: [shea_butter, hyaluronic_acid, vitamin_e, beeswax, petrolatum]

---

## 5. 로션 / 크림

### Core

hydration_level: low | medium | high
oiliness: low | medium | high
texture: light | medium | rich
barrier_repair: low | medium | high
irritation_risk: low | medium | high

### Optional

sticky: none | low | medium | high
absorption_speed: slow | medium | fast
active_ingredients: [retinol, vitamin_c, niacinamide, peptide, ceramide, hyaluronic_acid, centella]
seasonal_fit: summer | winter | all_season
ingredient_role: humectant | emollient | occlusive | mixed

---

## 6. 클렌저

### Core

cleansing_power: low | medium | high
after_feel: moist | neutral | dry
irritation_risk: low | medium | high
cleanser_type: foam | gel | oil | balm | water | cream
ph_level: acidic | neutral | alkaline

### Optional

exfoliation: none | physical | chemical
double_cleanse_role: first | second | both
active_ingredients: [salicylic_acid, charcoal, ceramide, niacinamide, tea_tree, centella]
sulfate_free: true | false
fragrance: true | false

---

## 공통 매칭 축 (피부 타입 → Core attribute 매핑)

피부 타입은 product attribute가 아니라 **선택 로직의 입력값**이며, 다음과 같이 Core attribute로 매핑된다.

- 건성 → hydration_level: high, oiliness: medium~high, irritation_risk: low
- 지성 → oiliness: low, texture: light, exfoliation_type 활용
- 민감성 → irritation_risk: low, alcohol_free: true, fragrance: false
- 복합성 → hydration_level: medium, oiliness: low~medium
- 여드름성 → active_ingredients에 [bha, niacinamide, tea_tree], 논코메도제닉
- 노화 → active_ingredients에 [retinol, peptide, vitamin_c], barrier_repair: high

---

## 핵심 원칙

- Core = 필터에 직접 사용
- Optional = 태그 / 정렬 / 보조 판단
- attribute 개수는 제한하지 않는다
- 피부 타입은 attribute가 아니라 매칭 로직의 입력값이다

---

## 한 줄 정리

> 중요한 건 개수가 아니라
> "이 attribute가 선택을 바꾸냐"이다
