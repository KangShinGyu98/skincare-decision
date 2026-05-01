# K-Beauty Decision MVP — Page Content Specification

화면에 어떻게 보여줄지 

---

## 이 문서의 목적

각 화면을 실제로 개발할 때 **어떤 텍스트, 어떤 데이터, 어떤 룰이 들어가야 하는지**를 한 화면씩 정리한다.  
와이어프레임이 "어떻게 생겼는가"를, DB 모델링이 "어떻게 저장되는가"를 다룬다면, 이 문서는 **"화면에 무엇이 보이는가"**를 다룬다.

### 표기 규칙

| 마크 | 의미 |
|------|------|
| ✅ | 콘텐츠 확정됨 (이 문서에 그대로 사용) |
| ⏳ | 슬롯 정의됨, 콘텐츠 작성 필요 |
| 🔗 | 동적 데이터 (DB에서 조회) |
| 📐 | Rule 기반 동적 출력 |

---

## 화면 목록

| ID | 화면 | 우선순위 |
|----|------|---------|
| S01 | Landing / Intent Entry | P1 |
| S02 | Priority Gate | P1 |
| S03 | Category Decision — Box 1 (기본 확인) | P1 |
| S04 | Category Decision — Box 2 (카테고리 기준) | P1 |
| S05 | Category Decision — Box 3 (판단 결과) | P1 |
| S06 | Product Matrix | P0 |
| S07 | Product Detail | P2 |
| S08 | Reaction Traceback | P3 |

---

# S01 — Landing / Intent Entry

## 콘텐츠 슬롯 일람

| 슬롯 | 타입 | 상태 |
|------|------|------|
| Nav Bar 메뉴 라벨 | 정적 | ✅ |
| Hero Title / Subtitle | 정적 | ✅ |
| 4-Segment 카드 (제목 + 설명) | 정적 | ✅ |
| Priority Gate 소개 섹션 | 정적 | ✅ |
| Context 소개 섹션 | 정적 | ✅ |
| Product Matrix 소개 섹션 | 정적 | ✅ |
| Reaction Traceback 소개 섹션 | 정적 | ✅ |
| Concern Mapper 캐러셀 태그 | 동적 (프론트 상수) | ⏳ |
| Concern → Category 라우팅 매핑 | 코드 상수 | ⏳ |

## 1. Nav Bar

### 메뉴 항목 (확정)

| 라벨 | 링크 |
|------|------|
| 홈 | `/` |
| 진단 | `/priority-gate` |
| 제품 비교 | `/product-matrix` |
| 실패 추적 | `/reaction-traceback` |
| 시작하기 (CTA) | `/priority-gate` |

> 메뉴명은 잠정안. 추후 카피 검수 필요.

## 2. Hero Section

### Title
> **지금 필요한 건 제품 추천이 아니라 루틴 점검입니다**

### Subtitle
> 브러시는 1년째 안 빨면서, 저자극 세럼을 검색하고 있지는 않나요?
> 토너가 4개나 쌓여 있는데, 장바구니에는 또 토너가 들어 있지는 않나요?
> 로션 하나 고르는데도, 성분·제형·끈적임·휴대성까지 따지고 있지는 않나요?


## 3. 4-Segment 카드

| ID | 제목 | 설명 | 이동 경로 |
|----|------|------|----------|
| segment_A | 전체 루틴 점검하기 | 필요한건 제품이 아닐지도 모릅니다. 루틴부터 점검해보세요. | `/priority-gate` |
| segment_B | 고민은 있는데 카테고리를 모름 | 문제는 있지만 어떤 제품군이 필요한지 모르는 사용자 | `/concern-mapper` |
| segment_C | 이미 찾는 제품군이 있음 | 선크림, 세럼 등 보고 싶은 제품군이 있는 사용자 | `/product-matrix` |
| segment_D | 실패 원인 추적형 | 특정 제품 사용 후 문제가 생긴 사용자 | `/reaction-traceback` |

### 클릭 시 처리
```
session_events INSERT { event_name: "segment_clicked", element_id: "segment_<X>" }
→ user_facts INSERT { fact_key: "session.segment", value: "<A/B/C/D>" }
→ 라우팅
```

## 4. Section 2 — Priority Gate 소개

### Heading
> 제품을 고르기 전에, 지금 사도 되는 상태인지 먼저 확인해요.

### Body
> 최근 자극, 루틴 변경, 선크림 사용, 클렌징, 보습 상태를 확인해  
> 새 제품을 사야 할지, 잠시 보류해야 할지 알려줍니다.

### Bullet Points
- 새 제품 구매 가능 여부 판단
- 루틴 안정화 필요 여부 확인
- 선크림 / 클렌징 / 보습 우선순위 안내
- 진단이 아니라 gate

### 이미지 슬롯
`[Priority Gate 화면 스크린샷]` ⏳ — 디자인 작업 후 첨부

## 5. Section 3 — Context 소개

### Heading
> 모든 제품군에 같은 질문을 하지 않아요.

### Body
> 립밤을 고르는데 피부 타입을 묻지 않고,  
> 선크림을 고를 때는 눈시림, 백탁, 메이크업 궁합을 묻습니다.  
> 제품군에 맞는 질문만 보여주고, 그 답변을 이후 필터링에 반영합니다.

### Bullet Points
- 제품군별 질문 자동 변경
- 불필요한 질문 제거
- 사용 장소, 시간대, 휴대성, 민감도 반영
- Context 답변을 Product Matrix 필터로 연결

## 6. Section 4 — Product Matrix 소개

### Heading
> 제품을 끝없이 나열하지 않아요.

### Body
> 좋은 제품의 조건과 개인화 필터를 기준으로  
> 가격대별 추천 후보를 한 번에 비교할 수 있게 보여줍니다.

