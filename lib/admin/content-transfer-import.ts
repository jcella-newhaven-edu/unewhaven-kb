import "server-only";
import { createHash } from "node:crypto";
import { DatabaseError, type PoolClient } from "pg";
import { articleImageIds } from "@/lib/article-media-server";
import { withTransaction } from "@/lib/postgres";
import type { ValidatedTransfer } from "./content-transfer-format";
import type { TransferMode, TransferResponse, TransferSummary } from "./content-transfer-types";

type Topic = ValidatedTransfer["topics"][number];
type Article = ValidatedTransfer["articles"][number];
type Image = ValidatedTransfer["images"][number];
type StoredTopic = { slug: string; parentSlug: string | null; revision: string };
type StoredArticle = { slug: string; revision: string };
type StoredImage = { id: string; revision: string; contentType: string; digest: string | null };

type TransferPlan = {
  topics: Topic[];
  articles: Article[];
  images: Image[];
  summary: TransferSummary;
  issues: string[];
  revisions: [StoredTopic[], StoredArticle[], StoredImage[]];
};

function selectChanges<Entry extends { slug: string }>(
  incoming: Entry[],
  stored: { slug: string }[],
  mode: TransferMode,
) {
  const existing = new Set(stored.map(({ slug }) => slug));
  const changes = incoming.filter(({ slug }) => mode === "update" || !existing.has(slug));
  const created = incoming.filter(({ slug }) => !existing.has(slug)).length;
  return {
    changes,
    counts: { created, updated: changes.length - created, skipped: incoming.length - changes.length },
  };
}

async function readPlan(client: PoolClient, data: ValidatedTransfer, mode: TransferMode): Promise<TransferPlan> {
  const referencedTopics = new Set(data.topics.map(({ slug }) => slug));
  for (const { parentSlug } of data.topics) {
    if (parentSlug !== null) referencedTopics.add(parentSlug);
  }
  for (const { topicSlug, additionalTopicSlugs } of data.articles) {
    referencedTopics.add(topicSlug);
    for (const slug of additionalTopicSlugs) referencedTopics.add(slug);
  }

  const { rows: storedTopics } = await client.query<StoredTopic>(
    `SELECT slug, NULLIF(parent_slug, '') AS "parentSlug", xmin::text AS revision
     FROM topics
     WHERE slug = ANY($1::text[]) OR parent_slug = ANY($2::text[])
     ORDER BY slug`,
    [[...referencedTopics], data.topics.map(({ slug }) => slug)],
  );
  const { rows: storedArticles } = await client.query<StoredArticle>(
    `SELECT slug, xmin::text AS revision FROM articles WHERE slug = ANY($1::text[]) ORDER BY slug`,
    [data.articles.map(({ slug }) => slug)],
  );

  const topics = selectChanges(data.topics, storedTopics, mode);
  const articles = selectChanges(data.articles, storedArticles, mode);
  const issues = validateReferences(storedTopics, topics.changes, articles.changes);
  const imagePlan = await resolveImages(client, articles.changes, data.images, issues);

  return {
    topics: topics.changes,
    articles: articles.changes,
    images: imagePlan.created,
    summary: {
      topics: topics.counts,
      articles: articles.counts,
      images: { created: imagePlan.created.length, reused: imagePlan.reused },
      publishedArticles: articles.changes.filter(({ published }) => published).length,
    },
    issues,
    revisions: [storedTopics, storedArticles, imagePlan.stored],
  };
}

function validateReferences(stored: StoredTopic[], changes: Topic[], articles: Article[]) {
  const issues: string[] = [];
  const parents = new Map(stored.map(({ slug, parentSlug }) => [slug, parentSlug]));
  const changed = new Set(changes.map(({ slug }) => slug));
  for (const { slug, parentSlug } of changes) parents.set(slug, parentSlug);

  for (const [slug, parentSlug] of parents) {
    if (issues.length >= 20) return issues;
    if (parentSlug === null || (!changed.has(slug) && !changed.has(parentSlug))) continue;
    if (!parents.has(parentSlug)) {
      issues.push(`Topic “${slug}” refers to missing parent “${parentSlug}”.`);
    } else if (parents.get(parentSlug) !== null) {
      issues.push(`Topic “${slug}” needs a top-level parent. “${parentSlug}” would be a subtopic.`);
    }
  }
  for (const { slug, topicSlug, additionalTopicSlugs } of articles) {
    if (issues.length >= 20) return issues;
    for (const assigned of [topicSlug, ...additionalTopicSlugs]) {
      if (!parents.has(assigned)) issues.push(`Article “${slug}” refers to missing topic “${assigned}”.`);
      if (issues.length >= 20) return issues;
    }
  }
  return issues;
}

