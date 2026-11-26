import Link from "next/link";
import { listAdminTopics } from "@/lib/admin/articles";
import { AdminBackLink, AdminGate, AdminHeader, AdminPage } from "../../shell";
import AdminArticleForm from "../editor";
import styles from "../../admin.module.css";

export default function NewAdminArticle() {
  return (
    <AdminPage>
      <AdminGate render={async (session) => {
        const topics = await listAdminTopics();
        return (
          <>
            <AdminHeader title="New article" session={session}>
              <AdminBackLink section="articles" />
            </AdminHeader>
            {topics.length
              ? <AdminArticleForm topics={topics} />
              : (
                <p className={styles.empty}>
                  <Link href="/admin/topics/new" className={styles.backLink} prefetch={false}>Create a topic</Link>
                  {" before adding an article."}
                </p>
              )}
          </>
        );
      }} />
    </AdminPage>
  );
}
