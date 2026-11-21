import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { getDb } from "@/lib/mongodb";

// topics collection. A subtopic is a topic whose parentSlug names its parent topic.
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

const topics = () => getDb().collection<Topic>("topics");

// Top-level topics may store parentSlug as null, "" (what Compass saves for an emptied field)
// or not at all. Normalize all three to null.
const withParent = (t: Topic): Topic => ({ ...t, parentSlug: t.parentSlug || null });

/** One topic or subtopic, or null if it doesn't exist. */
export async function getTopic(slug: string) {
  "use cache";
  cacheLife("days");
  cacheTag("topics", `topic:${slug}`);

  const topic = await topics().findOne<Topic>({ slug }, { projection: { _id: 0 } });
  return topic ? withParent(topic) : null;
}

/** Every topic and subtopic in one flat list, in display order. */
export async function getAllTopics() {
  "use cache";
  cacheLife("days");
  cacheTag("topics");

  const list = await topics().find<Topic>({}, { projection: { _id: 0 } }).sort({ order: 1, title: 1 }).toArray();
  return list.map(withParent);
}

/** Top-level topics in display order, each with its subtopics and published-article counts. */
export async function getTopics(): Promise<TopicTree[]> {
  "use cache";
  cacheLife("days");
  // The counts come from the articles collection, so article changes refresh this too.
  cacheTag("topics", "articles");

  const [all, counts] = await Promise.all([
    getAllTopics(),
    getDb()
      .collection("articles")
      .aggregate<{ _id: string; n: number }>([
        { $match: { published: true } },
        { $group: { _id: "$topicSlug", n: { $sum: 1 } } },
      ])
      .toArray(),
  ]);

  const countBySlug = new Map(counts.map((c) => [c._id, c.n]));
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

  const list = await topics()
    .find<Topic>({ parentSlug }, { projection: { _id: 0 } })
    .sort({ order: 1, title: 1 })
    .toArray();
  return list.map(withParent);
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
