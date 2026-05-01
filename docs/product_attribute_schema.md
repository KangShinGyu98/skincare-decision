# Product Attribute Schema (MVP)

> 목적: Product Matrix에서 사용할 제품 속성(attribute) 정의  
> 사용 위치: products.attributes (JSONB)

---

## 1. Sunscreen (선크림)

spf: number                # 예: 30, 50, 50+  
pa: "+" | "++" | "+++" | "++++"  

filter_type: physical | chemical | hybrid  

eye_sting: none | low | medium | high  
white_cast: none | low | medium | high  

texture: light | medium | rich  
sticky: none | low | medium | high  

makeup_compatibility: good | fair | poor  

portable: true | false  
fragrance: true | false  

---

## 2. Serum (세럼)

active_ingredients:
- retinol
- vitamin_c
- niacinamide
- peptide
- aha
- bha
- calming

irritation_risk: low | medium | high  

conflict_ingredients:
- retinol
- vitamin_c
- aha
- bha

usage_time: morning | night | both  
effect_timeline: fast | gradual  

texture: water | gel | oil | cream  

fragrance: true | false  

---

## 3. Lipcare (립케어)

menthol: true | false  
fragrance: true | false  

spf: number        # 없으면 0  

moisture_lasting: low | medium | high  

form: stick | tube | balm | tint  

portable: true | false  

---

## 4. Moisturizer (로션 / 크림)

texture: light | medium | rich  
sticky: none | low | medium | high  

barrier: true | false        # 세라마이드 등 포함 여부  
fragrance: true | false  

portable: true | false  

finish: fresh | neutral | heavy  

---

## 5. Cleanser (클렌저)

type: foam | gel | oil | balm | water  

ph_level: low | neutral | high  

cleansing_power: low | medium | high  

after_feel: moist | neutral | dry  

irritation_risk: low | medium | high  

fragrance: true | false  

---

## 공통 규칙

- 모든 attribute는 products.attributes JSONB에 저장  
- ENUM / BOOLEAN / NUMBER만 사용  
- "좋다/나쁘다" 판단 금지 → 상태만 기록  
- 필터링은 product_filter_mappings에서 처리