### Bullet Points
- 제품군 Select
- 좋은 제품의 조건 태그
- 개인화 필터
- 가격대별 Tier List
- ✓ 적합 / △ 주의 / ✕ 비추 표시

## 7. Section 5 — Reaction Traceback 소개

### Heading
> 어떤 제품 때문에 뒤집어졌는지 모르겠다면

### Body
> 문제 있었던 제품과 괜찮았던 제품을 함께 등록하면,  
> 공통 성분과 차이점을 비교해 원인 후보를 추측합니다.  
> 확정 진단이 아니라, 다음 선택에서 피해야 할 가능성을 줄이는 도구입니다.

### CTA 영역 라벨
- `[문제 상품 등록 +]`
- `[괜찮은 상품 등록 +]`

## 8. Section 6 — Concern Mapper 캐러셀

### Heading
> 고민부터 시작해도 돼요

### Subtitle
> 어떤 제품이 필요한지 몰라도 괜찮아요.  
> 고민 유형을 고르면 카테고리로 이어드립니다.

### 4-그룹 × 태그 구조 (프론트 상수)

```ts
// 프론트 코드 상수로 관리 (DB 없음)
export const CONCERN_GROUPS = [
  {
    key: "acute_trouble",
    label: "일회성 트러블",
    tags: ["뾰루지", "여드름", "붉어짐", "뒤집힘", "트러블 반복", "민감 반응"]
  },
  {
    key: "daily_discomfort",
    label: "일상 불편",
    tags: ["건조", "당김", "각질", "번들거림", "눈가 건조", "입술 트임"]
  },
  {
    key: "makeup",
    label: "화장 / 꾸미기",
    tags: ["화장 뜸", "밀림", "쿠션 추천", "파운데이션 고민", "선크림 추천", "립 제품"]
  },
  {
    key: "complex",
    label: "컴플렉스",
    tags: ["잡티", "다크서클", "홍조", "모공", "피부톤", "탄력"]
  }
];
```

### Concern → Category 라우팅 매핑 ⏳

각 고민 태그가 어느 제품군 Matrix로 이어질지 정의 필요. **모든 24개 태그에 대해 작성해야 한다.**

```ts
export const CONCERN_TO_CATEGORY: Record<string, {
  category: string;
  defaultFilters: string[];
}> = {
  "입술 트임":     { category: "lipcare",   defaultFilters: ["high_moisture"] },
  "선크림 추천":   { category: "sunscreen", defaultFilters: ["spf_50_plus", "pa_4_plus"] },
  "건조":         { category: "moisturizer", defaultFilters: ["barrier_ingredients"] },
  "뾰루지":       { category: "serum",     defaultFilters: ["bha_active"] },
  // ...나머지 20개 태그 매핑 필요
};
```

> 24개 매핑 표 전체는 별도 시드 작업으로 채운다 (P2 단계).

---

# S02 — Priority Gate

## 콘텐츠 슬롯 일람

| 슬롯 | 타입 | 상태 |
|------|------|------|
| 화면 제목 / 설명 | 정적 | ⏳ |
| Box 1: Life/루틴 체크리스트 (9개 질문) | 동적 (DB 또는 상수) | ⏳ |
| Box 2: 사용 중인 제품 체크리스트 (17개 항목) | 동적 (DB 또는 상수) | ⏳ |
| Box 3: 결과 문구 (12개 Rule 결과) | 📐 Rule 기반 | ⏳ |
| CTA 버튼 라벨 | 정적 | ⏳ |
| Priority Rules 인스턴스 (12개) | 🔗 DB `priority_rules` | ⏳ |
| Priority Rule Conditions | 🔗 DB `priority_rule_conditions` | ⏳ |

## 1. 화면 제목

### Heading ⏳
> 지금 새 제품을 사도 되는 상태인지 먼저 확인해요

### Subtitle ⏳
> 최근 피부 상태와 사용 중인 제품을 알려주시면,  
> 무엇부터 정리해야 할지 알려드릴게요.

## 2. Box 1 — Life / 루틴 체크리스트

### 9개 질문 슬롯

| # | fact_key | 질문 | input_type | options |
|---|----------|------|-----------|---------|
| 1 | `life.recent_irritation` | 최근 7일 안에 따가움, 붉어짐, 가려움이 반복됐나요? | BOOLEAN | 예 / 아니오 |
| 2 | `life.recent_new_products` | 최근 2주 안에 새 제품을 2개 이상 추가했나요? | BOOLEAN | 예 / 아니오 |
| 3 | `life.outdoor_activity` | 낮에 밖에 있는 시간이 많은 편인가요? | ENUM | 거의 매일 / 가끔 / 거의 없음 |
| 4 | `routine.sunscreen_use` | 선크림을 거의 매일 바르나요? | BOOLEAN | 예 / 아니오 |
| 5 | `routine.cleansing_stable` | 선크림/메이크업 후 클렌징이 잘 되고 있나요? | BOOLEAN | 예 / 아니오 |
| 6 | `routine.recent_dry_tight` | 세안 후 당김, 건조, 따가움이 자주 있나요? | BOOLEAN | 예 / 아니오 |
| 7 | `routine.moisturizer_daily` | 보습제를 매일 꾸준히 사용하나요? | BOOLEAN | 예 / 아니오 |
| 8 | `routine.makeup_frequent` | 베이스 메이크업을 자주 하나요? | BOOLEAN | 예 / 아니오 |
| 9 | `flow.current_concern` | 지금 가장 해결하고 싶은 고민은 무엇인가요? | SINGLE_SELECT | 트러블 / 건조 / 잡티 / 주름 / 모공 / 기타 |

