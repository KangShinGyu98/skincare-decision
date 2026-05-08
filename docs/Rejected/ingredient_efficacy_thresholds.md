# Ingredient Efficacy Thresholds — 성분 유효 농도 기준

> 목적: `effective_dose_met`(serum 등 attribute) 자동 판정에 쓰이는 성분별 유효 농도 임계값을 단일 진실로 모은다.
> 출처 우선순위: ① 식약처 「기능성화장품 기준 및 시험방법」 별표4 → ② 식약처 기능성 보고품목 통계 → ③ CIR/SCCS Opinion → ④ PubMed → ⑤ 운영 검토.
> 작성일: 2026-05-02

---

## 0. 적용 범위

**MVP 1차 시드 = 식약처 기능성 화장품 인정 11개 항목 중 MVP 6개 카테고리에 적용 가능한 6개 항목**.

| 식약처 기능 (concern key)                | 1차 시드 포함 |
| ---------------------------------------- | :-----------: |
| 피부 미백 (`brightening`)                |       ✓       |
| 피부 주름개선 (`anti_aging`)             |       ✓       |
| 피부 자외선 차단 (`uv_protection`)       |       ✓       |
| 피부 선태닝                              |  — _MVP 외_   |
| 모발 색상 변화                           |  — _MVP 외_   |
| 체모 제거                                |  — _MVP 외_   |
| 탈모 증상 완화                           |  — _MVP 외_   |
| 여드름성 피부 완화 (`acne`)              |       ✓       |
| 피부장벽 기능 회복 (`barrier`)           |       ✓       |
| 피부 건조함·갈라짐 방지·개선 (`dryness`) |       ✓       |
| 피부 튼살 개선                           |  — _MVP 외_   |

---

## 1. 데이터 형식

각 성분 entry는 다음 구조를 갖는다.

```yaml
- ingredient_key: niacinamide # backend/seed에서 사용할 키 (snake_case)
  ingredient_name_ko: 나이아신아마이드
  ingredient_name_en: Niacinamide
  inci_name: Niacinamide
  efficacy: # 1성분 다효능 가능
    - concern: brightening # 위 §0의 concern key
      mfds_function: 피부 미백
      min: 2.0
      max: 5.0 # null이면 상한 없음
      unit: '%' # '%' / 'IU/g' / 'ppm'
      formulation_limit: [lotion, liquid, cream, mask] # 적용 가능한 제형
      source: MFDS_FUNCTIONAL_NOTICE # 출처 enum (§3 참조)
      source_ref: 「기능성화장품 기준 및 시험방법」 별표4
      source_url: https://www.law.go.kr/...
      reviewed_at: 2026-05-02
      reviewer: 운영팀
      notes: ''
```

### 1.1 판정 규칙 (`effective_dose_met`)

1. product의 `target_concerns` 읽기 (예: `["brightening"]`).
2. product의 `ingredient_concentrations` 읽기 (예: `{ "niacinamide": 4 }`).
3. 각 (concern, ingredient) 쌍에 대해:
   - 임계값 entry가 존재하면 `min <= value <= (max ?? +∞)` 비교.
   - entry가 없으면 **unknown** (실패 아님).
4. 충족 1+ AND 미달 0 → `true`. 미달 1+ → `false`. 모두 unknown → `false` (보수적).
5. 운영자가 override 가능, 사유는 `attributes.effective_dose_met_override_reason`에 기록.

### 1.2 단위 통일

- 기본은 `%` (w/w 기준).
- 레티놀 / 레티닐 유도체는 `IU/g` 사용.
- 마데카소사이드 등 미량 성분은 `ppm` 사용 (1% = 10,000 ppm).
- 입력 시 단위 일치 검증 — 단위 불일치는 reject.

---

## 2. 1차 시드 — 미백 (피부 미백, `brightening`)

식약처 「기능성화장품 기준 및 시험방법」 별표4 (자료제출 생략) 기준.

