import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { getDb } from "@/lib/mongodb";
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
const fields = { _id: 0, slug: 1, title: 1, summary: 1, topicSlug: 1 } as const;

type Hit = Pick<Article, "slug" | "title" | "summary" | "topicSlug">;

const escapeRegex = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/**
 * Published articles matching a search, best first. Two searches are combined:
 *  1. The article_search text index: whole words anywhere in the title, summary or body,
 *     ranked with title matches highest (weights are set on the index).
 *  2. Word prefixes in the title or summary, so half-typed words match while typing:
 *     "reset pass" finds "Reset your password".
 * Typos don't match; that needs Atlas Search, which this database doesn't have.
 */
export async function searchArticles(rawQuery: string, limit = 8): Promise<SearchResult[]> {
  "use cache";
  cacheLife("hours");
  cacheTag("articles", "topics");

  const query = rawQuery.trim().slice(0, MAX_QUERY_LENGTH);
  if (!query) return [];

  const articles = getDb().collection<Article>("articles");
  const words = query.split(/\s+/).map(escapeRegex);
  // Every typed word must start a word in the title or summary.
  const prefixFilter = {
    published: true,
    $and: words.map((w) => {
      const startsWord = new RegExp(`(^|[^\\p{L}\\p{N}])${w}`, "iu");
      return { $or: [{ title: startsWord }, { summary: startsWord }] };
    }),
  };

  const [textHits, prefixHits, topics] = await Promise.all([
    articles
      .find<Hit>(
        { $text: { $search: query }, published: true },
        { projection: { ...fields, score: { $meta: "textScore" } } },
      )
      .sort({ score: { $meta: "textScore" } })
      .limit(limit)
      .toArray(),
    articles.find<Hit>(prefixFilter, { projection: fields }).sort({ title: 1 }).limit(limit).toArray(),
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
