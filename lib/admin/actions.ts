"use server";

import { revalidatePath, updateTag } from "next/cache";
import { redirect } from "next/navigation";
import { DatabaseError, type PoolClient } from "pg";
import { getAdminSession } from "@/lib/admin/auth";
import {
  type ArticleActionState,
  validateArticle,
  validateArticleVersion,
} from "@/lib/admin/validation";
import { withTransaction } from "@/lib/postgres";

export type { ArticleActionState } from "@/lib/admin/validation";

type Change = { affectedTopics: string[] } | { failure: ArticleActionState };

const versionExpression = `to_char(a.updated AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"')`;
const staleArticle = "This article changed or was removed. Reload the page before trying again.";
const slugConflict = { fieldErrors: { slug: "An article already uses this slug." } };
const signIn = { error: "Sign in with an editorial account to change articles." };
const saveFailed = { error: "The article could not be saved. Try again." };

async function lockSelectedTopics(client: PoolClient, topicSlugs: string[]): Promise<ArticleActionState | null> {
  // Topic deletion takes a conflicting lock before checking for article references.
  const { rows } = await client.query<{ slug: string }>(
    "SELECT slug FROM topics WHERE slug = ANY($1::text[]) ORDER BY slug FOR KEY SHARE",
    [topicSlugs],
  );
  if (rows.length === topicSlugs.length) return null;
  return rows.some(({ slug }) => slug === topicSlugs[0])
    ? { fieldErrors: { additionalTopicSlug: "Choose existing additional topics." } }
    : { fieldErrors: { topicSlug: "Choose an existing primary topic." } };
}

async function readLockedArticle(client: PoolClient, slug: string, updatedToken: string) {
  const { rows } = await client.query<{ topicSlugs: string[] }>(
    `SELECT ARRAY(SELECT m.topic_slug FROM article_topic_memberships m WHERE m.article_slug = a.slug) AS "topicSlugs"
     FROM articles a WHERE a.slug = $1 AND ${versionExpression} = $2 FOR UPDATE OF a`,
    [slug, updatedToken],
  );
  return rows[0];
}

async function saveTopicMemberships(client: PoolClient, slug: string, selected: string[]) {
  await client.query(
    "DELETE FROM article_topics WHERE article_slug = $1 AND NOT (topic_slug = ANY($2::text[]))",
    [slug, selected],
  );
  await client.query(
    `INSERT INTO article_topics (article_slug, topic_slug)
     SELECT $1, topic_slug FROM unnest($2::text[]) AS chosen(topic_slug)
     ON CONFLICT (article_slug, topic_slug) DO NOTHING`,
    [slug, selected],
  );
}

async function affectedTopicRoutes(client: PoolClient, slugs: string[]) {
  const { rows } = await client.query<{ parentSlug: string }>(
    `SELECT DISTINCT parent_slug AS "parentSlug" FROM topics
     WHERE slug = ANY($1::text[]) AND NULLIF(parent_slug, '') IS NOT NULL`,
    [slugs],
  );
  return [...slugs, ...rows.map(({ parentSlug }) => parentSlug)];
}

function refreshArticle(slug: string, affectedTopics: string[], previousSlug = slug) {
  updateTag("articles");
  updateTag("topics");
  for (const articleSlug of new Set([slug, previousSlug])) {
    updateTag(`article:${articleSlug}`);
    const path = `/articles/${encodeURIComponent(articleSlug)}`;
    if (path.length <= 1024) revalidatePath(path);
    else revalidatePath("/articles/[slug]", "page");
  }
  for (const topic of new Set(affectedTopics)) {
    const tag = `topic:${topic}`;
    if (tag.length <= 256) updateTag(tag);
    const path = `/topics/${encodeURIComponent(topic)}`;
    if (path.length <= 1024) revalidatePath(path);
  }

  revalidatePath("/");
  revalidatePath("/articles");
  revalidatePath("/topics");
  revalidatePath("/search");
  revalidatePath("/api/search");
  revalidatePath("/_not-found");
  revalidatePath("/admin");
  revalidatePath("/admin/topics");
}

