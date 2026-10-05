# syntax=docker/dockerfile:1

# 1. Install all dependencies (dev deps are needed to build)
FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# 2. Build the Next.js app as a self-contained "standalone" server
FROM node:22-alpine AS build
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

# 3. Minimal runtime image: just the standalone server, static assets and content
FROM node:22-alpine
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0 \
    CONTENT_DIR=/app/content
WORKDIR /app

# tini reaps zombies and forwards SIGTERM so Swarm/Compose stop the app cleanly.
RUN apk add --no-cache tini

COPY --from=build /app/.next/standalone ./
COPY --from=build /app/.next/static ./.next/static
COPY content ./content

# Files stay root-owned (read-only for the app); the process runs unprivileged.
USER node
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||3000)+'/healthz').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "server.js"]
