# 제품 방향 평가: Direction Evaluation
*Feature scoring and direction validation | Codex | 2026-04-21*

---

## 목적

초기 아이디어였던 트렌드 인사이트 중심 접근과, 이번 리서치로 도출된 루틴 우선순위 중심 접근을 비교 평가한다. 핵심은 무엇을 MVP에 넣고 무엇을 뒤로 미뤄야 하는지 결정하는 것이다.

---

## 평가 기준

모든 방향은 아래 네 기준으로 본다.

1. **유저 가치**: 정말 반복적으로 쓰일 문제인가  
2. **차별성**: 기존 서비스가 이미 잘하는 영역인가  
3. **신뢰성**: 사용자가 결과를 믿을 수 있는가  
4. **실행 복잡도**: 초기 팀이 현실적으로 만들 수 있는가

---

## 평가 대상 6개

### Concept 1: K-Beauty Trend Insight Dashboard

**설명**  
네이버/구글/소셜 데이터 기반으로 지금 뜨는 성분, 카테고리, 브랜드를 보여주는 대시보드.

**장점**
- 포트폴리오적으로 보기 좋다
- 유입용 콘텐츠로 쓰기 쉽다
- 데이터 시각화가 명확하다

**한계**
- 사용자의 핵심 문제인 "지금 나에게 필요한가"를 직접 해결하지 않는다
- 트렌드 미디어/콘텐츠 허브와 경쟁하기 쉽다
- 돈을 낼 이유가 약하다

**평가**
- 유저 가치: 5/10
- 차별성: 4/10
- 신뢰성: 8/10
- 실행 복잡도: 7/10

**결론**  
보조 레이어로는 좋다. 핵심 MVP가 되면 안 된다.

---

### Concept 2: AI Selfie Skin Diagnosis

**설명**  
셀피 이미지 기반 피부 상태 분석 후 제품/루틴 추천.

**장점**
- 진입 장벽이 낮고 직관적이다
- "나를 봐주는 느낌"을 준다
- 개인화 인상이 강하다

**한계**
- 실제 정확도와 신뢰가 큰 이슈다
- 의료 조언처럼 보일 위험이 있다
- 많은 경우 브랜드/리테일러 보조 도구와 겹친다

**평가**
- 유저 가치: 6/10
- 차별성: 5/10
- 신뢰성: 4/10
- 실행 복잡도: 3/10

**결론**  
장기 옵션. 초기 핵심 가치로 삼으면 위험하다.

---

### Concept 3: Universal Ranking / Score Aggregation

**설명**  
화해, 올리브영, SNS 인기, 가격, 성분을 합쳐 종합 점수를 만드는 방식.

**장점**
- 익숙한 인터페이스
- 빠르게 리스트를 만들 수 있다

**한계**
- 기존 시장의 문제를 다시 복제한다
- 카테고리 차이를 무시한다
- 인기와 적합도를 다시 혼동하게 만든다

**평가**
- 유저 가치: 3/10
- 차별성: 2/10
- 신뢰성: 4/10
- 실행 복잡도: 6/10

**결론**  
즉시 폐기. 이 제품이 풀어야 할 문제와 반대 방향이다.

---

### Concept 4: Dupe / Price Comparison Finder

**설명**  
비슷한 포지션의 제품을 가격/성분/사용감 기준으로 대체 추천하는 기능.

**장점**
- 실용적이다
- 구매 직전 단계에서 매력적이다
- 올리브영/커머스 사용자에게 직관적이다

**한계**
- 여전히 카테고리 필요성보다는 제품 비교에 머문다
- 강한 차별화 모트가 되기 어렵다

**평가**
- 유저 가치: 7/10
- 차별성: 5/10
- 신뢰성: 7/10
- 실행 복잡도: 6/10

**결론**  
Phase 2 보조 기능으로 적합하다.

---

### Concept 5: Routine Priority Engine + Category Decision Cards

