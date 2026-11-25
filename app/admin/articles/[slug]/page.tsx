import Link from "next/link";
import { notFound } from "next/navigation";
import { getAdminArticle, listAdminTopics } from "@/lib/admin/articles";
import { AdminGate, AdminHeader, AdminPage } from "../../shell";
import AdminArticleForm from "../editor";
import { DeleteArticle } from "../delete";
import styles from "../../admin.module.css";

export default function EditAdminArticle({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ saved?: string | string[] }>;
}) {
  return (
    <AdminPage>
      <AdminGate render={async (session) => {
        const { slug } = await params;
        const [article, topics, query] = await Promise.all([
          getAdminArticle(slug), listAdminTopics(), searchParams,
        ]);
        if (!article) notFound();

        return (
          <>
            <AdminHeader title="Edit article" session={session}>
              <Link href="/admin" className={styles.backLink} prefetch={false}>Back to articles</Link>
            </AdminHeader>
            {query.saved === "1" && <p className={styles.notice} role="status">Article saved.</p>}
            <AdminArticleForm key={article.updatedToken} article={article} topics={topics} />
            {session.role === "admin" && (
              <DeleteArticle slug={article.slug} title={article.title} updatedToken={article.updatedToken} />
            )}
          </>
        );
      }} />
    </AdminPage>
  );
}
