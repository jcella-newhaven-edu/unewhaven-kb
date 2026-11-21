import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { getDb } from "@/lib/mongodb";
import type { JSONContent } from "@tiptap/core";

// articles collection
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

// ObjectId can't be cached or passed to client components, so _id is always left out.
const summaryFields = { _id: 0, slug: 1, title: 1, summary: 1, topicSlug: 1, updated: 1 };

const articles = () => getDb().collection<Article>("articles");

/** One published article, or null if it doesn't exist. */
export async function getArticle(slug: string) {
  "use cache";
  cacheLife("days");
  cacheTag("articles", `article:${slug}`);

  return articles().findOne<Article>({ slug, published: true }, { projection: { _id: 0 } });
}

/** Published articles in a topic, A to Z. */
export async function getArticlesByTopic(topicSlug: string) {
  "use cache";
  cacheLife("days");
  cacheTag("articles", `topic:${topicSlug}`);

  return articles()
    .find<ArticleSummary>({ topicSlug, published: true }, { projection: summaryFields })
    .sort({ title: 1 })
    .toArray();
}

/** Published articles in any of several topics (e.g. a topic and its subtopics), A to Z. */
export async function getArticlesByTopics(topicSlugs: string[]) {
  "use cache";
  cacheLife("days");
  cacheTag("articles", ...topicSlugs.map((s) => `topic:${s}`));

  return articles()
    .find<ArticleSummary>({ topicSlug: { $in: topicSlugs }, published: true }, { projection: summaryFields })
    .sort({ title: 1 })
    .toArray();
}

/** Every published article, A to Z. */
export async function getAllArticles() {
  "use cache";
  cacheLife("days");
  cacheTag("articles");

  return articles()
    .find<ArticleSummary>({ published: true }, { projection: summaryFields })
    .sort({ title: 1 })
    .toArray();
}

/** The most recently updated published articles. */
export async function getRecentArticles(limit = 5) {
  "use cache";
  cacheLife("days");
  cacheTag("articles");

  return articles()
    .find<ArticleSummary>({ published: true }, { projection: summaryFields })
    .sort({ updated: -1 })
    .limit(limit)
    .toArray();
}

/** Slugs of every published article, for generateStaticParams. */
export async function getArticleSlugs() {
  "use cache";
  cacheLife("days");
  cacheTag("articles");

  return articles()
    .find<{ slug: string }>({ published: true }, { projection: { _id: 0, slug: 1 } })
    .toArray();
}

export function readingMinutes(text:string, wordsPerMinute = 200) {
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / wordsPerMinute));
}
