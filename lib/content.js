import fs from 'node:fs/promises';
import path from 'node:path';
import { connection } from 'next/server';
import matter from 'gray-matter';
import MiniSearch from 'minisearch';
import { getConfig } from './config.js';
import { renderMarkdown, htmlToText, slugify, toBanner } from './markdown.js';

// Top-level paths the app already uses; a topic with one of these names would be unreachable.
export const RESERVED = new Set([
  'api', 'search', 'tags', 'media', 'healthz', 'readyz', '_next', 'robots.txt', 'sitemap.xml', 'icon.svg', 'favicon.ico',
]);

// Guards against runaway trees. Layouts are designed for 2-3 levels.
const MAX_DEPTH = 8;

const titleFromSlug = (slug) => slug.replace(/-/g, ' ').replace(/^\w/, (c) => c.toUpperCase());
const toOrder = (value) => (value !== null && value !== '' && Number.isFinite(Number(value)) ? Number(value) : 1000);
const byOrder = (a, b) => a.order - b.order || a.title.localeCompare(b.title);

function toTags(value) {
  if (!value) return [];
  const list = Array.isArray(value) ? value : String(value).split(',');
  return [...new Set(list.map((t) => String(t).trim()).filter(Boolean))];
}

function truncate(text, max) {
  if (text.length <= max) return text;
  const cut = text.slice(0, max);
  return cut.slice(0, cut.lastIndexOf(' ')) + '…';
}

const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** Returns an excerpt as segments: [{ text, match }], so React can render <mark> safely. */
function snippet(text, terms, length = 220) {
  const lower = text.toLowerCase();
  let hit = -1;
  for (const term of terms) {
    const i = lower.indexOf(term.toLowerCase());
    if (i !== -1 && (hit === -1 || i < hit)) hit = i;
  }
  let start = hit === -1 ? 0 : Math.max(0, hit - 60);
  if (start > 0) {
    const space = text.indexOf(' ', start);
    if (space !== -1 && space < hit) start = space + 1;
  }
  let out = text.slice(start, start + length);
  if (start + length < text.length) out = out.slice(0, out.lastIndexOf(' ')) + '…';
  if (start > 0) out = '…' + out;
  if (!terms.length) return [{ text: out, match: false }];

  const pattern = new RegExp(`(${[...terms].sort((a, b) => b.length - a.length).map(escapeRe).join('|')})`, 'gi');
  // With a capturing group, split() puts matches at odd indices.
  return out.split(pattern).map((text, i) => ({ text, match: i % 2 === 1 })).filter((s) => s.text);
}

/** Articles of a topic in reading order: its own articles, then each subtopic's, depth first. */
function readingOrder(category) {
  return [...category.articles, ...category.children.flatMap(readingOrder)];
}

class ContentIndex {
  constructor(dir) {
    this.dir = dir;
    this.roots = [];              // top-level topics
    this.categories = new Map();  // 'deployment/docker' -> topic
    this.articles = new Map();    // 'deployment/docker/compose' -> article
    this.tags = new Map();
    this.searchable = new Map();  // articles plus topic overviews (index.md)
    this.index = null;
  }

