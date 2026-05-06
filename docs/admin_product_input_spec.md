# Admin Product Input Spec — 관리자 제품 등록 폼 명세

> 목적: Product Matrix에 1건의 제품을 등록할 때 관리자가 무엇을 어떤 형식으로 입력해야 하는지 한 페이지에서 끝낸다.
> 기준 문서: [db_modeling.md](db_modeling.md), [product_attribute_schema.md](product_attribute_schema.md), [matching_rules_revised.md](matching_rules_revised.md), [ingredient_efficacy_thresholds.md](ingredient_efficacy_thresholds.md), [data_source_catalog.md](data_source_catalog.md).
> 작성일: 2026-05-02

---

## 0. 표기 규칙

| 마크 | 의미 |
|---|---|
| 🟥 | 필수 입력 (없으면 저장 불가) |
| 🟨 | 권장 입력 (없으면 attribute 누락 표시) |
| ⬜ | 선택 입력 |
| 🤖 | 시스템 자동 계산/검증 |
| 🔒 | 입력 후 변경 시 별도 권한 필요 (브랜드/카테고리 변경) |

값 타입:
- `string`, `number`, `boolean`, `enum`, `multi_enum`, `json`, `image`, `url`

---

## 1. 공통 필드 (모든 카테고리)

| 필드 | 마크 | 타입 | 검증 / 옵션 | 비고 |
|---|---|---|---|---|
| `brand_id` | 🟥🔒 | UUID FK | brands 테이블에서 선택 또는 신규 생성 | 자동완성 select |
| `category_id` | 🟥🔒 | UUID FK | 6개 product_categories 중 1개 | 변경 시 attributes 초기화 경고 |
| `name` | 🟥 | string | 1~300자 | 한글/영문 모두 허용 |
| `volume` | 🟨 | string | 예: `50ml`, `30g`, `15ml × 3` | 자유 입력 |
| `barcode` | ⬜ | string | KAN/JAN 13자리 또는 EAN-8 | 중복 시 경고 |
| `price` | 🟥 | number | 정수, 단위 ₩ (원) | 0 이상 |
| `price_band` | 🟥🤖 | enum | `UNDER_20000` / `BETWEEN_20000_50000` / `OVER_50000` | `price`로 자동 계산 |
| `image_url` | 🟥 | image (S3 업로드) | 권장 1:1 비율, 1MB 이하 PNG/WebP | **외부 URL 직접 입력 금지** |
| `purchase_url` | 🟨 | url | https만 허용 | 어필리에이트 파라미터 허용 |
| `attributes` | 🟥 | json | 카테고리별 schema (아래 §3~§8) | Zod 검증 |
| `sort_order` | ⬜ | number | 0 이상 정수 | 작을수록 상위 노출 |
| `is_active` | 🟨 | boolean | default `true` | `false`이면 Matrix 비노출 |

### 1.1 자동 계산 규칙

```
price_band = (
  price < 20000  → UNDER_20000
  price < 50000  → BETWEEN_20000_50000
  else           → OVER_50000
)
```

### 1.2 이미지 업로드 흐름 (S3 강제)

```
관리자 화면
  ├─ 1. 파일 선택 또는 드래그 앤 드롭 (PNG/JPG/WebP)
  ├─ 2. 클라이언트에서 검증 (≤ 1MB, ≥ 600×600)
  ├─ 3. POST /admin/upload-image  → presigned URL 발급
  ├─ 4. PUT presigned URL  → S3 업로드
  ├─ 5. CloudFront URL 반환  → image_url 자동 채움
  └─ 6. (Naver 후보 URL이 있을 경우) "후보 다운로드" 버튼
        → backend가 image fetch → S3 업로드 → CloudFront URL 반환
```

> 외부 URL 직접 저장은 명세상 차단. UI에서 hot-link URL이 입력되면 폼 검증 단계에서 reject.

---

## 2. 전성분 (모든 카테고리, 권장 입력)

