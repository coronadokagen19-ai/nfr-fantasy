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
ARG BASE_PATH=/
ENV VITE_CLERK_PUBLISHABLE_KEY=$VITE_CLERK_PUBLISHABLE_KEY \
    VITE_CLERK_PROXY_URL=$VITE_CLERK_PROXY_URL \
    BASE_PATH=$BASE_PATH

RUN pnpm run qa:nfr && pnpm run qa:static && pnpm run build:release

FROM node:22-bookworm-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production PORT=8080
COPY --from=build /app/artifacts/api-server/dist ./artifacts/api-server/dist
EXPOSE 8080
CMD ["node", "artifacts/api-server/dist/index.mjs"]