  async build() {
    let entries = [];
    try {
      entries = await fs.readdir(this.dir, { withFileTypes: true });
    } catch (err) {
      if (err.code !== 'ENOENT') throw err;
      console.warn(`[content] Directory not found: ${this.dir}`);
    }

    for (const entry of entries) {
      if (!entry.isDirectory() || entry.name.startsWith('.') || entry.name.startsWith('_')) continue;
      const slug = slugify(entry.name);
      if (RESERVED.has(slug)) {
        console.warn(`[content] Skipping topic "${entry.name}": the name is reserved.`);
        continue;
      }
      const topic = await this.#readCategory(path.join(this.dir, entry.name), slug, null);
      if (topic) this.roots.push(topic);
    }
    this.roots.sort(byOrder);

    // Register topics first so a folder wins when it clashes with an article of the same name.
    const walk = (category) => {
      this.categories.set(category.path, category);
      category.children.forEach(walk);
    };
    this.roots.forEach(walk);

    for (const category of this.categories.values()) {
      category.articles = category.articles.filter((article) => {
        if (!this.categories.has(article.key)) return true;
        console.warn(`[content] "${article.sourcePath}" has the same URL as a folder; the folder is shown instead.`);
        return false;
      });
      for (const article of category.articles) {
        this.articles.set(article.key, article);
        this.searchable.set(article.key, article);
        for (const tag of article.tags) {
          if (!this.tags.has(tag.slug)) this.tags.set(tag.slug, { name: tag.name, slug: tag.slug, articles: [] });
          this.tags.get(tag.slug).articles.push(article);
        }
      }
      if (category.intro) this.searchable.set(category.intro.key, category.intro);
    }

    // Previous/next follow reading order through the whole top-level topic.
    for (const root of this.roots) {
      const ordered = readingOrder(root);
      root.totalArticles = ordered.length;
      ordered.forEach((article, i) => {
        article.prev = ordered[i - 1] || null;
        article.next = ordered[i + 1] || null;
      });
    }
    for (const category of this.categories.values()) category.totalArticles = readingOrder(category).length;

    this.index = new MiniSearch({
      fields: ['title', 'tags', 'summary', 'text'],
      storeFields: ['key'],
      searchOptions: { boost: { title: 4, tags: 2, summary: 1.5 }, prefix: true, fuzzy: 0.2 },
    });
    this.index.addAll(
      [...this.searchable.values()].map((a) => ({
        id: a.key, key: a.key, title: a.title, tags: a.tags.map((t) => t.name).join(' '), summary: a.summary, text: a.text,
      })),
    );
    return this;
  }

  async #readCategory(dir, slug, parent) {
    const depth = parent ? parent.depth + 1 : 0;
    const categoryPath = parent ? `${parent.path}/${slug}` : slug;
    let meta = { data: {}, content: '' };
    try {
      meta = matter(await fs.readFile(path.join(dir, '_category.md'), 'utf8'));
    } catch { /* optional file */ }

    const category = {
      slug,
      path: categoryPath,
      url: `/${categoryPath}`,
      title: meta.data.title,
      description: meta.data.description || meta.content.trim(),
      order: toOrder(meta.data.order),
      depth,
      parent,
      trail: [],      // ancestors from the top-level topic down to this one
      children: [],
      articles: [],
      intro: null,    // index.md, shown at the top of the topic page
      totalArticles: 0,
    };
    category.trail = parent ? [...parent.trail, category] : [category];

