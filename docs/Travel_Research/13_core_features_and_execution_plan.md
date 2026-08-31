# 핵심 기능 정의 & 실행 계획

_Feature design and implementation plan | Claude | 2026-08-19_

---

## Part 1. 이 제품이 답하는 질문

> **"지금 내 조건에서, 무엇을 먼저 결정하고 무엇은 아직 결정하지 않아도 되는가? 그리고 이 계획은 실행 가능한가?"**

이 질문은 단순 추천보다 어렵다. 그래서 제품은 추천 피드가 아니라 의사결정 구조를 가져야 한다.

---

## Part 2. 3-Layer Architecture

```
┌─────────────────────────────────────────────────────────────┐
│ LAYER 3: GUIDANCE                                           │
│ Trip Priority Engine / Reality Check /                      │
│ Trip Debrief · Postmortem                                   │
├─────────────────────────────────────────────────────────────┤
│ LAYER 2: DECISION OBJECTS                                   │
│ Decision Card / Day Plan Card / Similar-Traveler            │
│ Review Graph                                                │
├─────────────────────────────────────────────────────────────┤
│ LAYER 1: CONTEXT                                            │
│ Traveler Profile / Trip Frame / Constraints                 │
└─────────────────────────────────────────────────────────────┘
```

Layer 1이 없으면 조언이 일반론이 된다.
Layer 2가 없으면 제품은 다시 자유 서술 후기 모음이 된다.
Layer 3가 없으면 플랫폼은 좋은 데이터베이스일 뿐, 의사결정 플랫폼이 아니다.

---

## Part 3. Feature Definitions

### Feature 1: Traveler Profile

사용자 컨텍스트를 최소한 아래 정도로 구조화한다.

- 동행 구성: 혼자 / 커플 / 친구 / 아이 동반(연령) / 부모님 동반
- 여행 밀도 선호: 빡빡 / 보통 / 느긋
- 이동 방식: 뚜벅이 / 대중교통 / 렌터카
- 체력 수준: 하루 도보 감당 범위
- 취향 축: 음식 / 자연 / 도시 / 쇼핑 / 휴식 (가중치)
- 제약: 예산대, 유아차·휠체어, 식이 제한

이 정보는 추천을 화려하게 만들기 위한 것이 아니라, `하지 말아야 할 선택`을 걸러내기 위한 필터다. 초기 입력은 3문항 이내로 최소화하고 나머지는 사용 중에 채운다.

---

### Feature 2: Trip Frame

취향보다 중요한 것은 이번 여행의 골격 상태다.

입력 예시:

- 가능 날짜 (확정/유동)
- 총 예산대
- 확정된 것 체크: 목적지 / 항공 / 숙소 / 일정 (각각 유무)
- 여행 목적: 휴식 / 경험 / 기념 / 동행 만족

이 레이어가 있어야 "너는 지금 일정이 아니라 숙소 지역부터 정해야 한다" 같은 결론이 가능해진다.

---

### Feature 3: Decision Card

결정 유형별 핵심 판단 축을 구조화한다.

#### Example A: Destination Decision Card (오사카, 10월 기준)

- 시기 적합성: 10월 기온·강수, 연휴 성수기 여부
- 예산 레벨: 항공 시세 범위, 체감 물가
- 비행 강도: 비행시간 대비 권장 최소 체류일
- 동행 적합성: 아이 동반 난이도, 도보 강도, 유아차 환경
- Skip If: 벚꽃/단풍 목적이라면 시기 재검토, 3일 미만이면 근교 제외 권장

#### Example B: Flight Decision Card

- 시간대 가치: 첫날 오전 도착 vs 마지막 날 저녁 출발의 체류 시간 차이
- 경유 리스크: 환승 시간, 수하물 재위탁, 지연 연쇄
- 규정: 취소·변경 수수료, 수하물 포함 여부
- 타이밍: 성수기 여부 × 출발까지 남은 기간 기반 조건부 가이드
- Skip If: 아이 동반 새벽 출발, 경유 2회 이상

#### Example C: Lodging Area Decision Card (숙소 지역 우선)

- 동선 중심성: 계획한 지역들과의 평균 이동시간
- 교통 결절: 공항 직결 여부, 주요 노선 접근
- 생활 편의: 늦은 밤 식사, 편의점, 약국
- 짐 동선: 체크인 전·후 짐 보관 옵션
- Skip If: 밤 도착인데 공항 직결이 아닌 지역, 아이 동반인데 환승 2회 지역

#### Example D: Day Plan Card

- 하루 이동 총량 기준: 도보 km, 이동 횟수 상한 (동행 보정)
- 리듬: 오전 1 앵커 + 오후 1 앵커 + 유동 슬롯 구조
- 예약 필수 스팟과 데드라인
- 우천 대안 슬롯
- Skip If: 하루 3개 지역 이상 이동, 마지막 날 원거리 일정

