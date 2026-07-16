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
COPY backend ./backend
RUN pnpm --filter @skincare-decision/shared build
RUN DATABASE_URL="postgresql://placeholder:placeholder@localhost:5432/placeholder" \
    pnpm --filter backend run prisma:generate
RUN pnpm --filter backend build
RUN pnpm --filter backend deploy --prod --legacy /prod/backend

FROM node:22-slim AS runtime
ENV NODE_ENV=production
WORKDIR /app
COPY --from=build /prod/backend ./
COPY --from=build /repo/backend/dist ./dist
COPY --from=build /repo/backend/prisma ./prisma
COPY --from=build /repo/backend/prisma.config.ts ./
RUN groupadd -r nodeapp && useradd -r -g nodeapp nodeapp \
    && chown -R nodeapp:nodeapp /app
USER nodeapp
EXPOSE 3000
CMD ["node", "dist/main.js"]
