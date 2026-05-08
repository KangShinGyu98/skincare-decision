# backend/

Skincare Decision MVP NestJS 백엔드.

## 스택

NestJS · Prisma · PostgreSQL · Redis · Zod · Pino

## 실행

```bash
# 의존성
pnpm install

# 로컬 DB / Redis
docker compose -f backend/docker-compose.yml up -d

# Prisma
pnpm run prisma:validate
pnpm exec prisma migrate dev
pnpm exec prisma generate

# Dev
pnpm run start:dev   # http://localhost:4000
# health: GET /health
# swagger: GET /docs

# 테스트
pnpm run test
pnpm run test:e2e
```

## 환경변수

`.env.example`을 복사해 `.env` 작성:

```bash
cp .env.example .env
```

필수 키:

- `DATABASE_URL`
- `REDIS_URL`
- `COOKIE_SECRET`
- `CORS_ORIGIN`

## 폴더 구조

[AGENTS.md](AGENTS.md) 참조.

## 진입 규칙

- 작업 시작 전 [CLAUDE.md](CLAUDE.md)와 [AGENTS.md](AGENTS.md)를 읽는다.
- 새 endpoint는 `../memory/api_contracts.md`에 등록.
- 의존성 추가 사유는 `../memory/project_decisions.md`에 기록.
- Jest는 `run-local-jest.cjs`를 통해 workspace-local CLI를 강제한다.
