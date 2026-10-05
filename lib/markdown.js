import path from 'node:path';
import { Marked } from 'marked';
import { gfmHeadingId, getHeadingList } from 'marked-gfm-heading-id';
import { markedHighlight } from 'marked-highlight';
import hljs from 'highlight.js';
import sanitizeHtml from 'sanitize-html';
import { getBasePath } from './config.js';

export function slugify(value) {
  return String(value)
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

// Category of the article currently being rendered. Parsing is synchronous,
// so a module-level value is safe and lets walkTokens resolve relative links.
let currentCategory = '';

function rewriteHref(href, type) {
  if (!href || /^([a-z][a-z0-9+.-]*:|\/\/|#)/i.test(href)) return href;
  const base = getBasePath();
  const [target, hash] = href.split('#');
  const suffix = hash ? `#${hash}` : '';

  if (type === 'link' && /\.md$/i.test(target)) {
    const resolved = path.posix.normalize(path.posix.join('/', currentCategory, target));
    const parts = resolved.replace(/\.md$/i, '').split('/').filter(Boolean).map(slugify);
    if (parts.at(-1) === 'index') parts.pop(); // a folder's index.md lives at the folder's URL
    return `${base}/${parts.length ? parts.join('/') + '/' : ''}${suffix}`;
  }
  if (type === 'image' && !target.startsWith('/')) {
    return `${base}/media/` + target.replace(/^(\.\.?\/)+/, '').replace(/^_media\//, '');
  }
  // Site-absolute links written by authors ("/getting-started/welcome") need the base path too.
  if (target.startsWith('/') && base && !target.startsWith(`${base}/`)) return base + href;
  return href;
}

// Callouts using GitHub's alert syntax, with an optional custom title:
//   > [!WARNING] Back up first
//   > This permanently deletes the workspace.
export const CALLOUT_TYPES = { note: 'Note', tip: 'Tip', important: 'Important', warning: 'Warning', caution: 'Caution' };
const calloutPattern =
  /^ {0,3}> ?\[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION)\][ \t]*([^\n]*)(?:\n|$)((?: {0,3}>[^\n]*(?:\n|$))*)/i;

const callouts = {
  extensions: [
    {
      name: 'callout',
      level: 'block',
      start(src) {
        return src.match(/^ {0,3}> ?\[!/m)?.index;
      },
      tokenizer(src) {
        const match = calloutPattern.exec(src);
        if (!match) return undefined;
        const variant = match[1].toLowerCase();
        const token = {
          type: 'callout',
          raw: match[0],
          variant,
          titleTokens: this.lexer.inlineTokens(match[2].trim() || CALLOUT_TYPES[variant]),
          tokens: [],
        };
        this.lexer.blockTokens(match[3].replace(/^ {0,3}> ?/gm, ''), token.tokens);
        return token;
      },
      renderer(token) {
        return (
          `<div class="callout callout-${token.variant}" role="note">` +
          `<p class="callout-title">${this.parser.parseInline(token.titleTokens)}</p>` +
          `${this.parser.parse(token.tokens)}</div>\n`
        );
      },
    },
  ],
};

const marked = new Marked(
  markedHighlight({
    emptyLangClass: 'hljs',
    langPrefix: 'hljs language-',
    highlight(code, lang) {
      const language = hljs.getLanguage(lang) ? lang : 'plaintext';
      return hljs.highlight(code, { language }).value;
    },
  }),
  gfmHeadingId(),
  callouts,
  {
    gfm: true,
    walkTokens(token) {
      if (token.type === 'link' || token.type === 'image') token.href = rewriteHref(token.href, token.type);
    },
  },
);

const sanitizeOptions = {
  allowedTags: sanitizeHtml.defaults.allowedTags.concat([
    'img', 'h1', 'h2', 'del', 'details', 'summary', 'kbd', 'sup', 'sub', 'input',
  ]),
  allowedAttributes: {
    '*': ['id', 'class'],
    div: ['role'],
    a: ['href', 'title', 'name', 'rel'],
    img: ['src', 'alt', 'title', 'width', 'height', 'loading'],
    th: ['align'],
    td: ['align'],
    input: ['type', 'checked', 'disabled'],
  },
  allowedSchemes: ['http', 'https', 'mailto'],
  transformTags: {
    img: (tagName, attribs) => ({ tagName, attribs: { ...attribs, loading: 'lazy' } }),
    a: (tagName, attribs) =>
      /^https?:\/\//i.test(attribs.href || '')
        ? { tagName, attribs: { ...attribs, rel: 'noopener noreferrer' } }
        : { tagName, attribs },
  },
};

export function renderMarkdown(markdown, category) {
  currentCategory = category;
  const raw = marked.parse(markdown);
  const headings = getHeadingList()
    .filter((h) => h.level === 2 || h.level === 3)
    .map((h) => ({ id: h.id, text: h.raw, level: h.level }));
  return { html: sanitizeHtml(raw, sanitizeOptions), headings };
}

/** Renders a short Markdown string (banner text) as sanitized inline HTML. */
export function renderInline(markdown, category = '') {
  currentCategory = category;
  return sanitizeHtml(marked.parseInline(String(markdown)), sanitizeOptions);
}

/** Normalizes a banner setting: a string, or { type, title, text }. Returns null if empty. */
export function toBanner(value, category = '') {
  if (!value) return null;
  const banner = typeof value === 'string' ? { text: value } : value;
  if (!banner.text) return null;
  const type = String(banner.type || 'note').toLowerCase();
  return {
    type: CALLOUT_TYPES[type] ? type : 'note',
    title: banner.title ? renderInline(banner.title, category) : '',
    html: renderInline(banner.text, category),
  };
}

export function htmlToText(html) {
  return html
    // Block boundaries become spaces; inline tags vanish so "a <a>link</a>." stays "a link."
    .replace(/<\/(p|h[1-6]|li|pre|div|tr|td|th|blockquote|summary)>|<br\s*\/?>/gi, ' ')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .trim();
}