export async function createArticle(_previous: ArticleActionState, form: FormData): Promise<ArticleActionState> {
  const session = await getAdminSession();
  if (session?.role !== "admin" && session?.role !== "editor") return signIn;

  const parsed = validateArticle(form);
  if ("fieldErrors" in parsed) return parsed;

  const { slug, title, summary, topicSlug, topicSlugs, published, content } = parsed.data;
  let change: Change;
  try {
    change = await withTransaction(async (client) => {
      const failure = await lockSelectedTopics(client, topicSlugs);
      if (failure) return { failure };

      const result = await client.query(
        `INSERT INTO articles (slug, title, summary, topic_slug, published, body, body_text, updated,
                               author_id, last_editor_id, published_at)
         VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7, statement_timestamp(), $8, $8,
                 CASE WHEN $5 THEN statement_timestamp() END)
         ON CONFLICT (slug) DO NOTHING`,
        [slug, title, summary, topicSlug, published, JSON.stringify(content?.body), content?.bodyText, session.id],
      );
      if (result.rowCount !== 1) return { failure: slugConflict };
      await saveTopicMemberships(client, slug, topicSlugs);
      return { affectedTopics: await affectedTopicRoutes(client, topicSlugs) };
    });
  } catch (error) {
    console.error("Article insert failed.", error);
    return saveFailed;
  }
  if ("failure" in change) return change.failure;

  refreshArticle(slug, change.affectedTopics);
  redirect(`/admin/articles/${encodeURIComponent(slug)}?saved=1`);
}

export async function updateArticle(_previous: ArticleActionState, form: FormData): Promise<ArticleActionState> {
  const session = await getAdminSession();
  if (session?.role !== "admin" && session?.role !== "editor") return signIn;

  const version = validateArticleVersion(form, "originalSlug");
  if ("fieldErrors" in version) return { error: version.fieldErrors.updatedToken ?? version.fieldErrors.slug };

  const { slug: originalSlug, updatedToken } = version.data;
  const parsed = validateArticle(form, originalSlug);
  if ("fieldErrors" in parsed) return parsed;

  const { slug, title, summary, topicSlug, topicSlugs, published, content } = parsed.data;
  let change: Change;
  try {
    change = await withTransaction(async (client) => {
      const failure = await lockSelectedTopics(client, topicSlugs);
      if (failure) return { failure };
      const prior = await readLockedArticle(client, originalSlug, updatedToken);
      if (!prior) return { failure: { error: staleArticle } };

      await client.query(
        `UPDATE articles
         SET slug = $2, title = $3, summary = $4, topic_slug = $5, published = $6,
             body = COALESCE($7::jsonb, body), body_text = COALESCE($8, body_text),
             updated = GREATEST(statement_timestamp(), updated + interval '1 microsecond'),
             last_editor_id = $9,
             published_at = CASE WHEN $6 AND NOT published
                                 THEN COALESCE(published_at, statement_timestamp()) ELSE published_at END
         WHERE slug = $1`,
        [originalSlug, slug, title, summary, topicSlug, published, content ? JSON.stringify(content.body) : null, content?.bodyText ?? null, session.id],
      );
      await saveTopicMemberships(client, slug, topicSlugs);
      return { affectedTopics: await affectedTopicRoutes(client, [...prior.topicSlugs, ...topicSlugs]) };
    });
  } catch (error) {
    if (error instanceof DatabaseError && error.code === "23505" && error.constraint === "articles_pkey") {
      return slugConflict;
    }
    console.error("Article update failed.", error);
    return saveFailed;
  }
  if ("failure" in change) return change.failure;

  refreshArticle(slug, change.affectedTopics, originalSlug);
  redirect(`/admin/articles/${encodeURIComponent(slug)}?saved=1`);
}

export async function deleteArticle(_previous: ArticleActionState, form: FormData): Promise<ArticleActionState> {
  const session = await getAdminSession();
  if (session?.role !== "admin") return { error: "Only administrators can delete articles." };

  const version = validateArticleVersion(form);
  if ("fieldErrors" in version) return { error: version.fieldErrors.updatedToken ?? version.fieldErrors.slug };

  const { slug, updatedToken } = version.data;
  let change: Change;
  try {
    change = await withTransaction(async (client) => {
      const prior = await readLockedArticle(client, slug, updatedToken);
      if (!prior) return { failure: { error: staleArticle } };
      await client.query("DELETE FROM articles WHERE slug = $1", [slug]);
      return { affectedTopics: await affectedTopicRoutes(client, prior.topicSlugs) };
    });
  } catch (error) {
    console.error("Article deletion failed.", error);
    return { error: "The article could not be deleted. Try again." };
  }
  if ("failure" in change) return change.failure;

  refreshArticle(slug, change.affectedTopics);
  redirect("/admin?deleted=1");
}
