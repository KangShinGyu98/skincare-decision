# syntax=docker/dockerfile:1.7

FROM node:22-slim AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable && corepack prepare pnpm@10.32.1 --activate

FROM base AS deps
WORKDIR /repo
COPY pnpm-workspace.yaml pnpm-lock.yaml package.json ./
COPY shared/package.json ./shared/package.json
COPY backend/package.json ./backend/package.json
COPY frontend/package.json ./frontend/package.json
RUN --mount=type=cache,id=pnpm,target=/pnpm/store \
    pnpm install --frozen-lockfile

FROM deps AS build
WORKDIR /repo
COPY tsconfig.base.json ./
COPY shared ./shared
COPY frontend ./frontend
RUN pnpm --filter @skincare-decision/shared build
RUN pnpm --filter frontend build

FROM node:22-slim AS runtime
ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"
WORKDIR /app

COPY --from=build /repo/frontend/.next/standalone ./
COPY --from=build /repo/frontend/.next/static ./frontend/.next/static
COPY --from=build /repo/frontend/public ./frontend/public

RUN groupadd -r nodeapp && useradd -r -g nodeapp nodeapp \
    && chown -R nodeapp:nodeapp /app
USER nodeapp
EXPOSE 3000

CMD ["node", "frontend/server.js"]
