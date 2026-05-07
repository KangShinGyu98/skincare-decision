# 제품 전략: Skincare Decision Platform
*Product strategy document | Based on 10_product_analysis.md | Codex | 2026-04-21*

---

## 1. Core Product Concept

> "이 제품이 인기 있는지 알려주는 플랫폼이 아니라, 지금 네 루틴에서 이게 맞는 다음 선택인지 알려주는 플랫폼."

핵심은 `추천`보다 `우선순위 판단`이다. 어떤 경우에는 특정 제품을 추천하는 것이 아니라, 제품을 사지 말고 클렌징/보습/선케어 습관을 먼저 정리하라고 말할 수 있어야 한다. 이것이 기존 랭킹/리뷰 플랫폼과 가장 큰 차이다.

---

## 2. Differentiation

| 기존 서비스 | 주로 답하는 질문 | 핵심 한계 |
|---|---|---|
| 올리브영 | 무엇이 잘 팔리고, 지금 뭘 사면 좋은가 | 커머스 편향 |
| 화해 | 어떤 제품과 성분이 상대적으로 낫나 | 제품 중심, 우선순위 약함 |
| 아이소이 | 우리 브랜드 안에서 어떤 고민/라인/단계가 맞나 | 브랜드 내부 최적화 |
| 무신사 뷰티 | 지금 어떤 뷰티/브랜드가 감각적으로 뜨나 | 트렌드/큐레이션 중심 |
| INCIDecoder/COSDNA | 성분표가 무엇을 의미하나 | 루틴/포뮬러 맥락 부족 |
| TikTok/YouTube | 요즘 뭐가 뜨나, 써보니 어땠나 | 광고 혼재, 적합도 불명확 |
| 피부과/전문가 | 일반 원칙은 무엇인가 | 실제 제품 비교 워크플로 부재 |
| **이 플랫폼** | **지금 내 루틴에서 무엇이 다음 선택인가** | — |

### 세 가지 구조적 차별점

**1. Need-first, not product-first**  
제품을 보여주기 전에 카테고리 필요성을 판단한다.

**2. Category-specific decision language**  
선크림, 세럼, 립밤을 같은 기준으로 비교하지 않는다.

**3. Similar-skin proof over crowd averages**  
평균 평점보다 유사 피부군의 성공/실패 데이터를 우선 신호로 사용한다.

---

## 3. Five Core Features

### Feature 1: Routine Priority Engine

이 제품의 진짜 기반이다. 사용자의 피부 타입, 고민, 현재 루틴, 최근 실패 경험을 입력받아 아래를 반환한다.

- 지금 가장 우선인 카테고리
- 지금 보류할 카테고리
- 바꾸면 안 되는 기본기
- 왜 그런지 설명

이 기능이 없으면 제품은 다시 "좋은 제품 추천 앱"으로 축소된다.

---

### Feature 2: Category Decision Cards

카테고리별 핵심 판단 기준을 구조화한다.

예:
- **선크림:** SPF/PA, 필터, 눈 시림, 백탁, 재도포 편의
- **클렌저:** 세정 강도, 당김, 메이크업 제거력, 이중세안 필요성
- **세럼:** 액티브, 자극 가능성, 주야간 사용, 병행 주의 성분
- **립 케어:** 자극 유발 가능 성분 여부, 보호막 성분, SPF, 휴대성

이 카드는 사용자가 제품 자체보다 먼저 `어떤 질문을 해야 하는가`를 배우게 한다.

---

### Feature 3: Product Fit Cards

제품 페이지 상단에 보여줄 구조화된 의사결정 요약.

포함 요소:
- 이 제품이 잘 맞는 상황
- 실패 가능성이 높은 상황
- 유사 피부군 결과
- 사용 순서/빈도
- 핵심 성분과 주의점
- 사용감/편의성 요약

목표는 리뷰를 더 많이 읽게 하는 것이 아니라, 리뷰를 거의 읽지 않고도 기본 판단을 가능하게 만드는 것이다.

---

### Feature 4: Similar-Skin Review Graph

리뷰를 자유 서술형으로만 두지 않고, 구조화된 입력과 함께 축적한다.

필수 구조:
- 피부 타입
- 주요 고민
- 기존 루틴 맥락
- 계절/사용 환경
- 자극 여부
- 만족/실패 이유

이 데이터는 평균 별점이 아니라 `유사 피부 성공률`을 계산하는 데 사용된다.

---

### Feature 5: Adaptation Tracker

화장품은 사용 후 판단이 중요하다. 따라서 구매 후 기록이 필요하다.

입력 예시:
- 3일 차/1주 차/3주 차 반응
- 따가움, 건조, 트러블, 유분, 만족감
- 사용 빈도
- 다른 제품과 병행 여부

이 데이터는 향후 더 정확한 Routine Priority 판단으로 이어진다.

### Feature 5A: Reaction Traceback

이 기능은 사용자가 `문제 제품`에서 출발해 다음 선택을 더 안전하게 만들도록 돕는다.

**핵심 흐름**
- 바코드/QR 스캔 또는 브랜드 > 카테고리 > 제품 검색으로 과거 사용 제품 등록
- 증상 유형, 발생 부위, 발현 시점, rinse-off/leave-on 여부 기록
- 제품의 성분/제형/향료/보존제/계면활성제/occlusive 특성 추출
- 과거 실패 제품끼리 겹치는 의심 성분군 또는 제형군 비교
- 이후 추천에서는 회피 규칙을 적용한 대체 제품 제안

**중요한 원칙**
- 이 기능은 `원인 후보를 좁히는 도구`이지 의료 진단이 아니다.
- 한 개 제품만으로 특정 성분을 단정하지 않는다.
- 심한 발진, 두드러기, 호흡 증상, 반복되는 접촉성 피부염 의심은 전문의 상담과 patch testing으로 연결한다.

