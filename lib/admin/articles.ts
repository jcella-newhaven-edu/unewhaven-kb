import "server-only";
import { redirect } from "next/navigation";
import { getAdminSession } from "@/lib/admin/auth";
import { isArticleSlug } from "@/lib/admin/validation";
import type { Article } from "@/lib/data/articles";
import { queryRows } from "@/lib/postgres";

export type AdminArticle = Article & {
  topicTitle: string;
  updatedToken: string;
};
export type AdminArticleSummary = Omit<AdminArticle, "body" | "bodyText">;
export type AdminTopic = { slug: string; title: string; parentSlug: string | null };

const fields = `
  a.slug, a.title, a.summary, a.topic_slug AS "topicSlug", COALESCE(t.title, a.topic_slug) AS "topicTitle",
  a.published, a.updated, to_char(a.updated AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"') AS "updatedToken"
`;
const from = 'FROM articles a LEFT JOIN topics t ON a.topic_slug = t.slug';

async function requireEditorialAccess() {
  const session = await getAdminSession();
  if (session?.role !== "admin" && session?.role !== "editor") redirect("/admin");
}

export async function listAdminArticles(): Promise<AdminArticleSummary[]> {
  await requireEditorialAccess();
  return queryRows<AdminArticleSummary>(`SELECT ${fields} ${from} ORDER BY a.updated DESC, a.slug`);
}

export async function getAdminArticle(slug: string): Promise<AdminArticle | null> {
  await requireEditorialAccess();
  if (!isArticleSlug(slug)) return null;

  const [article] = await queryRows<AdminArticle>(
    `SELECT ${fields}, a.body, a.body_text AS "bodyText" ${from} WHERE a.slug = $1`,
    [slug],
  );
  return article ?? null;
}

export async function listAdminTopics(): Promise<AdminTopic[]> {
  await requireEditorialAccess();
  return queryRows<AdminTopic>(
    `SELECT slug, title, NULLIF(parent_slug, '') AS "parentSlug" FROM topics ORDER BY sort_order, title, slug`,
  );
}
