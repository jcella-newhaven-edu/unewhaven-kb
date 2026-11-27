import "server-only";
import { redirect } from "next/navigation";
import { getAdminSession } from "@/lib/admin/auth";
import { queryRows } from "@/lib/postgres";

export type ManagedTopic = {
  slug: string;
  title: string;
  icon: string;
  description: string;
  sortOrder: number;
  parentSlug: string | null;
  parentTitle: string | null;
  articleCount: number;
  childCount: number;
  updatedToken: string;
};

export async function listManagedTopics(): Promise<ManagedTopic[]> {
  const session = await getAdminSession();
  if (session?.role !== "admin" && session?.role !== "editor") redirect("/admin");

  return queryRows<ManagedTopic>(`
    SELECT t.slug, t.title, t.icon, t.description, t.sort_order AS "sortOrder",
           NULLIF(t.parent_slug, '') AS "parentSlug", p.title AS "parentTitle",
           COALESCE(a.article_count, 0) AS "articleCount", COALESCE(c.child_count, 0) AS "childCount",
           t.xmin::text AS "updatedToken"
    FROM topics t
    LEFT JOIN topics p ON NULLIF(t.parent_slug, '') = p.slug
    LEFT JOIN (SELECT topic_slug, count(*)::integer AS article_count FROM article_topic_memberships GROUP BY topic_slug) a
      ON a.topic_slug = t.slug
    LEFT JOIN (SELECT parent_slug, count(*)::integer AS child_count FROM topics GROUP BY parent_slug) c
      ON c.parent_slug = t.slug
    ORDER BY t.sort_order, t.title, t.slug
  `);
}
