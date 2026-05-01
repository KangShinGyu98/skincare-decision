# K-Beauty Decision MVP — 콘텐츠 / Rule / Seed Data 작성 계획

전체 작업 계획 

---

## 한 줄 요약

> **DB 스키마는 완성됐다. 이제 그 안을 채울 "객관적 기준 + Rule + 국민템 시드"를 화면별로 작성한다.**

---

## 1. 작성 원칙

### 1-1. 객관적 사실 기반

모든 기준은 출처가 명확해야 한다. 트렌드 기사나 블로그 후기는 1차 출처가 아니다.

| 우선순위 | 출처 | 사용 영역 |
|---------|------|-----------|
| 1차 | 식약처(MFDS) 기능성 화장품 고시 | 성분 유효 함량, 기능성 분류 |
| 1차 | 식약처 화장품 안전기준 등에 관한 규정 | 사용 한도 성분 |
| 1차 | KFDA 화장품 성분 사전 | 성분 표준 명칭, INCI 매핑 |
| 2차 | 대한피부과학회 / 미국피부과학회(AAD) | 일반 권고 (보습, 자극 등) |
| 2차 | ICDRG (국제접촉피부염연구학회) | 알러지 유발 성분군 |
| 3차 | 한국소비자원 비교조사 | 시판 제품 측정값 (SPF 실측 등) |

### 1-2. 국민템(기본템) 위주

힙한 신제품, 인플루언서 PR 제품은 제외한다. 기준은 다음 셋 중 하나 이상:

- 올리브영 카테고리별 누적 베스트 (3년 이상)
- 다이소/CU 등 오프라인 광범위 유통
- 성분 단순함 + 가격 접근성 + 국내 출시 5년 이상

### 1-3. "기능"이 아니라 "필터"

좋은 제품의 조건은 마케팅 카피("촉촉한", "탄력")가 아니라 측정 가능한 attribute여야 한다. attribute는 db_modeling.md의 Product Attribute 사전을 따른다.

---

## 2. 화면별 갭 분석

| 화면 | 와이어프레임 | DB 스키마 | 콘텐츠/룰/시드 | 비고 |
|------|------|------|------|------|
| S01 Landing | ✅ | ✅ | ✅ Perplexity 카피 | OK |
| S02 Priority Gate | ✅ | ✅ | ❌ Rule 인스턴스 0개 | **P1** |
| S03 Category Decision Box1 (기본 확인) | ✅ | ✅ | ❌ context_questions 0개 | **P2** |
| S04 Category Decision Box2 (카테고리 기준) | ✅ | ✅ | ❌ 카테고리별 questions 0개 | **P2** |
| S05 Category Decision Box3 (판단 결과) | ✅ | ✅ | ⚠️ Box2 결과 자동 생성 | Box2 완료 후 자동 |
| S06 Product Matrix | ✅ | ✅ | ❌ BASIC_CONDITION 정의 / 제품 시드 / attribute 가이드 | **P0** |
| S07 Product Detail | ✅ | ✅ | ❌ 적합도 태그 룰 | **P3** |
| S08 Reaction Traceback | ✅ | ✅ | ❌ 성분 사전 / 그룹 / 추론 룰 | **P3** |
| 관리자 화면 전반 | ✅ | ✅ | ⚠️ 시드만 있으면 동작 | 위 작업의 부산물 |

---

## 3. 작업 우선순위

### Why this order?

**S06(Product Matrix)부터 채워야 모든 화면이 의미를 갖는다.**

이유: 다른 화면들의 결론(CTA, 필터 선택)이 결국 Product Matrix로 모인다. Matrix가 텅 비어 있으면 Priority Gate Rule을 아무리 정교하게 만들어도 사용자에게 보여줄 게 없다.

### 권장 순서

```
P0  Product Matrix 시드 (S06)
       ├─ 카테고리별 BASIC_CONDITION 객관적 정의
       ├─ Product Attribute 측정 가이드라인
       └─ 카테고리별 국민템 5~10개 시드
        ↓
P1  Priority Gate Rule (S02)
       └─ 와이어프레임 결과 매핑 표 → priority_rules row
        ↓
P2  Context Questions (S03, S04)
       ├─ context_questions row
       └─ question_visibility_conditions row
        ↓
P3  Product Filter Mappings + 적합도 태그 (S06, S07)
       └─ user_facts → attribute 조건 변환표
        ↓
P4  Reaction Traceback (S08)
       ├─ ingredients 사전
       ├─ ingredient_groups + members
       └─ 원인 후보 추론 룰
```

