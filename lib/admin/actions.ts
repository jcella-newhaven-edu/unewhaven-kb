"use server";

import { revalidatePath, updateTag } from "next/cache";
import { redirect } from "next/navigation";
import { DatabaseError, type PoolClient } from "pg";
import {
  articleAliases,
  readLockedArticle,
  readRevisionSnapshot,
  readWorkingDraft,
  recordBaseline,
  recordRevision,
  saveWorkingDraft,
  type ArticleSnapshot,
} from "@/lib/admin/article-editorial";
import { getAdminSession } from "@/lib/admin/auth";
import {
  type ArticleActionState,
  validateArticle,
  validateArticleEditVersion,
  validateArticleRevisionId,
} from "@/lib/admin/validation";
import { withTransaction } from "@/lib/postgres";

export type { ArticleActionState } from "@/lib/admin/validation";

type Change = { slug: string; notice: string; publicTopics?: string[]; aliases?: string[] } | { failure: ArticleActionState };

const staleArticle = "This article changed or was removed. Reload the page before trying again.";
const slugConflict = { fieldErrors: { slug: "An article or its URL redirect already uses this slug." } };
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

async function slugAvailable(client: PoolClient, slug: string, currentSlug: string | null) {
  const { rows: [result] } = await client.query<{ taken: boolean }>(
    `SELECT EXISTS (SELECT 1 FROM articles WHERE slug = $1 AND slug IS DISTINCT FROM $2)
         OR EXISTS (SELECT 1 FROM article_slug_redirects WHERE old_slug = $1 AND article_slug IS DISTINCT FROM $2)
           AS taken`,
    [slug, currentSlug],
  );
  return !result.taken;
}

function isSlugConflict(error: unknown) {
  return error instanceof DatabaseError && error.code === "23505"
    && (error.constraint === "articles_pkey" || error.constraint === "article_slug_redirects_pkey");
}

async function validateOwner(client: PoolClient, ownerId: string | null | undefined, editorId: string) {
  if (!ownerId) return null;
  const { rowCount } = await client.query(
    `SELECT 1 FROM admin_accounts owner JOIN admin_accounts editor ON editor.tenant_id = owner.tenant_id
     WHERE owner.id = $1 AND editor.id = $2 FOR KEY SHARE OF owner`,
    [ownerId, editorId],
  );
  return rowCount === 1 ? null : { fieldErrors: { ownerId: "Choose an editorial account in your organization." } };
}

