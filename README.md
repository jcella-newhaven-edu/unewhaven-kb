# Knowledge Base (React / Next.js on GitHub Pages)

A public, searchable knowledge base built with **React 19** and **Next.js 16**. Articles are Markdown files in folders. Every push to `main` builds the site into static HTML and publishes it to **GitHub Pages**: no server, database or Docker.

## Features

- Markdown articles with front matter (title, description, tags, order, draft, updated date, banner)
- Topics from folders, nested to any depth, with optional `_category.md` and `index.md` overview pages
- Search that runs in the browser, with typo tolerance and live suggestions
- Callouts (`> [!NOTE]`, `[!TIP]`, `[!WARNING]`…), article banners and a site-wide banner
- Syntax highlighting, tables, table of contents, previous/next links, tags
- "Updated" dates from each file's last Git commit
- Sitemap, canonical URLs, light and dark themes, self-hosted fonts

## Publish on GitHub Pages

1. Push this project to a GitHub repository.
2. In the repository, open **Settings → Pages** and set **Source** to **GitHub Actions**.
3. Push to `main`, or run **Deploy to GitHub Pages** from the **Actions** tab.

The site appears at `https://YOUR-USERNAME.github.io/YOUR-REPO/`. Every later push to `main` republishes it within a minute or two.

On a free GitHub plan, Pages requires a public repository.

### Custom domain

Add the domain in **Settings → Pages → Custom domain**, follow GitHub's DNS instructions, then re-run the workflow. It detects the domain and builds for it automatically.

### Site settings

Settings are read at build time. Add them as repository variables under **Settings → Secrets and variables → Actions → Variables**. All are optional.

| Variable | Default | Purpose |
| --- | --- | --- |
| `SITE_NAME` | `Knowledge Base` | Header and page titles |
| `SITE_TAGLINE` | `Find an answer` | Home page heading |
| `SITE_DESCRIPTION` | | Home page lede and meta description |
| `SITE_FOOTER` | site name | Footer text |
| `SITE_BANNER` | | Notice on every page (Markdown links allowed) |
| `SITE_BANNER_TYPE` | `note` | `note`, `tip`, `important`, `warning`, `caution` |
| `EDIT_URL` | | Prefix for "Suggest an edit" links, e.g. `https://github.com/ORG/REPO/edit/main/content/` |
| `SITE_LOCALE` | `en-US` | Date format |

After changing a variable, re-run the workflow (or push any commit) to rebuild.

## Work locally

Requires Node.js 22.12 or later.

```bash
npm install
npm run dev        # http://localhost:3000, updates as you edit articles
npm run build      # writes the static site to ./out
npm run preview    # serves ./out
```

For local builds, settings can go in a `.env` file (see `.env.example`).

## Writing content

```
content/
├── getting-started/
│   ├── _category.md       # optional: topic title, description, order
│   ├── index.md           # optional: topic overview page
│   └── welcome.md
├── deployment/
│   └── hosting/           # nested topics, any depth
│       └── github-pages.md
└── _media/                # images, referenced by file name
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

Folders and files starting with `_` or `.` are not treated as topics or articles. Topic folder names `search`, `tags` and `media` are reserved. If a folder and an article share a name at the same level, the folder wins and a warning is logged. The sample articles in `content/` document the full format.

## How it works

`next build` renders every topic, article and tag page to HTML in `out/`, using `trailingSlash` so each page is a folder with an `index.html`. It also writes `search-index.json` with the text of every article. The browser downloads that file the first time someone searches and indexes it with MiniSearch, so search needs no server.

On a project site, everything is served under `/YOUR-REPO/`. The workflow passes that path to the build as `BASE_PATH`, and every link, including links inside articles, gets the prefix.

## Project layout

```
.github/workflows/pages.yml   Build and publish to GitHub Pages
app/                          Routes (Next.js App Router)
  layout.jsx                  Shell: masthead, banner, footer, fonts, metadata
  page.jsx                    Home
  [...path]/page.jsx          Every topic and article, at any depth
  search/page.jsx             Search results (computed in the browser)
  search-index.json/route.js  Search data, written at build time
  tags/[tag]/page.jsx         Tag pages
  sitemap.js  robots.js       SEO
components/                   React components (SearchBox, SearchResults and Masthead run in the browser)
lib/content.js                Loads Markdown, builds topics and tags, reads Git dates
lib/markdown.js               Markdown rendering, callouts, link rewriting, sanitizing
lib/search-core.js            Browser search
lib/config.js                 Settings
scripts/copy-media.mjs        Copies content/_media into the site
content/                      Articles
```
