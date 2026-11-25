import Link from "next/link";
import { listManagedTopics } from "@/lib/admin/topics";
import { AdminGate, AdminHeader, AdminPage } from "../../shell";
import styles from "../../admin.module.css";
import TopicForm from "../editor";

export default function NewAdminTopic() {
  return (
    <AdminPage>
      <AdminGate render={async (session) => {
        const topics = await listManagedTopics();
        return (
          <>
            <AdminHeader title="New topic" session={session} section="topics">
              <Link href="/admin/topics" className={styles.backLink} prefetch={false}>Back to topics</Link>
            </AdminHeader>
            <TopicForm parentTopics={topics.filter((topic) => !topic.parentSlug)} />
          </>
        );
      }} />
    </AdminPage>
  );
}
