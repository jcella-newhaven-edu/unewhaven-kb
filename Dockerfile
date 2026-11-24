# syntax=docker/dockerfile:1

# Base image
FROM node:24-bookworm-slim AS base

# Install dependencies
FROM base AS deps
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

# Prepare the application source and dependencies
FROM base AS source
WORKDIR /app

COPY --from=deps --chown=node:node /app/node_modules ./node_modules
COPY --chown=node:node . .

RUN chown node:node /app
ENV NEXT_TELEMETRY_DISABLED=1
USER node

# Local Compose builds after its PostgreSQL service has initialized.
FROM source AS compose
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"
EXPOSE 3000
CMD ["sh", "-c", "npm run build && cp -a public .next/standalone/ && cp -a .next/static .next/standalone/.next/ && exec node .next/standalone/server.js"]

# Production builds connect to a prepared PostgreSQL instance.
FROM source AS builder
RUN --mount=type=secret,id=database_url,env=DATABASE_URL,required=true npm run build

# Production image
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

COPY --from=builder --chown=node:node /app/public ./public
COPY --from=builder --chown=node:node /app/.next/standalone ./
COPY --from=builder --chown=node:node /app/.next/static ./.next/static

RUN mkdir -p .next/cache && chown -R node:node .next

USER node

EXPOSE 3000

CMD ["node", "server.js"]
