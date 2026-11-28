import Link from "next/link";
import { listAdminTopics } from "@/lib/admin/articles";
import AdminFeedback from "../../admin-feedback";
import { AdminBackLink, AdminGate, AdminHeader, AdminPage } from "../../shell";
import AdminArticleForm from "../editor";
import { adminStyles as styles } from "../../admin-styles";

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
                <AdminFeedback status="warning" className="max-w-3xl">
                  <Link href="/admin/topics/new" className={styles.backLink} prefetch={false}>Create a topic</Link>
                  {" before adding an article."}
                </AdminFeedback>
              )}
          </>
        );
      }} />
    </AdminPage>
  );
}
