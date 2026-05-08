# design_system/ui_kits/webapp/ — Landing/Priority Gate/Product Matrix 프로토타입

> Ant Design 기반의 정적 React 프로토타입. 명세 문서를 시각화한 데모이며, 실제 `frontend/` 코드는 별도로 작성한다.

## 파일

| 파일              | 설명                                            |
| ----------------- | ----------------------------------------------- |
| index.html        | 단일 페이지 데모 (Landing → Gate → Matrix 흐름) |
| Components.jsx    | 공통 컴포넌트 (Card, Tag, Button, Badge 등)     |
| LandingPage.jsx   | S01 — Landing                                   |
| PriorityGate.jsx  | S02 — Priority Gate                             |
| ProductMatrix.jsx | S06 — Product Matrix                            |
| README.md         | 키트 설명 / 실행 방법                           |

## 진입 규칙

1. 코드를 그대로 frontend로 복사하지 않는다. shadcn/ui로 재작성하면서 명세와 토큰을 다시 맞춘다.
2. 새 화면 프로토타입을 추가할 때는 명세(`docs/page_content_specification_revised.md`)의 화면 ID(S03/S04/...)를 파일명에 반영.
3. 실 데이터 fetch 로직은 넣지 않는다(목 데이터만).
