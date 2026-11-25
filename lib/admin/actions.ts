"use server";

import { revalidatePath, updateTag } from "next/cache";
import { redirect } from "next/navigation";
import { DatabaseError } from "pg";
import { getAdminSession } from "@/lib/admin/auth";
import {
  type ArticleActionState,
  validateArticle,
  validateArticleVersion,
} from "@/lib/admin/validation";
import { queryRows } from "@/lib/postgres";

export type { ArticleActionState } from "@/lib/admin/validation";

type ArticleChange = {
  slug: string | null;
  topicSlug: string;
  parentSlug: string | null;
  previousTopicSlug?: string | null;
  previousParentSlug?: string | null;
};

const versionExpression = `to_char(a.updated AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"')`;
const staleArticle = "This article changed or was removed. Reload the page before trying again.";
const missingTopic = { fieldErrors: { topicSlug: "Choose an existing topic." } };
const slugConflict = { fieldErrors: { slug: "An article already uses this slug." } };
const signIn = { error: "Sign in with an editorial account to change articles." };
const saveFailed = { error: "The article could not be saved. Try again." };

function refreshArticle(slug: string, change: ArticleChange, previousSlug = slug) {
  const { topicSlug, parentSlug, previousTopicSlug, previousParentSlug } = change;
  const topics = new Set([topicSlug, parentSlug, previousTopicSlug, previousParentSlug]);

  updateTag("articles");
  updateTag("topics");
  for (const articleSlug of new Set([slug, previousSlug])) {
    updateTag(`article:${articleSlug}`);
    const path = `/articles/${encodeURIComponent(articleSlug)}`;
    if (path.length <= 1024) revalidatePath(path);
    else revalidatePath("/articles/[slug]", "page");
  }
  for (const topic of topics) {
    if (!topic) continue;
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
}

export async function createArticle(_previous: ArticleActionState, form: FormData): Promise<ArticleActionState> {
  const session = await getAdminSession();
  if (session?.role !== "admin" && session?.role !== "editor") return signIn;

  const parsed = validateArticle(form);
  if ("fieldErrors" in parsed) return parsed;

  const { slug, title, summary, topicSlug, published, content } = parsed.data;
  let change: ArticleChange | undefined;
  try {
    [change] = await queryRows<ArticleChange>(
      `WITH selected_topic AS (
         SELECT slug, NULLIF(parent_slug, '') AS parent_slug FROM topics WHERE slug = $4 FOR KEY SHARE
       ), saved AS (
         INSERT INTO articles (slug, title, summary, topic_slug, published, body, body_text, updated)
         SELECT $1, $2, $3, slug, $5, $6::jsonb, $7, clock_timestamp() FROM selected_topic
         ON CONFLICT (slug) DO NOTHING
         RETURNING slug
       )
       SELECT saved.slug, t.slug AS "topicSlug", t.parent_slug AS "parentSlug"
       FROM selected_topic t LEFT JOIN saved ON true`,
      [slug, title, summary, topicSlug, published, JSON.stringify(content?.body), content?.bodyText],
    );
  } catch (error) {
    console.error("Article insert failed.", error);
    return saveFailed;
  }
  if (!change) return missingTopic;
  if (!change.slug) return slugConflict;

  refreshArticle(change.slug, change);
  redirect(`/admin/articles/${encodeURIComponent(change.slug)}?saved=1`);
}

export async function updateArticle(_previous: ArticleActionState, form: FormData): Promise<ArticleActionState> {
  const session = await getAdminSession();
  if (session?.role !== "admin" && session?.role !== "editor") return signIn;

  const version = validateArticleVersion(form, "originalSlug");
  if ("fieldErrors" in version) return { error: version.fieldErrors.updatedToken ?? version.fieldErrors.slug };

  const { slug: originalSlug, updatedToken } = version.data;
  const parsed = validateArticle(form, originalSlug);
  if ("fieldErrors" in parsed) return parsed;

  const { slug, title, summary, topicSlug, published, content } = parsed.data;
  let change: ArticleChange | undefined;
  try {
    [change] = await queryRows<ArticleChange>(
      `WITH selected_topic AS (
         SELECT slug, NULLIF(parent_slug, '') AS parent_slug FROM topics WHERE slug = $6 FOR KEY SHARE
       ), prior_article AS (
         SELECT a.slug, a.updated, a.topic_slug, NULLIF(t.parent_slug, '') AS parent_slug
         FROM articles a LEFT JOIN topics t ON a.topic_slug = t.slug
         WHERE a.slug = $1 AND ${versionExpression} = $2
       ), saved AS (
         UPDATE articles a
         SET slug = $3, title = $4, summary = $5, topic_slug = t.slug, published = $7,
             body = COALESCE($8::jsonb, a.body), body_text = COALESCE($9, a.body_text),
             updated = GREATEST(clock_timestamp(), a.updated + interval '1 microsecond')
         FROM prior_article p CROSS JOIN selected_topic t
         WHERE a.slug = p.slug AND a.updated = p.updated
         RETURNING a.slug, p.topic_slug AS "previousTopicSlug", p.parent_slug AS "previousParentSlug"
       )
       SELECT saved.*, t.slug AS "topicSlug", t.parent_slug AS "parentSlug"
       FROM selected_topic t LEFT JOIN saved ON true`,
      [originalSlug, updatedToken, slug, title, summary, topicSlug, published, content ? JSON.stringify(content.body) : null, content?.bodyText ?? null],
    );
  } catch (error) {
    if (error instanceof DatabaseError && error.code === "23505" && error.constraint === "articles_pkey") {
      return slugConflict;
    }
    console.error("Article update failed.", error);
    return saveFailed;
  }
  if (!change) return missingTopic;
  if (!change.slug) return { error: staleArticle };

  refreshArticle(change.slug, change, originalSlug);
  redirect(`/admin/articles/${encodeURIComponent(change.slug)}?saved=1`);
}

export async function deleteArticle(_previous: ArticleActionState, form: FormData): Promise<ArticleActionState> {
  const session = await getAdminSession();
  if (session?.role !== "admin") return { error: "Only administrators can delete articles." };

  const version = validateArticleVersion(form);
  if ("fieldErrors" in version) return { error: version.fieldErrors.updatedToken ?? version.fieldErrors.slug };

  const { slug, updatedToken } = version.data;
  let change: ArticleChange | undefined;
  try {
    [change] = await queryRows<ArticleChange>(
      `WITH removed AS (
         DELETE FROM articles a WHERE a.slug = $1 AND ${versionExpression} = $2
         RETURNING a.slug, a.topic_slug
       )
       SELECT r.slug, r.topic_slug AS "topicSlug", NULLIF(t.parent_slug, '') AS "parentSlug"
       FROM removed r LEFT JOIN topics t ON r.topic_slug = t.slug`,
      [slug, updatedToken],
    );
  } catch (error) {
    console.error("Article deletion failed.", error);
    return { error: "The article could not be deleted. Try again." };
  }
  if (!change?.slug) return { error: staleArticle };

  refreshArticle(change.slug, change);
  redirect("/admin?deleted=1");
}
