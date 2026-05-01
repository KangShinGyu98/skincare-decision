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
absorption_speed: slow | medium | fast  
irritation_risk: low | medium | high

### Optional

layer_compatibility: good | fair | poor

---

## 2. 선크림

### Core

spf: number  
eye_sting: none | low | medium | high  
white_cast: none | low | medium | high  
texture: light | medium | rich

### Optional

makeup_compatibility: good | fair | poor  
filter_type: physical | chemical | hybrid  
portable: true | false

---

## 3. 에센스 / 세럼 / 앰플

### Core

active_ingredients: [retinol, vitamin_c, niacinamide, peptide, aha, bha, calming]  
irritation_risk: low | medium | high  
conflict_ingredients: [retinol, vitamin_c, aha, bha]  
usage_time: morning | night | both

### Optional

texture: water | gel | oil | cream

---

## 4. 립케어

### Core

moisture_lasting: low | medium | high  
occlusive_level: low | medium | high

### Optional

menthol: true | false  
fragrance: true | false  
form: stick | tube | balm | tint

---

## 5. 로션 / 크림

### Core

hydration_level: low | medium | high  
oiliness: low | medium | high  
texture: light | medium | rich

### Optional

sticky: none | low | medium | high  
absorption_speed: slow | medium | fast

---

## 6. 클렌저

### Core

cleansing_power: low | medium | high  
after_feel: moist | neutral | dry  
irritation_risk: low | medium | high

### Optional

type: foam | gel | oil | balm | water  
ph_level: low | neutral | high

---

## 핵심 원칙

- Core = 필터에 직접 사용
- Optional = 태그 / 정렬 / 보조 판단
- attribute 개수는 제한하지 않는다

---

## 한 줄 정리

> 중요한 건 개수가 아니라  
> "이 attribute가 선택을 바꾸냐"이다
