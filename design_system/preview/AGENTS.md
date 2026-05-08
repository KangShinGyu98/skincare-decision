# design_system/preview/ — 디자인 토큰 HTML 프리뷰

> 색·타입·간격·보더·컴포넌트 토큰을 브라우저로 직접 확인할 수 있는 정적 HTML.
> shadcn/ui로 컴포넌트를 만들 때 시각적 기준으로 사용한다.

## 파일

| 파일                 | 보여주는 것                        |
| -------------------- | ---------------------------------- |
| colors-brand.html    | Primary blue 1~10                  |
| colors-neutral.html  | gray-1 ~ gray-10                   |
| feedback.html        | success/warning/error/info 상태 색 |
| inputs.html          | input, select, textarea 패턴       |
| buttons.html         | primary/secondary/text/danger 버튼 |
| cards.html           | 카드 / 섹션 / 분할선 패턴          |
| navigation.html      | nav bar / tab / breadcrumb         |
| shadows-borders.html | 그림자/보더 스타일                 |
| spacing-tokens.html  | 4/8/12/16/20/24/32/48 간격 시각화  |
| tags-badges.html     | tag, badge, pill                   |
| type-scale.html      | 12 → 38px 타입 스케일              |
| type-specimens.html  | Roboto + Noto Sans KR 표본         |

## 진입 규칙

1. 코드를 작성하기 전, 표현하려는 패턴이 이미 있는지 본 폴더에서 확인.
2. 새 토큰이 필요하면 `../colors_and_type.css`에 먼저 등록하고, 본 폴더에 프리뷰 추가.
3. HTML은 외부 의존성 없이 로컬에서 바로 열리는 형태로 유지(이미지/폰트 CDN만 허용).