---

## 4. P0 — Product Matrix 시드

### 4-1. 카테고리별 "좋은 제품의 조건" 정의

`product_filter_mappings.filter_type = 'BASIC_CONDITION'` 으로 등록할 항목과 그 객관적 근거를 카테고리별로 작성한다.

#### 선크림 (sunscreen)

| filter_key | 정의 (객관적 기준) | 출처 |
|------------|-------------------|------|
| `spf_50_plus` | SPF 50 이상 | 식약처 기능성 화장품 고시 — SPF 50+ 표기는 60 이상이지만, 일상 권장 최소치는 SPF 50 (식약처 자외선차단지수 측정 가이드) |
| `pa_4_plus` | PA++++ (PFA 16 이상) | 식약처 기능성 화장품 고시 — PA 등급 |
| `eye_sting_low` | 눈시림 위험 낮음 (`none` 또는 `low`) | 한국소비자원 비교조사 + 사용자 후기 데이터 종합 |
| `white_cast_low` | 백탁 적음 (`none` 또는 `low`) | 한국소비자원 비교조사 + 사용자 후기 데이터 종합 |
| `makeup_compat_good` | 메이크업 위/아래 사용 시 밀림 없음 | 사용감 측정 (자체 평가 기준 필요) |

> **추가 검토**: 자외선 필터 종류(`filter_type` = physical/chemical/hybrid) 자체는 BASIC_CONDITION이 아니라 정보성 표시. "physical만 좋다"는 잘못된 통념.

#### 세럼 (serum)

식약처 기능성 화장품 고시 기준 유효 함량을 만족하는지를 BASIC_CONDITION으로 사용한다.

| filter_key | 정의 (객관적 기준) | 출처 |
|------------|-------------------|------|
| `effective_dose_active` | 주력 성분이 식약처 고시 함량 이상 | 식약처 기능성 화장품 심사규정 |
| `low_irritation` | 자극 가능성 낮음 (`irritation_risk = low`) | conflict_ingredients 동시 함유 여부 + 향료/알코올 함량 |
| `clear_purpose` | 목적 성분이 명시적으로 표기됨 | 제조사 표기 의무 |
| `usage_time_specified` | 사용 시간대(아침/밤)가 명시됨 | 레티놀, 비타민C 등은 시간대 의존 |

**식약처 기능성 화장품 고시 함량 기준 (이 표를 시드에 그대로 사용):**

| 성분 | 기능 | 유효 함량 |
|------|------|----------|
| 나이아신아마이드 | 미백 | 2~5% |
| 알부틴 | 미백 | 2~5% |
| 아스코빌글루코사이드 | 미백 | 2% |
| 아데노신 | 주름 개선 | 0.04% |
| 레티놀 | 주름 개선 | 2,500~10,000 IU/g |
| 레티닐팔미테이트 | 주름 개선 | 10,000 IU/g (2024 변경) |
| 살리실산(BHA) | 여드름 완화 | 0.5~2% |

> **검증 필요**: 위 함량 기준은 wireframe_summary 작성 시점 자료다. 시드 데이터 확정 전 식약처 고시 최신본(현재 기준)을 한 번 더 크로스체크할 것.

#### 립케어 (lipcare)

| filter_key | 정의 (객관적 기준) | 출처 |
|------------|-------------------|------|
| `high_moisture` | 보습 지속력 `high` (occlusive 성분 함유) | 페트롤라툼/라놀린/시어버터/호호바오일 등 함유 |
| `no_menthol` | 멘톨/캠퍼/유칼립톨 미함유 | AAD: 입술 자극 성분으로 분류 |
| `low_fragrance` | 향료 미함유 또는 5번째 이후 표기 | ICDRG 알러지 빈출 성분 |

#### 로션/크림 (moisturizer) — 시드 추가 필요

현재 db_modeling에는 attribute 사전이 없다. 추가가 필요하다.

| filter_key | 정의 | 출처 |
|------------|------|------|
| `barrier_ingredients` | 세라마이드/콜레스테롤/지방산 함유 | 대한피부과학회 권고 |
| `triple_moisture` | humectant + emollient + occlusive 3종 구조 | AAD 권고 |
| `no_essential_oil` | 에센셜 오일 미함유 | ICDRG |

#### 클렌저 (cleanser) — 시드 추가 필요

