import type { Metadata } from "next";
import Link from "next/link";
import { BookOpenIcon, ChevronRightIcon } from "@heroicons/react/24/outline";
import { Breadcrumbs, Card, CardDescription } from "@heroui/react";
import { getTopics } from "@/lib/data/topics";
import styles from "../browse.module.css";

export const metadata: Metadata = { title: "All topics" };

const count = (n: number) => `${n} ${n === 1 ? "article" : "articles"}`;

export default async function TopicsPage() {
  const topics = await getTopics();

  return (
    <main className={`kb-shell ${styles.shell}`}>
      <Breadcrumbs>
        <Breadcrumbs.Item href="/">Home</Breadcrumbs.Item>
        <Breadcrumbs.Item>Topics</Breadcrumbs.Item>
      </Breadcrumbs>

      <h1 className={styles.heading}>All topics</h1>
      <p className={styles.intro}>Browse guides and how-tos by subject.</p>

      {topics.length === 0 ? (
        <p className={styles.status}>No topics yet.</p>
      ) : (
        <ul className={styles.topicGrid}>
          {topics.map((topic) => (
            <li key={topic.slug}>
              <Card className={styles.topicCard}>
                <Link href={`/topics/${topic.slug}`} className={styles.cardLink}>
                  <div className={styles.cardTop}>
                    <span className={styles.cardIcon} aria-hidden="true">
                      <BookOpenIcon />
                    </span>
                    <ChevronRightIcon aria-hidden="true" className={styles.arrow} />
                  </div>
                  <div>
                    <h2 className={styles.cardTitle}>{topic.title}</h2>
                    {topic.description && (
                      <CardDescription className={styles.summary}>{topic.description}</CardDescription>
                    )}
                    <p className={styles.meta}>{count(topic.articleCount)}</p>
                  </div>
                </Link>

                {topic.subtopics.length > 0 && (
                  <ul aria-label={`${topic.title} subtopics`} className={styles.subtopics}>
                    {topic.subtopics.map((subtopic) => (
                      <li key={subtopic.slug}>
                        <Link href={`/topics/${subtopic.slug}`} className={styles.subtopicLink}>
                          {subtopic.title}
                          <span className={styles.meta}>{count(subtopic.articleCount)}</span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </Card>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
