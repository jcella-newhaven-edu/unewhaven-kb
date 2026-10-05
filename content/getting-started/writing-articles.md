---
title: Writing articles
description: The Markdown and front-matter format every article uses, with examples.
tags: [basics, markdown, authoring]
order: 2
---

Each article is a Markdown file with an optional block of settings at the top, called front matter.

## Front matter

```yaml
---
title: Reset a forgotten password
description: One-sentence summary shown in search results and lists.
tags: [accounts, security]
order: 3            # position within the topic; lower comes first
updated: 2026-10-01 # optional; defaults to the file's modified time
slug: reset-password # optional; defaults to the file name
draft: true         # optional; hides the article
banner:             # optional; notice shown above the article
  type: warning
  text: This applies to accounts created before March 2026.
---
```

Every field is optional. Without a `title`, the first `# Heading` in the file is used, and failing that, the file name.

## Topic settings

Add a `_category.md` file to a topic folder to set its display name, description and position on the home page:

```yaml
---
title: Billing and invoices
description: Payment methods, receipts and refunds.
order: 2
---
```

## Callouts

Highlight important information with a callout. Start a blockquote with one of five types:

```markdown
> [!NOTE]
> Useful information the reader should notice, even when skimming.

> [!TIP]
> A shortcut or better way to do something.

> [!IMPORTANT]
> Something the reader needs to know to succeed.

> [!WARNING]
> Something that could cause problems if ignored.

> [!CAUTION]
> An action with risky or irreversible consequences.
```

They look like this:

> [!NOTE]
> Useful information the reader should notice, even when skimming.

> [!TIP]
> A shortcut or better way to do something.

> [!IMPORTANT]
> Something the reader needs to know to succeed.

> [!WARNING]
> Something that could cause problems if ignored.

> [!CAUTION]
> An action with risky or irreversible consequences.

Text after the type replaces the default title, and callouts can contain lists, links and code:

```markdown
> [!WARNING] Back up before upgrading
> The upgrade changes the database format. Run `kb backup` first.
```

> [!WARNING] Back up before upgrading
> The upgrade changes the database format. Run `kb backup` first.

This is the same syntax GitHub uses, so callouts also render when someone views the file there.

## Article banners

To put a notice at the top of an article, such as "this page is out of date", add `banner` to the front matter. Use the same five types; `title` is optional, and the text can include links and formatting:

```yaml
banner:
  type: caution
  title: Deprecated
  text: This method stops working in June. Use [the new API](../developers/api-v2.md) instead.
```

A plain string works too, and shows as a note: `banner: Updated for version 2.`

## Site-wide banner

For announcements such as planned maintenance, set the `SITE_BANNER` environment variable. It appears below the header on every page. Set `SITE_BANNER_TYPE` to choose the style; it defaults to `note`.

## Linking between articles

Link to other articles by their file path, exactly as you would on GitHub. The site rewrites these links to the right URL:

```markdown
See [Configuration](../deployment/configuration.md#environment-variables).
```

## Images

Put images in `content/_media/` and reference them by file name:

```markdown
![Settings screen](settings-screen.png)
```

## Supported formatting

Standard Markdown plus GitHub extensions: tables, task lists, strikethrough, and fenced code blocks with syntax highlighting.

| Element | Syntax |
| --- | --- |
| Inline code | `` `code` `` |
| Keyboard key | `<kbd>Ctrl</kbd>` |
| Collapsible section | `<details><summary>…</summary>…</details>` |

> HTML in articles is sanitized: scripts, styles and event handlers are removed, so contributions can't inject code into the site.

Changes are picked up automatically while the server runs. There is no build step.