---

### Feature 4: Day Plan + Priority Tag

일정 구성 시 모든 장소에 우선순위를 태깅한다.

- **필수**: 이번 여행의 이유. 빠지면 실패
- **선택**: 가면 좋고 빠져도 무방
- **대안**: 우천 시, 체력 저하 시, 웨이팅 초과 시 대체

이 태그가 있어야 Reality Check의 "무엇을 빼라"는 제안과 현지 재조정이 검색이 아닌 선택이 된다.

---

### Feature 5: Reality Check

이 제품의 검증 코어다. 입력은 일정 초안(직접 작성 또는 AI 생성 텍스트 붙여넣기), 출력은 판정과 수정안이다.

예시 출력:

```
[Reality Check — Day 2]
판정: 과밀 (아이 동반 기준)
- 총 도보 11.4km, 이동 5회 — 권장 상한 7km/4회 초과
- 15:00 방문 예정 A는 화요일 휴무
- B → C 구간은 지도상 12분이지만 유아차 기준 25분 예상

수정 제안:
- 오후 2곳 중 '선택' 태그인 C 제거
- A는 Day 3 오전으로 이동 (영업일 확인됨)
- 대안 슬롯: 우천 시 B 대신 실내 스팟 D
```

중요한 점은 판정에 항상 기준(무엇을 근거로 과밀인가)이 붙는다는 것이다. 그리고 이 기능은 일정 생성기가 아니다. 생성은 트리플 AI든 ChatGPT든 어디서 해도 좋다.

---

### Feature 6: Similar-Traveler Review Graph

후기를 자유 텍스트만으로 두지 않고, 다음 메타데이터를 필수화한다.

- 동행 구성 / 이동 방식 / 여행 밀도
- 시기 (월, 연휴 여부)
- 만족 이유 / 실패 이유 (구조화 태그)
- 재방문 의사

이 구조를 통해 다음을 보여준다.

- 평균 별점이 아닌 유사 조건 만족률
- 실패 패턴 클러스터 ("아이 동반 + 뚜벅이 조합에서 이 지역 숙박 불만족 집중")
- 특정 조건에서만 좋은 선택인지 여부

---

### Feature 7: Trip Priority Engine

이 제품의 핵심 로직이다.

출력 예시:

```
[Trip Priority — 10월 연휴 오사카, 아이 동반, 항공 미확정]
지금 결정: 항공 (연휴 성수기 — 선택지가 매일 줄어드는 중)
이번 주 안에: 숙소 지역 (개별 숙소는 그다음)
미뤄도 됨: 일별 일정 (D-14 이후 권장), 식당 예약 (D-14부터)
이유: 연휴 수요는 공급이 고정된 항공에 먼저 반영된다.
      숙소는 취소 무료 옵션으로 지역만 먼저 잡아두면 된다.
```

중요한 점은 항상 장소 추천으로 끝나지 않아도 된다는 것이다. "이번 주는 아무것도 사지 말고 날짜만 확정해라"가 최선의 출력일 수 있다.

---

### Feature 8: Trip Debrief / Postmortem

여행 종료 후 5분 기록 흐름이다.

#### 입력 방식

- 여행 종료 시점 알림 → 5분 체크인
- 계획했던 일정 대비 실제 실행 체크 (탭 단위)
- 실패 요인 태그 선택

#### 저장 정보

- 실행률: 계획 대비 실제 방문
- 최고/최악의 선택
- 실패 요인: 과밀 일정 / 숙소 위치 / 시기 / 예약 실패 / 동행 불일치 / 날씨
- 다음에 유지할 것

#### 출력 예시

```
[Trip Postmortem — 지난 오사카 여행]
반복된 패턴:
- 2회 연속 '과밀 일정' 태그 (Day 2, Day 3)
- 숙소-주요 일정 평균 이동 38분

다음 여행 규칙 제안:
- 하루 앵커 2곳 상한 적용
- 숙소 지역은 동선 중심성 우선 (역 도보 8분 이내)
승인하시겠습니까? [적용] [수정] [무시]
```

#### 핵심 원칙

- 원인 `확정`이 아니라 원인 `후보`를 제시한다
- 규칙은 사용자 승인 후에만 다음 Priority 판단에 반영한다

---

## Part 4. MVP Build Order

### Sprint 1-2: Foundation

- Trip Frame + Traveler Profile 입력 구조 설계
- 목적지 5곳 × Decision Card 5종 스키마 확정 및 수동 시딩
- Trip Priority 룰셋 v1 (성수기 캘린더 × 확정 상태 × 동행 조합)