> 위 9개를 `context_questions` 테이블에 row로 등록 (`screen='priority_gate'`, `ui_section='life_routine'`).

## 3. Box 2 — 사용 중인 Skin Care 제품 체크리스트

### fact_key
`product.owned_categories` (MULTI_ENUM)

### 17개 옵션 슬롯

| # | value | 라벨 |
|---|-------|------|
| 1 | `cleansing_oil` | 클렌징 오일 / 밤 / 워터 |
| 2 | `foam_cleanser` | 폼클렌저 / 젤클렌저 |
| 3 | `toner` | 토너 |
| 4 | `skin` | 스킨 |
| 5 | `toner_pad` | 토너패드 |
| 6 | `essence` | 에센스 |
| 7 | `serum` | 세럼 |
| 8 | `ampoule` | 앰플 |
| 9 | `lotion` | 로션 |
| 10 | `cream` | 크림 |
| 11 | `sunscreen` | 선크림 |
| 12 | `exfoliator` | 각질 제거제 / 필링 제품 |
| 13 | `retinol` | 레티놀 제품 |
| 14 | `vitamin_c` | 비타민C 제품 |
| 15 | `aha_bha` | AHA / BHA 제품 |
| 16 | `mask_pack` | 마스크팩 |
| 17 | `lipcare` | 립케어 제품 |

## 4. Box 3 — 결과 출력 (📐 Rule 기반)

### 출력 구조

```
[결과 타입 배지]    예: "보류"
[결과 제목]         예: "지금은 새 제품보다 피부 반응 안정화가 먼저예요."
[결과 설명]         예: "최근 7일 내 따가움이 반복되면..."
[CTA 버튼]          예: "현재 루틴 점검하기"
```

### 12개 Priority Rules 인스턴스 ⏳

이 12개를 `priority_rules` + `priority_rule_conditions` 테이블에 row로 등록한다.

#### Rule #1 — 최근 자극 반복

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
  - { fact_key: "life.recent_irritation", operator: "EQ", value: true, state: "REQUIRED" }
```

#### Rule #2 — 액티브 성분 동시 사용 과다

```yaml
priority_rules:
  name: "레티놀+비타민C+AHA 동시 → 액티브 보류"
  priority: 2
  result_type: HOLD
  result_title: "자극 가능성이 높아 새 세럼이나 필링 제품은 보류하는 게 좋아요."
  result_description: |
    레티놀, 비타민C, AHA/BHA를 동시에 사용 중이면
    피부 장벽 부담이 커서 새 액티브 제품 추가는 피하는 게 좋아요.
  cta_label: "병행 가이드 보기"

priority_rule_conditions:
  - { fact_key: "product.owned_categories", operator: "CONTAINS", value: "retinol", state: "REQUIRED" }
  - { fact_key: "product.owned_categories", operator: "CONTAINS", value: "vitamin_c", state: "REQUIRED" }
  - { fact_key: "product.owned_categories", operator: "CONTAINS", value: "aha_bha", state: "REQUIRED" }
```

#### Rule #3 — 기능성 제품 다수 사용

```yaml
priority_rules:
  name: "기능성 제품 다수 → 루틴 단순화 먼저"
  priority: 3
  result_type: HOLD
  result_title: "새 기능성 제품은 잠시 보류하고 루틴을 단순화하는 게 좋아요."
  result_description: |
    세럼/앰플/에센스 등 기능성 제품을 여러 개 사용 중이면
    효과를 평가하기 어려우니 먼저 정리해보세요.

priority_rule_conditions:
  # 세럼+앰플+에센스 중 2개 이상 동시 사용
  - { fact_key: "product.owned_categories", operator: "CONTAINS_ANY_2", value: ["serum","ampoule","essence"], state: "REQUIRED" }