| 필드 | 마크 | 타입 | 비고 |
|---|---|---|---|
| `ingredients_raw` | 🟨 | string (textarea) | 개행 또는 쉼표 구분 |
| `ingredients_parsed` | 🤖 | array | 위 raw를 토큰화한 결과 (preview) |
| `ingredient_concentrations` | 🟨 | json | `{ "niacinamide": 5, "retinol": 0.1 }` |

### 2.1 토큰화 + 매핑 흐름

```
1. ingredients_raw textarea 입력
2. 자동 split (개행 또는 ',')
3. 각 토큰 → ingredients 테이블 검색 (name_ko / name_en / inci_name)
   ├─ 매칭 → ingredient_id 추출
   ├─ 신규 → "신규 등록" 버튼 (관리자가 INCI 등록)
4. preview 테이블에 [순서, 한글명, INCI, 매칭상태] 표시
5. 저장 시 product_ingredients(product_id, ingredient_id, order_index, raw_text) 일괄 INSERT
```

### 2.2 `ingredient_concentrations` 입력 규칙

- **기능성 성분 우선**: `docs/ingredient_efficacy_thresholds.md`에 등록된 성분만 입력 권장.
- 단위는 `%` 기본, 예외(IU/g, ppm)는 별도 표기 (`{ "retinol_iu_per_g": 2500 }`).
- 입력 후 `effective_dose_met`이 자동 갱신됨 → §10 참고.

---

## 3. Toner 카테고리 attribute

| 필드 | 마크 | 타입 | 옵션 | 비고 |
|---|---|---|---|---|
| `form` | 🟥 | enum | `water` / `viscous` / `milky` / `pad` / `mist` | `milky`는 밀크토너/크림스킨 |
| `role_tags` | 🟥 | multi_enum | `hydration` / `calming` / `exfoliation` / `oil_control` / `barrier` | 1개 이상. "결 정돈"은 단일 옵션 없음 — 메커니즘 단위(`exfoliation` + `hydration`)로 해체 입력 |
| `hydration_level` | 🟥 | enum | `low` / `medium` / `high` | 수분감 |
| `emollient_level` | 🟥 | enum | `none` / `low` / `medium` / `high` | 유분감/영양감. **`oil_control`과 다름** |
| `film_level` | 🟥 | enum | `none` / `low` / `medium` / `high` | 쫀쫀함, 막감 |
| `finish` | 🟥 | enum | `fresh` / `moist` / `dewy` / `rich` | 마무리감 (toner 전용) |
| `exfoliation_type` | 🟥 | enum | `none` / `aha` / `bha` / `pha` / `lha` / `enzyme` / `mixed` | |
| `exfoliation_strength` | 🟥 | enum | `none` / `low` / `medium` / `high` | |
| `irritation_risk` | 🟥 | enum | `low` / `medium` / `high` | |
| `alcohol` | 🟥 | boolean | | 변성알코올/에탄올 등 |
| `fragrance` | 🟥 | boolean | | 향료 |
| `essential_oil` | 🟥 | boolean | | 티트리/스피어민트/유칼립투스 등. **`fragrance = false`여도 자극원**이 될 수 있어 별도 표기 |
| `ph_value` | 🟨 | number | 예: 5.5 | 실제 수치 없으면 null |
| `ph_label` | 🟨 | enum | `strong_acidic` / `weak_acidic` / `mild_acidic` / `neutral` / `unknown` | `ph_value`가 null일 때 폴백. 큐레이터가 직접 판단해 입력 |
| `astringent_level` | 🟨 | enum | `none` / `low` / `medium` / `high` | 수렴감 (위치하젤 등) |
| `oil_control` | 🟨 | enum | `none` / `low` / `medium` / `high` | 피지 조절 효과. **`emollient_level`과 다름** |
| `cooling_feel` | 🟨 | enum | `none` / `low` / `medium` / `high` | 화한 느낌 |
| `application_methods` | 🟨 | multi_enum | `wipe` / `press` / `pack` / `mist` | 대부분 겸용이라 Core 필터 가치 낮음 |
| `wipe_caution` | 🟨 | boolean | | 닦토 사용 시 자극/마찰 주의 필요 |
| `cotton_pad_fit` | ⬜ | enum | `good` / `fair` / `poor` | 화장솜 적합도 |
| `sun_caution` | 🟨 | enum | `none` / `low` / `medium` / `high` | 산 성분 등으로 인한 낮 사용 주의 강도 (기존 `photosensitive` 대체) |
| `functional_claims` | ⬜ | multi_enum | `brightening` / `anti_aging` / `acne_relief` | **식약처 기능성 인정 받은 항목만 입력**. 미인증 제품은 비움 |
| `active_ingredients` | ⬜ | multi_enum | (스키마 §2.2 참조) | |
| `absorption_speed` | ⬜ | enum | `slow` / `medium` / `fast` | |
| `layer_compatibility` | ⬜ | enum | `good` / `fair` / `poor` | |
| `recommended_frequency` | ⬜ | enum | `daily` / `weekly_1_3` / `as_needed` | |

