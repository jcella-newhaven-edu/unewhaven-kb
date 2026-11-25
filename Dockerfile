# syntax=docker/dockerfile:1

# Base image: Node 26 (LTS) on Debian 13 "trixie"
FROM node:26-trixie-slim AS base

# Node 26 ships with an older npm; upgrade to the latest.
RUN npm install -g npm@12.2.3 && npm cache clean --force

# Install dependencies
FROM base AS deps
WORKDIR /app

COPY package.json package-lock.json ./
RUN --mount=type=cache,target=/root/.npm npm ci

# Prepare the application source and dependencies
FROM base AS source
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1

RUN chown node:node /app
COPY --from=deps --chown=node:node /app/node_modules ./node_modules
COPY --chown=node:node . .

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

USER node
RUN mkdir -p .next/cache

EXPOSE 3000

CMD ["node", "server.js"]
