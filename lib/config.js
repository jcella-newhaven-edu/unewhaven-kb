import path from 'node:path';

// Read during `next build`. On GitHub Pages, set these as repository variables (see README).
const bool = (value, fallback) =>
  value === undefined || value === '' ? fallback : ['1', 'true', 'yes', 'on'].includes(String(value).toLowerCase());

export function getConfig() {
  const env = process.env;
  return {
    // Content is read at runtime, so keep it out of the build's file tracing.
    contentDir: path.resolve(/*turbopackIgnore: true*/ env.CONTENT_DIR || path.join(/*turbopackIgnore: true*/ process.cwd(), 'content')),
    watch: bool(env.WATCH_CONTENT, true),
    watchInterval: Math.max(250, Number(env.WATCH_INTERVAL_MS) || 2000),
    site: {
      name: env.SITE_NAME || 'Knowledge Base',
      tagline: env.SITE_TAGLINE || 'Find an answer',
      description: env.SITE_DESCRIPTION || 'Guides, how-tos and reference articles.',
      baseUrl: (env.BASE_URL || '').replace(/\/+$/, ''),
      editUrl: env.EDIT_URL || '',
      footer: env.SITE_FOOTER || '',
      lang: env.SITE_LANG || 'en',
      locale: env.SITE_LOCALE || 'en-US',
      banner: env.SITE_BANNER ? { type: env.SITE_BANNER_TYPE || 'note', text: env.SITE_BANNER } : null,
    },
  };
}

export const getSite = () => getConfig().site;

/** Sub-path the site is served from on GitHub Pages ("/my-repo"), or "" at a domain root. */
export function getBasePath() {
  const trimmed = String(process.env.BASE_PATH || '').trim().replace(/\/+$/, '');
  if (!trimmed) return '';
  return trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
}

export function formatDate(date) {
  return new Intl.DateTimeFormat(getSite().locale, { year: 'numeric', month: 'short', day: 'numeric' }).format(date);
}
