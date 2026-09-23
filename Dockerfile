FROM node:22-bookworm-slim AS build
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@10.18.3 --activate

COPY NFR_Fantasy_APP_SOURCE.tar.gz.b64 /tmp/NFR_Fantasy_APP_SOURCE.tar.gz.b64
RUN base64 -d /tmp/NFR_Fantasy_APP_SOURCE.tar.gz.b64 > /tmp/NFR_Fantasy_APP_SOURCE.tar.gz \
 && tar -xzf /tmp/NFR_Fantasy_APP_SOURCE.tar.gz -C /app \
 && rm /tmp/NFR_Fantasy_APP_SOURCE.tar.gz /tmp/NFR_Fantasy_APP_SOURCE.tar.gz.b64

RUN pnpm install --frozen-lockfile

ARG VITE_CLERK_PUBLISHABLE_KEY
ARG VITE_CLERK_PROXY_URL
ARG VITE_TEST_MODE=true
ARG BASE_PATH=/
ENV VITE_CLERK_PUBLISHABLE_KEY=$VITE_CLERK_PUBLISHABLE_KEY \
    VITE_CLERK_PROXY_URL=$VITE_CLERK_PROXY_URL \
    VITE_TEST_MODE=$VITE_TEST_MODE \
    BASE_PATH=$BASE_PATH

RUN pnpm run qa:nfr && pnpm run qa:static && pnpm run build:release

FROM node:22-bookworm-slim AS runtime
WORKDIR /app
RUN apt-get update \
 && apt-get install -y --no-install-recommends postgresql-client \
 && rm -rf /var/lib/apt/lists/*
ENV NODE_ENV=production PORT=8080
COPY --from=build /app/artifacts/api-server/dist ./artifacts/api-server/dist
COPY --from=build /app/handoff/migrations ./handoff/migrations
EXPOSE 8080
CMD ["sh", "-c", "if [ \"$MEMORY_ONLY\" = \"true\" ]; then exec node artifacts/api-server/dist/index.mjs; else psql \"$DATABASE_URL\" -v ON_ERROR_STOP=1 -f handoff/migrations/0001_initial.sql && psql \"$DATABASE_URL\" -v ON_ERROR_STOP=1 -f handoff/migrations/0002_multi_league_memberships.sql && psql \"$DATABASE_URL\" -v ON_ERROR_STOP=1 -f handoff/migrations/0003_enable_rls.sql && exec node artifacts/api-server/dist/index.mjs; fi"]
