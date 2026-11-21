import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { Breadcrumbs } from "@heroui/react";
import { getArticlesByTopics, type ArticleSummary } from "@/lib/data/articles";
import { getAllTopics, getSubtopics, getTopicTrail } from "@/lib/data/topics";

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

      <div className="mt-6 max-w-prose">
        <h1 className="font-serif text-4xl tracking-tight text-unh-primary sm:text-5xl dark:text-white">{topic.title}</h1>
        {topic.description && <p className="mt-4 text-xl text-slate-600 dark:text-slate-300">{topic.description}</p>}

        {articles.length === 0 && (
          <p className="mt-8 border-t border-slate-200 pt-6 text-slate-600 dark:border-slate-700 dark:text-slate-400">
            No articles in this topic yet.
          </p>
        )}

        <ArticleList articles={ownArticles} />

        {subtopics.map((s) => {
          const list = articlesIn(s.slug);
          return (
            <section key={s.slug} aria-labelledby={`subtopic-${s.slug}`} className="mt-12">
              <h2 id={`subtopic-${s.slug}`} className="font-serif text-2xl text-unh-primary dark:text-white">
                <Link
                  href={`/topics/${s.slug}`}
                  className="rounded-sm hover:underline hover:decoration-2 hover:underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
                >
                  {s.title}
                </Link>
              </h2>
              {s.description && <p className="mt-2 text-slate-600 dark:text-slate-300">{s.description}</p>}
              {list.length > 0 ? (
                <ArticleList articles={list} />
              ) : (
                <p className="mt-4 text-sm text-slate-500 dark:text-slate-400">No articles yet.</p>
              )}
            </section>
          );
        })}
      </div>
    </>
  );
}

// Same item style as the All articles page.
function ArticleList({ articles }: { articles: ArticleSummary[] }) {
  if (articles.length === 0) return null;

  return (
    <ul className="mt-6 divide-y divide-slate-200 border-t border-slate-200 dark:divide-slate-700 dark:border-slate-700">
      {articles.map((a) => (
        <li key={a.slug} className="py-5">
          <h3 className="text-lg font-semibold text-unh-primary dark:text-white">
            <Link
              href={`/articles/${a.slug}`}
              className="rounded-sm hover:underline hover:decoration-2 hover:underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
            >
              {a.title}
            </Link>
          </h3>
          {a.summary && <p className="mt-1 text-slate-600 dark:text-slate-300">{a.summary}</p>}
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Last Updated <time dateTime={a.updated.toISOString()}>{formatDate(a.updated)}</time>
          </p>
        </li>
      ))}
    </ul>
  );
}

export default function TopicPage({ params }: PageProps<"/topics/[topic]">) {
  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-10 sm:px-6">
      <Suspense fallback={<p className="text-slate-500">Loading topic…</p>}>
        <TopicContent params={params} />
      </Suspense>
    </main>
  );
}
