---
title: Run with Docker Compose
description: Build the image and run a single instance with Docker Compose.
tags: [docker, deployment]
order: 1
---

The repository ships with a `Dockerfile` and a `docker-compose.yml` that work with both `docker compose` and `docker stack deploy`.

## Start the site

```bash
docker compose up -d --build
```

The site is now available at `http://localhost:3000`. Check its health with:

```bash
curl http://localhost:3000/healthz
```

## Edit content without rebuilding

By default the articles are baked into the image. To edit them live, uncomment the volume in `docker-compose.yml`:

```yaml
volumes:
  - ./content:/app/content:ro
```

The server checks the folder every two seconds and picks up added, changed and deleted articles without a restart. This works on Docker Desktop for Mac and Windows too.

## Behind a reverse proxy

Set `BASE_URL` to the public address so canonical links and the sitemap are correct:

```yaml
environment:
  BASE_URL: https://help.example.com
```
