import "server-only";
import type { JSONContent } from "@tiptap/core";
import type { PoolClient } from "pg";

export type ArticleSnapshot = {
  slug: string;
  title: string;
  summary: string;
  topicSlug: string;
  topicSlugs: string[];
  body: JSONContent | null;
  bodyText: string;
};

export type LockedArticle = ArticleSnapshot & {
  updatedToken: string;
  published: boolean;
  lastEditorId: string | null;
};

type WorkingDraft = ArticleSnapshot & { updatedToken: string };

const snapshotFields = 'slug, title, summary, topic_slug AS "topicSlug", body, body_text AS "bodyText"';
const topicSlugsField = 'topic_slugs AS "topicSlugs"';
const updatedVersion = `to_char(updated AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"')`;

export async function readLockedArticle(client: PoolClient, slug: string, updatedToken: string) {
  const { rows: [article] } = await client.query<Omit<LockedArticle, "topicSlugs">>(
    `SELECT ${snapshotFields}, ${updatedVersion} AS "updatedToken", published, last_editor_id AS "lastEditorId"
     FROM articles WHERE slug = $1 AND ${updatedVersion} = $2 FOR UPDATE`,
    [slug, updatedToken],
  );
  if (!article) return null;

  const { rows } = await client.query<{ topicSlug: string }>(
    `SELECT topic_slug AS "topicSlug" FROM article_topic_memberships WHERE article_slug = $1
     ORDER BY (topic_slug = $2) DESC, topic_slug`,
    [slug, article.topicSlug],
  );
  return { ...article, topicSlugs: rows.map(({ topicSlug }) => topicSlug) };
}

/** Read after locking the canonical row so the draft check sees any prior save. */
export async function readWorkingDraft(client: PoolClient, slug: string) {
  const { rows: [draft] } = await client.query<WorkingDraft>(
    `SELECT ${snapshotFields}, ${topicSlugsField}, ${updatedVersion} AS "updatedToken"
     FROM article_working_drafts WHERE article_slug = $1`,
    [slug],
  );
  return draft ?? null;
}

export async function readRevisionSnapshot(client: PoolClient, slug: string, id: string) {
  const { rows: [revision] } = await client.query<ArticleSnapshot>(
    `SELECT ${snapshotFields}, ${topicSlugsField} FROM article_revisions WHERE article_slug = $1 AND id = $2`,
    [slug, id],
  );
  return revision ?? null;
}

function snapshotValues(snapshot: ArticleSnapshot) {
  const { slug, title, summary, topicSlug, topicSlugs, body, bodyText } = snapshot;
  return [slug, title, summary, topicSlug, topicSlugs, JSON.stringify(body), bodyText];
}

export async function saveWorkingDraft(client: PoolClient, slug: string, snapshot: ArticleSnapshot, editorId: string) {
  await client.query(
    `INSERT INTO article_working_drafts AS draft
       (article_slug, slug, title, summary, topic_slug, topic_slugs, body, body_text, last_editor_id, updated)
     VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, $8, $9, statement_timestamp())
     ON CONFLICT (article_slug) DO UPDATE SET
       slug = excluded.slug, title = excluded.title, summary = excluded.summary,
       topic_slug = excluded.topic_slug, topic_slugs = excluded.topic_slugs,
       body = excluded.body, body_text = excluded.body_text, last_editor_id = excluded.last_editor_id,
       updated = GREATEST(excluded.updated, draft.updated + interval '1 microsecond')`,
    [slug, ...snapshotValues(snapshot), editorId],
  );
}

export async function recordRevision(
  client: PoolClient,
  articleSlug: string,
  snapshot: ArticleSnapshot,
  kind: "draft" | "published" | "restored",
  editorId: string,
) {
  await client.query(
    `INSERT INTO article_revisions
       (article_slug, slug, title, summary, topic_slug, topic_slugs, body, body_text, kind, published, editor_id)
     VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, $8, $9, $10, $11)`,
    [articleSlug, ...snapshotValues(snapshot), kind, kind === "published", editorId],
  );
}

/** SQL imports can add canonical rows after the migration's initial baseline capture. */
export async function recordBaseline(client: PoolClient, article: LockedArticle) {
  await client.query(
    `INSERT INTO article_revisions
       (article_slug, slug, title, summary, topic_slug, topic_slugs, body, body_text, kind, published, editor_id, created_at)
     SELECT $1, $2, $3, $4, $5, $6, $7::jsonb, $8, 'baseline', $9, $10, $11
     WHERE NOT EXISTS (SELECT 1 FROM article_revisions WHERE article_slug = $1)`,
    [article.slug, ...snapshotValues(article), article.published, article.lastEditorId, article.updatedToken],
  );
}

export async function articleAliases(client: PoolClient, slug: string) {
  const { rows } = await client.query<{ oldSlug: string }>(
    'SELECT old_slug AS "oldSlug" FROM article_slug_redirects WHERE article_slug = $1', [slug],
  );
  return rows.map(({ oldSlug }) => oldSlug);
}
