import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { queryRows } from "@/lib/postgres";

// A subtopic is a topic whose parentSlug names its parent topic.
// Only two levels: a subtopic can't have subtopics of its own.
export type Topic = {
  slug: string;
  title: string;
  description: string;
  order: number; // lower numbers are listed first, among topics with the same parent
  parentSlug: string | null; // null for a top-level topic
};

export type TopicWithCount = Topic & { articleCount: number };

/** A top-level topic with its subtopics. articleCount includes the subtopics' articles. */
export type TopicTree = TopicWithCount & { subtopics: TopicWithCount[] };

const topicFields = `slug, title, description, sort_order AS "order", NULLIF(parent_slug, '') AS "parentSlug"`;

/** One topic or subtopic, or null if it doesn't exist. */
export async function getTopic(slug: string) {
  "use cache";
  cacheLife("days");
  if (slug.includes("\0")) return null;
  cacheTag("topics", `topic:${slug}`);

  const [topic] = await queryRows<Topic>(`SELECT ${topicFields} FROM topics WHERE slug = $1`, [slug]);
  return topic ?? null;
}

/** Every topic and subtopic in one flat list, in display order. */
export async function getAllTopics() {
  "use cache";
  cacheLife("days");
  cacheTag("topics");

  return queryRows<Topic>(`SELECT ${topicFields} FROM topics ORDER BY sort_order, title, slug`);
}

/** Top-level topics in display order, each with its subtopics and published-article counts. */
export async function getTopics(): Promise<TopicTree[]> {
  "use cache";
  cacheLife("days");
  // Article changes refresh the counts too.
  cacheTag("topics", "articles");

  const [all, counts] = await Promise.all([
    getAllTopics(),
    queryRows<{ topicSlug: string; articleCount: number }>(
      `SELECT topic_slug AS "topicSlug", count(*)::integer AS "articleCount"
       FROM articles WHERE published GROUP BY topic_slug`,
    ),
  ]);

  const countBySlug = new Map(counts.map(({ topicSlug, articleCount }) => [topicSlug, articleCount]));
  const withCount = (t: Topic): TopicWithCount => ({ ...t, articleCount: countBySlug.get(t.slug) ?? 0 });

  return all
    .filter((t) => t.parentSlug === null)
    .map((parent) => {
      const subtopics = all.filter((t) => t.parentSlug === parent.slug).map(withCount);
      const own = withCount(parent);
      return { ...own, articleCount: own.articleCount + subtopics.reduce((n, s) => n + s.articleCount, 0), subtopics };
    });
}

/** Subtopics of a topic, in display order. */
export async function getSubtopics(parentSlug: string) {
  "use cache";
  cacheLife("days");
  cacheTag("topics", `topic:${parentSlug}`);

  return queryRows<Topic>(
    `SELECT ${topicFields} FROM topics WHERE parent_slug = $1 ORDER BY sort_order, title, slug`,
    [parentSlug],
  );
}

/**
 * The topic and, for a subtopic, its parent, outermost first, e.g. [Email, Distribution Lists].
 * Empty if the topic doesn't exist. Used for breadcrumbs.
 */
export async function getTopicTrail(slug: string): Promise<Topic[]> {
  const topic = await getTopic(slug);
  if (!topic) return [];
  const parent = topic.parentSlug ? await getTopic(topic.parentSlug) : null;
  return parent ? [parent, topic] : [topic];
}
