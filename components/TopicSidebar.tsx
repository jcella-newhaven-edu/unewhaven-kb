import { Accordion } from "@heroui/react";
import Link from "next/link";
import { getAllArticles, type ArticleSummary } from "@/lib/data/articles";
import { getAllTopics } from "@/lib/data/topics";
import styles from "@/app/articles/[slug]/article.module.css";

export default async function TopicSidebar({
  rootSlug,
  currentSlug,
}: {
  rootSlug?: string;
  currentSlug: string;
}) {
  const [topics, articles] = await Promise.all([getAllTopics(), getAllArticles()]);
  const topicSlugs = new Set(topics.map((topic) => topic.slug));
  const roots = topics.filter((topic) => !topic.parentSlug || !topicSlugs.has(topic.parentSlug));
  if (!roots.length) return null;

  const byTopic = new Map<string, ArticleSummary[]>();
  for (const article of articles) {
    for (const slug of article.topicSlugs) {
      const group = byTopic.get(slug) ?? [];
      group.push(article);
      byTopic.set(slug, group);
    }
  }

  return (
    <aside className={styles.sidebar}>
      <nav aria-labelledby="article-topics">
        <h2 id="article-topics" className={styles.railHeading}>Topics</h2>
        <Accordion
          hideSeparator
          defaultExpandedKeys={rootSlug ? [rootSlug] : []}
          className={styles.topicAccordion}
        >
          {roots.map((topic) => {
            const subtopics = topics.filter((child) => child.parentSlug === topic.slug);
            return (
              <Accordion.Item key={topic.slug} id={topic.slug}>
                <Accordion.Heading>
                  <Accordion.Trigger className={styles.topicTrigger}>
                    <Accordion.Indicator className={styles.topicChevron} />
                    {topic.title}
                  </Accordion.Trigger>
                </Accordion.Heading>
                <Accordion.Panel>
                  <Accordion.Body className={styles.topicPanel}>
                    <ul className={styles.topicLinks}>
                      <li>
                        <Link href={`/topics/${topic.slug}`} className={styles.topicOverview} prefetch={false}>
                          View topic
                        </Link>
                      </li>
                      <ArticleLinks articles={byTopic.get(topic.slug)} currentSlug={currentSlug} />
                      {subtopics.map((subtopic) => (
                        <li key={subtopic.slug} className={styles.subtopic}>
                          <Link href={`/topics/${subtopic.slug}`} prefetch={false}>{subtopic.title}</Link>
                          <ul>
                            <ArticleLinks articles={byTopic.get(subtopic.slug)} currentSlug={currentSlug} />
                          </ul>
                        </li>
                      ))}
                    </ul>
                  </Accordion.Body>
                </Accordion.Panel>
              </Accordion.Item>
            );
          })}
        </Accordion>
      </nav>
    </aside>
  );
}

function ArticleLinks({ articles, currentSlug }: { articles?: ArticleSummary[]; currentSlug: string }) {
  return articles?.map((article) => (
    <li key={article.slug}>
      <Link
        href={`/articles/${article.slug}`}
        aria-current={article.slug === currentSlug ? "page" : undefined}
        prefetch={false}
      >
        {article.title}
      </Link>
    </li>
  ));
}
