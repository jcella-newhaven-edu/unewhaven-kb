import { notFound } from "next/navigation";
import { Button } from "@heroui/react";
import { listManagedTopics } from "@/lib/admin/topics";
import { AdminBackLink, AdminGate, AdminHeader, AdminPage } from "../../shell";
import styles from "../../admin.module.css";
import topicStyles from "../topics.module.css";
import TopicForm from "../editor";
import { DeleteTopic } from "../delete";

export default function EditAdminTopic({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ saved?: string | string[] }>;
}) {
  return (
    <AdminPage>
      <AdminGate render={async (session) => {
        const [{ slug }, topics, query] = await Promise.all([params, listManagedTopics(), searchParams]);
        const topic = topics.find((candidate) => candidate.slug === slug);
        if (!topic) notFound();

        const hasArticles = topic.articleCount > 0;
        const hasChildren = topic.childCount > 0;
        const deleteBlocker = hasArticles && hasChildren ? "its articles and subtopics"
          : hasArticles ? "its articles"
          : hasChildren ? "its subtopics"
          : undefined;

        return (
          <>
            <AdminHeader title="Edit topic" session={session} section="topics">
              <AdminBackLink section="topics" />
            </AdminHeader>
            {query.saved === "1" && <p className={styles.notice} role="status">Topic saved.</p>}
            <div className={topicStyles.editLayout}>
              <TopicForm
                key={`${topic.slug}:${topic.updatedToken}`}
                topic={topic}
                parentTopics={hasChildren ? [] : topics.filter((candidate) => !candidate.parentSlug && candidate.slug !== topic.slug)}
              />
              <aside className={styles.detailsPanel} aria-label="Topic usage">
                <h2>Topic usage</h2>
                <dl>
                  <div>
                    <dt>Articles assigned</dt>
                    <dd>{topic.articleCount}</dd>
                  </div>
                  <div>
                    <dt>Subtopics</dt>
                    <dd>{topic.childCount}</dd>
                  </div>
                </dl>
                {session.role === "admin" && (
                  deleteBlocker ? (
                    <div className={`${styles.deleteArea} ${topicStyles.blockedDelete}`}>
                      <Button type="button" variant="danger-soft" isDisabled>Delete topic</Button>
                      <p className={topicStyles.muted}>
                        Move or remove {deleteBlocker} before deleting this topic.{hasArticles && " Drafts count as articles."}
                      </p>
                    </div>
                  ) : (
                    <DeleteTopic slug={topic.slug} title={topic.title} updatedToken={topic.updatedToken} />
                  )
                )}
              </aside>
            </div>
          </>
        );
      }} />
    </AdminPage>
  );
}