```

> CONTAINS_ANY_2 같은 연산자는 DB 스키마에 없음. 추가 정의하거나 단일 Rule을 여러 개로 분해 필요.

#### Rule #4~#12 (요약 — 각 항목별 conditions 작성 필요)

| # | priority | result_type | 결과 제목 | 핵심 조건 |
|---|---------|-------------|----------|----------|
| 4 | 4 | HOLD | 지금은 새 제품보다 현재 루틴을 7~14일 고정하는 게 먼저예요. | `life.recent_new_products = true` |
| 5 | 5 | ROUTE_CATEGORY | 새 제품보다 클렌징 루틴 점검이 먼저예요. | `routine.cleansing_stable = false` |
| 6 | 6 | ROUTE_CATEGORY | 세럼보다 선크림 루틴이 먼저예요. | `life.outdoor_activity = high` AND `routine.sunscreen_use = false` |
| 7 | 7 | ROUTE_CATEGORY | 매일 쓸 수 있는 선크림을 먼저 찾아야 해요. | `routine.sunscreen_use = false` AND (사용감 이슈 표현) |
| 8 | 8 | ROUTE_CATEGORY | 기능성 제품보다 보습 루틴 고정이 먼저예요. | `routine.recent_dry_tight = true` |
| 9 | 9 | ROUTE_CATEGORY | 수분 세럼보다 매일 쓸 수 있는 로션/크림이 먼저예요. | `routine.moisturizer_daily = false` |
| 10 | 10 | CAUTION | 선크림, 보습제, 베이스 궁합을 같이 봐야 해요. | `routine.makeup_frequent = true` (밀림/들뜸은 별도 fact 필요) |
| 11 | 11 | CAUTION | 새로 사기보다 기존 제품을 먼저 정리해요. | `product.owned_categories` 중 동일 역할 다수 |
| 12 | 12 | PASS | 지금은 기능성 제품군을 봐도 괜찮아요. | 위 11개 모두 미매칭 (fallback) |

> Rule #11의 "동일 역할 다수" 판정은 사전 정의된 카테고리 그룹(예: 기능성 = serum + ampoule + essence)을 비교하는 별도 룰 엔진 처리가 필요. MVP에서는 Rule #3과 통합 가능.

### 평가 순서

```
priority 오름차순 정렬 (1 → 12)
첫 번째로 모든 REQUIRED 조건이 만족되는 Rule이 결과로 채택
EXCLUDED 조건 1개라도 만족되면 해당 Rule은 건너뜀
어떤 Rule도 매칭되지 않으면 → priority 12 (PASS) 폴백
```

---

# S03 — Category Decision Box 1 (기본 확인)

## 콘텐츠 슬롯 일람

| 슬롯 | 타입 | 상태 |
|------|------|------|
| 화면 제목 | 정적 | ⏳ |
| 6개 공통 질문 | 동적 (DB) | ⏳ |
| 진행 표시 (1/3) | 정적 | ⏳ |
| Next 버튼 라벨 | 정적 | ⏳ |

## 1. 화면 제목 ⏳

### Heading
> 어떤 상황에서 사용하실 건가요?

### Subtitle
> 사용 맥락에 맞춰 후보를 좁혀드릴게요.

## 2. 6개 공통 질문 ⏳

| # | fact_key | 질문 | input_type | options |
|---|----------|------|-----------|---------|
| 1 | `context.usage_place` | 주로 어디서 쓸 건가요? | SINGLE_SELECT | 집 / 밖 / 둘 다 |
| 2 | `context.usage_time` | 언제 쓸 건가요? | SINGLE_SELECT | 아침 / 밤 / 둘 다 |
| 3 | `context.portable` | 외출 시 들고 다니며 사용할 예정인가요? | BOOLEAN | 예 / 아니오 |
| 4 | `context.budget` | 예산대를 정해두셨나요? | SINGLE_SELECT | 2만원 이하 / 2~5만원 / 5만원+ / 무관 |
| 5 | `context.past_failure` | 이전에 불편했던 사용감이나 성분이 있나요? | TAG | 끈적임 / 답답함 / 향 / 화한 느낌 / 없음 |
| 6 | `context.avoid_texture` | 피하고 싶은 사용감이 있나요? | MULTI_SELECT | 끈적임 / 답답함 / 무거움 / 향 / 화한 느낌 |

> 6개 모두 `context_questions` 테이블에 등록 (`screen='context'`, `ui_section='basic_context'`).
> Box1 질문은 카테고리 무관하게 항상 노출 (visibility_conditions 없음).
> 단, **립케어** 카테고리는 #4 예산만 노출하고 나머지 5개는 EXCLUDED 처리.

---

# S04 — Category Decision Box 2 (카테고리 기준)

## 콘텐츠 슬롯 일람

| 슬롯 | 타입 | 상태 |
|------|------|------|
| 카테고리별 질문 세트 (선크림 6 / 세럼 6 / 립케어 6) | 동적 (DB) | ⏳ |
| 카테고리 동적 헤더 | 정적 패턴 | ⏳ |
| 질문 노출 매트릭스 | 코드 상수 또는 DB | ⏳ |

## 1. 동적 헤더 패턴 ⏳

```
[선크림] 선택 시  → "선크림 고를 때 봐야 할 것"
[세럼]   선택 시  → "세럼 고를 때 봐야 할 것"
[립케어] 선택 시  → "립케어 고를 때 봐야 할 것"
```

## 2. 선크림 — 6개 질문 ⏳

| # | fact_key | 질문 | input_type | options | 노출 조건 |
|---|----------|------|-----------|---------|----------|
| 1 | `context.outdoor_intensity` | 야외 활동이 많은 편인가요? | SINGLE_SELECT | 매일 / 가끔 / 거의 없음 | `category.selected = sunscreen` |
| 2 | `context.eye_sting` | 선크림을 바르면 눈이 시린 편인가요? | BOOLEAN | 예 / 아니오 | `category.selected = sunscreen` |
| 3 | `context.white_cast_sensitive` | 백탁이 있으면 사용하기 어려운가요? | BOOLEAN | 예 / 아니오 | `category.selected = sunscreen` |
| 4 | `context.sunscreen_skip_reason` | 끈적임이나 답답함 때문에 선크림을 생략한 적이 있나요? | BOOLEAN | 예 / 아니오 | `category.selected = sunscreen` |
| 5 | `context.makeup_use` | 선크림 위에 베이스 메이크업을 하나요? | BOOLEAN | 예 / 아니오 | `category.selected = sunscreen` |
| 6 | `context.touch_up` | 밖에서 덧바를 수 있는 형태가 필요한가요? | BOOLEAN | 예 / 아니오 | `category.selected = sunscreen` AND `context.usage_place = outdoor` |

## 3. 세럼 — 6개 질문 ⏳

| # | fact_key | 질문 | input_type | options | 노출 조건 |
|---|----------|------|-----------|---------|----------|
| 1 | `context.serum_purpose` | 세럼으로 해결하고 싶은 고민은 무엇인가요? | SINGLE_SELECT | 미백 / 주름 / 진정 / 모공 / 트러블 / 보습 | `category.selected = serum` |
| 2 | `life.recent_irritation` | 최근 따가움, 붉어짐, 건조함이 있었나요? | BOOLEAN | 예 / 아니오 | `category.selected = serum` |
| 3 | `product.owned_actives` | 현재 레티놀, 비타민C, AHA/BHA 제품을 사용 중인가요? | MULTI_SELECT | 레티놀 / 비타민C / AHA / BHA / 없음 | `category.selected = serum` |
| 4 | `context.usage_time` | 아침에 사용할 제품인가요, 밤에 사용할 제품인가요? | SINGLE_SELECT | 아침 / 밤 / 둘 다 | `category.selected = serum` (Box1과 중복 시 자동 prefill) |
| 5 | `context.expectation_speed` | 빠른 효과보다 천천히 안정적인 변화를 원하나요? | BOOLEAN | 예 / 아니오 | `category.selected = serum` |
| 6 | `routine.sunscreen_use` | 세럼 사용 후 선크림을 꾸준히 바를 수 있나요? | BOOLEAN | 예 / 아니오 | `category.selected = serum` AND `context.serum_purpose IN [미백, 주름]` |

## 4. 립케어 — 6개 질문 ⏳

| # | fact_key | 질문 | input_type | options | 노출 조건 |
|---|----------|------|-----------|---------|----------|
| 1 | `context.lip_severity` | 입술 갈라짐이나 벗겨짐이 반복되나요? | BOOLEAN | 예 / 아니오 | `category.selected = lipcare` |
| 2 | `preference.menthol_sensitive` | 화한 립밤을 쓰면 불편한가요? | BOOLEAN | 예 / 아니오 | `category.selected = lipcare` |
| 3 | `preference.fragrance_sensitive` | 향이 강한 립 제품이 불편한가요? | BOOLEAN | 예 / 아니오 | `category.selected = lipcare` |
| 4 | `context.lip_reapply` | 자주 덧바르기 어려운 상황인가요? | BOOLEAN | 예 / 아니오 | `category.selected = lipcare` |
| 5 | `context.lip_outdoor` | 야외에서 사용할 립케어가 필요한가요? | BOOLEAN | 예 / 아니오 | `category.selected = lipcare` |
| 6 | `context.lip_form` | 스틱, 튜브, 밤 타입 중 선호가 있나요? | SINGLE_SELECT | 스틱 / 튜브 / 밤 / 무관 | `category.selected = lipcare` |

## 5. 노출 매트릭스 (요약)

| 질문 | sunscreen | serum | lipcare | moisturizer | cleanser |
|------|-----------|-------|---------|-------------|----------|
| 피부 타입 | ✓ | ✓ | ✕ | ✓ | ✓ |
| 눈시림 | ✓ | ✕ | ✕ | ✕ | ✕ |
| 백탁 | ✓ | ✕ | ✕ | ✕ | ✕ |
| 메이크업 궁합 | ✓ | ✕ | 선택 | ✓ | ✕ |
| 액티브 병행 | ✕ | ✓ | ✕ | 선택 | ✕ |
| 멘톨 / 화한 느낌 | ✕ | ✕ | ✓ | ✕ | ✕ |
| 향료 민감 | 선택 | ✓ | ✓ | ✓ | 선택 |
| 휴대성 | ✓ | ✕ | ✓ | ✕ | ✕ |

> 실제 구현은 `question_visibility_conditions` row로 표현된다.

---

# S05 — Category Decision Box 3 (판단 결과)

## 콘텐츠 슬롯 일람

| 슬롯 | 타입 | 상태 |
|------|------|------|
| 결과 메시지 (📐 조건별) | Rule 기반 | ⏳ |
| 상위 제품 N개 (3~5개) | 🔗 DB 조회 | ⏳ |
| 제품 카드 (이름, 브랜드, 가격대) | 🔗 DB 조회 | ⏳ |
| CTA 버튼 라벨 | 정적 | ✅ |

## 1. 결과 메시지 — 14개 패턴 ⏳

다음 표는 사용자 답변 조합에 따라 Box 3 상단에 노출될 결과 문구다. **이 문구들은 Priority Rule처럼 별도 테이블이 아니라, Box 2 답변 + Box 1 답변 조합에 따라 계산되는 동적 메시지다.**

| # | 조건 (요약) | 결과 메시지 |
|---|-----------|-------------|
| 1 | `context.usage_place = outdoor` | 휴대성, 지속력, 덧바르기 쉬운 형태를 우선으로 봐요. |
| 2 | `context.usage_place = indoor` | 휴대성보다 보습 지속력이나 기능성을 더 중요하게 봐요. |
| 3 | `context.usage_time = morning` | 메이크업 궁합, 끈적임, 선크림과의 조합을 같이 봐요. |
| 4 | `context.usage_time = night` | 자극 가능성, 병행 성분, 다음 날 피부 부담을 같이 봐요. |
| 5 | `context.eye_sting = true` | 눈시림 위험이 높은 선크림은 제외해요. |
| 6 | `context.white_cast_sensitive = true` | 백탁이 강한 선크림은 주의 태그를 붙여요. |
| 7 | `context.sunscreen_skip_reason = true` | 최고 스펙보다 매일 쓸 수 있는 사용감을 우선해요. |
| 8 | `product.owned_actives` 1개+ | 세럼은 병행 주의 성분을 확인한 뒤 후보를 줄여요. |
| 9 | `life.recent_irritation = true` | 자극 가능성이 높은 세럼은 제외하거나 주의 태그를 붙여요. |
| 10 | `context.lip_severity = true` | 립케어는 보습 지속력과 보호막 형성을 우선해요. |
| 11 | `preference.menthol_sensitive = true` | 멘톨이 있는 립케어는 제외하거나 주의 태그를 붙여요. |
| 12 | `preference.fragrance_sensitive = true` | 향료가 있는 제품은 주의하거나 제외해요. |
| 13 | `context.budget != 무관` | 해당 가격대 안에서만 제품 후보를 보여줘요. |
| 14 | `product.owned_categories` 중복 다수 | 새로 사기보다 기존 제품과 역할이 겹치는지 먼저 확인해요. |

> 여러 조건이 동시에 만족되면 메시지를 누적 표시한다. 단, 화면당 최대 3개까지만 노출한다 (UI 과부하 방지).

## 2. 상위 제품 N개 — 표시 형식

```
[제품 이미지]
브랜드명
제품명 (15자 제한, 길면 ellipsis)
₩가격
[✓ 적합 / △ 주의] 배지
```

## 3. CTA 버튼 ✅

| 라벨 | 동작 |
|------|------|
| 제품 보러가기 | `/product-matrix?category=<X>&filters=<auto>` |

---

# S06 — Product Matrix

## 콘텐츠 슬롯 일람

| 슬롯 | 타입 | 상태 |
|------|------|------|
| 제품군 Select 드롭다운 | 정적 옵션 | ✅ |
| BASIC_CONDITION 태그 (카테고리별) | 🔗 DB `product_filter_mappings` | ⏳ |
| PERSONALIZED 필터 태그 | 🔗 DB `product_filter_mappings` | ⏳ |
| 가격대 구간 라벨 | 정적 | ✅ |
| 적합도 배지 (✓ / △ / ✕) | 📐 Rule 기반 | ⏳ |
| 빈 상태 카피 | 정적 | ⏳ |
| 제품 카드 | 🔗 DB `products` | ⏳ |
| 제품 시드 데이터 (~30개) | 🔗 DB | ⏳ |

## 1. 제품군 Select ✅

| value | 라벨 |
|-------|------|
| `sunscreen` | 선크림 |
| `serum` | 세럼 |
| `lipcare` | 립케어 |
| `moisturizer` | 로션 / 크림 |
| `cleanser` | 클렌저 |

## 2. BASIC_CONDITION 태그 (카테고리별)

> 각 카테고리 진입 시 **기본 선택 상태**로 시작한다.

### 선크림

| filter_key | 표시 라벨 | 객관적 기준 |
|------------|----------|------------|
| `spf_50_plus` | SPF 50 이상 | 식약처 기능성 화장품 고시 |
| `pa_4_plus` | PA++++ | 식약처 기능성 화장품 고시 |
| `eye_sting_low` | 눈시림 낮음 | 자체 평가 (attribute `eye_sting IN [none,low]`) |
| `white_cast_low` | 백탁 적음 | 자체 평가 (attribute `white_cast IN [none,low]`) |
| `makeup_compat_good` | 메이크업 궁합 | 자체 평가 (attribute `makeup_compatibility = good`) |

### 세럼

| filter_key | 표시 라벨 | 객관적 기준 |
|------------|----------|------------|
| `effective_dose` | 유효 함량 충족 | 식약처 기능성 고시 함량 (나이아신아마이드 2~5%, 아데노신 0.04%, 알부틴 2~5% 등) |
| `low_irritation` | 자극 가능성 낮음 | attribute `irritation_risk = low` |
| `clear_purpose` | 목적 성분 명시 | attribute `active_ingredients` 1개 이상 |

### 립케어

| filter_key | 표시 라벨 | 객관적 기준 |
|------------|----------|------------|
| `high_moisture` | 보습 지속력 높음 | attribute `moisture_lasting = high` |
| `no_menthol` | 멘톨 없음 | attribute `menthol = false` |
| `low_fragrance` | 향료 적음 | attribute `fragrance = false` 또는 후순위 표기 |

### 로션/크림 ⏳ (attribute 사전 미정)

| filter_key | 표시 라벨 | 기준 |
|------------|----------|------|
| `barrier_ingredients` | 장벽 성분 | 세라마이드/콜레스테롤/지방산 함유 |
| `triple_moisture` | 다층 보습 | humectant + emollient + occlusive |
| `mild_ph` | 약산성 (pH 5~6) | 측정값 |

### 클렌저 ⏳ (attribute 사전 미정)

| filter_key | 표시 라벨 | 기준 |
|------------|----------|------|
| `mild_ph` | 약산성 | pH 5.0~6.5 |
| `low_sls` | 저자극 계면활성제 | SLS/SLES 미함유 또는 후순위 |

## 3. PERSONALIZED 필터 (자동 선택)

Context 답변에서 자동 변환되어 선택 상태로 진입한다.

| user_facts → | filter_key | 표시 라벨 |
|--------------|-----------|----------|
| `context.eye_sting = true` | `no_eye_sting` | 눈시림 회피 |
| `context.white_cast_sensitive = true` | `no_white_cast` | 백탁 회피 |
| `preference.fragrance_sensitive = true` | `no_fragrance` | 향료 회피 |
| `preference.menthol_sensitive = true` | `no_menthol_sensitive` | 멘톨 회피 |
| `context.usage_place = outdoor` | `outdoor_use` | 야외 사용 |
| `context.portable = true` | `portable` | 휴대형 |
| `context.usage_time = morning` | `morning_use` | 아침 사용 |
| `context.usage_time = night` | `night_use` | 밤 사용 |
| `product.owned_actives CONTAINS retinol` | `no_conflict_retinol` | 레티놀 병행 주의 |
| `product.owned_actives CONTAINS vitamin_c` | `no_conflict_vitamin_c` | 비타민C 병행 주의 |
| `life.recent_irritation = true` | `low_irritation` | 자극 위험 낮음 |

## 4. 가격대 구간 ✅

| price_band | 라벨 | 범위 |
|-----------|------|------|
| `UNDER_20000` | ~2만원 | 0 ~ 19,999원 |
| `BAND_20K_50K` | 2~5만원 | 20,000 ~ 49,999원 |
| `OVER_50K` | 5만원+ | 50,000원 이상 |

## 5. 적합도 배지 (📐 Rule 기반)

```
HARD_FILTER 모두 통과 + CAUTION 0개 → ✓ 적합
HARD_FILTER 모두 통과 + CAUTION 1개+ → △ 주의
HARD_FILTER 1개+ 미통과              → ✕ 비추 (목록에서 제거)
```

배지 라벨:
- `✓ 적합` (초록)
- `△ 주의` (노랑)
- `✕ 비추` (회색, 표시되지 않음)

CAUTION 사유 툴팁 ⏳:
- `△ 주의` 클릭 시 어떤 조건 때문인지 보여준다 (예: "향료 함유" / "백탁 가능성").

## 6. 빈 상태 카피 ⏳

### 필터 적용 결과 0건일 때
> 조건에 맞는 제품이 없어요.  
> 필터를 한두 개 줄여보시거나, 다른 가격대를 확인해보세요.

### 카테고리 자체에 제품이 없을 때 (MVP 초기)
> 곧 제품이 추가될 예정이에요.  
> 다른 제품군을 확인해보세요.

## 7. 제품 카드 표시 항목

| 영역 | 데이터 |
|------|--------|
| 이미지 | `products.image_url` |
| 브랜드 | `brands.name` |
| 제품명 | `products.name` (20자 ellipsis) |
| 가격 | `products.price` |
| 용량 | `products.volume` |
| 적합도 배지 | 📐 계산 |
| 핵심 태그 (최대 3개) | attribute에서 자동 생성 (예: "SPF50+", "백탁 적음") |

## 8. 제품 시드 데이터 ⏳

5카테고리 × 6개 = 30개 시드 작성 (content_plan.md P0 참조).

---

# S07 — Product Detail

## 콘텐츠 슬롯 일람

| 슬롯 | 타입 | 상태 |
|------|------|------|
| 제품 기본 정보 | 🔗 DB | ⏳ |
| 적합도 배지 + 사유 | 📐 Rule | ⏳ |
| BASIC_CONDITION 충족 표시 | 📐 | ⏳ |
| PERSONALIZED 매칭 표시 | 📐 | ⏳ |
| 전성분 표 | 🔗 DB | ⏳ |
| 주의 성분 하이라이트 | 📐 (avoidance_rules) | ⏳ |
| 구매 링크 (외부) | 🔗 DB | ⏳ |
| Disclaimer 카피 | 정적 | ⏳ |

## 1. 제품 기본 정보

```
[제품 이미지]
브랜드 / 제품명
₩가격 · 용량
적합도 배지
```

## 2. 적합도 사유 표시

### ✓ 적합 메시지 ⏳
> 회원님 조건에 잘 맞는 제품이에요.  
> 충족: `[SPF 50 이상]` `[눈시림 낮음]` `[향료 회피]`

### △ 주의 메시지 ⏳
> 다음 조건은 확인하고 사용하세요.  
> 주의: `[향료 함유 (5번째 표기)]` `[백탁 가능성 medium]`

## 3. 전성분 표 — 표시 형식

| 컬럼 | 내용 |
|------|------|
| 순번 | 전성분 순서 |
| 성분명 (한글) | `ingredients.korean_name` |
| 성분명 (INCI) | `ingredients.inci_name` |
| 기능 | `ingredients.function` (보습/미백/주름/방부 등) |
| 주의 | 사용자 `avoidance_rules`와 매칭되면 ⚠️ 아이콘 |

> 주의 아이콘 클릭 시 "이 성분은 회원님의 회피 목록에 있어요" 노출.

## 4. 구매 링크 ⏳

```
[올리브영에서 보기 →]
[브랜드 공식몰 →]
```

> Commerce Separation 원칙: 구매 링크는 판단 영역과 분리. 추천 텍스트와 구매 링크 사이에 시각적 구분 명확히.

## 5. Disclaimer 카피 ⏳

> 추천은 회원님이 입력한 조건과 제품 데이터를 기반으로 자동 계산됩니다.  
> 피부 반응은 개인차가 있으니 참고용으로 활용하세요.  
> 성분에 알레르기가 있다면 사용 전 반드시 확인하세요.

---

# S08 — Reaction Traceback

## 콘텐츠 슬롯 일람

| 슬롯 | 타입 | 상태 |
|------|------|------|
| 화면 제목 / 설명 | 정적 | ⏳ |
| 등록 CTA (문제 / 괜찮은) | 정적 | ✅ |
| 상품 등록 모달 (검색 / 바코드 / 카테고리) | UI | ⏳ |
| Box 1 등록한 상품 리스트 | 🔗 DB | - |
| Box 2 반응 기록 입력 | 정적 슬롯 | ⏳ |
| Box 3 원인 후보 결과 | 📐 추론 알고리즘 | ⏳ |
| 5개 성분 그룹 | 🔗 DB `ingredient_groups` | ⏳ |
| 다음 액션 카피 | 정적 | ⏳ |

## 1. 화면 제목 ⏳

### Heading
> 어떤 성분이 문제였을까요?

### Subtitle
> 문제 있었던 제품과 괜찮았던 제품을 함께 등록하면,  
> 공통 성분과 차이점을 비교해 원인 후보를 알려드려요.

## 2. 등록 CTA ✅

```
[+ 문제 상품 등록]    (빨간색 계열)
[+ 괜찮은 상품 등록]  (회색 계열)
```

## 3. 상품 등록 방식 (3가지) ⏳

### 모달 탭 라벨
- `바코드 스캔` (모바일 카메라)
- `검색` (제품명 직접 입력)
- `카테고리 탐색` (브랜드 → 제품군 → 제품)

### 검색 빈 상태 카피
> 제품을 못 찾으셨나요?  
> 등록되지 않은 제품은 직접 입력으로 추가하실 수 있어요.

## 4. Box 2 — 반응 기록 입력 슬롯 ⏳

| 입력 항목 | input_type | 옵션 |
|----------|-----------|------|
| 증상 | MULTI_SELECT | 가려움 / 따가움 / 붉어짐 / 뾰루지 / 부어오름 / 건조 / 따끔거림 |
| 부위 | MULTI_SELECT | 이마 / 볼 / 코 / 입가 / 턱 / 눈가 / 전체 |
| 발현 시점 | SINGLE_SELECT | 즉시 / 1시간 이내 / 당일 / 다음 날 / 며칠 후 |
| 메모 (선택) | TEXTAREA | - |

## 5. Box 3 — 원인 후보 결과 출력 (📐)

### 5개 성분 그룹 시드 ⏳

| ingredient_group | 표시 라벨 | 포함 성분 (예시) |
|-----------------|----------|----------------|
| `fragrance` | 향료 / Fragrance 계열 | Parfum, Fragrance, Limonene, Linalool, Geraniol, Citronellol |
| `essential_oils` | 에센셜오일 계열 | Lavender Oil, Tea Tree Oil, Rosemary Oil, Peppermint Oil |
| `menthol_cooling` | 멘톨 / 화한 사용감 | Menthol, Camphor, Eucalyptol, Methyl Lactate |
| `uv_filters` | 자외선 차단 필터 | Oxybenzone, Avobenzone, Octocrylene, Octinoxate |
| `high_dose_actives` | 고함량 액티브 | Retinol >0.3%, Vitamin C >15%, AHA >10% |

### 추론 알고리즘

```
for each ingredient_group G:
  problem_count = (G에 속한 성분이 PROBLEM 상품 중 몇 개에 포함되어 있는가)
  ok_count      = (G에 속한 성분이 OK 상품 중 몇 개에 포함되어 있는가)

  if problem_count >= 1 AND ok_count == 0:
    confidence = HIGH
  elif problem_count >= 1 AND ok_count < problem_count:
    confidence = MEDIUM
  elif problem_count >= 1 AND ok_count >= problem_count:
    confidence = LOW
  else:
    skip