### Sprint 3-4: Decision Layer

- Decision Timeline (출발일 역산 데드라인)
- 숙소 지역 데이터 시딩 (목적지당 4~8개 지역)
- Priority Tag 구조

### Sprint 5-6: Verification Layer

- Reality Check v1: 이동시간 합산(지도 API) + 영업시간 충돌 + 동행 보정 기준선
- AI 생성 일정 텍스트 파싱·가져오기

### Sprint 7-8: Proof & Learning Layer

- 유사 여행자 구조화 후기 입력 UI
- Trip Debrief 체크인 플로우
- Postmortem 규칙 생성 v1

### Sprint 9+

- 동행 합의 공유 뷰 (판단 근거 공유)
- 국내 주말여행 확장
- 유사 조건 집계가 쌓인 뒤 Similar-Traveler 만족률 노출

---

## Part 5. Cold Start Plan

### Step 1: 목적지 5곳만 시딩

오사카·도쿄·후쿠오카·다낭·방콕. 전 세계를 다루지 않는다. 5곳을 깊게 한다.

### Step 2: 구조화 데이터 우선

초기에 후기 수를 모으기보다 판단 데이터 품질을 먼저 만든다.

- Decision Card 25종 (5 목적지 × 5 유형)
- 숙소 지역 판단 데이터 약 30개 지역
- 대표 시나리오 일정 약 40개 (동행 × 밀도 조합) — Reality Check 기준선

### Step 3: 초기 기여자 선정

필요한 사람은 "여행 인플루언서"가 아니다. 다음에 가까운 사람이다.

- 같은 도시 3회 이상 재방문자
- 아이 동반·부모님 동반 조건이 뚜렷한 여행자
- 계획을 떠맡아 본 총무형 사용자
- 실패 경험을 언어화할 수 있는 사용자

### Step 4: 하지 말아야 할 것

- POI 데이터베이스 자체 구축 (지도 API 참조로 대체)
- AI만으로 Decision Card 생성
- 영감 피드 메인 홈
- 예약 제휴와 판단 로직 혼합
- 가격 예측 보증처럼 보이는 표현

---

## Part 6. Guardrails

### Guardrail 1: Advice must be explainable

모든 판단(지금 결정/보류/과밀 판정)에는 근거가 붙어야 한다.

### Guardrail 2: Revenue must not affect judgment

예약 링크·제휴는 판단 결과와 분리한다. "예약하지 마라"가 결론일 수 있어야 한다.

### Guardrail 3: Decision cards beat universal scores

하나의 종합 점수보다 결정 유형별 판단 기준을 우선한다.

### Guardrail 4: Similarity beats popularity

유사 조건 여행자의 결과를 기본값으로 한다.

### Guardrail 5: Judgment must stay conditional

Reality Check와 타이밍 가이드는 조건부 판단이지 보증이 아니다. 현지 변동(휴무 변경, 날씨, 혼잡)의 리스크를 항상 고지한다.

### Guardrail 6: Generated drafts are inputs, not answers

AI 생성 일정은 검증 대상 입력이다. 생성 결과를 정답처럼 표시하지 않는다.

---

## Final Build Logic

```
Context first
→ 조건과 확정 상태 파악 (Trip Frame)

Sequence next
→ 지금 결정할 것과 타임라인 판단 (Priority Engine)

Decision objects
→ 해당 결정의 기준 확인 (Decision Card)

Verification
→ 계획의 실행 가능성 검증 (Reality Check)

Proof
→ 유사 여행자 결과로 확신 보강

Learning
→ 여행 후 Debrief 기록
→ Postmortem 규칙이 다음 여행에 반영
```

이 순서가 깨지면 제품은 다시 평범한 일정 앱이나 추천 앱이 된다.

---

## Sources

- 트리플 사용법 안내: https://triple.guide/articles/8e26647d-9e7b-4346-8517-4945ced97bb8
- 트리플 AI 기반 개인 맞춤형 여행 홈 개편, 호텔앤레스토랑: http://www.hotelrestaurant.co.kr/news/article.html?no=14131
- 마이리얼트립 ChatGPT 연동 AI 여행플래너, 여행신문: https://www.traveltimes.co.kr/news/articleView.html?idxno=404198
- 컨슈머인사이트 여행 정보탐색 채널 조사: https://www.consumerinsight.co.kr/voc_view?no=3188&id=pr10_list&PageNo=1&schFlag=0
- 오픈서베이 해외여행 트렌드 리포트 2025: https://blog.opensurvey.co.kr/trendreport/overseas-travel-2025/
- Mindtrip Flights (agentic booking), VC Tavern: https://vctavern.com/mindtrip-raises-multi-million-dollar-funding-to-expand-ai-powered-travel-planning-platform/
