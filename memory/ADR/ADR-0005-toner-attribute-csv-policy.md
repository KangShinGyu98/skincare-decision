# ADR-0005 Toner Attribute CSV 정책

## Status

Accepted — 2026-06-17

## Context

Toner 제품 seed의 원천인 `docs/화장품 성분비교.CSV`는 제품명, 가격, 구매 링크, 전성분, 주요 목적, pH, 자극도, 각질 타입, 알코올/향료, 수렴성, 피지조절, 흡수속도, 레이어링, 광민감성, 사용빈도 같은 CSV/성분 기반 필드를 가진다.

기존 toner attribute schema에는 `hydration_level`, `emollient_level`, `film_level`, `finish`, `exfoliation_strength`, `essential_oil`, `cooling_feel`, `wipe_caution`, `cotton_pad_fit`, `sun_caution`처럼 실제 사용감 평가나 큐레이터 주관 보정 없이는 안정적으로 판정하기 어려운 필드가 포함되어 있었다. 이 필드들을 production seed에 넣으면 CSV-derived data라는 운영 경계가 흐려지고, 테스트 가능한 seed 품질도 떨어진다.

## Decision

1. Toner production seed는 CSV와 전성분/name 기반 deterministic rule로 판정 가능한 필드만 사용한다.
2. Toner active attributes는 다음으로 고정한다.
   - `form`
   - `application_methods`
   - `role_tags`
   - `ph_label`
   - `ph_value`
   - `irritation_risk`
   - `exfoliation_type`
   - `alcohol`
   - `fragrance`
   - `astringent_level`
   - `oil_control`
   - `active_ingredients`
   - `absorption_speed`
   - `layer_compatibility`
   - `photosensitive`
   - `recommended_frequency`
3. 다음 toner-only subjective fields는 deprecated 처리하고 seed에서 soft-deactivate한다.
   - `hydration_level`
   - `emollient_level`
   - `film_level`
   - `finish`
   - `exfoliation_strength`
   - `essential_oil`
   - `cooling_feel`
   - `wipe_caution`
   - `cotton_pad_fit`
   - `sun_caution`
4. `hydrating_toner`는 `hydration_level`이 아니라 `role_tags CONTAINS hydration`으로 판단한다.
5. 민감/저자극 toner 필터는 `irritation_risk`, `alcohol`, `fragrance`, `exfoliation_type`, `photosensitive` 조합으로 처리한다.
6. 향료성 에센셜오일은 별도 `essential_oil` 키로 분리하지 않고 `fragrance = true`로 흡수한다.
7. `피부타입메모`는 product seed 경로에서 제거한다. 피부 타입은 user context이며 product attribute가 아니다.
8. Production product seed는 CSV를 runtime에 읽지 않는다. `backend/src/seed/data/toner-products.ts`에 정규화 완료된 상수로 저장한다.
9. CSV-derived ingredient seed는 원문 토큰을 `ingredients.name_ko`와 `product_ingredients.raw_text`에 보존한다. 검증된 외부 매핑 전까지 `ingredients.name_en`과 `ingredients.inci_name`은 `NULL`로 둔다.

## Consequences

- `products.attributes` JSONB에는 migration 없이 새 toner attribute set을 적용할 수 있다.
- 기존 DB에 deprecated toner attribute/filter/matrix filter가 있으면 seed가 hard delete하지 않고 `deleted_at`/`is_active = false`로 비활성화한다.
- 제품 seed는 25개 eligible non-discontinued toner row만 포함하고 `imageUrl = null`로 저장한다.
- `irritation_risk`와 `exfoliation_type` 누락값은 제품명/전성분/pH/산 성분/향료성 오일 rule로 보강해 TypeScript seed 상수에 resolved value로 저장한다.
- 테스트는 모든 seed product attribute key가 active toner definitions에 있는지, deprecated key와 `피부타입메모`가 배출되지 않는지, 가격/HTTPS URL/image null 정책이 지켜지는지 검증한다.