| 성분 (한글)            | 성분 (영문/INCI)                        | 함량    | 단위 | 제형 한정                         | 출처                   | 메모                                                                                                |
| ---------------------- | --------------------------------------- | ------- | ---- | --------------------------------- | ---------------------- | --------------------------------------------------------------------------------------------------- |
| 나이아신아마이드       | Niacinamide                             | 2.0~5.0 | %    | 로션제, 액제, 크림제, 침적 마스크 | MFDS_FUNCTIONAL_NOTICE | 5% 이상 효과 명확 ([selection_rule:220](skincare_product_selection_rule.md#L220))                   |
| 알부틴                 | Arbutin                                 | 2.0~5.0 | %    | 동일                              | MFDS_FUNCTIONAL_NOTICE | 한국소비자원 안전성 조사 통과                                                                       |
| 알파-비사보롤          | Alpha-Bisabolol                         | 0.5     | %    | 동일                              | MFDS_FUNCTIONAL_NOTICE |                                                                                                     |
| 닥나무추출물           | Broussonetia Kazinoki Extract           | 2.0     | %    | 동일                              | MFDS_FUNCTIONAL_NOTICE |                                                                                                     |
| 에칠아스코빌에텔       | Ethyl Ascorbyl Ether                    | 1.0~2.0 | %    | 동일                              | MFDS_FUNCTIONAL_NOTICE | 비타민C 유도체                                                                                      |
| 아스코빌글루코사이드   | Ascorbyl Glucoside                      | 2.0     | %    | 동일                              | MFDS_FUNCTIONAL_NOTICE | 비타민C 유도체                                                                                      |
| 유용성감초추출물       | Dipotassium Glycyrrhizate (oil-soluble) | 0.05    | %    | 동일                              | MFDS_FUNCTIONAL_NOTICE |                                                                                                     |
| 비타민C (아스코르브산) | Ascorbic Acid                           | 3.0~5.0 | %    | —                                 | INTERNAL_REVIEW        | 별표4 미등록, 저자극 시작 농도 권장 ([selection_rule:226](skincare_product_selection_rule.md#L226)) |

---

## 3. 1차 시드 — 주름개선 (피부 주름개선, `anti_aging`)

| 성분 (한글)                    | 성분 (영문/INCI)           | 함량                   | 단위 | 제형 한정                                   | 출처                   | 메모                                                                               |
| ------------------------------ | -------------------------- | ---------------------- | ---- | ------------------------------------------- | ---------------------- | ---------------------------------------------------------------------------------- |
| 레티놀                         | Retinol                    | 2,500                  | IU/g | 로션제, 크림제, 침적 마스크                 | MFDS_FUNCTIONAL_NOTICE | 0.001% 이하 무의미 ([selection_rule:218](skincare_product_selection_rule.md#L218)) |
| 레티닐팔미테이트               | Retinyl Palmitate          | 10,000                 | IU/g | 동일                                        | MFDS_FUNCTIONAL_NOTICE | 2세대 레티놀 유도체                                                                |
| 아데노신                       | Adenosine                  | 0.04                   | %    | 액제(2%), 로션제, 액제, 크림제, 침적 마스크 | MFDS_FUNCTIONAL_NOTICE | 액제는 2% 별도                                                                     |
| 폴리에톡실레이티드레틴아마이드 | Polyethoxylated Retinamide | (별표4 함량 확인 필요) | %    | (확인 필요)                                 | MFDS_FUNCTIONAL_NOTICE | **TODO: 정확한 함량 식약처 PDF 별표4 확인**                                        |

---

## 4. 1차 시드 — 자외선 차단 (피부 자외선 차단, `uv_protection`)

> 자외선 차단은 단일 성분 임계값보다 **최종 SPF/PA 측정값**이 인정 기준이다.
> 따라서 `effective_dose_met`은 자외선 차단 카테고리에서는 사용하지 않고, sunscreen attribute의 `spf >= 30` 같은 직접 조건을 BASIC_CONDITION으로 사용한다.

식약처가 인정하는 자외선 차단 성분(고시 별표) 일부 — 제품에 포함만 되면 됨, 농도는 SPF/PA 측정으로 검증:

| 성분                                        | 영문 / INCI                              | 메모                     |
| ------------------------------------------- | ---------------------------------------- | ------------------------ |
| 이산화티타늄                                | Titanium Dioxide                         | 무기자차                 |
| 산화아연                                    | Zinc Oxide                               | 무기자차                 |
| 에칠헥실메톡시신나메이트                    | Octinoxate (Ethylhexyl Methoxycinnamate) | 유기자차                 |
| 에칠헥실살리실레이트                        | Octisalate (Ethylhexyl Salicylate)       | 유기자차                 |
| 호모살레이트                                | Homosalate                               | 유기자차                 |
| 부틸메톡시디벤조일메탄                      | Avobenzone                               | 유기자차 (UVA 차단 핵심) |
| 옥토크릴렌                                  | Octocrylene                              | 유기자차                 |
| 비스-에칠헥실옥시페놀메톡시페닐트리아진     | Bemotrizinol (Tinosorb S)                | 광범위 차단              |
| 메칠렌비스-벤조트리아졸일테트라메칠부틸페놀 | Bisoctrizole (Tinosorb M)                | 광범위 차단              |
| 디에칠헥실부타미도트리아존                  | Iscotrizinol (Uvasorb HEB)               | UVB                      |

> ⚠️ 자외선 차단제 전체 목록은 식약처 「화장품 안전기준 등에 관한 규정」 별표7을 봐야 한다. 본 표는 빈도 높은 성분만 발췌. 운영팀이 별표7 전체를 본 파일에 옮길 때 위 표를 갱신.

---

## 5. 1차 시드 — 여드름성 피부 완화 (`acne`)

| 성분 (한글)         | 성분 (영문/INCI)   | 함량    | 단위 | 제형 한정            | 출처                   | 메모                                                                                           |
| ------------------- | ------------------ | ------- | ---- | -------------------- | ---------------------- | ---------------------------------------------------------------------------------------------- |
| 살리실산 (BHA)      | Salicylic Acid     | 0.5     | %    | 인체세정용 제품 한정 | MFDS_FUNCTIONAL_NOTICE | 클렌저에만 기능성 인정. 토너/세럼은 일반 사용                                                  |
| 살리실산 (BHA)      | Salicylic Acid     | 0.5~2.0 | %    | 토너 / 세럼 (일반)   | INTERNAL_REVIEW        | 0.5~2% 적정, 2% 이상 장벽 위험 ([selection_rule:224](skincare_product_selection_rule.md#L224)) |
| 베타인 살리실레이트 | Betaine Salicylate | ~0.9    | %    | —                    | INTERNAL_REVIEW        | 데일리 피지 케어 적정 ([selection_rule:228](skincare_product_selection_rule.md#L228))          |

---

## 6. 1차 시드 — 피부장벽 기능 회복 (`barrier`)

> 식약처 별표4에 자료 면제 성분이 명시되어 있는지 확인 필요(보습 중심 평가).
> 1차 시드는 운영 검토(INTERNAL_REVIEW) 기반.

| 성분 (한글)            | 성분 (영문/INCI)          | 함량    | 단위 | 출처            | 메모                                                                      |
| ---------------------- | ------------------------- | ------- | ---- | --------------- | ------------------------------------------------------------------------- |
| 마데카소사이드         | Madecassoside             | 500     | ppm  | INTERNAL_REVIEW | 진정 효과 ([selection_rule:222](skincare_product_selection_rule.md#L222)) |
| 세라마이드 NP          | Ceramide NP               | 0.1~2.0 | %    | INTERNAL_REVIEW | 고함량은 제형 영향                                                        |
| 판테놀                 | Panthenol                 | 1.0~5.0 | %    | INTERNAL_REVIEW | 진정 + 보습                                                               |
| 센텔라아시아티카추출물 | Centella Asiatica Extract | 0.1~5.0 | %    | INTERNAL_REVIEW | 마데카소사이드의 모체 추출물                                              |

> **TODO**: 식약처 「기능성화장품 기준 및 시험방법」 별표4의 피부장벽 관련 성분 항목을 확인해 INTERNAL_REVIEW를 MFDS_FUNCTIONAL_NOTICE로 승격.

---

## 7. 1차 시드 — 건조함·갈라짐 방지·개선 (`dryness`)

> 식약처 별표4 자료 면제 성분 확인 필요. 1차 시드는 운영 검토 + 보습 3요소 기준.

| 성분 (한글)      | 성분 (영문/INCI)            | 함량     | 단위 | 출처            | 메모             |
| ---------------- | --------------------------- | -------- | ---- | --------------- | ---------------- |
| 히알루론산나트륨 | Sodium Hyaluronate          | 0.05~1.0 | %    | INTERNAL_REVIEW | 분자량별 차이 큼 |
| 글리세린         | Glycerin                    | 3.0~10.0 | %    | INTERNAL_REVIEW | 보습 기본        |
| 스쿠알란         | Squalane                    | 1.0~10.0 | %    | INTERNAL_REVIEW | 유연제           |
| 시어버터         | Butyrospermum Parkii Butter | 1.0~10.0 | %    | INTERNAL_REVIEW | 폐쇄제           |

---

## 8. 출처 enum 정의

| 값                       | 의미                                                                 | 신뢰도               |
| ------------------------ | -------------------------------------------------------------------- | -------------------- |
| `MFDS_FUNCTIONAL_NOTICE` | 식약처 「기능성화장품 기준 및 시험방법」 별표4 (자료 면제 성분·농도) | 최상 (법적 근거)     |
| `MFDS_FUNCTIONAL_REPORT` | 식약처 기능성화장품 보고품목 데이터 통계(`data.go.kr/data/15095680`) | 상                   |
| `CIR_OPINION`            | Cosmetic Ingredient Review (미국)                                    | 상                   |
| `SCCS_OPINION`           | EU Scientific Committee on Consumer Safety                           | 최상 (가장 엄격)     |
| `PEER_REVIEWED`          | PubMed 인용 1+ 논문                                                  | 중                   |
| `INTERNAL_REVIEW`        | 자체 검토 (운영팀)                                                   | 하 (마지막 fallback) |

---

## 9. 갱신 절차

새 성분 추가 또는 임계값 변경 시:

1. 식약처 별표4 → CIR/SCCS → PubMed 순으로 1차 출처 검색.
2. 위 §1.1 형식으로 entry 작성, `source` + `source_url` 필수.
3. `reviewed_at` (오늘 날짜) + `reviewer` 기재.
4. 본 파일 표 갱신 + `backend/src/services/efficacy/thresholds.ts` 코드 상수 동기화.
5. 단위 테스트 추가: `niacinamide: 4 → false`, `niacinamide: 5 → true` 같은 boundary case.
6. PR description에 출처 링크와 검증 절차를 명시.

---

## 10. 마이그레이션 계획 (Phase 6+)

entry 수가 30+개를 넘기면 코드 상수에서 DB 테이블로 이전.

```sql
-- ingredient_efficacy_thresholds (Phase 6 마이그레이션)
CREATE TABLE ingredient_efficacy_thresholds (
  id UUID PRIMARY KEY,
  ingredient_id UUID REFERENCES ingredients(id),
  concern_key VARCHAR(50) NOT NULL,         -- brightening / anti_aging / ...
  mfds_function VARCHAR(100),
  min_concentration NUMERIC,
  max_concentration NUMERIC,
  unit VARCHAR(10) NOT NULL,                -- '%' / 'IU/g' / 'ppm'
  formulation_limit JSONB,
  source VARCHAR(50) NOT NULL,
  source_ref TEXT,
  source_url TEXT,
  reviewed_at TIMESTAMPTZ NOT NULL,
  reviewer VARCHAR(100) NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (ingredient_id, concern_key)
);
```

마이그레이션 시 `docs/db_modeling.md`도 함께 갱신.

---

## 11. 진입 규칙

1. 본 파일은 [admin_product_input_spec.md §10](admin_product_input_spec.md#10) 자동 판정의 단일 진실이다.
2. 새 성분 추가는 §9 절차 준수.
3. 식약처 별표4 PDF 갱신 추적 — 식약처 고시 갱신 시 본 파일도 동시 갱신.
4. INTERNAL_REVIEW entry는 식약처 1차 출처 발견 시 우선 승격.
5. 레티놀 등 IU/g 단위는 % 환산하지 않는다 (식약처 표기 그대로 유지).
