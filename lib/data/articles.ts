import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { queryRows } from "@/lib/postgres";
import type { JSONContent } from "@tiptap/core";

export type Article = {
  slug: string;
  title: string;
  summary: string;
  topicSlug: string;
  body: JSONContent;
  bodyText: string;
  published: boolean;
  updated: Date;
};

// What lists need: everything except the body.
export type ArticleSummary = Omit<Article, "body" | "bodyText" | "published">;

const summaryFields = 'slug, title, summary, topic_slug AS "topicSlug", updated';

/** One published article, or null if it doesn't exist. */
export async function getArticle(slug: string) {
  "use cache";
  cacheLife("days");
  if (slug.includes("\0")) return null;
  cacheTag("articles", `article:${slug}`);

  const [article] = await queryRows<Article>(
    `SELECT ${summaryFields}, body, body_text AS "bodyText", published
     FROM articles WHERE slug = $1 AND published`,
    [slug],
  );
  return article ?? null;
}

/** Published articles in any of several topics (e.g. a topic and its subtopics), A to Z. */
export async function getArticlesByTopics(topicSlugs: string[]) {
  "use cache";
  cacheLife("days");
  cacheTag("articles", ...topicSlugs.map((s) => `topic:${s}`));

  return queryRows<ArticleSummary>(
    `SELECT ${summaryFields} FROM articles
     WHERE topic_slug = ANY($1::text[]) AND published ORDER BY title, slug`,
    [topicSlugs],
  );
}

/** Every published article, A to Z. */
export async function getAllArticles() {
  "use cache";
  cacheLife("days");
  cacheTag("articles");

  return queryRows<ArticleSummary>(
    `SELECT ${summaryFields} FROM articles WHERE published ORDER BY title, slug`,
  );
}

/** The most recently updated published articles. */
export async function getRecentArticles(limit = 5) {
  "use cache";
  cacheLife("days");
  cacheTag("articles");

  return queryRows<ArticleSummary>(
    `SELECT ${summaryFields} FROM articles WHERE published ORDER BY updated DESC, slug LIMIT $1`,
    [limit],
  );
}

/** Slugs of every published article, for generateStaticParams. */
export async function getArticleSlugs() {
  "use cache";
  cacheLife("days");
  cacheTag("articles");

  return queryRows<{ slug: string }>("SELECT slug FROM articles WHERE published ORDER BY slug");
}

export function readingMinutes(text:string, wordsPerMinute = 200) {
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / wordsPerMinute));
}
