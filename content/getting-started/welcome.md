---
title: Welcome to the knowledge base
description: What this site is, how it is organized, and how to find what you need.
tags: [basics]
order: 1
---

This knowledge base collects guides, how-tos and reference articles in one searchable place. Every article is a plain Markdown file, so anyone who can edit a text file can contribute.

## How it's organized

Articles are grouped into **topics**. Each topic is a folder inside the `content` directory, and each article is a `.md` file inside that folder:

```text
content/
├── getting-started/
│   ├── _category.md      # optional: topic title, description, order
│   ├── welcome.md
│   └── writing-articles.md
├── deployment/
│   └── docker-compose.md
└── _media/               # images referenced from articles
```

## Finding an answer

- Use the search box at the top of any page. Press <kbd>/</kbd> to jump to it.
- Search matches titles, tags, summaries and full article text, and tolerates small typos.
- Browse a topic from the home page, or follow a tag to see related articles.

## Next steps

Read [Writing articles](writing-articles.md) to learn the file format, then see [Run with Docker Compose](../deployment/docker-compose.md) to deploy your own copy.
