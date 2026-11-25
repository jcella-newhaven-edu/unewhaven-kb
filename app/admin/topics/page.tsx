import Link from "next/link";
import { listManagedTopics } from "@/lib/admin/topics";
import { AdminGate, AdminHeader, AdminPage } from "../shell";
import styles from "../admin.module.css";
import topicStyles from "./topics.module.css";

export default function AdminTopics({
  searchParams,
}: {
  searchParams: Promise<{ deleted?: string | string[] }>;
}) {
  return (
    <AdminPage>
      <AdminGate render={async (session) => {
        const [topics, query] = await Promise.all([listManagedTopics(), searchParams]);

        return (
          <>
            <AdminHeader title="Topic administration" session={session} section="topics" />
            {query.deleted === "1" && <p className={styles.notice} role="status">Topic deleted.</p>}
            <div className={styles.listControls}>
              <Link href="/admin/topics/new" className={styles.primaryLink} prefetch={false}>New topic</Link>
            </div>

            {topics.length ? (
              <ul className={styles.articleList} aria-label="Topics">
                {topics.map((topic) => (
                  <li key={topic.slug} className={`${styles.articleRow} ${topicStyles.row}`}>
                    <div className={styles.articleDetails}>
                      <Link href={`/admin/topics/${encodeURIComponent(topic.slug)}`} prefetch={false}>{topic.title}</Link>
                      <span>{topic.parentSlug ? `Subtopic of ${topic.parentTitle || topic.parentSlug}` : "Top-level topic"}</span>
                    </div>
                    <span className={topicStyles.muted}>{topic.articleCount} {topic.articleCount === 1 ? "article" : "articles"}</span>
                    <span className={topicStyles.muted}>{topic.childCount} {topic.childCount === 1 ? "subtopic" : "subtopics"}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className={styles.empty}>No topics yet.</p>
            )}
          </>
        );
      }} />
    </AdminPage>
  );
}
