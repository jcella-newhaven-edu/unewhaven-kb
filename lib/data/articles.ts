import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { queryRows } from "@/lib/postgres";
import type { JSONContent } from "@tiptap/core";

export type Article = {
  slug: string;
  title: string;
  summary: string;
  topicSlug: string;
  topicSlugs: string[];
  body: JSONContent;
  bodyText: string;
  published: boolean;
  updated: Date;
};

// What lists need: everything except the body.
export type ArticleSummary = Omit<Article, "body" | "bodyText" | "published">;

const summaryFields = `a.slug, a.title, a.summary, a.topic_slug AS "topicSlug", a.updated,
  ARRAY(SELECT m.topic_slug FROM article_topic_memberships m WHERE m.article_slug = a.slug
        ORDER BY (m.topic_slug = a.topic_slug) DESC, m.topic_slug) AS "topicSlugs"`;

/** One published article by its current slug or a historical URL. */
export async function getArticle(slug: string) {
  "use cache";
  cacheLife("days");
  if (slug.includes("\0")) return null;
  cacheTag("articles", `article:${slug}`);

  const [article] = await queryRows<Article>(
    `SELECT ${summaryFields}, a.body, a.body_text AS "bodyText", a.published
     FROM articles a
     WHERE a.slug = COALESCE((SELECT article_slug FROM article_slug_redirects WHERE old_slug = $1), $1)
       AND a.published`,
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
    `SELECT ${summaryFields} FROM articles a
     WHERE a.published AND EXISTS (
       SELECT 1 FROM article_topic_memberships m WHERE m.article_slug = a.slug AND m.topic_slug = ANY($1::text[])
     ) ORDER BY a.title, a.slug`,
    [topicSlugs],
  );
}

/** Every published article, A to Z. */
export async function getAllArticles() {
  "use cache";
  cacheLife("days");
  cacheTag("articles");

  return queryRows<ArticleSummary>(
    `SELECT ${summaryFields} FROM articles a WHERE a.published ORDER BY a.title, a.slug`,
  );
}

/** The most recently updated published articles. */
export async function getRecentArticles(limit = 5) {
  "use cache";
  cacheLife("days");
  cacheTag("articles");

  return queryRows<ArticleSummary>(
    `SELECT ${summaryFields} FROM articles a WHERE a.published ORDER BY a.updated DESC, a.slug LIMIT $1`,
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
