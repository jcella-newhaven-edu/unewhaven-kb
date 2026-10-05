---
title: Configuration reference
description: Every environment variable the server reads, with defaults.
tags: [reference, deployment]
order: 3
---

All configuration happens through environment variables.

## Environment variables

| Variable | Default | Purpose |
| --- | --- | --- |
| `PORT` | `3000` | Port the server listens on. |
| `HOSTNAME` | `0.0.0.0` | Interface to bind. |
| `CONTENT_DIR` | `/app/content` | Folder containing topics and articles. |
| `WATCH_CONTENT` | `true` | Reload automatically when files change. |
| `WATCH_INTERVAL_MS` | `2000` | How often to check for changed files. |
| `SITE_NAME` | `Knowledge Base` | Name in the header and page titles. |
| `SITE_TAGLINE` | `Find an answer` | Large heading on the home page. |
| `SITE_DESCRIPTION` | | Text under the heading and the default meta description. |
| `SITE_FOOTER` | site name | Footer text. |
| `SITE_BANNER` | | Notice shown on every page. Supports links and formatting. |
| `SITE_BANNER_TYPE` | `note` | Banner style: `note`, `tip`, `important`, `warning` or `caution`. |
| `BASE_URL` | | Public URL, used for canonical links and the sitemap. |
| `EDIT_URL` | | Prefix for "Suggest an edit" links, e.g. a GitHub edit URL ending in `/content/`. |
| `SITE_LOCALE` | `en-US` | Date formatting. |

## Endpoints

| Path | Purpose |
| --- | --- |
| `/healthz` | Liveness check. Always `200` while the process runs. |
| `/readyz` | Readiness check. `503` during startup and shutdown. |
| `/api/search?q=` | JSON search results. |
| `/sitemap.xml` | Sitemap for search engines. |
