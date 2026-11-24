import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { queryRows } from "@/lib/postgres";
import { getRecentArticles, type Article } from "@/lib/data/articles";
import { getAllTopics } from "@/lib/data/topics";

export type SearchResult = {
  slug: string;
  title: string;
  summary: string;
  topicSlug: string;
  topicTitle: string;
};

const MAX_QUERY_LENGTH = 100;
const fields = 'slug, title, summary, topic_slug AS "topicSlug"';

type Hit = Pick<Article, "slug" | "title" | "summary" | "topicSlug">;

const escapeRegex = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/**
 * Published articles matching a search, best first. Two searches are combined:
 *  1. Full-text search across the title, summary and body, with title matches weighted highest.
 *  2. Word prefixes in the title or summary, so half-typed words match while typing:
 *     "reset pass" finds "Reset your password".
 */
export async function searchArticles(rawQuery: string, limit = 8): Promise<SearchResult[]> {
  "use cache";
  cacheLife("hours");
  cacheTag("articles", "topics");

  const query = rawQuery.replaceAll("\0", " ").trim().slice(0, MAX_QUERY_LENGTH);
  if (!query) return [];

  const words = query.split(/\s+/);
  // Match any ordinary term, while keeping quoted phrases and exclusions intact.
  const textQuery = /"|(^|\s)-/.test(query) ? query : words.join(" OR ");
  const prefixes = words.map((word) => `(^|[^[:alnum:]])${escapeRegex(word)}`);

  const [textHits, prefixHits, topics] = await Promise.all([
    queryRows<Hit>(
      `WITH search_terms AS (SELECT websearch_to_tsquery('english', $1) AS terms)
       SELECT ${fields} FROM articles CROSS JOIN search_terms
       WHERE published AND search_document @@ terms
       ORDER BY ts_rank(search_document, terms) DESC, title, slug LIMIT $2`,
      [textQuery, limit],
    ),
    queryRows<Hit>(
      `SELECT ${fields} FROM articles WHERE published AND NOT EXISTS (
         SELECT 1 FROM unnest($1::text[]) AS prefixes(pattern)
         WHERE title !~* pattern AND summary !~* pattern
       ) ORDER BY title, slug LIMIT $2`,
      [prefixes, limit],
    ),
    getAllTopics(),
  ]);

  // Whole-word matches first (they're ranked), then prefix matches not already included.
  const seen = new Set<string>();
  const merged = [...textHits, ...prefixHits].filter((a) => !seen.has(a.slug) && seen.add(a.slug)).slice(0, limit);

  const topicTitle = new Map(topics.map((t) => [t.slug, t.title]));
  return merged.map(({ slug, title, summary, topicSlug }) => ({
    slug,
    title,
    summary,
    topicSlug,
    topicTitle: topicTitle.get(topicSlug) ?? topicSlug,
  }));
}

/** What the search dialog shows before anything is typed: the most recently updated articles. */
export async function getSearchSuggestions(limit = 5): Promise<SearchResult[]> {
  const [recent, topics] = await Promise.all([getRecentArticles(limit), getAllTopics()]);
  const topicTitle = new Map(topics.map((t) => [t.slug, t.title]));
  return recent.map(({ slug, title, summary, topicSlug }) => ({
    slug,
    title,
    summary,
    topicSlug,
    topicTitle: topicTitle.get(topicSlug) ?? topicSlug,
  }));
}