---

## 4. Sunscreen 카테고리 attribute

| 필드 | 마크 | 타입 | 옵션 | 비고 |
|---|---|---|---|---|
| `spf` | 🟥 | number | 1~50+ | 50+는 50으로 저장 |
| `pa` | 🟥 | enum | `+` / `++` / `+++` / `++++` | |
| `broad_spectrum` | 🟥 | boolean | | UVA/UVB |
| `filter_type` | 🟥 | enum | `physical` / `chemical` / `hybrid` | |
| `eye_sting` | 🟥 | enum | `none` / `low` / `medium` / `high` | |
| `white_cast` | 🟥 | enum | `none` / `low` / `medium` / `high` | |
| `texture` | 🟥 | enum | `light` / `medium` / `rich` | |
| `sticky` | 🟥 | enum | `none` / `low` / `medium` / `high` | |
| `finish` | 🟥 | enum | `matte` / `natural` / `dewy` | |
| `makeup_compatibility` | 🟥 | enum | `good` / `fair` / `poor` | |
| `portable` | 🟥 | boolean | | |
| `water_resistant` | 🟥 | boolean | | |
| `fragrance` | 🟥 | boolean | | |
| `alcohol` | 🟥 | boolean | | |
| `oil_free` | 🟥 | boolean | | |
| `non_comedogenic` | 🟥 | boolean | | |
| `hydration_level` | 🟥 | enum | `low` / `medium` / `high` | |
| `tone_up` | 🟨 | boolean | | |
| `reapplication_fit` | 🟨 | enum | `low` / `medium` / `high` | |
| `sweat_resistant` | ⬜ | boolean | | water_resistant과 별개 판단 |
| `uv_filters` | 🟨 | multi_enum | `zinc_oxide` / `titanium_dioxide` / `avobenzone` / `octocrylene` / `octinoxate` / `oxybenzone` / `tinosorb_s` / `uvinul_a_plus` / `uvinul_t150` | |
| `moisturizing_ingredients` | ⬜ | multi_enum | `hyaluronic_acid` / `glycerin` / `panthenol` / `ceramide` / `squalane` / `aloe` | |

---

## 5. Serum 카테고리 attribute

| 필드 | 마크 | 타입 | 옵션 | 비고 |
|---|---|---|---|---|
| `active_ingredients` | 🟥 | multi_enum | (schema §4.1 — 31개 enum) | 1개 이상 |
| `target_concerns` | 🟥 | multi_enum | `brightening` / `anti_aging` / `acne` / `hydration` / `calming` / `pore_care` / `barrier` / `texture` / `pigmentation` | 1개 이상 |
| `irritation_risk` | 🟥 | enum | `low` / `medium` / `high` | |
| `conflict_ingredients` | 🟨 | multi_enum | `retinol` / `vitamin_c` / `aha` / `bha` / `benzoyl_peroxide` / `peeling` | 병행 주의 |
| `usage_time` | 🟥 | enum | `morning` / `night` / `both` | |
| `effective_dose_met` | 🤖 | boolean | | §10 자동 판정 + override 가능 |
| `effective_dose_met_override_reason` | ⬜ | string | | override 시 메모 |
| `fragrance` | 🟥 | boolean | | |
| `alcohol` | 🟥 | boolean | | |
| `oil_free` | 🟥 | boolean | | |
| `non_comedogenic` | 🟥 | boolean | | |
| `texture` | 🟨 | enum | `water` / `gel` / `oil` / `cream` | |
| `concentration_level` | 🟨 | enum | `low` / `medium` / `high` | |
| `ingredient_concentrations` | 🟨 | json | §2.2 | effective_dose_met 자동 판정에 사용 |
| `packaging` | 🟨 | enum | `opaque` / `transparent` / `airless` / `dropper` / `tube` | |
| `stability_packaging` | 🟨 | enum | `good` / `fair` / `poor` | |
| `photosensitive` | 🟨 | boolean | | |
| `effect_timeline` | ⬜ | enum | `fast` / `gradual` | |

