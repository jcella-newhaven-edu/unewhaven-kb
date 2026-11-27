import type { Metadata } from "next";
import Link from "next/link";
import { ChevronRightIcon } from "@heroicons/react/24/outline";
import { Breadcrumbs, Card, CardDescription } from "@heroui/react";
import TopicIcon from "@/components/TopicIcon";
import { getTopics } from "@/lib/data/topics";
import { browseFocus, browseStyles as styles } from "../browse-styles";

export const metadata: Metadata = { title: "All topics" };

const count = (n: number) => `${n} ${n === 1 ? "article" : "articles"}`;

export default async function TopicsPage() {
  const topics = await getTopics();

  return (
    <main className={styles.shell}>
      <Breadcrumbs>
        <Breadcrumbs.Item href="/">Home</Breadcrumbs.Item>
        <Breadcrumbs.Item>Topics</Breadcrumbs.Item>
      </Breadcrumbs>

      <h1 className={styles.heading}>All topics</h1>
      <p className={styles.intro}>Browse guides and how-tos by subject.</p>

      {topics.length === 0 ? (
        <p className={styles.status}>No topics yet.</p>
      ) : (
        <ul className="mt-6.5 grid gap-3.5 sm:grid-cols-2">
          {topics.map((topic) => (
            <li key={topic.slug}>
              <Card className="h-full gap-0 rounded-[0.875rem] border border-kb-line bg-background p-0 shadow-none wrap-anywhere hover:border-focus focus-within:border-focus">
                <Link
                  href={`/topics/${topic.slug}`}
                  className={`group grid gap-2.5 rounded-[inherit] px-4.5 py-4 no-underline hover:bg-kb-hover ${browseFocus}`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="grid size-[2.2rem] place-items-center rounded-[0.625rem] bg-kb-highlight text-link">
                      <TopicIcon icon={topic.icon} className="size-[1.2rem]" />
                    </span>
                    <ChevronRightIcon aria-hidden="true" className={styles.arrow} />
                  </div>
                  <div>
                    <h2 className="text-[1.0625rem] leading-[1.3] font-bold tracking-tight text-kb-heading group-hover:underline group-hover:underline-offset-[0.23em]">
                      {topic.title}
                    </h2>
                    {topic.description && (
                      <CardDescription className={styles.summary}>{topic.description}</CardDescription>
                    )}
                    <p className={styles.meta}>{count(topic.articleCount)}</p>
                  </div>
                </Link>

                {topic.subtopics.length > 0 && (
                  <ul aria-label={`${topic.title} subtopics`} className="mx-4.5 mb-3.5 border-bs border-kb-line pt-1.5">
                    {topic.subtopics.map((subtopic) => (
                      <li key={subtopic.slug}>
                        <Link
                          href={`/topics/${subtopic.slug}`}
                          className={`flex items-center justify-between gap-2 rounded-sm py-[0.4rem] text-sm text-link hover:underline hover:underline-offset-[0.23em] ${browseFocus}`}
                        >
                          <span className="flex min-w-0 items-center gap-2">
                            <TopicIcon icon={subtopic.icon} className="size-4 flex-none" />
                            {subtopic.title}
                          </span>
                          <span className="shrink-0 text-[0.8125rem] leading-[1.45] whitespace-nowrap text-kb-muted">
                            {count(subtopic.articleCount)}
                          </span>
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
