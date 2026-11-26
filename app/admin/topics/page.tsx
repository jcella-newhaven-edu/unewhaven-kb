import Link from "next/link";
import { listManagedTopics } from "@/lib/admin/topics";
import { AdminCreateLink, AdminGate, AdminHeader, AdminPage } from "../shell";
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
            <AdminHeader title="Topics" session={session} section="topics" actions={<AdminCreateLink section="topics" />} />
            {query.deleted === "1" && <p className={styles.notice} role="status">Topic deleted.</p>}

            <div className={styles.directory}>
              {topics.length ? (
                <table className={`${styles.table} ${topicStyles.table}`} aria-label="Topics">
                  <thead>
                    <tr>
                      <th scope="col">Topic</th>
                      <th scope="col">Parent topic</th>
                      <th scope="col">Articles</th>
                      <th scope="col">Subtopics</th>
                      <th scope="col">Sort order</th>
                    </tr>
                  </thead>
                  <tbody>
                    {topics.map((topic) => (
                      <tr key={topic.slug}>
                        <th scope="row">
                          <div className={styles.rowIdentity}>
                            <Link href={`/admin/topics/${encodeURIComponent(topic.slug)}`} prefetch={false}>{topic.title}</Link>
                            {topic.description && <span className={styles.rowDetail}>{topic.description}</span>}
                          </div>
                        </th>
                        <td data-label="Parent topic">
                          {topic.parentSlug ? topic.parentTitle || topic.parentSlug : <span className={styles.rowDetail}>Top level</span>}
                        </td>
                        <td data-label="Articles">{topic.articleCount}</td>
                        <td data-label="Subtopics">{topic.childCount}</td>
                        <td data-label="Sort order">{topic.sortOrder}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <p className={styles.emptyResults}>No topics yet.</p>
              )}
            </div>
          </>
        );
      }} />
    </AdminPage>
  );
}
