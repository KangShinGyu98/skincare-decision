# CSS 레이아웃 트러블슈팅 기록

랜딩/헤더 레이아웃을 만들면서 실제로 막혔던 지점과 원인을 정리한다.
같은 증상을 다시 만났을 때 원인을 빨리 좁히는 것이 목적이다.

---

## 1. `h-full`은 뷰포트가 아니라 부모 기준이다

**증상** — sticky 헤더 안쪽 div에 `h-full`을 줬는데, "화면에서 헤더를 뺀 나머지"가 될 거라 기대했지만 아니었다.

**원인** — `h-full`은 `height: 100%`이고, 100%의 기준은 언제나 부모다. 부모가 헤더면 결과는 헤더 높이와 같다. 뷰포트를 기준으로 하려면 `dvh`/`vh` 단위나 `calc()`가 필요하다.

**정리**

| 목적 | 쓸 것 |
|---|---|
| 부모 높이만큼 | `h-full` (`height: 100%`) |
| 뷰포트 높이만큼 | `h-dvh` (`height: 100dvh`) |
| 뷰포트에서 헤더를 뺀 만큼 | `calc(100dvh - var(--header-height))` |

**관련 코드** — `frontend/src/components/SiteHeader.tsx`

---

## 2. `sticky`는 문서 흐름에 남는다 (`fixed`와의 차이)

**의문** — 헤더가 sticky일 때 뒤따르는 `{children}`은 헤더 아래에서 시작하는가?

**답** — 시작한다. `position: sticky`는 흐름에서 빠지지 않아 헤더가 자기 높이만큼 자리를 차지하고, 형제 요소는 자연스럽게 그 아래에 놓인다. `fixed`처럼 `padding-top`으로 밀어줄 필요가 없다.

콘텐츠가 헤더 뒤로 파고드는 증상이 보인다면 보통 `fixed`를 쓰고 있거나, 아래 3번 케이스다.

**관련 코드** — `frontend/src/app/layout.tsx`

---

## 3. scroll-snap + sticky 헤더 → 스냅 지점이 헤더에 가린다

**증상** — sticky 헤더는 그대로인데, 스냅으로 이동하면 섹션 위쪽이 헤더에 가리고 가운데 정렬한 제목이 예상보다 위로 치우쳐 보였다.

**원인** — `snap-start`는 섹션의 top을 **스크롤 컨테이너의 top**에 맞춘다. 스크롤 컨테이너가 뷰포트면 그 top은 화면 최상단이고, 거기에는 sticky 헤더가 떠 있다. 그래서 스냅될 때마다 헤더 높이만큼 잘린다.

**해결 (택1)**

1. 스크롤 컨테이너를 헤더 아래로 옮긴다 — `main`에 `height: calc(100dvh - header)` + `overflow-y-scroll`. 컨테이너 top이 헤더 바로 아래가 되어 잘리지 않는다. **현재 프로젝트가 택한 방식.**
2. 뷰포트를 그대로 스크롤 컨테이너로 두고 스냅 위치만 민다 — `html { scroll-padding-top: var(--header-height); }`. 페이지 전체가 하나로 스크롤되고 앵커 이동에도 같은 보정이 걸린다.

1번은 랜딩 영역과 푸터의 스크롤이 분리되고, 2번은 한 번에 쭉 이어진다.

---

## 4. 전체화면 섹션의 중앙 정렬이 헤더만큼 어긋난다

**증상** — 섹션을 `h-screen` + `items-center`로 잡으면 콘텐츠가 화면 중앙보다 아래로 내려가 보인다.

**원인** — 정렬 기준이 100dvh 전체인데, 실제로 보이는 영역은 `100dvh - header`다. 기준과 가시 영역이 헤더 높이만큼 어긋난다.

**해결** — 정렬 기준 자체를 가시 영역으로 바꾼다. `calc(100dvh - var(--header-height))`.

---

## 5. Tailwind arbitrary value로 calc 높이를 주면 값이 사라지는 경우

**증상** — `min-h-[calc(100dvh-var(--header-height))]` 형태로 쓰다가 높이가 적용되지 않는 문제를 겪었다.

**해결** — 임의값 대신 `globals.css`에 plain CSS 유틸리티로 정의했다.

```css
.h-below-header {
  height: calc(100dvh - var(--header-height));
}
.min-h-below-header {
  min-height: calc(100dvh - var(--header-height));
}
.min-h-section {
  min-height: calc(100dvh - var(--header-height) - 4rem);
}
```

**트레이드오프** — plain 클래스는 `md:`, `hover:` 같은 Tailwind variant를 붙일 수 없다. variant가 필요해지면 Tailwind v4의 `@theme`에 등록하는 방식으로 옮길 수 있다.

```css
@theme {
  --spacing-below-header: calc(100dvh - var(--header-height));
}
```

**관련 코드** — `frontend/src/app/globals.css`

---

## 6. `100vh` 대신 `100dvh`

모바일 브라우저의 주소창이 접히고 펴지면서 `100vh`가 실제 가시 영역과 어긋난다. `dvh`(dynamic viewport height)는 그 변화를 반영한다. 전체화면 레이아웃에서는 `dvh`를 기본으로 쓴다.

