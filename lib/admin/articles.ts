import "server-only";
import { redirect } from "next/navigation";
import { getAdminSession } from "@/lib/admin/auth";
import { isArticleSlug } from "@/lib/admin/validation";
import type { Article } from "@/lib/data/articles";
import { queryRows } from "@/lib/postgres";

export type AdminArticle = Article & {
  topicTitle: string;
  topics: { slug: string; title: string }[];
  authorName: string | null;
  lastEditorName: string | null;
  publishedAt: Date | null;
  updatedToken: string;
  ownerId: string | null;
  ownerName: string | null;
  reviewDueOn: string | null;
  reviewDue: boolean;
  workingDraftUpdated: Date | null;
  workingDraftToken: string | null;
  workingDraftEditorName: string | null;
  workingDraft: WorkingDraft | null;
};
type WorkingDraft = Pick<Article, "slug" | "title" | "summary" | "topicSlug" | "topicSlugs" | "body" | "bodyText" | "updated"> & {
  updatedToken: string;
};
export type AdminArticleSummary = Omit<AdminArticle, "body" | "bodyText" | "workingDraft">;
export type AdminTopic = { slug: string; title: string; parentSlug: string | null };
export type ArticleOwner = { id: string; name: string };
export type ArticleRevision = Pick<Article, "slug" | "title" | "summary" | "topicSlug" | "topicSlugs" | "bodyText" | "published"> & {
  id: string;
  kind: "baseline" | "draft" | "published" | "restored";
  createdAt: Date;
  editorName: string | null;
  bodyChanged: boolean;
};

const draftToken = `to_char(draft.updated AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"')`;

const fields = `
  a.slug, a.title, a.summary, a.topic_slug AS "topicSlug", COALESCE(t.title, a.topic_slug) AS "topicTitle",
  assigned.slugs AS "topicSlugs", assigned.topics, creator.display_name AS "authorName",
  editor.display_name AS "lastEditorName", a.published_at AS "publishedAt", a.published, a.updated,
  to_char(a.updated AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"') AS "updatedToken",
  owner.id AS "ownerId", owner.display_name AS "ownerName",
  to_char(a.review_due_on, 'YYYY-MM-DD') AS "reviewDueOn",
  COALESCE(a.review_due_on <= (now() AT TIME ZONE 'America/New_York')::date, false) AS "reviewDue",
  draft.updated AS "workingDraftUpdated", ${draftToken} AS "workingDraftToken",
  draft_editor.display_name AS "workingDraftEditorName"
`;
const from = `
  FROM articles a
  LEFT JOIN topics t ON a.topic_slug = t.slug
  LEFT JOIN admin_accounts viewer ON viewer.id = $1
  LEFT JOIN admin_accounts creator ON a.author_id = creator.id AND creator.tenant_id = viewer.tenant_id AND viewer.role = 'admin'
  LEFT JOIN admin_accounts editor ON a.last_editor_id = editor.id AND editor.tenant_id = viewer.tenant_id AND viewer.role = 'admin'
  LEFT JOIN admin_accounts owner ON a.owner_id = owner.id AND owner.tenant_id = viewer.tenant_id
  LEFT JOIN article_working_drafts draft ON draft.article_slug = a.slug
  LEFT JOIN admin_accounts draft_editor
    ON draft.last_editor_id = draft_editor.id AND draft_editor.tenant_id = viewer.tenant_id AND viewer.role = 'admin'
  LEFT JOIN LATERAL (
    SELECT array_agg(m.topic_slug ORDER BY (m.topic_slug = a.topic_slug) DESC, m.topic_slug) AS slugs,
           jsonb_agg(jsonb_build_object('slug', m.topic_slug, 'title', COALESCE(label.title, m.topic_slug))
                     ORDER BY (m.topic_slug = a.topic_slug) DESC, m.topic_slug) AS topics
    FROM article_topic_memberships m LEFT JOIN topics label ON label.slug = m.topic_slug
    WHERE m.article_slug = a.slug
  ) assigned ON true
`;

async function requireEditorialAccess() {
  const session = await getAdminSession();
  if (session?.role !== "admin" && session?.role !== "editor") redirect("/admin");
  return session;
}

export async function listAdminArticles(): Promise<AdminArticleSummary[]> {
  const session = await requireEditorialAccess();
  return queryRows<AdminArticleSummary>(
    `SELECT ${fields} ${from} ORDER BY GREATEST(draft.updated, a.updated) DESC, a.slug`,
    [session.id],
  );
}

export async function getAdminArticle(slug: string): Promise<AdminArticle | null> {
  const session = await requireEditorialAccess();
  if (!isArticleSlug(slug)) return null;

  const [article] = await queryRows<Omit<AdminArticle, "workingDraft"> & {
    workingDraft: Omit<WorkingDraft, "updated"> | null;
  }>(
    `SELECT ${fields}, a.body, a.body_text AS "bodyText",
            CASE WHEN draft.article_slug IS NOT NULL THEN jsonb_build_object(
              'slug', draft.slug, 'title', draft.title, 'summary', draft.summary,
              'topicSlug', draft.topic_slug, 'topicSlugs', draft.topic_slugs,
              'body', draft.body, 'bodyText', draft.body_text, 'updatedToken', ${draftToken}
            ) END AS "workingDraft"
     ${from} WHERE a.slug = $2`,
    [session.id, slug],
  );
  if (!article) return null;
  const { workingDraft, workingDraftUpdated } = article;
  return {
    ...article,
    workingDraft: workingDraft && workingDraftUpdated ? { ...workingDraft, updated: workingDraftUpdated } : null,
  };
}

export async function listArticleOwners(): Promise<ArticleOwner[]> {
  const session = await requireEditorialAccess();
  return queryRows<ArticleOwner>(
    `SELECT owner.id, owner.display_name AS name FROM admin_accounts viewer
     JOIN admin_accounts owner ON owner.tenant_id = viewer.tenant_id
     WHERE viewer.id = $1 ORDER BY owner.display_name, owner.id`,
    [session.id],
  );
}

export async function listArticleRevisions(slug: string): Promise<ArticleRevision[]> {
  const session = await requireEditorialAccess();
  if (!isArticleSlug(slug)) return [];
  return queryRows<ArticleRevision>(
    `SELECT r.id::text, r.slug, r.title, r.summary, r.topic_slug AS "topicSlug", r.topic_slugs AS "topicSlugs",
            r.body_text AS "bodyText", r.published, r.kind, r.created_at AS "createdAt",
            editor.display_name AS "editorName",
            r.body IS DISTINCT FROM COALESCE(draft.body, a.body) AS "bodyChanged"
     FROM article_revisions r
     JOIN articles a ON a.slug = r.article_slug
     LEFT JOIN article_working_drafts draft ON draft.article_slug = a.slug
     LEFT JOIN admin_accounts viewer ON viewer.id = $1 AND viewer.role = 'admin'
     LEFT JOIN admin_accounts editor ON editor.id = r.editor_id AND editor.tenant_id = viewer.tenant_id
     WHERE r.article_slug = $2 ORDER BY r.created_at DESC, r.id DESC`,
    [session.role === "admin" ? session.id : null, slug],
  );
}

export async function listAdminTopics(): Promise<AdminTopic[]> {
  await requireEditorialAccess();
  return queryRows<AdminTopic>(
    `SELECT slug, title, NULLIF(parent_slug, '') AS "parentSlug" FROM topics ORDER BY sort_order, title, slug`,
  );
}