---

## 6. Lipcare 카테고리 attribute

| 필드 | 마크 | 타입 | 옵션 | 비고 |
|---|---|---|---|---|
| `moisture_lasting` | 🟥 | enum | `low` / `medium` / `high` | |
| `humectant_level` | 🟥 | enum | `low` / `medium` / `high` | |
| `occlusive_level` | 🟥 | enum | `low` / `medium` / `high` | |
| `irritation_risk` | 🟥 | enum | `low` / `medium` / `high` | |
| `menthol` | 🟥 | boolean | | |
| `fragrance` | 🟥 | boolean | | |
| `alcohol` | 🟥 | boolean | | |
| `camphor` | 🟥 | boolean | | |
| `salicylic_acid` | 🟥 | boolean | | 입술 자극 가능 |
| `colorant` | 🟥 | boolean | | 색조는 MVP 외이므로 false 권장 |
| `spf` | 🟥 | number | 0 이상 | 없으면 0 |
| `form` | 🟥 | enum | `stick` / `tube` / `balm` / `mask` / `essence` | tint 제외 |
| `portable` | 🟥 | boolean | | |
| `night_care` | 🟨 | boolean | | |
| `makeup_base_fit` | 🟨 | enum | `good` / `fair` / `poor` | |
| `key_ingredients` | 🟨 | multi_enum | `shea_butter` / `hyaluronic_acid` / `glycerin` / `aloe` / `vitamin_e` / `beeswax` / `petrolatum` / `lanolin` / `ceramide` / `panthenol` / `squalane` / `jojoba_oil` / `argan_oil` / `coconut_oil` / `honey` | |
| `absorption_speed` | ⬜ | enum | `slow` / `medium` / `fast` | |
| `finish` | ⬜ | enum | `matte` / `natural` / `glossy` | |

---

## 7. Moisturizer 카테고리 attribute

| 필드 | 마크 | 타입 | 옵션 | 비고 |
|---|---|---|---|---|
| `form` | 🟥 | enum | `lotion` / `gel_cream` / `water_cream` / `cream` | |
| `hydration_level` | 🟥 | enum | `low` / `medium` / `high` | |
| `humectant_level` | 🟥 | enum | `low` / `medium` / `high` | |
| `emollient_level` | 🟥 | enum | `low` / `medium` / `high` | |
| `occlusive_level` | 🟥 | enum | `low` / `medium` / `high` | |
| `oiliness` | 🟥 | enum | `low` / `medium` / `high` | |
| `texture` | 🟥 | enum | `light` / `medium` / `rich` | |
| `barrier_repair` | 🟥 | enum | `low` / `medium` / `high` | |
| `irritation_risk` | 🟥 | enum | `low` / `medium` / `high` | |
| `fragrance` | 🟥 | boolean | | |
| `alcohol` | 🟥 | boolean | | |
| `oil_free` | 🟥 | boolean | | |
| `non_comedogenic` | 🟥 | boolean | | |
| `ph` | 🟨 | number | 예: 5.5 | |
| `sticky` | 🟥 | enum | `none` / `low` / `medium` / `high` | |
| `makeup_compatibility` | 🟥 | enum | `good` / `fair` / `poor` | |
| `absorption_speed` | 🟨 | enum | `slow` / `medium` / `fast` | |
| `seasonal_fit` | 🟨 | multi_enum | `spring` / `summer` / `autumn` / `winter` / `all_season` | |
| `active_ingredients` | 🟨 | multi_enum | (schema §6.2 — 16개) | |
| `finish` | ⬜ | enum | `matte` / `natural` / `dewy` | |
| `layer_compatibility` | ⬜ | enum | `good` / `fair` / `poor` | |