| filter_key | 정의 | 출처 |
|------------|------|------|
| `mild_ph` | pH 5.0~6.5 (약산성) | 피부 정상 pH 기준 |
| `low_sls` | SLS/SLES 미함유 또는 후순위 표기 | 자극 측정 다수 학술 자료 |

---

### 4-2. Product Attribute 측정 가이드라인

DB에 `eye_sting`, `white_cast` 같은 ENUM이 있지만, **무엇을 보고 `low`/`medium`/`high`로 분류할지 기준이 없다.** 이게 정해지지 않으면 관리자가 attribute를 입력할 때마다 주관적으로 판단하게 된다.

각 attribute별 측정 기준을 별도 문서로 작성해야 한다.

#### 예시: 선크림 `eye_sting`

| 등급 | 판정 기준 |
|------|----------|
| `none` | 화학 필터 미함유 (Pure physical) |
| `low` | 화학 필터 함유하나 옥토크릴렌/티노솔 등 저자극 위주 |
| `medium` | 옥시벤존, 아보벤존 등 일반 화학필터 |
| `high` | 옥시벤존 + 알코올 동시 함유 또는 사용자 후기 90% 이상 눈시림 보고 |

#### 예시: 선크림 `white_cast`

| 등급 | 판정 기준 |
|------|----------|
| `none` | Tinted 또는 화학 필터 only |
| `low` | 산화아연/이산화티탄 함유하나 마이크로 분산 처리 |
| `medium` | 산화아연/이산화티탄 일반 입자 |
| `high` | 무기 자차 단독 + Pure white finish |

→ 관리자 화면 Tooltip으로 노출하면 입력 일관성 확보.

---

### 4-3. 국민템 제품 시드 — 카테고리별 5~10개

선정 기준 (4-1, 1-2 참조):
- 올리브영 카테고리 누적 베스트 3년 이상
- 또는 단종 위험 낮은 스테디셀러
- 가격 접근성 (~5만원 이하 우선)
- 성분 단순함 (액티브 1~2개)

#### 카테고리별 후보 (검증 필요)

각 후보별로 (1) 가격대 (2) attribute 값 (3) 전성분 을 채워서 등록해야 한다.

**선크림** — 라운드랩 자작나무 / 닥터지 그린마일드 / 아넷사 마일드 / 비욘드 에코 / 이니스프리 데일리

**세럼**
- 미백: 토니모리 비타C / 닥터자르트 비타C
- 주름: 더샘 셀 리뉴얼 / 미샤 타임 레볼루션
- 진정: 라운드랩 1025 독도 / 이즈앤트리 그린티

**립케어** — 바세린 립테라피 / 라네즈 슬리핑 마스크 / 닥터자르트 시카페어 립 / 키엘 립밤 #1

**로션/크림** — 세타필 모이스처라이저 / CeraVe 모이스처라이징 / 일리윤 세라마이드 / 라운드랩 자작나무

**클렌저** — 닥터지 폼 / 토리든 다이브인 / 라운드랩 자작나무 / 이즈앤트리 히알루론산

> 위 목록은 **출발점이지 확정안이 아니다.** 실제 등록 전:
> 1. 올리브영 카테고리 베스트 최근 3년 누적 데이터로 재검증
> 2. 단종/리뉴얼 여부 확인
> 3. 전성분 표시 페이지(올리브영, 화해 등) 출처와 함께 attribute 입력

---

## 5. P1 — Priority Gate Rule

### 5-1. 작업 내용

wireframe_summary.md의 **"체크리스트 별 실제 결과물" 표 12개 행**을 그대로 priority_rules row로 변환한다. 이게 P1의 전부다 — 표는 이미 있으니 DB 형식으로 옮기기만 하면 된다.

### 5-2. 변환 양식 (예시 1개)

원본 표 행:
> 최근 자극 반복 / 문제 반응 있음 → "지금은 새 제품보다 피부 반응 안정화가 먼저예요."

DB row:
```yaml
priority_rules:
  name: "최근 자극 반복 → 새 제품 보류"
  priority: 1
  result_type: HOLD
  result_title: "지금은 새 제품보다 피부 반응 안정화가 먼저예요."
  result_description: |
    최근 7일 내 따가움, 붉어짐, 가려움이 반복되면
    원인을 파악하기 전에 새 제품을 추가하지 않는 게 좋아요.
  cta_label: "현재 루틴 점검하기"
  cta_target: "/routine-check"

priority_rule_conditions:
  - fact_key: life.recent_irritation
    operator: EQ
    value: true
    state: REQUIRED
```

### 5-3. 12개 Rule 우선순위 권장값