---

## 4. Cold Start Strategy

### 초기 범위

6개 카테고리만 먼저 한다.

1. 클렌저
2. 보습제
3. 선크림
4. 기능성 세럼/앰플
5. 트러블 케어
6. 립 케어

이 범위는 사용 빈도가 높고, 혼란도가 높고, 루틴 맥락의 차이가 큰 카테고리다.

### 데이터 시딩

초기에는 대략 200~300개 핵심 제품을 수동 시딩하는 편이 현실적이다.

포함 기준:
- 올리브영/화해 상위 인지도 제품
- 민감성/트러블/보습/선케어 대표 제품
- 트렌드 제품과 기본기 제품 혼합
- 가격대 분산

### 초기 기여자

- 성분/루틴 설명에 강한 마이크로 크리에이터
- 민감성/트러블 커뮤니티 파워유저
- 스킨케어를 많이 사는 사람보다, 많이 실패해본 사람

핵심은 대형 인플루언서가 아니라 `판단 언어를 잘 쓰는 사용자`다.

---

## 5. User Acquisition

### Primary user

화해와 올리브영을 함께 쓰면서도 여전히 확신이 부족한 사용자.

조금 더 넓게 보면, 화해/올리브영/무신사 뷰티/브랜드몰을 함께 오가며 탐색하는 사용자가 핵심 타겟이다.

이들은 이미 불편을 느낀다.
- 성분은 보지만 확신은 낮다
- 리뷰는 읽지만 더 헷갈린다
- 트렌드는 알지만 우선순위는 모르겠다

### Acquisition loops

**1. "사지 말아야 할 것" 콘텐츠**  
예: "지금 앰플보다 먼저 봐야 하는 것 3가지", "민감성에게 립밤에서 진짜 중요한 것"

**2. Category calculators**  
예: "내가 지금 세럼보다 선크림이 먼저인지 체크"

**3. Similar-skin proof snippets**  
예: "민감성+레티노이드 사용자 61%가 이 조합에서 자극을 경험"

**4. Reaction Traceback entry point**  
예: "왜 이 제품만 쓰면 뒤집어질까?" "문제 제품 성분 비교하기"

이 콘텐츠는 트렌드 미디어가 아니라 `판단 보조 미디어`로 포지셔닝한다.

---

## 6. Monetization Principles

### Principle 1: Subscription-first

이 제품의 가치가 시간 절약과 실패 비용 절감에 있다면, 광고보다 구독과 잘 맞는다.

### Principle 2: Affiliate only under hard constraints

구매 링크는 가능하지만 다음과 같은 가드레일이 필요하다.

- 추천/랭킹 로직에 영향 없음
- 라이브 커머스/브랜드 협찬 데이터와 분리
- 샘플 체험/오프라인 테스트/피부과 상담 같은 비구매 경로도 함께 안내

### Principle 3: Brand revenue must not shape user advice

브랜드 인사이트 상품은 장기적으로 가능하지만, 사용자 조언 로직과 섞이면 제품 정체성이 무너진다.

---

## 7. What This Product Explicitly Does Not Do

- 화해처럼 전체 카탈로그를 먼저 확장하지 않는다
- 올리브영처럼 판매 전환을 중심 목표로 삼지 않는다
- TikTok처럼 트렌드를 메인 피드로 두지 않는다
- 피부 질환 진단을 표방하지 않는다
- "어떤 제품이든 하나 사게 만드는 플랫폼"이 되지 않는다

---

## Strategy Summary

| Dimension | Decision |
|---|---|
| Core question | 지금 내 루틴에서 무엇이 다음 선택인가 |
| First wedge | Routine Priority Engine |
| Core data model | Category Decision Card + Product Fit Card + Failure history |
| Trust model | Similar-skin proof over average ratings |
| Initial scope | 6개 핵심 카테고리 |
| Growth surface | 판단형 콘텐츠 + 계산기 + Reaction Traceback 툴 |
| Revenue principle | 구독 우선, 추천과 수익 분리 |

---

## Closing Statement

이 제품의 전략은 좋은 제품을 더 많이 보여주는 것이 아니다. 오히려 반대다. 사용자가 `지금 안 사도 되는 것`과 `지금 정말 필요한 것`을 구분하도록 만드는 것이 핵심 가치다. K-Beauty 시장이 이미 너무 많은 제품과 너무 빠른 트렌드를 갖고 있기 때문에, 가장 큰 혁신은 더 많은 발견이 아니라 더 적은 혼란이다.

---

## Sources

- 화해 2026 뷰티 트렌드 리포트: https://blog.hwahae.co.kr/all/newsroom/news/15418
- 화해 성장 관련 보도: https://wowtale.net/2025/03/07/238044/
- 올리브영 Skin Scan: https://corp.oliveyoung.com/ko/news/56
- 올리브영 `올영어워즈`: https://corp.oliveyoung.com/ko/news/104
- 아이소이 공식몰: https://www.isoi.co.kr/
- 무신사 뉴스룸 2025-0203: https://newsroom.musinsa.com/newsroom-menu/2025-0203
- 무신사 뉴스룸 2026-0403: https://newsroom.musinsa.com/newsroom-menu/2026-0403
- OpenSurvey 뷰티 리포트 2025: https://blog.opensurvey.co.kr/trendreport/beauty-2025/
- OpenSurvey 5개년 뷰티 트렌드: https://blog.opensurvey.co.kr/article/beauty-2021-2025/
- AAD patch testing guidance: https://www.aad.org/public/diseases/eczema/types/contact-dermatitis/patch-testing-rash
- FDA allergens in cosmetics: https://www.fda.gov/cosmetics/cosmetic-ingredients/allergens-cosmetics
