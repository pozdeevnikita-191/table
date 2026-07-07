# syntax=docker/dockerfile:1

##############################################################################
# Stage 1: deps — install the full pnpm workspace (all packages, all deps).
# Also used as the base for the one-off "migrate" stage (drizzle-kit push).
##############################################################################
FROM node:24-bookworm-slim AS deps
RUN corepack enable && corepack prepare pnpm@10 --activate
WORKDIR /app

# Copy only what's needed to resolve the dependency graph first, for better
# Docker layer caching.
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./
COPY tsconfig.json tsconfig.base.json ./
COPY lib ./lib
COPY artifacts/api-server ./artifacts/api-server
COPY artifacts/tabele ./artifacts/tabele
COPY scripts ./scripts

RUN pnpm install --no-frozen-lockfile

##############################################################################
# Stage 2: build — compile the API server bundle and the frontend static site.
##############################################################################
FROM deps AS build

ARG BASE_PATH=/
ENV BASE_PATH=$BASE_PATH
ENV NODE_ENV=production
# Only used so vite.config.ts has *a* value while building (unused at build time).
ENV PORT=5173

RUN pnpm --filter @workspace/api-server run build \
 && pnpm --filter @workspace/tabele run build

##############################################################################
# Stage 3: migrate — lightweight one-off image to push the Drizzle schema to
# Postgres. Not used by the running service; invoked manually / via
# `docker compose run --rm migrate`.
##############################################################################
FROM deps AS migrate
WORKDIR /app/lib/db
ENTRYPOINT ["pnpm", "run", "push"]

##############################################################################
# Stage 4: runtime — minimal image, no source, no node_modules, no dev deps.
# The API server is a single self-contained esbuild bundle; the frontend is
# static files served by the same Express process.
##############################################################################
FROM node:24-bookworm-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production
ENV STATIC_DIR=/app/public
ENV PORT=3000

COPY --from=build /app/artifacts/api-server/dist ./dist
COPY --from=build /app/artifacts/tabele/dist/public ./public

EXPOSE 3000

# Basic container-level healthcheck hitting the API health route.
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||3000)+'/api/healthz').then(r=>{if(!r.ok)process.exit(1)}).catch(()=>process.exit(1))"

CMD ["node", "--enable-source-maps", "dist/index.mjs"]