---

## 7. `flex-1`은 `height`를 덮어쓴다

**증상** — `height`가 지정된 flex 아이템에 `flex-1`을 추가했더니 높이가 다르게 계산됐다.

**원인** — Tailwind `flex-1`은 `flex: 1 1 0%`이고, 여기에는 `flex-basis: 0%`가 포함된다. flex 아이템의 주축(main axis)에서는 `flex-basis`가 `height`를 이긴다. 즉 둘을 같이 쓰면 `height`는 죽은 코드가 된다.

**주의** — `body`가 `flex flex-col`인 구조에서 `main`에 `flex-1`을 주면 `main`은 "뷰포트 − 헤더 − 푸터"가 된다. 푸터를 첫 화면에 노출하고 싶은 게 아니라면 원하는 결과가 아니다.

**곁가지** — flex 아이템의 기본 `min-height: auto`는 콘텐츠보다 작게 줄어드는 것을 막는다. 스크롤 컨테이너로 쓸 flex 아이템에는 `min-h-0`을 명시해두면 안전하다.

---

## 8. `transform`은 레이아웃에 반영되지 않는다

**증상** — flex로 중앙 정렬한 카드인데 위쪽 여백만 넓어 보였다.

**원인** — 카드에 `translate-y-8`이 걸려 있었다. 중앙 정렬로 배치한 뒤 그리기 단계에서만 32px 내려간 것이라, 위 여백은 32px 늘고 아래 여백은 32px 줄어 비대칭이 된다. transform은 레이아웃 계산에 참여하지 않는다.

**해결** — 위치를 옮기려면 transform이 아니라 레이아웃 속성(margin/padding)을 쓴다. 애니메이션·호버 효과처럼 레이아웃을 흔들면 안 되는 경우에만 transform을 쓴다.

---

## 9. 섹션 높이가 스크롤 컨테이너와 같으면 다음 섹션을 보여줄 수 없다

**증상** — "아래에 더 있다"는 신호를 주려고 다음 섹션을 살짝 노출하고 싶은데, 카드 크기를 아무리 줄여도 보이지 않았다.

**원인** — 섹션(`min-h-below-header`)과 스크롤 컨테이너(`h-below-header`)의 높이가 정확히 같았다. 섹션 안쪽을 줄여도 섹션 자체가 화면을 꽉 채우므로 다음 섹션이 들어올 자리가 없다.

**해결** — 섹션을 컨테이너보다 짧게 만든다.

```css
.min-h-section {
  min-height: calc(100dvh - var(--header-height) - 4rem); /* 4rem 만큼 다음 섹션이 보인다 */
}
```

노출량 조절 지점을 이 한 곳으로 모아두면 섹션 전체에 동시에 반영된다.

---

## 10. (미해결) `min-height`만 가진 부모에 대한 퍼센트 높이

**상황** — 섹션은 `min-height`만 갖고 `height`는 auto다. 이 안의 카드에 `h-[90%]`를 주면 무엇을 기준으로 계산되는가?

**쟁점** — 블록 레이아웃 규칙상, 부모 높이가 콘텐츠에 의존하면(indefinite) 자식의 퍼센트 높이는 `auto`로 떨어진다. 다만 부모가 flex 컨테이너인 경우 브라우저가 확정 크기로 취급하는 경우가 많다. 이 구분을 확인해야 한다.

**검증 방법** — devtools에서 카드의 computed height를 확인한다. 섹션 내부 높이에 근접하면 퍼센트가 풀린 것이고, 콘텐츠 높이 그대로면 auto로 떨어진 것이다.

**퍼센트를 피하는 대안** — `self-stretch`를 쓰면 부모의 `items-center`를 덮어쓰고 교차축을 꽉 채운다. 퍼센트 해석 문제가 없고, 여백은 섹션 padding 한 곳에서 조절된다. 단 `align-self: stretch`는 해당 축의 크기가 `auto`일 때만 적용되므로, `h-[70vh]` 같은 명시적 높이와 함께 쓰면 무시된다.

**검색어** — `height percentage parent min-height not working`, `definite vs indefinite size css sizing spec`, `align-self stretch vs center flex item height`

---

## 부록: CSS는 아니지만 같이 걸렸던 것

- **`<main>` 중첩 금지** — 각 페이지가 이미 `<main>`을 렌더링하므로, 공통 레이아웃에서 `{children}`을 다시 `<main>`으로 감싸면 중첩된다. 공통 래퍼가 필요하면 `<div>`를 쓴다.
- **`useSearchParams` + `Suspense`** — 이 훅을 쓰는 컴포넌트는 Suspense 경계가 없으면 정적 프리렌더에서 제외되고, 정적 라우트에서는 빌드가 실패한다. 루트 레이아웃에 있으면 영향이 전체 페이지에 미친다. 다만 `fallback={null}`이면 해당 영역이 하이드레이션 후 갑자기 나타나 레이아웃이 한 번 흔들리므로, 정적으로 그릴 수 있는 뼈대를 fallback으로 두는 편이 낫다.