async function resolveImages(client: PoolClient, articles: Article[], images: Image[], issues: string[]) {
  const imageArticles = new Map<string, string>();
  for (const { slug, body } of articles) {
    for (const id of articleImageIds(body)) imageArticles.set(id, slug);
  }

  const incoming = new Map(images.filter(({ id }) => imageArticles.has(id)).map((image) => [image.id, image]));
  const { rows: stored } = await client.query<StoredImage>(
    `SELECT id::text, xmin::text AS revision, content_type AS "contentType",
            CASE WHEN id = ANY($2::uuid[]) THEN encode(sha256(content), 'hex') END AS digest
     FROM article_images WHERE id = ANY($1::uuid[]) ORDER BY id`,
    [[...imageArticles.keys()], [...incoming.keys()]],
  );
  const existing = new Map(stored.map((image) => [image.id, image]));
  const created: Image[] = [];
  let reused = 0;

  for (const [id, article] of imageArticles) {
    if (issues.length >= 20) break;
    const supplied = incoming.get(id);
    const original = existing.get(id);
    if (original) {
      if (supplied && (original.contentType !== supplied.contentType
        || original.digest !== createHash("sha256").update(supplied.content).digest("hex"))) {
        issues.push(`Image “${id}” in article “${article}” conflicts with an upload already in the database.`);
      } else {
        reused += 1;
      }
    } else if (supplied) {
      created.push(supplied);
    } else {
      issues.push(`Article “${article}” refers to missing image “${id}”.`);
    }
  }
  return { created, reused, stored };
}

async function applyPlan(client: PoolClient, plan: TransferPlan, actorId: string) {
  if (plan.topics.length) {
    await client.query(
      `INSERT INTO topics (slug, title, description, sort_order, parent_slug, icon)
       SELECT slug, title, description, "sortOrder", "parentSlug", icon
       FROM jsonb_to_recordset($1::jsonb) AS incoming(
         slug text, title text, description text, "sortOrder" integer, "parentSlug" text, icon text
       )
       ON CONFLICT (slug) DO UPDATE SET
         title = excluded.title,
         description = excluded.description,
         sort_order = excluded.sort_order,
         parent_slug = excluded.parent_slug,
         icon = excluded.icon`,
      [JSON.stringify(plan.topics)],
    );
  }

  if (plan.images.length) {
    await client.query(
      `INSERT INTO article_images (id, content_type, content)
       SELECT * FROM unnest($1::uuid[], $2::text[], $3::bytea[])`,
      [plan.images.map(({ id }) => id), plan.images.map(({ contentType }) => contentType), plan.images.map(({ content }) => content)],
    );
  }

  if (!plan.articles.length) return;

  await client.query(
    `INSERT INTO articles AS current_article (
       slug, title, summary, topic_slug, body, body_text, published, updated, author_id, last_editor_id, published_at
     )
     SELECT slug, title, summary, "topicSlug", body, "bodyText", published,
            statement_timestamp(), $2::uuid, $2::uuid, CASE WHEN published THEN statement_timestamp() END
     FROM jsonb_to_recordset($1::jsonb) AS incoming(
       slug text, title text, summary text, "topicSlug" text, body jsonb, "bodyText" text, published boolean
     )
     ON CONFLICT (slug) DO UPDATE SET
       title = excluded.title,
       summary = excluded.summary,
       topic_slug = excluded.topic_slug,
       body = excluded.body,
       body_text = excluded.body_text,
       published = excluded.published,
       updated = GREATEST(excluded.updated, current_article.updated + interval '1 microsecond'),
       last_editor_id = excluded.last_editor_id,
       published_at = CASE WHEN excluded.published AND NOT current_article.published
                           THEN COALESCE(current_article.published_at, excluded.published_at)
                           ELSE current_article.published_at END`,
    [JSON.stringify(plan.articles), actorId],
  );

  const memberships = plan.articles.map(({ slug, topicSlug, additionalTopicSlugs }) => ({
    slug,
    topicSlugs: [topicSlug, ...additionalTopicSlugs],
  }));
  await client.query(
    "DELETE FROM article_topics WHERE article_slug = ANY($1::text[])",
    [memberships.map(({ slug }) => slug)],
  );
  await client.query(
    `INSERT INTO article_topics (article_slug, topic_slug)
     SELECT incoming.slug, chosen.topic_slug
     FROM jsonb_to_recordset($1::jsonb) AS incoming(slug text, "topicSlugs" text[])
     CROSS JOIN LATERAL unnest(incoming."topicSlugs") AS chosen(topic_slug)`,
    [JSON.stringify(memberships)],
  );
}

export async function planContentTransfer(
  data: ValidatedTransfer,
  mode: TransferMode,
  actorId: string,
  rawDigest: string,
  previewToken?: string,
): Promise<TransferResponse> {
  try {
    return await withTransaction<TransferResponse>(async (client) => {
      if (previewToken === undefined) {
        await client.query("SET TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY");
      } else {
        await client.query("SET LOCAL lock_timeout = '5s'");
        // Match article editing's topic-before-article lock order.
        await client.query("LOCK TABLE topics IN EXCLUSIVE MODE");
        await client.query("LOCK TABLE articles, article_images IN SHARE ROW EXCLUSIVE MODE");
      }

      const plan = await readPlan(client, data, mode);
      const token = createHash("sha256")
        .update(JSON.stringify([actorId, mode, rawDigest, plan.revisions]))
        .digest("hex");
      if (previewToken !== undefined && previewToken !== token) {
        return { error: "The file, import mode, or matching database records changed. Preview the file again." };
      }
      if (plan.issues.length) {
        return { error: "The file has references that cannot be imported.", issues: plan.issues };
      }
      if (previewToken === undefined) return { summary: plan.summary, token };

      await applyPlan(client, plan, actorId);
      return { summary: plan.summary };
    });
  } catch (error) {
    if (error instanceof DatabaseError && error.code === "55P03") {
      return { error: "The database is busy. Try importing again." };
    }
    throw error;
  }
}