    const entries = await fs.readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.name.startsWith('.') || entry.name.startsWith('_')) continue;
      const full = path.join(dir, entry.name);
      if (entry.isFile() && /\.md$/i.test(entry.name)) {
        try {
          const isIntro = /^index\.md$/i.test(entry.name);
          const article = await this.#readArticle(full, category, isIntro);
          if (!article) continue;
          if (isIntro) category.intro = article;
          else category.articles.push(article);
        } catch (err) {
          console.error(`[content] Failed to read ${path.relative(this.dir, full)}: ${err.message}`);
        }
      } else if (entry.isDirectory()) {
        if (depth + 1 >= MAX_DEPTH) {
          console.warn(`[content] Skipping "${path.relative(this.dir, full)}": nested more than ${MAX_DEPTH} levels.`);
          continue;
        }
        const child = await this.#readCategory(full, slugify(entry.name), category);
        if (child) category.children.push(child);
      }
    }

    if (!category.articles.length && !category.children.length && !category.intro) return null;
    // Title falls back from _category.md, to index.md, to the folder name.
    category.title ||= category.intro?.title || titleFromSlug(slug);
    category.description ||= category.intro?.summary || '';
    if (category.intro) category.intro.title ||= category.title;
    category.articles.sort(byOrder);
    category.children.sort(byOrder);
    return category;
  }

  async #readArticle(file, category, isIntro) {
    const [raw, stat] = await Promise.all([fs.readFile(file, 'utf8'), fs.stat(file)]);
    const { data, content } = matter(raw);
    if (data.draft === true) return null;

    let body = content;
    let title = data.title;
    const leadingH1 = body.match(/^\s*#\s+(.+?)\s*\r?\n/);
    if (leadingH1) {
      title ||= leadingH1[1].replace(/\s*#+$/, '');
      body = body.slice(leadingH1[0].length);
    }

    const slug = isIntro ? 'index' : slugify(data.slug || path.basename(file, path.extname(file)));
    const { html, headings } = renderMarkdown(body, category.path);
    const text = htmlToText(html);
    const firstParagraph = html.match(/<p>([\s\S]*?)<\/p>/);
    const updated = data.updated ? new Date(data.updated) : stat.mtime;

    return {
      key: `${category.path}/${slug}`,
      slug,
      isIntro,
      // A topic's overview lives at the topic's own URL.
      url: isIntro ? category.url : `/${category.path}/${slug}`,
      sourcePath: path.relative(this.dir, file).split(path.sep).join('/'),
      title: title || (isIntro ? '' : titleFromSlug(slug)),
      summary: data.description || truncate(firstParagraph ? htmlToText(firstParagraph[1]) : text, 180),
      tags: isIntro ? [] : toTags(data.tags).map((name) => ({ name, slug: slugify(name) })),
      order: toOrder(data.order),
      updated: Number.isNaN(updated.getTime()) ? stat.mtime : updated,
      banner: toBanner(data.banner, category.path),
      readingMinutes: Math.max(1, Math.round(text.split(' ').length / 220)),
      html,
      headings,
      text,
      category,
    };
  }

  /** Top-level topics, in display order. */
  categoryList() { return this.roots; }
  allCategories() { return [...this.categories.values()]; }
  category(categoryPath) { return this.categories.get(categoryPath); }
  article(key) { return this.articles.get(key); }
  allArticles() { return [...this.articles.values()]; }
  tag(slug) { return this.tags.get(slug); }
  recent(limit = 6) { return this.allArticles().sort((a, b) => b.updated - a.updated).slice(0, limit); }

  /** Resolves URL segments to a topic or an article. Folders win over articles with the same path. */
  resolve(segments) {
    const key = segments.map((s) => decodeURIComponent(s)).join('/');
    const category = this.categories.get(key);
    if (category) return { type: 'category', category };
    const article = this.articles.get(key);
    if (article) return { type: 'article', article };
    return null;
  }

  search(query, limit = 20) {
    const q = String(query || '').trim().slice(0, 200);
    if (!q || !this.index) return [];
    let results = this.index.search(q, { combineWith: 'AND' });
    if (!results.length) results = this.index.search(q, { combineWith: 'OR' });
    return results.slice(0, limit).map((r) => {
      const article = this.searchable.get(r.key);
      return { article, snippet: snippet(article.text, r.terms) };
    });
  }
}

/** Cheap fingerprint of the content tree (paths, sizes, mtimes) used to detect edits. */
async function fingerprint(dir) {
  const parts = [];
  async function walk(current, depth) {
    let entries;
    try { entries = await fs.readdir(current, { withFileTypes: true }); } catch { return; }
    for (const entry of entries) {
      if (entry.name.startsWith('.')) continue;
      const full = path.join(current, entry.name);
      if (entry.isDirectory() && depth < MAX_DEPTH) await walk(full, depth + 1);
      else if (entry.isFile() && /\.md$/i.test(entry.name)) {
        const s = await fs.stat(full);
        parts.push(`${full}:${s.size}:${s.mtimeMs}`);
      }
    }
  }
  await walk(dir, 0);
  return parts.sort().join('|');
}

// One cache per server process, shared across all routes and bundles.
const cache = (globalThis.__kbContent ??= { index: null, fingerprint: '', checkedAt: 0, pending: null });

/**
 * Returns the content index, rebuilding it when files have changed.
 * Calling connection() marks every caller as request-time rendered, so edits show up without a rebuild.
 */
export async function getContent() {
  await connection();
  const { contentDir, watch, watchInterval } = getConfig();
  const fresh = cache.index && (!watch || Date.now() - cache.checkedAt < watchInterval);
  if (fresh) return cache.index;
  if (cache.pending) return cache.pending;

  cache.pending = (async () => {
    try {
      const print = await fingerprint(contentDir);
      cache.checkedAt = Date.now();
      if (!cache.index || print !== cache.fingerprint) {
        const started = Date.now();
        const index = await new ContentIndex(contentDir).build();
        const reason = cache.index ? 'Content changed' : 'Loaded';
        cache.index = index;
        cache.fingerprint = print;
        console.log(`[content] ${reason}: ${index.articles.size} articles in ${index.categories.size} topics (${Date.now() - started} ms)`);
      }
      return cache.index;
    } catch (err) {
      if (cache.index) {
        console.error(`[content] Reload failed, keeping previous content: ${err.message}`);
        return cache.index;
      }
      throw err;
    } finally {
      cache.pending = null;
    }
  })();
  return cache.pending;
}
