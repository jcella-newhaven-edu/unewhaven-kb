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
};
export type AdminArticleSummary = Omit<AdminArticle, "body" | "bodyText">;
export type AdminTopic = { slug: string; title: string; parentSlug: string | null };

const fields = `
  a.slug, a.title, a.summary, a.topic_slug AS "topicSlug", COALESCE(t.title, a.topic_slug) AS "topicTitle",
  assigned.slugs AS "topicSlugs", assigned.topics, creator.display_name AS "authorName",
  editor.display_name AS "lastEditorName", a.published_at AS "publishedAt", a.published, a.updated,
  to_char(a.updated AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"') AS "updatedToken"
`;
const from = `
  FROM articles a
  LEFT JOIN topics t ON a.topic_slug = t.slug
  LEFT JOIN admin_accounts viewer ON viewer.id = $1 AND viewer.role = 'admin'
  LEFT JOIN admin_accounts creator ON a.author_id = creator.id AND creator.tenant_id = viewer.tenant_id
  LEFT JOIN admin_accounts editor ON a.last_editor_id = editor.id AND editor.tenant_id = viewer.tenant_id
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
    `SELECT ${fields} ${from} ORDER BY a.updated DESC, a.slug`,
    [session.role === "admin" ? session.id : null],
  );
}

export async function getAdminArticle(slug: string): Promise<AdminArticle | null> {
  const session = await requireEditorialAccess();
  if (!isArticleSlug(slug)) return null;

  const [article] = await queryRows<AdminArticle>(
    `SELECT ${fields}, a.body, a.body_text AS "bodyText" ${from} WHERE a.slug = $2`,
    [session.role === "admin" ? session.id : null, slug],
  );
  return article ?? null;
}

export async function listAdminTopics(): Promise<AdminTopic[]> {
  await requireEditorialAccess();
  return queryRows<AdminTopic>(
    `SELECT slug, title, NULLIF(parent_slug, '') AS "parentSlug" FROM topics ORDER BY sort_order, title, slug`,
  );
}
