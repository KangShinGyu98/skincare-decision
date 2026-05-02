# design_system/ui_kits/ — 프로토타입 UI 키트

> 디자인 시스템 기반 React/HTML 프로토타입 컬렉션. 실제 frontend 앱 코드는 아니다.
> Phase 3에서 `frontend/` 컴포넌트를 만들 때 참조한다.

## 하위 키트

| 폴더                | 설명                                                                 |
| ------------------- | -------------------------------------------------------------------- |
| [webapp/](webapp/)  | Landing → Priority Gate → Product Matrix 흐름의 React 프로토타입     |

## 진입 규칙

1. 새 프로토타입은 단일 폴더로 추가하고 자체 README + AGENTS.md를 둔다.
2. 키트 안의 컴포넌트는 자유롭게 작성하되, `frontend/` 본 코드에 그대로 복사하지 말고 shadcn/ui 컨벤션으로 재작성한다.
3. 키트 코드는 명세(`docs/page_content_specification_revised.md`)와 시각적 차이가 있으면 명세를 우선시한다.