```
priority 1   최근 자극 반복         → HOLD
priority 2   레티놀+비타민C+AHA 동시  → HOLD (액티브 과다)
priority 3   기능성 제품 다수 사용   → HOLD (루틴 단순화 먼저)
priority 4   최근 신제품 2개+ 추가  → HOLD (루틴 안정화)
priority 5   클렌징 불안정          → ROUTE_CATEGORY (cleanser)
priority 6   야외+선크림 불안정     → ROUTE_CATEGORY (sunscreen)
priority 7   선크림 사용감으로 생략  → ROUTE_CATEGORY (sunscreen, 사용감 필터)
priority 8   세안 후 당김 반복     → ROUTE_CATEGORY (moisturizer)
priority 9   보습제 미사용         → ROUTE_CATEGORY (moisturizer)
priority 10  메이크업 밀림         → CAUTION (선크림+보습 궁합 안내)
priority 11  비슷한 제품 다수 보유  → CAUTION (기존 정리 먼저)
priority 12  안정 + 자극 없음     → PASS (기능성 제품 OK)
```

> priority 숫자가 작을수록 먼저 평가. 첫 번째로 매칭되는 Rule이 결과로 채택된다.

---

## 6. P2 — Context Questions (S03, S04)

### 6-1. 작업 내용

wireframe_summary.md의 Box1(기본 확인) + Box2(카테고리 기준) 표를 `context_questions` + `question_visibility_conditions` row로 변환한다.

### 6-2. 변환 양식 예시

원본 표:
> 선크림 / 눈시림 / "선크림을 바르면 눈이 시린 편인가요?"

DB row:
```yaml
context_questions:
  fact_key: context.eye_sting
  question: "선크림을 바르면 눈이 시린 편인가요?"
  input_type: BOOLEAN
  screen: context
  ui_section: category_criteria
  sort_order: 20

question_visibility_conditions:
  - fact_key: category.selected
    operator: EQ
    value: "sunscreen"
    state: REQUIRED
```

### 6-3. 작성 분량

- Box1 공통 질문: 6개
- Box2 카테고리별:
  - 선크림 6개
  - 세럼 6개
  - 립케어 6개
  - (로션/크림, 클렌저는 나중에 추가)
- **총 ~24개 질문 + 각각 노출 조건 1~3개**

---

## 7. P3 — Product Filter Mapping + 적합도 태그

### 7-1. Product Filter Mapping

`user_facts` → `attribute 조건` 변환표를 `product_filter_mappings` row로 등록한다. wireframe_summary.md의 "Product Filter Mapping 관리 페이지" 표가 5개 예시를 보여줬으니, 이걸 모든 fact_key에 대해 확장한다.

### 7-2. 적합도 태그 룰 (S07 Product Detail)

각 제품의 적합도(`✓ 적합 / △ 주의 / ✕ 비추`)를 어떻게 계산할지 정의한다.

권장 룰 (단순한 결정형):
- HARD_FILTER 모두 통과 + CAUTION 0개 → ✓ 적합
- HARD_FILTER 모두 통과 + CAUTION 1개 이상 → △ 주의
- HARD_FILTER 1개 이상 미통과 → ✕ 비추 (= 목록에서 제거)

> 점수형(가중치)은 MVP에서 과한 설계. 결정형 룰로 시작하고, 사용자 피드백 들어오면 그때 점수형으로 옮긴다.

---

## 8. P4 — Reaction Traceback

### 8-1. 성분 사전 (ingredients)

#### 최소 필요 분량

전체 INCI 성분(수만 개)을 다 넣을 필요 없다. 다음만 우선:

- 식약처 기능성 화장품 고시 성분 (~30개)
- 식약처 사용 한도 성분 (~50개)
- ICDRG 알러지 빈출 성분 (~20개)
- 자외선 차단 필터 (~25개)
- 흔한 향료 / 에센셜오일 (~30개)

→ **~150개로 MVP 충분**

각 성분 row:
```yaml
ingredients:
  inci_name: "Niacinamide"
  korean_name: "나이아신아마이드"
  cas_number: "98-92-0"
  category: "ACTIVE"
  function: "미백"
  effective_dose_min: 2
  effective_dose_max: 5
```

### 8-2. 성분 그룹 (ingredient_groups)

wireframe_summary.md의 "원인 후보로 볼 수 있는 성분군" 5개를 그대로 사용:

