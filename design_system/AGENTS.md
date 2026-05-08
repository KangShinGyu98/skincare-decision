# design_system/ — Ant Design 기반 UI 토큰

> 시각 시스템의 단일 진실. Tailwind 토큰과 shadcn/ui 컴포넌트는 본 폴더의 값을 따른다.

## 폴더 구조

| 항목                                        | 역할                                                              |
| ------------------------------------------- | ----------------------------------------------------------------- |
| [README.md](README.md)                      | 색상·타이포·스페이싱·컴포넌트 가이드 (필수 읽기)                  |
| [SKILL.md](SKILL.md)                        | 디자인 시스템 사용 시 Skill 정의                                  |
| [colors_and_type.css](colors_and_type.css)  | CSS 변수 (color/type tokens) — Tailwind 매핑 기준                 |
| [Ant Design Open Source (Community).fig](.) | Figma 원본 (참조용)                                               |
| `preview/`                                  | 토큰 프리뷰 HTML (color, type, button, card 등)                   |
| `ui_kits/webapp/`                           | React/JSX 프로토타입 (LandingPage / PriorityGate / ProductMatrix) |

## 진입 규칙

1. 새 컴포넌트 시작 전 [README.md](README.md)에서 색/스페이싱/카드 패턴 확인.
2. Tailwind config에 색을 추가할 때는 `colors_and_type.css`의 변수와 동일한 이름·값을 사용한다.
3. shadcn/ui 컴포넌트 커스터마이즈는 Ant Design 기본값(border-radius 2px, 14px body, etc.)을 유지.
4. PingFang SC → Noto Sans KR 대체. README 마지막 섹션 참고.
5. UI 결정이 명세(`docs/page_content_specification_revised.md`)와 충돌하면 명세를 우선 갱신한다.

## 핵심 토큰 요약

- Primary: `#1890FF` (blue-6) / Hover `#40A9FF` / Active `#096DD9`
- Border radius: 2px (Ant 시그니처 sharp-corner)
- Body font: 14px / 1.5714 line-height
- Card: 흰색 + `1px solid #D9D9D9` + radius 2px

상세 값은 [README.md](README.md)와 [colors_and_type.css](colors_and_type.css) 참조.
