# Backend API List

> 화면별 백엔드 API 초안. 모든 URI는 `/api` prefix 아래에 붙는다.
>
> 기준 문서: [screen_data_specification.md](screen_data_specification.md), [wireframe_summary.md](../ContentSpec/wireframe_summary.md)

---

## API 목록

| 페이지 | 이벤트 설명 | 메서드 | URI (`/api`) | Service layer 역할 |
| ------ | ----------- | ------ | ------------ | ------------------ |
| Landing | `product_categories`에서 목록 가져오기 | GET | `/product-categories` | 카테고리 목록 조회 |
| Landing | 메인 화면 Concern 클릭 | POST | `/landing/concern-selections` | 1. 클릭 이벤트 저장<br>2. 체크리스트 클릭처럼 mapping 해서 `user_responses` 저장 |
| Priority Gate | 체크리스트에 채울 질문, 답 선택지, 기존 답변 조회 | GET | `/priority-gate` | 질문 목록, 답 선택지, 기존 답변 조회 |
| Priority Gate | 질문 답변 하나 클릭 | POST/PATCH | `/priority-gate/responses` | 1. 답변 저장<br>2. 이벤트 기록<br>3. rule 계산 후 결론 박스에 들어갈 preview result 반환 |
| Priority Gate | CTA 버튼 클릭 | POST | `/priority-gate/snapshot` | 1. 결과 snapshot 저장<br>2. 이벤트 기록 |
| Category Decision | 화면 접근 시 카테고리 목록 가져오기 | GET | `/product-categories` | 카테고리 목록 조회. Landing API 재사용 |
| Category Decision | 체크리스트에 채울 질문, 답 선택지, 기존 답변 조회 | GET | `/category-decision` | 1. 질문 노출 결정<br>2. 질문 목록, 답 선택지, 기존 답변 조회 |
| Category Decision | 질문 답변 하나 클릭 | POST/PATCH | `/category-decision/responses` | 1. 답변 저장<br>2. 이벤트 기록<br>3. 결론 박스에 들어갈 preview result 반환 |
| Category Decision | CTA 버튼 클릭 | POST | `/category-decision/snapshot` | 1. 결과 snapshot 저장<br>2. 이벤트 기록 |
| Product Matrix | 화면 접근 시 카테고리 목록 가져오기 | GET | `/product-categories` | 카테고리 목록 조회. Landing API 재사용 |
| Product Matrix | 화면 진입 | GET | `/product-matrix` | 1. filter state 계산/조회 (쓰기 없음)<br>2. 필터 목록과 선택지 조회<br>3. 제품 목록 조회 (필터, 회피 규칙, 브랜드 정보 등 적용) |
| Product Matrix | 필터링 작성 시 | POST/PATCH | `/product-matrix/filters` | 1. `filter_state` upsert |
| Product Matrix | 결과 snapshot | POST | `/product-matrix/snapshot` | 1. 필터 상태 snapshot 저장 |
| Product Matrix - Product Detail 모달 | 제품 상세뷰 열기 | GET | `/product-matrix/products/:productId` | 제품 상세, 적합도 사유, attribute, 성분, 회피/주의 성분 조회 |
| Product Matrix - Product Detail 모달 | 제품 상세뷰 응답 저장 | POST | `/product-matrix/products/:productId/responses` | 1. 제품 상세뷰에서 발생한 사용자 응답 저장 |
| Reaction Traceback | 제품 검색 | GET | `/reaction-traceback/products` | 1. 제품 검색<br>2. 후보군 매핑 |
| Reaction Traceback | Traceback 응답 저장 | POST | `/reaction-traceback/responses` | 1. 제품 추가 등 상황별 상태 저장 |
| 로그인 | 로그인 | POST | `/auth/login` | 로그인 처리 |
| 로그인 | 회원가입 | POST | `/auth/signup` | 회원가입 처리 |
| 로그인 | 로그아웃 | POST | `/auth/logout` | 로그아웃 처리 |
| 로그인 | 내 정보 조회 | GET | `/auth/me` | 현재 로그인 사용자 조회 |
| 공용 | `session_events` 로깅 | POST | `/session/events` | 공용 세션 이벤트 저장 |
| 공용 | health check | GET | `/health` | 서버 상태 확인 |

---

## 설계 메모

- `GET /product-matrix`는 `filter_state`를 생성하거나 UPSERT하지 않는다. 필터를 실제로 작성/수정할 때 `/product-matrix/filters`에서 저장한다.
- Priority Gate와 Category Decision의 답변 클릭 API는 최종 snapshot 저장이 아니라 preview result 반환을 담당한다.
- 최종 snapshot은 CTA 클릭 시 `/priority-gate/snapshot`, `/category-decision/snapshot`, `/product-matrix/snapshot`에서 저장한다.
- Product Detail은 독립 화면이 아니라 Product Matrix 안의 모달/드로어 상세뷰다.
