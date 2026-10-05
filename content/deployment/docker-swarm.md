---
title: Deploy to Docker Swarm
description: Run several replicas behind the Swarm routing mesh with rolling updates.
tags: [docker, swarm, deployment]
order: 2
banner:
  type: tip
  text: Running a single server? [Docker Compose](docker-compose.md) is simpler and supports live content editing.
---

The same `docker-compose.yml` deploys as a Swarm stack. Swarm ignores the `build` key, so build and push the image first.

## Build and push

```bash
export KB_IMAGE=registry.example.com/knowledge-base:1.0.0
docker compose build
docker push "$KB_IMAGE"
```

On a single-node swarm you can skip the push; the local image is used.

## Deploy

```bash
docker stack deploy -c docker-compose.yml kb
docker service ls
```

The stack runs two replicas with start-first rolling updates, so a new version is healthy before the old one stops. Each replica answers `/healthz`, which the image's `HEALTHCHECK` uses.

## Content on multiple nodes

Each node needs the articles. Choose one of these:

1. **Bake content into the image** (default). Rebuild and redeploy to publish changes.
2. **Shared storage.** Mount the same NFS or CIFS volume on every node at `/app/content`.

> [!WARNING]
> Bind mounts with relative paths, like `./content`, don't work in Swarm because the path must exist on every node.

## Update a running stack

```bash
docker service update --image registry.example.com/knowledge-base:1.0.1 kb_kb
```