---

## 8. Cleanser 카테고리 attribute

| 필드 | 마크 | 타입 | 옵션 | 비고 |
|---|---|---|---|---|
| `cleanser_type` | 🟥 | enum | `foam` / `gel` / `oil` / `balm` / `water` / `cream` / `milk` / `lotion` | |
| `cleansing_power` | 🟥 | enum | `low` / `medium` / `high` | |
| `after_feel` | 🟥 | enum | `moist` / `neutral` / `dry` | |
| `irritation_risk` | 🟥 | enum | `low` / `medium` / `high` | |
| `ph` | 🟨 | number | 예: 5.5 | |
| `sulfate_free` | 🟥 | boolean | | |
| `fragrance` | 🟥 | boolean | | |
| `alcohol` | 🟥 | boolean | | |
| `colorant` | 🟥 | boolean | | |
| `soap_free` | 🟥 | boolean | | |
| `non_comedogenic` | 🟥 | boolean | | |
| `makeup_removal_power` | 🟥 | enum | `none` / `low` / `medium` / `high` | |
| `double_cleanse_role` | 🟥 | enum | `first` / `second` / `both` | |
| `physical_scrub_risk` | 🟥 | enum | `none` / `low` / `medium` / `high` | |
| `exfoliation` | 🟨 | enum | `none` / `physical` / `chemical` / `mixed` | |
| `active_ingredients` | 🟨 | multi_enum | (schema §7.2 — 13개) | |
| `surfactant_type` | 🟨 | enum | `amino_acid` / `amphoteric` / `sulfate` / `soap` / `mixed` / `unknown` | |
| `morning_fit` | ⬜ | enum | `good` / `fair` / `poor` | |
| `waterproof_makeup_fit` | ⬜ | enum | `good` / `fair` / `poor` | |

---

## 9. 입력 예시 (sunscreen 1건)

```json
{
  "brand_id": "<uuid of 라운드랩>",
  "category_id": "<uuid of sunscreen>",
  "name": "자작나무 수분 선크림",
  "volume": "50ml",
  "barcode": "8809589680293",
  "price": 16800,
  "price_band": "UNDER_20000",
  "image_url": "https://cdn.kbeauty.app/products/sun_001.webp",
  "purchase_url": "https://smartstore.naver.com/...",
  "attributes": {
    "spf": 50,
    "pa": "++++",
    "broad_spectrum": true,
    "filter_type": "hybrid",
    "eye_sting": "low",
    "white_cast": "low",
    "texture": "light",
    "sticky": "low",
    "finish": "natural",
    "makeup_compatibility": "good",
    "portable": false,
    "water_resistant": true,
    "fragrance": false,
    "alcohol": false,
    "oil_free": true,
    "non_comedogenic": true,
    "hydration_level": "medium",
    "tone_up": false,
    "uv_filters": ["zinc_oxide", "titanium_dioxide", "tinosorb_s"],
    "moisturizing_ingredients": ["hyaluronic_acid", "panthenol"]
  },
  "sort_order": 0,
  "is_active": true,
  "ingredients_raw": "정제수\n호모살레이트\n에칠헥실살리실레이트\n...",
  "ingredient_concentrations": {}
}
```

---

## 10. `effective_dose_met` 자동 판정 (serum 전용)

`docs/ingredient_efficacy_thresholds.md`의 임계값과 `attributes.ingredient_concentrations`를 비교해 판정.

**판정 알고리즘:**

