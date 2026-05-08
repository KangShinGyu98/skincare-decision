# 핵심 기능 정의 & 실행 계획

_Feature design and implementation plan | Codex | 2026-04-21_

---

## Part 1. 이 제품이 답하는 질문

> **"지금 내 피부와 루틴에서, 무엇을 먼저 선택하고 무엇은 아직 사지 않아도 되는가?"**

이 질문은 단순 추천보다 더 어렵다. 그래서 제품은 추천 피드가 아니라 의사결정 구조를 가져야 한다.

---

## Part 2. 3-Layer Architecture

```
┌─────────────────────────────────────────────────────────────┐
│ LAYER 3: GUIDANCE                                           │
│ Routine Priority Engine / Adaptation Tracker /              │
│ Reaction Traceback                                          │
├─────────────────────────────────────────────────────────────┤
│ LAYER 2: DECISION OBJECTS                                   │
│ Category Decision Card / Product Fit Card / Similar-Skin    │
│ Review Graph                                                │
├─────────────────────────────────────────────────────────────┤
│ LAYER 1: CONTEXT                                            │
│ Skin Profile / Routine Baseline / Constraints               │
└─────────────────────────────────────────────────────────────┘
```

Layer 1이 없으면 조언이 일반론이 된다.  
Layer 2가 없으면 제품은 다시 자유 서술 리뷰 모음이 된다.  
Layer 3가 없으면 플랫폼은 좋은 데이터베이스일 뿐, 의사결정 플랫폼이 아니다.

---

## Part 3. Feature Definitions

### Feature 1: Skin Profile

사용자 컨텍스트를 최소한 아래 정도로 구조화해야 한다.

- 피부 타입: 건성 / 지성 / 복합성 / 민감성
- 주요 고민: 트러블 / 홍조 / 건조 / 톤 / 탄력 / 입술 건조 등
- 자극 민감도: 낮음 / 보통 / 높음
- 현재 사용 중 액티브: 레티노이드, 산, 비타민C 등
- 생활 맥락: 메이크업 유무, 야외활동, 계절, 선호 제형
- 예산: 저가 / 중가 / 프리미엄

이 정보는 추천을 화려하게 만들기 위한 것이 아니라, `하지 말아야 할 선택`을 걸러내기 위한 필터다.

---

### Feature 2: Routine Baseline

단순 선호보다 중요한 것은 현재 루틴 상태다.

입력 예시:

- 아침/저녁 현재 사용하는 단계
- 선크림 사용 빈도
- 주간 각질제/레티노이드 사용 빈도
- 최근 실패 제품
- 반복되는 불편: 따가움, 건조, 들뜸, 답답함

이 레이어가 있어야 "너는 세럼보다 선크림 습관이 먼저" 같은 결론이 가능해진다.

---

### Feature 3: Category Decision Card

카테고리별 핵심 판단 축을 구조화한다.

#### Example A: Sunscreen Decision Card

- 보호 기준: SPF / PA / broad-spectrum
- 제형: 로션 / 플루이드 / 스틱 / 젤
- 사용감: 눈 시림, 백탁, 끈적임, 메이크업 궁합
- 상황 적합성: 야외활동, 재도포 빈도, 민감성 여부
- Skip If: 향 민감, 눈 시림 민감, 백탁 허용 낮음

#### Example B: Serum Decision Card

- 목적: 색소 / 트러블 / 장벽 / 탄력
- 액티브: 나이아신아마이드, 비타민C, 레티날, PDRN 등
- 자극 가능성
- 병행 주의 성분
- 기대 시차: 빠름 / 중간 / 장기

#### Example C: Lip Care Decision Card

- 목적: 보호막 / SPF / 야간 집중 케어
- 피해야 할 성분: 향료, 멘톨, 캄퍼 등
- 보호 성분: petrolatum, lanolin, ceramide 등
- 사용감: 번들 / 매트 / 끈적임 / 휴대성

---

### Feature 4: Product Fit Card

제품 페이지 상단의 핵심 요약 카드.

권장 필드:

