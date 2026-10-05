// Search that runs in the browser. Shared by the header suggestions and the /search page.
// The build writes every article to /search-index.json; this module indexes it on first use.
import MiniSearch from 'minisearch';

const OPTIONS = {
  fields: ['title', 'tags', 'summary', 'text'],
  storeFields: ['id'],
  searchOptions: { boost: { title: 4, tags: 2, summary: 1.5 }, prefix: true, fuzzy: 0.2 },
};

const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** Excerpt around the first match, as segments [{ text, match }] so React can render <mark> safely. */
export function snippet(text, terms, length = 220) {
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
  return out.split(pattern).map((t, i) => ({ text: t, match: i % 2 === 1 })).filter((s) => s.text);
}

/** Builds a search function from the documents in search-index.json. */
export function createSearch(documents) {
  const index = new MiniSearch(OPTIONS);
  index.addAll(documents);
  const byId = new Map(documents.map((d) => [d.id, d]));

  return function search(query, limit = 20) {
    const q = String(query || '').trim().slice(0, 200);
    if (!q) return [];
    let results = index.search(q, { combineWith: 'AND' });
    if (!results.length) results = index.search(q, { combineWith: 'OR' });
    return results.slice(0, limit).map((r) => {
      const doc = byId.get(r.id);
      return { doc, snippet: snippet(doc.text, r.terms) };
    });
  };
}

export const basePath = process.env.NEXT_PUBLIC_BASE_PATH || '';

let loading = null;

/** Downloads and indexes search-index.json once per page view. */
export function loadSearch() {
  loading ??= fetch(`${basePath}/search-index.json`)
    .then((res) => {
      if (!res.ok) throw new Error(`Search index returned ${res.status}`);
      return res.json();
    })
    .then((data) => createSearch(data.documents))
    .catch((err) => {
      loading = null; // allow a retry on the next keystroke
      throw err;
    });
  return loading;
}
