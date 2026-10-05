# Knowledge Base (React / Next.js)

A public, searchable knowledge base built with **React 19** and **Next.js 16** (App Router). Articles are plain Markdown files in folders; there is no database. Pages are rendered on the server, so they're fast, indexable by search engines, and readable before JavaScript loads. Ships with a production Dockerfile and a compose file that works with `docker compose`, `docker stack deploy` (Swarm), and Portainer stacks.

## Features

- Markdown articles with front matter (title, description, tags, order, draft, updated date)
- Topics from folders, with optional `_category.md` for name, description and order
- Full-text search with typo tolerance and prefix matching (MiniSearch), plus live suggestions as you type
- Callouts (`> [!NOTE]`, `[!TIP]`, `[!WARNING]`…), article banners and a site-wide banner
- Syntax highlighting, tables, task lists, table of contents, previous/next links, tags
- Relative links like `../deployment/configuration.md` rewritten to site URLs
- Content changes picked up automatically, no rebuild or restart
- Sanitized article HTML, security headers and Content-Security-Policy
- Self-hosted fonts (no third-party requests), light and dark themes
- `sitemap.xml`, `robots.txt`, canonical URLs, Open Graph tags
- `/healthz` and `/readyz` endpoints, non-root container, read-only filesystem

## Run locally

```bash
npm install
npm run dev                 # http://localhost:3000, hot reload
# or production mode
npm run build && npm start
```

## Run with Docker Compose

```bash
cp .env.example .env        # optional: site name, public URL, etc.
docker compose up -d --build
```

To edit articles without rebuilding the image, uncomment the `./content:/app/content:ro` volume in `docker-compose.yml`. The server checks for changes every two seconds.

## Deploy to Docker Swarm

Swarm ignores `build`, so build (and push, for multi-node clusters) first:

```bash
export KB_IMAGE=registry.example.com/knowledge-base:1.0.0
docker compose build && docker push "$KB_IMAGE"
docker stack deploy -c docker-compose.yml kb
```

The stack runs 2 replicas with start-first rolling updates and automatic rollback. For content on multiple nodes, either bake it into the image (default) or mount shared storage (NFS/CIFS) at `/app/content` on every node. Relative bind mounts don't work in Swarm.

## Portainer

Add a stack from this repository (or paste `docker-compose.yml`). On a standalone Docker endpoint Portainer builds the image; on a Swarm endpoint, point `KB_IMAGE` at an image in your registry.

## Writing content

```
content/
├── getting-started/
│   ├── _category.md
│   └── welcome.md
├── deployment/
│   └── docker-swarm.md
└── _media/            # images, served at /media/<file>
```

```markdown
---
title: Reset a forgotten password
description: Shown in search results and lists.
tags: [accounts, security]
order: 2
---

Article body in Markdown...
```

Folders can be nested to any depth, e.g. `deployment/docker/compose.md` → `/deployment/docker/compose`. Add an `index.md` to a folder to give that topic an overview page. If a folder and an article share a name at the same level (`docker/` and `docker.md`), the folder wins and a warning is logged.

Folders and files starting with `_` or `.` are not treated as topics or articles. Topic folder names `api`, `search`, `tags`, `media`, `healthz` and `readyz` are reserved. The sample articles in `content/` document the full format.

## Configuration

All settings are environment variables read at request time, so changing them only needs a container restart, not a rebuild.

| Variable | Default | Purpose |
| --- | --- | --- |
| `PORT` | `3000` | Listen port |
| `HOSTNAME` | `0.0.0.0` (Docker) | Interface to bind |
| `CONTENT_DIR` | `./content` (`/app/content` in Docker) | Articles folder |
| `WATCH_CONTENT` | `true` | Pick up file changes automatically |
| `WATCH_INTERVAL_MS` | `2000` | How often to check for changes |
| `SITE_NAME` | `Knowledge Base` | Header and page titles |
| `SITE_TAGLINE` | `Find an answer` | Home page heading |
| `SITE_DESCRIPTION` | | Home page lede and meta description |
| `SITE_FOOTER` | site name | Footer text |
| `SITE_BANNER` | | Notice on every page (Markdown links allowed) |
| `SITE_BANNER_TYPE` | `note` | `note`, `tip`, `important`, `warning`, `caution` |
| `BASE_URL` | | Public URL for canonical links and sitemap |
| `EDIT_URL` | | Prefix for "Suggest an edit" links (e.g. `https://github.com/org/repo/edit/main/content/`) |
| `SITE_LOCALE` | `en-US` | Date format |

## Endpoints

| Path | Purpose |
| --- | --- |
| `/healthz` | Liveness (used by the image `HEALTHCHECK`) |
| `/readyz` | Readiness; `503` if content can't be loaded |
| `/api/search?q=…&limit=8` | JSON search |
| `/sitemap.xml`, `/robots.txt` | SEO |

## Project layout

```
app/                        Routes (Next.js App Router)
  layout.jsx                Shell: masthead, footer, fonts, metadata
  page.jsx                  Home
  [...path]/page.jsx        Every topic and article, at any depth
  search/  tags/[tag]/      Search results, tag pages
  api/search/route.js       JSON search API
  healthz/ readyz/ media/   Health checks, media files
  sitemap.js  robots.js     SEO
components/                 React components: ArticleView, CategoryView, TopicTree (sidebar),
                            Breadcrumbs, SearchBox and Masthead (client components)
lib/content.js              Loads Markdown, builds topics, tags and search index; detects changes
lib/markdown.js             Markdown rendering, link rewriting, sanitizing
lib/config.js               Environment configuration
content/                    Articles
```

## How content updates work

Pages call `getContent()`, which marks them as rendered per request. It keeps the parsed articles and search index in memory and, at most every `WATCH_INTERVAL_MS`, compares file sizes and modification times. If anything changed it rebuilds the index (typically a few milliseconds for hundreds of articles) and swaps it in. If a rebuild fails, the previous content keeps serving.