- 이 제품이 잘 맞는 상황
- 이런 사용자는 피하는 편이 좋은 상황
- 유사 피부군 만족/실패 비율
- 자극 리스크
- 사용 순서와 빈도
- 핵심 성분 요약
- 사용감 요약

예시 출력:

```
[Product Fit Card]
적합: 민감성-건성, 밤 루틴, 장벽 회복 목적
주의: 레티노이드와 같은 날 병행 시 따가움 보고 높음
유사 피부 만족도: 74%
흔한 실패 이유: 너무 무겁다 / 화장 밀림
권장 순서: 세럼 다음, 크림 단계
```

---

### Feature 5: Similar-Skin Review Graph

리뷰를 자유 텍스트만으로 두지 않고, 다음 메타데이터를 필수화한다.

- 피부 타입
- 주요 고민
- 계절/환경
- 사용 단계
- 병행 제품
- 자극 여부
- 재구매 여부

이 구조를 통해 다음을 보여준다.

- 평균 별점이 아닌 유사 피부 성공률
- 실패 패턴 클러스터
- 특정 조건에서만 좋은 제품인지 여부

---

### Feature 6: Routine Priority Engine

이 제품의 핵심 로직이다.

출력 예시:

- 지금 최우선: 선크림 정착
- 보류: 미백 세럼 추가
- 이유: 현재 주간 선케어 빈도가 낮고, 톤 고민은 자외선 노출과 직접 연결됨
- 대안: 텍스처 가벼운 선크림 3개 비교 + 재도포 편의 우선

중요한 점은 항상 제품 추천으로 끝나지 않아도 된다는 것이다.

---

### Feature 7: Adaptation Tracker

구매 후 반응을 짧게 기록하게 한다.

체크 포인트:

- Day 3: 즉각 자극/답답함
- Day 7: 지속 사용 가능성
- Day 21: 체감 변화 / 재구매 의사

이 데이터는 개인 루틴 최적화와 Similar-Skin 집계 양쪽에 모두 쓰인다.

### Feature 8: Reaction Traceback

사용자가 예전에 문제를 일으킨 제품에서 출발해 회피 규칙을 만드는 흐름이다.

#### 입력 방식

- 바코드/QR 스캔
- 브랜드 > 카테고리 > 제품 검색
- 직접 제품명 입력 후 매칭

#### 저장 정보

- 문제 제품명
- 증상: 붉어짐 / 따가움 / 두드러기 / 여드름 / 건조 / 가려움 등
- 발생 부위: 얼굴 / 등 / 두피 / 입술 / 몸
- 발현 시점: 즉시 / 수시간 / 수일
- 사용 방식: rinse-off / leave-on / 주야간 / 빈도

#### 추출 로직

- 향료 / 에센셜오일 / 보존제 / 액티브 / 계면활성제 / occlusive 특성 추출
- 실패 제품 간 공통점 찾기
- 잘 맞았던 제품과의 차이 비교
- 이후 추천 시 의심군 회피

#### 출력 예시

```
[Reaction Traceback]
의심되는 공통 특징:
- fragrance/parfum 포함
- essential oil 계열 향 성분
- leave-on 바디 제품에서 반복 반응

현재 결론:
- 특정 단일 성분 확정 불가
- 향료군/에센셜오일군 회피 제품 우선 추천
- 반응 반복 시 patch testing 고려
```

#### 핵심 원칙

- 원인 `확정`이 아니라 원인 `후보`를 제시한다
- 한 제품만으로 특정 성분 알레르기를 단정하지 않는다
- 심한 두드러기, 호흡 증상, 지속 발진은 즉시 사용 중단과 전문의 상담으로 연결한다

---

## Part 4. MVP Build Order

### Sprint 1-2: Foundation

- Skin Profile 설계
- Routine Baseline 입력 구조
- 6개 카테고리의 Category Decision Card 스키마 확정
- 초기 200~300개 hero product 시딩

### Sprint 3-4: Product Layer

