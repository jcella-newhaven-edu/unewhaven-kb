import Link from "next/link";
import { notFound } from "next/navigation";
import { Button } from "@heroui/react";
import { listManagedTopics } from "@/lib/admin/topics";
import { AdminGate, AdminHeader, AdminPage } from "../../shell";
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
              <Link href="/admin/topics" className={styles.backLink} prefetch={false}>Back to topics</Link>
            </AdminHeader>
            {query.saved === "1" && <p className={styles.notice} role="status">Topic saved.</p>}
            <TopicForm
              key={`${topic.slug}:${topic.updatedToken}`}
              topic={topic}
              parentTopics={hasChildren ? [] : topics.filter((candidate) => !candidate.parentSlug && candidate.slug !== topic.slug)}
            />
            {session.role === "admin" && (
              deleteBlocker ? (
                <div className={`${styles.deleteArea} ${topicStyles.blockedDelete}`}>
                  <Button type="button" variant="danger-soft" aria-describedby="topic-delete-blocker" isDisabled>
                    Delete topic
                  </Button>
                  <p id="topic-delete-blocker" className={topicStyles.muted}>
                    Move or remove {deleteBlocker} before deleting this topic.{hasArticles && " Drafts count as articles."}
                  </p>
                </div>
              ) : (
                <DeleteTopic slug={topic.slug} title={topic.title} updatedToken={topic.updatedToken} />
              )
            )}
          </>
        );
      }} />
    </AdminPage>
  );
}