**설명**  
사용자의 피부/루틴/고민을 입력받고, 지금 필요한 카테고리와 카테고리별 판단 기준을 먼저 제시하는 구조.

**장점**
- 기존 플랫폼이 약한 질문을 직접 해결한다
- "사지 말라"는 결론까지 포함할 수 있다
- Similar-skin proof, Product Fit Card, Adaptation Tracker로 자연스럽게 확장된다

**한계**
- 구조화 데이터 설계가 필요하다
- 초기 시딩 비용이 크다
- 상담처럼 보이는 UX의 품질이 매우 중요하다

**평가**
- 유저 가치: 9/10
- 차별성: 9/10
- 신뢰성: 8/10
- 실행 복잡도: 6/10

**결론**  
핵심 MVP. 이 방향이 제품의 정체성이다.

---

### Concept 6: Reaction Traceback Tool

**설명**  
문제 제품을 바코드/QR 또는 제품 검색으로 등록하고, 증상/부위/발현 시점과 함께 과거 실패 제품의 공통 성분군/제형군을 추출하는 흐름.

**장점**
- 사용자의 실제 pain이 매우 직접적이다
- "추천"보다 강한 리텐션 이유가 된다
- 과거 실패 이력을 미래 추천과 연결할 수 있다
- 단독 툴로도 유입면이 강하다

**한계**
- 인과 추론 오류 위험이 있다
- 의료 진단처럼 오해받기 쉽다
- 제품 DB 정규화와 성분군 분류 품질이 중요하다

**평가**
- 유저 가치: 9/10
- 차별성: 8/10
- 신뢰성: 6/10
- 실행 복잡도: 7/10

**결론**  
강한 기능이다. 다만 MVP의 첫 화면이 되면 제품 전체가 `알레르기 진단 앱`처럼 보일 수 있다. 가장 좋은 위치는 `핵심 제품 안의 Phase 1.5~2 서브플로`다. 별도 서비스로도 분리 가능하지만, 장기적으로는 Adaptation Tracker와 추천 로직에 붙어 있을 때 가장 가치가 크다.

---

## 방향성 결론

### MVP에서 해야 할 것

1. Routine Priority Engine  
2. Category Decision Cards  
3. Product Fit Cards  
4. Similar-skin 구조화 리뷰

### MVP에서 하지 말아야 할 것

1. 범용 랭킹 통합
2. 셀피 AI를 핵심 인터페이스로 전면 배치
3. 트렌드 대시보드를 메인 가치로 설정

### Phase 2 이후 가능

1. 트렌드 해석 레이어
2. Dupe / 대체재 비교
3. 이미지 기반 피부 상태 보조 입력
4. Reaction Traceback 고도화

---

## 핵심 시사점

1. 처음 아이디어였던 트렌드 인사이트는 좋은 진입점이지만 핵심 문제 해결은 아니다.
2. 진짜 차별화는 `내가 지금 무엇을 먼저 해야 하는지`를 줄여주는 능력에서 나온다.
3. 제품이 랭킹 시스템으로 후퇴하는 순간, 화해/올리브영과 같은 게임을 하게 된다.

---

## Sources

- 화해 2026 뷰티 트렌드 리포트: https://blog.hwahae.co.kr/all/newsroom/news/15418
- 올리브영 Skin Scan: https://corp.oliveyoung.com/ko/news/56
- Perfect Corp AI Skin Diagnostic: https://www.perfectcorp.com/business/products/ai-skin-diagnostic
- Revieve: https://www.revieve.com/
- OpenSurvey 뷰티 리포트 2025: https://blog.opensurvey.co.kr/trendreport/beauty-2025/
- AAD patch testing guidance: https://www.aad.org/public/diseases/eczema/types/contact-dermatitis/patch-testing-rash
- FDA allergens in cosmetics: https://www.fda.gov/cosmetics/cosmetic-ingredients/allergens-cosmetics