- Product Fit Card 작성 구조
- Similar-Skin Review 입력 UI
- 유사 피부 필터링과 집계 로직

### Sprint 5-6: Guidance Layer

- Routine Priority Engine v1
- 보류/추천 로직
- 기본기 우선 경고 시스템

### Sprint 7-8: Post-purchase Loop

- Adaptation Tracker
- 실패 패턴 구조화
- Reaction Traceback v1
- 다음 추천에 반영되는 간단한 개인화

### Sprint 9+

- Trend Decoder
- Dupe finder
- 이미지 기반 피부 상태 입력 보조

---

## Part 5. Cold Start Plan

### Step 1: 6개 카테고리만 시딩

초기 모든 카테고리를 다루지 않는다. 핵심 6개만 깊게 한다.

### Step 2: 구조화 데이터 우선

초기에 리뷰 수를 많이 모으기보다 카드 품질을 먼저 만든다.

- 카테고리 카드
- 제품 카드
- 유사 피부 메타데이터

### Step 3: 초기 기여자 선정

필요한 사람은 "좋은 피부를 가진 인플루언서"가 아니다. 다음에 가까운 사람이다.

- 실패 경험을 언어화할 수 있는 사용자
- 민감성/트러블/장벽 손상 경험자
- 마이크로 뷰티 리뷰어
- 성분/루틴 설명형 크리에이터

### Step 4: 하지 말아야 할 것

- AI만으로 Product Fit Card 생성
- 범용 랭킹 메인 홈피드
- 브랜드 협찬과 추천 로직 혼합
- 피부 질환 진단처럼 보이는 표현

---

## Part 6. Guardrails

### Guardrail 1: Advice must be explainable

모든 추천과 보류 판단에는 이유가 붙어야 한다.

### Guardrail 2: Revenue must not affect ranking

제휴/판매/브랜드 상품은 Product Fit 순서와 분리한다.

### Guardrail 3: Category cards beat universal scores

하나의 종합 점수보다 카테고리별 핵심 판단 기준을 우선한다.

### Guardrail 4: Similarity beats popularity

비슷한 피부군의 결과를 기본값으로 한다.

### Guardrail 5: Traceback must stay probabilistic

Reaction Traceback은 의심 성분군/제형군을 좁혀주는 기능이지, 알레르기 확진 기능이 아니다.

---

## Final Build Logic

```
Context first
→ 현재 루틴과 피부 상태 파악

Need next
→ 지금 필요한 카테고리 판단

Decision objects
→ Category Card와 Product Fit Card 확인

Proof
→ Similar-Skin 결과 검증

Learning
→ 사용 후 Adaptation Tracker 기록
→ 문제 제품의 Reaction Traceback 반영
```

이 순서가 깨지면 제품은 다시 평범한 리뷰/랭킹 앱이 된다.

---

## Sources

- 화해 2026 뷰티 트렌드 리포트: https://blog.hwahae.co.kr/all/newsroom/news/15418
- 올리브영 Skin Scan: https://corp.oliveyoung.com/ko/news/56
- OpenSurvey 뷰티 리포트 2025: https://blog.opensurvey.co.kr/trendreport/beauty-2025/
- OpenSurvey 5개년 뷰티 트렌드: https://blog.opensurvey.co.kr/article/beauty-2021-2025/
- AAD skin care order: https://www.aad.org/public/everyday-care/skin-care-basics/care/how-to-apply-skin-care-products
- AAD sunscreen guidance: https://www.aad.org/public/everyday-care/sun-protection/shade-clothing-sunscreen/how-to-select-sunscreen
- AAD lip care guidance: https://www.aad.org/public/everyday-care/skin-care-secrets/dry/chapped-lips
- AAD patch testing guidance: https://www.aad.org/public/diseases/eczema/types/contact-dermatitis/patch-testing-rash
- FDA allergens in cosmetics: https://www.fda.gov/cosmetics/cosmetic-ingredients/allergens-cosmetics
- FDA using cosmetics safely: https://www.fda.gov/cosmetics/resources-consumers-cosmetics/using-cosmetics-safely
