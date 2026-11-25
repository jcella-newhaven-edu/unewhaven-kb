import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { ChevronRightIcon } from "@heroicons/react/24/outline";
import { Breadcrumbs } from "@heroui/react";
import { getArticlesByTopics, type ArticleSummary } from "@/lib/data/articles";
import { getAllTopics, getSubtopics, getTopicTrail } from "@/lib/data/topics";
import styles from "../../browse.module.css";

// Prerender every topic and subtopic at build time. New ones are rendered on first visit.
export async function generateStaticParams() {
  const topics = await getAllTopics();
  return topics.map((t) => ({ topic: t.slug }));
}

export async function generateMetadata({ params }: PageProps<"/topics/[topic]">): Promise<Metadata> {
  const { topic: slug } = await params;
  const trail = await getTopicTrail(slug);
  const topic = trail.at(-1);
  return topic ? { title: topic.title, description: topic.description || undefined } : {};
}

const formatDate = (date: Date) =>
  new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" }).format(date);

// params is read inside <Suspense> so topics that weren't prerendered still get an instant shell.
async function TopicContent({ params }: Pick<PageProps<"/topics/[topic]">, "params">) {
  const { topic: slug } = await params;
  const trail = await getTopicTrail(slug); // [topic] or [parent, subtopic]
  const topic = trail.at(-1);
  if (!topic) notFound();

  // A subtopic can't have subtopics, so only top-level topics look them up.
  const subtopics = topic.parentSlug === null ? await getSubtopics(topic.slug) : [];
  const articles = await getArticlesByTopics([topic.slug, ...subtopics.map((s) => s.slug)]);
  const articlesIn = (s: string) => articles.filter((a) => a.topicSlug === s);
  const ownArticles = articlesIn(topic.slug);

  return (
    <>
      <Breadcrumbs>
        <Breadcrumbs.Item href="/">Home</Breadcrumbs.Item>
        {trail.slice(0, -1).map((t) => (
          <Breadcrumbs.Item key={t.slug} href={`/topics/${t.slug}`}>
            {t.title}
          </Breadcrumbs.Item>
        ))}
        <Breadcrumbs.Item>{topic.title}</Breadcrumbs.Item>
      </Breadcrumbs>

      <h1 className={styles.heading}>{topic.title}</h1>
      {topic.description && <p className={styles.intro}>{topic.description}</p>}

      {articles.length === 0 && <p className={styles.status}>No articles in this topic yet.</p>}

      <ArticleList articles={ownArticles} />

      {subtopics.map((subtopic) => {
        const list = articlesIn(subtopic.slug);
        return (
          <section key={subtopic.slug} aria-labelledby={`subtopic-${subtopic.slug}`} className={styles.group}>
            <h2 id={`subtopic-${subtopic.slug}`} className={styles.groupTitle}>
              <Link href={`/topics/${subtopic.slug}`}>{subtopic.title}</Link>
            </h2>
            {subtopic.description && <p className={styles.summary}>{subtopic.description}</p>}
            {list.length > 0 ? (
              <ArticleList articles={list} headingLevel="h3" />
            ) : (
              <p className={styles.status}>No articles yet.</p>
            )}
          </section>
        );
      })}
    </>
  );
}

function ArticleList({
  articles,
  headingLevel: Heading = "h2",
}: {
  articles: ArticleSummary[];
  headingLevel?: "h2" | "h3";
}) {
  if (articles.length === 0) return null;

  return (
    <ul className={styles.list}>
      {articles.map((article) => (
        <li key={article.slug} className={styles.listItem}>
          <Link href={`/articles/${article.slug}`} className={styles.row}>
            <div className={styles.rowText}>
              <Heading className={styles.rowTitle}>{article.title}</Heading>
              {article.summary && <p className={styles.summary}>{article.summary}</p>}
              <p className={styles.meta}>
                Last Updated <time dateTime={article.updated.toISOString()}>{formatDate(article.updated)}</time>
              </p>
            </div>
            <ChevronRightIcon aria-hidden="true" className={styles.arrow} />
          </Link>
        </li>
      ))}
    </ul>
  );
}

export default function TopicPage({ params }: PageProps<"/topics/[topic]">) {
  return (
    <main className={`kb-shell ${styles.shell}`}>
      <Suspense fallback={<p className={styles.status}>Loading topic…</p>}>
        <TopicContent params={params} />
      </Suspense>
    </main>
  );
}