```yaml
ingredient_groups:
  - key: "fragrance"           # 향료/fragrance 계열
  - key: "essential_oils"      # 에센셜오일 계열
  - key: "menthol_cooling"     # 멘톨/화한 사용감
  - key: "uv_filters"          # 특정 자외선 차단 필터
  - key: "high_dose_actives"   # 고함량 액티브
```

각 그룹별 ingredient_group_members 시드를 작성한다. 예시:

| 그룹 | 포함 성분 (예) |
|------|---------------|
| fragrance | Parfum, Fragrance, Limonene, Linalool, Geraniol, Citronellol |
| essential_oils | Lavender Oil, Tea Tree Oil, Rosemary Oil, Peppermint Oil |
| menthol_cooling | Menthol, Camphor, Eucalyptol, Methyl Lactate |
| uv_filters | Oxybenzone, Avobenzone, Octocrylene, Octinoxate |
| high_dose_actives | Retinol >0.3%, Vitamin C >15%, AHA >10% |

### 8-3. 원인 후보 추론 룰

문제 상품 vs 괜찮은 상품 비교 로직:

```
for each ingredient_group G:
  problem_count   = (G에 속한 성분이 PROBLEM 상품에 있는 개수)
  ok_count        = (G에 속한 성분이 OK 상품에 있는 개수)

  if problem_count >= 1 and ok_count == 0:
    confidence = HIGH        # 문제 상품에만 있음
  elif problem_count >= 1 and ok_count < problem_count:
    confidence = MEDIUM       # 문제 상품에 더 많음
  elif problem_count >= 1 and ok_count >= problem_count:
    confidence = LOW          # 양쪽 모두 비슷
  else:
    skip                       # 후보 아님
```

> Probabilistic 원칙(설계 원칙 4번)에 따라 결과 표기는 "원인 가능성 있음"이지 "원인 확정"이 아님.

---

## 9. 작업량 견적

P0~P4 전체를 1인 기준으로 작성한다고 가정.

| 단계 | 작업량 | 메모 |
|------|--------|------|
| P0 BASIC_CONDITION 정의 + attribute 가이드 | 2~3일 | 출처 확인이 시간 잡아먹음 |
| P0 제품 시드 5카테고리 × 6개 | 2~3일 | 전성분 입력이 핵심 |
| P1 Priority Rule 12개 | 0.5일 | 변환 작업 |
| P2 Context Question 24개 | 1일 | 변환 작업 |
| P3 Filter Mapping 30~40개 | 1일 | 매핑표 작성 |
| P4 ingredients ~150개 + 그룹 5개 | 2~3일 | 사전 데이터 입력 |
| P4 Reaction 추론 룰 구현 | 0.5일 | 로직 단순 |
| **합계** | **~10일** | 검수 별도 |

---

## 10. 다음 액션 — 권장 순서

1. **이 문서를 14_content_plan.md 같은 형식으로 저장**해서 wireframe_summary, db_modeling 시리즈에 포함시킨다.
2. **P0 BASIC_CONDITION 정의 부분(섹션 4-1)부터 식약처 고시 최신본 크로스체크.** 함량 기준이 변경됐을 가능성 있음.
3. **국민템 후보 5카테고리 × 6개 = 30개 리스트를 먼저 확정.** 그 다음 attribute를 채운다 (제품을 정해야 attribute가 정해짐).
4. **이 30개의 전성분을 ingredients 사전과 매핑할 때 P4 작업이 자연스럽게 진행됨.** P0와 P4는 서로 의존 — 같이 진행하는 게 효율적.
5. P1, P2는 변환 작업이니 위 셋이 끝난 뒤 한 번에.

---

## 11. 추가로 검토해야 하는 영역

본 계획에서 다루지 않았지만 추후 필요해질 영역:

- **이미지 자산**: 제품 이미지, 카테고리 아이콘, 결과 일러스트 — 출처/저작권 정책 필요
- **구매 링크 정책**: 올리브영/브랜드몰/쿠팡 중 어디로 보낼지, 제휴 관계 명시 정책
- **A/B 테스트 시나리오**: db_modeling에 ab_variant 컬럼은 있으나 어떤 실험을 할지 미정
- **GDPR/개보법 정책**: device_id 영구 보관 + user_facts 이력 보관에 대한 동의 흐름
- **Concern 태그 → 카테고리 라우팅 매핑 상수**: 프론트 코드 상수로 관리하기로 했으나, 실제 매핑 표 미작성

이들은 콘텐츠 작성과 별개의 트랙이므로, 본 계획서에서는 인덱스만 남기고 별도 문서로 다룬다.