```
1. product.attributes.target_concerns 읽기 (예: ["brightening"])
2. product.attributes.ingredient_concentrations 읽기 (예: { niacinamide: 4 })
3. 각 (concern, ingredient) 쌍에 대해 thresholds 조회:
     thresholds[ingredient].efficacy[concern] = { min, max, unit }
4. 충족 판정:
     - 등록된 임계값에 대해 min <= value <= max → 충족
     - 임계값 미등록 → unknown (실패 아님)
     - 충족 0건 → effective_dose_met = false
     - 충족 1건 이상 + 미달 0건 → effective_dose_met = true
     - 미달 1건 이상 → effective_dose_met = false (단, override 가능)
5. 관리자 화면에 "자동 판정: ✓ / ✗ / ?" 배지 표시
6. 관리자가 override 시 effective_dose_met_override_reason 메모 필수
```

**예시:**

| ingredient_concentrations | target_concerns | 자동 판정 | 사유 |
|---|---|---|---|
| `{ niacinamide: 4 }` | `[brightening]` | ✗ false | 미백 임계값 2~5% 중 4%는 통과지만, **실제 임계값 시드는 5% min** → 미달 |
| `{ niacinamide: 5 }` | `[brightening]` | ✓ true | 5% min 충족 |
| `{ retinol_iu_per_g: 2500 }` | `[anti_aging]` | ✓ true | 2500 IU/g min 충족 |
| `{ centella: 100 }` | `[calming]` | ? unknown | 임계값 미등록 → 운영자 판단 |

---

## 11. 검증 체크리스트 (저장 전 자동)

저장 버튼 클릭 시 backend가 검증하는 항목:

- [ ] 모든 🟥 필드가 채워졌는가
- [ ] `category_id`에 해당하는 카테고리별 🟥 attribute가 모두 채워졌는가
- [ ] `attributes` JSONB가 `category_attribute_definitions`의 enum/range를 위반하지 않는가
- [ ] `image_url`이 CloudFront 도메인인가 (외부 URL reject)
- [ ] `purchase_url`이 https인가
- [ ] `barcode` 중복 시 경고 (강제 reject 아님 — 모디파이어 가능)
- [ ] (serum) `effective_dose_met` 자동 판정이 완료됐는가, override 시 reason이 있는가
- [ ] (전성분 입력 시) 모든 토큰이 ingredients 테이블에 매칭되는가 (신규 미매칭은 별도 등록 필요)

---

## 12. 외부 API 후보 채움 (선택)

데이터 출처 조합 결정에 따라 활성/비활성. [data_source_catalog.md](data_source_catalog.md) 참고.

| 버튼 | 호출 endpoint | 채울 수 있는 필드 |
|---|---|---|
| 🔍 Naver 쇼핑에서 가져오기 | `GET /admin/external/naver?keyword=...` | `name`, `price`, `image_url`(다운로드 후 S3), `purchase_url`, `brand` |
| 🔍 식약처 기능성 보고에서 검증 | `GET /admin/external/mfds-functional?name=...` | 효능·효과 라벨, 회사명, 보고번호, 사용 시 주의사항 |
| 🔍 식약처 원료성분 매핑 | `GET /admin/external/mfds-ingredients?inci=...` | `ingredients` 테이블 자동완성 (한/영/INCI) |

> 조합 X(100% 수동) 선택 시 본 §12는 비활성. 조합 Y/Z 선택 시 폼에 버튼 노출.

---

## 13. 변경 이력 / 권한

- `category_id`, `brand_id` 변경은 별도 권한(ADMIN role) 필요.
- 모든 product UPDATE는 변경자(`updated_by`)와 변경시각(`updated_at`)을 기록.
- soft delete: `is_active = false`로 처리, 30일 후 hard delete 검토.

---

## 14. 진입 규칙

1. 본 명세는 [db_modeling.md](db_modeling.md)와 [product_attribute_schema.md](product_attribute_schema.md)의 종속 문서다 — 두 파일이 갱신되면 본 파일도 같이 갱신.
2. 카테고리 attribute 추가 시: schema 갱신 → 본 §3~§8 갱신 → seed 갱신.
3. `effective_dose_met` 로직 변경 시: [ingredient_efficacy_thresholds.md](ingredient_efficacy_thresholds.md)와 동시 갱신.
