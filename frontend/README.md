# frontend/

Skincare Decision MVP Next.js (App Router) 프론트엔드.

## 스택

Next.js 14+ · React 18 · TypeScript 5 · Tailwind · shadcn/ui · TanStack Query · Zustand · Zod

## 실행

```bash
pnpm install
cp .env.local.example .env.local

pnpm run dev      # http://localhost:3000
pnpm run build
pnpm run lint
pnpm run test
```

## 환경변수

`.env.local.example`를 복사해 `.env.local`:

```bash
NEXT_PUBLIC_API_BASE_URL=http://localhost:4000
NEXT_PUBLIC_APP_ENV=local
```

## 폴더 구조

[AGENTS.md](AGENTS.md) 참조.

## 진입 규칙

- 작업 시작 전 [CLAUDE.md](CLAUDE.md), [AGENTS.md](AGENTS.md), `../docs/page_content_specification_revised.md` 해당 화면 섹션을 읽는다.
- shadcn/ui 컴포넌트 추가 시 `components/ui/` 하위에 두고 토큰 매핑을 검토한다.
- Concern Mapper 상수 변경은 `src/config/concerns.ts`만 수정.