async function applySnapshot(
  client: PoolClient,
  previousSlug: string,
  snapshot: ArticleSnapshot,
  published: boolean,
  editorId: string,
  ownerId?: string | null,
  reviewDueOn?: string | null,
) {
  const { slug, title, summary, topicSlug, topicSlugs, body, bodyText } = snapshot;
  await client.query(
    `UPDATE articles
     SET slug = $2, title = $3, summary = $4, topic_slug = $5, published = $6,
         body = $7::jsonb, body_text = $8,
         updated = GREATEST(statement_timestamp(), updated + interval '1 microsecond'),
         last_editor_id = $9,
         published_at = CASE WHEN $6 THEN COALESCE(published_at, statement_timestamp()) ELSE published_at END,
         owner_id = CASE WHEN $10 THEN $11::uuid ELSE owner_id END,
         review_due_on = CASE WHEN $12 THEN $13::date ELSE review_due_on END
     WHERE slug = $1`,
    [previousSlug, slug, title, summary, topicSlug, published, JSON.stringify(body), bodyText, editorId,
      ownerId !== undefined, ownerId ?? null, reviewDueOn !== undefined, reviewDueOn ?? null],
  );
  await saveTopicMemberships(client, slug, topicSlugs);
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

function refreshArticle(slug: string, affectedTopics: string[], aliases: string[]) {
  updateTag("articles");
  updateTag("topics");
  for (const articleSlug of new Set([slug, ...aliases])) {
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
}

function finishChange(change: Change) {
  if ("failure" in change) return change.failure;
  if (change.publicTopics) refreshArticle(change.slug, change.publicTopics, change.aliases ?? []);
  revalidatePath("/admin");
  revalidatePath("/admin/topics");
  revalidatePath("/admin/users");
  const editPath = `/admin/articles/${encodeURIComponent(change.slug)}`;
  revalidatePath(editPath);
  redirect(`${editPath}?saved=${change.notice}`);
}

export async function createArticle(_previous: ArticleActionState, form: FormData): Promise<ArticleActionState> {
  const session = await getAdminSession();
  if (session?.role !== "admin" && session?.role !== "editor") return signIn;

  const parsed = validateArticle(form);
  if ("fieldErrors" in parsed) return parsed;

  const { slug, title, summary, topicSlug, topicSlugs, published, content, ownerId, reviewDueOn } = parsed.data;
  if (!content) return saveFailed;
  const snapshot = { slug, title, summary, topicSlug, topicSlugs, ...content };
  let change: Change;
  try {
    change = await withTransaction(async (client) => {
      const failure = await lockSelectedTopics(client, topicSlugs);
      if (failure) return { failure };
      await client.query("SELECT lock_article_slug_namespace()");
      const ownershipFailure = await validateOwner(client, ownerId, session.id);
      if (ownershipFailure) return { failure: ownershipFailure };

      const result = await client.query(
        `INSERT INTO articles (slug, title, summary, topic_slug, published, body, body_text, updated,
                               author_id, last_editor_id, published_at, owner_id, review_due_on)
         VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7, statement_timestamp(), $8, $8,
                 CASE WHEN $5 THEN statement_timestamp() END, $9, $10)
         ON CONFLICT (slug) DO NOTHING`,
        [slug, title, summary, topicSlug, published, JSON.stringify(content.body), content.bodyText,
          session.id, ownerId ?? null, reviewDueOn ?? null],
      );
      if (result.rowCount !== 1) return { failure: slugConflict };
      await saveTopicMemberships(client, slug, topicSlugs);
      await recordRevision(client, slug, snapshot, published ? "published" : "draft", session.id);
      const publicTopics = published ? await affectedTopicRoutes(client, topicSlugs) : undefined;
      return { slug, notice: published ? "published" : "1", publicTopics };
    });
  } catch (error) {
    if (isSlugConflict(error)) return slugConflict;
    console.error("Article insert failed.", error);
    return saveFailed;
  }
  return finishChange(change);
}

export async function updateArticle(_previous: ArticleActionState, form: FormData): Promise<ArticleActionState> {
  const session = await getAdminSession();
  if (session?.role !== "admin" && session?.role !== "editor") return signIn;

  const version = validateArticleEditVersion(form);
  if ("fieldErrors" in version) return { error: Object.values(version.fieldErrors)[0] };

  const { slug: originalSlug, updatedToken, draftToken } = version.data;
  const parsed = validateArticle(form, originalSlug);
  if ("fieldErrors" in parsed) return parsed;

  const { slug, title, summary, topicSlug, topicSlugs, published, content, intent, ownerId, reviewDueOn } = parsed.data;
  let change: Change;
  try {
    change = await withTransaction(async (client) => {
      const failure = await lockSelectedTopics(client, topicSlugs);
      if (failure) return { failure };
      await client.query("SELECT lock_article_slug_namespace()");
      const prior = await readLockedArticle(client, originalSlug, updatedToken);
      if (!prior) return { failure: { error: staleArticle } };
      const draft = await readWorkingDraft(client, originalSlug);
      if ((draft?.updatedToken ?? null) !== draftToken) return { failure: { error: staleArticle } };
      if (!await slugAvailable(client, slug, originalSlug)) return { failure: slugConflict };
      const ownershipFailure = await validateOwner(client, ownerId, session.id);
      if (ownershipFailure) return { failure: ownershipFailure };

      const source = content ?? draft ?? prior;
      const snapshot = { slug, title, summary, topicSlug, topicSlugs, body: source.body, bodyText: source.bodyText };
      await recordBaseline(client, prior);
      if (prior.published && intent !== "apply") {
        await saveWorkingDraft(client, originalSlug, snapshot, session.id);
        await client.query(
          `UPDATE articles
           SET owner_id = CASE WHEN $2 THEN $3::uuid ELSE owner_id END,
               review_due_on = CASE WHEN $4 THEN $5::date ELSE review_due_on END
           WHERE slug = $1`,
          [originalSlug, ownerId !== undefined, ownerId ?? null, reviewDueOn !== undefined, reviewDueOn ?? null],
        );
        await recordRevision(client, originalSlug, snapshot, "draft", session.id);
        return { slug: originalSlug, notice: "working-draft" };
      }

      await applySnapshot(client, originalSlug, snapshot, published, session.id, ownerId, reviewDueOn);
      if (draft) await client.query("DELETE FROM article_working_drafts WHERE article_slug = $1", [slug]);
      await recordRevision(client, slug, snapshot, published ? "published" : "draft", session.id);
      const notice = published ? "published" : prior.published ? "unpublished" : "1";
      if (!prior.published && !published) return { slug, notice };

      return {
        slug,
        notice,
        aliases: [originalSlug, ...await articleAliases(client, slug)],
        publicTopics: await affectedTopicRoutes(client, [...prior.topicSlugs, ...topicSlugs]),
      };
    });
  } catch (error) {
    if (isSlugConflict(error)) return slugConflict;
    console.error("Article update failed.", error);
    return saveFailed;
  }
  return finishChange(change);
}

export async function restoreArticleRevision(_previous: ArticleActionState, form: FormData): Promise<ArticleActionState> {
  const session = await getAdminSession();
  if (session?.role !== "admin" && session?.role !== "editor") return signIn;
  const version = validateArticleEditVersion(form);
  if ("fieldErrors" in version) return { error: Object.values(version.fieldErrors)[0] };
  const revisionId = validateArticleRevisionId(form);
  if (!revisionId) return { error: "Choose an existing article revision." };
  const { slug, updatedToken, draftToken } = version.data;
  let change: Change;
  try {
    change = await withTransaction(async (client) => {
      const revision = await readRevisionSnapshot(client, slug, revisionId);
      if (!revision) return { failure: { error: "This revision is no longer available." } };
      const failure = await lockSelectedTopics(client, revision.topicSlugs);
      if (failure) return { failure: { error: "This revision refers to a topic that has been removed." } };
      await client.query("SELECT lock_article_slug_namespace()");
      const prior = await readLockedArticle(client, slug, updatedToken);
      if (!prior) return { failure: { error: staleArticle } };
      const draft = await readWorkingDraft(client, slug);
      if ((draft?.updatedToken ?? null) !== draftToken) return { failure: { error: staleArticle } };

      const restoredSlug = await slugAvailable(client, revision.slug, slug) ? revision.slug : slug;
      const snapshot = { ...revision, slug: restoredSlug };
      if (prior.published) {
        await saveWorkingDraft(client, slug, snapshot, session.id);
      } else {
        await applySnapshot(client, slug, snapshot, false, session.id);
      }
      const canonicalSlug = prior.published ? slug : restoredSlug;
      await recordRevision(client, canonicalSlug, snapshot, "restored", session.id);
      return { slug: canonicalSlug, notice: "restored" };
    });
  } catch (error) {
    console.error("Article revision restore failed.", error);
    return { error: "The revision could not be restored. Try again." };
  }
  return finishChange(change);
}

export async function deleteArticle(_previous: ArticleActionState, form: FormData): Promise<ArticleActionState> {
  const session = await getAdminSession();
  if (session?.role !== "admin") return { error: "Only administrators can delete articles." };

  const version = validateArticleEditVersion(form, "slug");
  if ("fieldErrors" in version) return { error: Object.values(version.fieldErrors)[0] };

  const { slug, updatedToken, draftToken } = version.data;
  let change: Change;
  try {
    change = await withTransaction(async (client) => {
      const prior = await readLockedArticle(client, slug, updatedToken);
      if (!prior) return { failure: { error: staleArticle } };
      const draft = await readWorkingDraft(client, slug);
      if ((draft?.updatedToken ?? null) !== draftToken) return { failure: { error: staleArticle } };
      const aliases = await articleAliases(client, slug);
      await client.query("DELETE FROM articles WHERE slug = $1", [slug]);
      return { slug, notice: "deleted", aliases, publicTopics: await affectedTopicRoutes(client, prior.topicSlugs) };
    });
  } catch (error) {
    console.error("Article deletion failed.", error);
    return { error: "The article could not be deleted. Try again." };
  }
  if ("failure" in change) return change.failure;

  if (change.publicTopics) refreshArticle(slug, change.publicTopics, change.aliases ?? []);
  revalidatePath("/admin");
  revalidatePath("/admin/topics");
  revalidatePath("/admin/users");
  redirect("/admin?deleted=1");
}
