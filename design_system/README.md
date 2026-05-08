# Skincare Decision Design System

> **스킨케어 결정 서비스** — A Korean skincare product recommendation service that helps users decide what to buy (or not buy) based on their skin condition, routine, and concerns.

---

## Product Overview

**Skincare Decision** (also referred to as "스킨케어 결정") is a web-first, mobile-prioritized service. Its core philosophy is:

> "더 많은 추천이 아닌 더 적은 선택" (Less recommendations, fewer choices)

The service does NOT simply recommend products. It first gates users through a structured decision flow to determine _if_ they should be buying anything at all, then narrows down candidates using personalized filters.

### Core Features

1. **Priority Gate** — Pre-purchase checklist: are you in a state to buy something new?
2. **Category Decision Matrix** — Contextual Q&A that surfaces only relevant questions per product category (sunscreen, serum, lip care)
3. **Product Matrix** — Tier-list style product comparison filtered by personalized + basic conditions
4. **Reaction Traceback** — Ingredient analysis to identify what caused a skin reaction

### User Segments

- A: 어디서부터 손댈지 모름 (Overwhelmed, no starting point)
- B: 고민은 있는데 카테고리를 모름 (Has a concern, but doesn't know what category)
- C: 이미 찾는 제품군이 있음 (Already knows the category — Fast Lane)
- D: 실패 원인 추적형 (Had a bad reaction, wants to trace the cause)

### Key Screens (MVP)

| #       | Screen                 | Role                                                    |
| ------- | ---------------------- | ------------------------------------------------------- |
| S01     | Landing / Intent Entry | Service value + segment selection + concern carousel    |
| S02     | Priority Gate          | Life/routine + product checklist → buy/hold verdict     |
| S03–S05 | Category Decision      | Contextual questions + product candidates               |
| S06     | Product Matrix         | Price-tier product comparison with personalized filters |
| S07     | Product Detail         | Product details + purchase link                         |
| S08     | Reaction Traceback     | Ingredient cause analysis                               |

---

## Sources

| Source            | Location                                                                                                                                         |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| Figma file        | "Ant Design Open Source (Community).fig" (mounted as virtual FS) — 70 pages, 808 frames. Ant Design component library used as the UI foundation. |
| Wireframe summary | `docs/wireframe_summary.md`                                                                                                                      |
| DB modeling       | `docs/db_modeling.md`                                                                                                                            |

---

## CONTENT FUNDAMENTALS

### Language

- **Primary**: Korean (한국어). All user-facing copy is in Korean.
- **Secondary**: English used for technical keys, code, admin labels, and design documentation.

### Tone & Voice

- **Direct and empathetic**: Speaks to the user as a knowledgeable, non-pushy friend who understands skincare.
- **Concise**: No long explanations. Short sentences. Results-first.
- **Honest and probabilistic**: Results are framed as _candidates_ and _possibilities_, never definitive diagnoses. E.g., "원인 후보로 볼 수 있는 성분군" (not "this caused your reaction").
- **Non-commercial**: The service actively tells users NOT to buy when appropriate. Purchase links are visually separated from decision content.

### Copy Examples

- "고민부터 시작해도 돼요" — concerns-first entry, no product knowledge needed
- "지금은 새 제품보다 피부 반응 안정화가 먼저예요" — hold verdict, empathetic
- "매일 쓸 수 있는 선크림을 먼저 찾아야 해요" — practical, not clinical
- "확정 진단이 아니라, 다음 선택에서 피해야 할 가능성을 줄이는 도구입니다" — probabilistic framing

### Casing & Punctuation

- Korean: sentence case, no all-caps
- Honorific: `-요` / `-세요` form throughout (polite but not formal)
- Emoji: **not used** in core UI. Tags and filters use plain Korean text.
- Numbers: Arabic numerals for prices (e.g., `2만원`, `5만원+`)

---

## VISUAL FOUNDATIONS

### Design Language

Built on **Ant Design** (antd) — a systematic, enterprise-grade UI library. The visual language is clean, information-dense, and functional. Not decorative.

### Colors

- **Primary / Brand**: Daybreak Blue `#1890FF` (blue-6 in Ant palette)
  - Hover: `#40A9FF` (blue-5)
  - Active/Pressed: `#096DD9` (blue-7)
  - Light background: `#E6F7FF` (blue-1)
  - Border accent: `#BAE7FF` (blue-2) / `#91D5FF` (blue-3)
- **Success**: Polar Green `#52C41A` (green-6)
- **Warning**: Calendula Gold `#FAAD14` (gold-6)
- **Error/Danger**: Dust Red `#FF4D4F` (red-5)
- **Background**: Page `#F0F2F5`, Component `#FAFAFA`, White `#FFFFFF`
- **Neutral grays**: `#F5F5F5` → `#D9D9D9` → `#8C8C8C` → `#595959` → `#262626`
- **Text hierarchy**: Primary `#262626`, Secondary `#595959`, Tertiary `#8C8C8C`, Disabled `#BFBFBF`

### Typography

- **Primary (Latin/numbers)**: Roboto — Regular (14px body), Medium (labels/emphasis), Bold (headings)
- **CJK (Korean/Chinese)**: PingFang SC — fallback for Korean glyphs
- **Monospace (code/ingredients)**: Menlo, Monaco
- **Base font size**: 14px
- **Line height**: 1.5714 (22px at 14px)
- **Type scale**: 12px (caption) → 14px (body) → 16px (subheading) → 20px → 24px → 30px → 38px (display)
- **Weight usage**: Regular = content, Medium = labels/tabs/nav, Bold = page titles
- **Google Fonts substitute**: Noto Sans KR replaces PingFang SC (unavailable on web). Flagged below.

### Spacing & Grid

- **Base unit**: 4px
- **Common spacing**: 4, 8, 12, 16, 20, 24, 32, 48px
- **Layout grid**: 24-column Ant Grid, gutter 16–24px
- **Page max-width**: 1440px design canvas; content typically 1200px
- **Component padding**: 4px (xs), 8px (sm), 12px (default input), 16px (cards/sections)

### Borders & Radii

- **Default border**: `1px solid #D9D9D9`
- **Border radius**: 2px (buttons, inputs, tags, most components) — Ant Design's signature sharp-cornered aesthetic
- **Card radius**: 2px bordered, or no border with subtle shadow
- **Pill/tag**: 2px (not round pills)

### Shadows

- **Default (dropdown/card)**: `0 2px 8px rgba(0,0,0,0.15)`
- **Hover elevation**: `0 4px 12px rgba(0,0,0,0.15)`
- **Button shadow**: `0 2px 0 rgba(0,0,0,0.016)` (very subtle, pushes button down)
- **Sider/sidebar**: `0 2px 8px rgba(0,0,0,0.15)` (right-side only)

### Backgrounds

- **Page background**: `#F0F2F5` (Ant Design classic gray-blue)
- **Card/panel**: `#FFFFFF` with `1px solid #D9D9D9` border OR just white with shadow
- **Sider**: `#001529` (dark navy) for primary nav; `#FFFFFF` for secondary/sub nav
- **Global header**: `#001529` (dark navy)
- No gradients in data-heavy screens. Flat, systematic.

### Hover & Interaction States

- **Button hover**: primary blue lightens to `#40A9FF`; border color transitions
- **Link hover**: text color → `#40A9FF`
- **Menu item hover**: light blue background `rgba(24,144,255,0.1)`
- **Input hover**: border → `#40A9FF`
- **Input focus**: border → `#1890FF`, blue box-shadow `0 0 0 2px rgba(24,144,255,0.2)`
- **Press/active**: darker shade (blue-7 `#096DD9`)
- No scale transforms on press. Color-based state changes only.

### Animation

- **Duration**: 200–300ms (Ant standard: `0.3s`)
- **Easing**: Ease-in-out (`cubic-bezier(0.645, 0.045, 0.355, 1)`)
- **Transitions**: color, background, border-color, box-shadow only. No layout animations.
- **No bounces or spring physics.** Clean, linear-adjacent transitions.

### Cards

- White background, `1px solid #D9D9D9` border, `border-radius: 2px`
- Title: `16px Roboto Medium`, separator line below (`#F0F0F0`)
- Body: `14px Roboto Regular`, color `#262626`
- No colored left-border accents. No large rounded corners.

### Iconography

Ant Design icons (antd icon set) — line/filled SVG icons, 14px and 16px standard sizes. See `assets/` and ICONOGRAPHY section in README.

### Imagery

- Ant Design uses minimal imagery in data screens
- Photos and illustrations used sparingly (marketing/landing contexts only)
- No background images in functional UI
- Placeholder: `#D9D9D9` fill with gray icon

---

## ICONOGRAPHY

Ant Design uses its own icon library (`@ant-design/icons`), served as SVG.

- **Style**: Outlined (default) and Filled variants. 14px / 16px / 20px sizes.
- **Color**: Inherits text color (`currentColor`). Icons match surrounding text.
- **Usage**: Navigation, action buttons, status indicators, form prefixes/suffixes.
- **Common icons in this product**: CheckCircle (pass), CloseCircle (fail), ExclamationCircle (caution), InfoCircle, Filter, Tag, Search, ArrowRight, ShoppingCart, UserOutlined, SettingOutlined.
- **CDN**: Ant Design icons are loaded via the antd library; no standalone icon font.
- Copied SVGs can be found in `assets/icons/`. Key icons were extracted from the Figma file.

---

## File Index

```
/
├── README.md                        ← This file
├── SKILL.md                         ← Agent skill definition
├── colors_and_type.css              ← CSS variables: colors, typography, spacing
├── assets/
│   └── icons/                       ← Extracted SVG icons
├── preview/                         ← Design system card previews
│   ├── colors-brand.html
│   ├── colors-neutral.html
│   ├── colors-semantic.html
│   ├── colors-palette.html
│   ├── type-scale.html
│   ├── type-specimens.html
│   ├── spacing-tokens.html
│   ├── shadows-borders.html
│   ├── buttons.html
│   ├── inputs.html
│   ├── tags-badges.html
│   ├── cards.html
│   ├── navigation.html
│   └── feedback.html
├── ui_kits/
│   └── webapp/
│       ├── README.md
│       ├── index.html               ← Main app prototype (Landing → Priority Gate → Product Matrix)
│       ├── Components.jsx
│       ├── LandingPage.jsx
│       ├── PriorityGate.jsx
│       └── ProductMatrix.jsx
└── docs/                            ← Attached source docs (read-only)
    ├── wireframe_summary.md
    └── db_modeling.md
```

---

## Font Substitution Notice

⚠️ **PingFang SC** (used for Korean/CJK in Figma) is a system font (macOS/iOS only). This design system uses **Noto Sans KR** from Google Fonts as a web-safe substitute. When deploying on macOS, PingFang SC will render natively. For all other platforms, Noto Sans KR provides equivalent coverage.

Please provide the original font files if you need pixel-perfect parity.