```

### 결과 카드 표시

```
[향료 / Fragrance 계열]   [HIGH 신뢰도]

문제 상품 3개 중 3개에 포함, 괜찮은 상품에는 없었어요.

해당 성분 (3):
- Limonene
- Linalool
- Parfum

[다음 선택에서 회피하기]
```

### 신뢰도 라벨 ⏳

| confidence | 라벨 | 색상 |
|-----------|------|------|
| HIGH | 가능성 높음 | 빨강 |
| MEDIUM | 가능성 있음 | 주황 |
| LOW | 가능성 낮음 | 회색 |

## 6. 다음 액션 카피 ⏳

### 결과 있음
> 이 결과를 회피 목록에 추가하면 다음 제품 추천에 반영돼요.  
> [회피 목록에 추가하기]

### 결과 없음 (괜찮은 상품 미등록)
> 괜찮았던 상품도 함께 등록하면 더 정확한 원인을 찾을 수 있어요.  
> [괜찮은 상품 등록 +]

### 확정 진단 아님 명시 ⏳
> ⚠️ 이 결과는 등록한 제품의 성분 비교에 기반한 추정이에요.  
> 실제 알레르기나 피부 질환은 피부과 전문의 진단이 필요합니다.

---

# 부록 A. 정적 카피 일람 (전 화면 공통)

## 공통 라벨 ✅

| 위치 | 라벨 |
|------|------|
| 닫기 버튼 | `닫기` |
| 다음 버튼 | `다음` |
| 이전 버튼 | `이전` |
| 저장 버튼 | `저장` |
| 취소 버튼 | `취소` |
| 더보기 | `더보기` |
| 적용 | `필터 적용` |
| 초기화 | `초기화` |

## 에러 메시지 ⏳

| 상황 | 메시지 |
|------|-------|
| 네트워크 오류 | 일시적인 오류가 발생했어요. 잠시 후 다시 시도해주세요. |
| 필수값 미입력 | 답변을 선택해주세요. |
| 제품 없음 | 조건에 맞는 제품이 없어요. 필터를 줄여보세요. |
| 검색 결과 없음 | 검색 결과가 없어요. 다른 키워드로 시도해보세요. |

## 로딩 상태 ⏳

| 상황 | 메시지 |
|------|-------|
| 제품 조회 중 | 조건에 맞는 제품을 찾고 있어요... |
| 결과 계산 중 | 답변을 정리하고 있어요... |
| 원인 분석 중 | 성분을 비교하고 있어요... |

---

# 부록 B. 미작성 콘텐츠 우선순위

| # | 항목 | 우선순위 | 의존 |
|---|------|---------|------|
| 1 | 제품 시드 30개 + attributes | P0 | - |
| 2 | BASIC_CONDITION 정의 (5카테고리) | P0 | - |
| 3 | Priority Rules 12개 인스턴스 | P1 | - |
| 4 | Context Questions 24개 (S03+S04) | P1 | - |
| 5 | 결과 메시지 14개 (S05) | P1 | Context Questions |
| 6 | Concern → Category 매핑 24개 | P2 | - |
| 7 | Product Filter Mappings | P2 | BASIC_CONDITION 정의 |
| 8 | 적합도 사유 카피 (S07) | P2 | - |
| 9 | Ingredients 사전 ~150개 | P3 | 제품 시드 |
| 10 | Ingredient Groups 5개 + members | P3 | Ingredients |
| 11 | 에러 / 로딩 / 빈 상태 카피 | P3 | - |

> P0~P3 우선순위는 content_plan.md 와 동일하게 정렬됨.
