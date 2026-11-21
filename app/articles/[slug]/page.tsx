import type { Metadata } from "next";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { getArticle, getArticleSlugs, readingMinutes } from "@/lib/data/articles";
import { getTopicTrail } from "@/lib/data/topics";
import ArticleBody from "@/components/ArticleBody";
import TopicSidebar from "@/components/TopicSidebar";
import { Breadcrumbs } from "@heroui/react";

// Prerender every published article at build time. New ones are rendered on first visit.
export async function generateStaticParams() {
  return getArticleSlugs();
}

export async function generateMetadata({ params }: PageProps<"/articles/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const article = await getArticle(slug);
  return article ? { title: article.title, description: article.summary } : {};
}

const formatDate = (date: Date) =>
  new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" }).format(date);

// params is read inside <Suspense> so articles that weren't prerendered still get an instant shell.
async function ArticleContent({ params }: Pick<PageProps<"/articles/[slug]">, "params">) {
  const { slug } = await params;
  const article = await getArticle(slug);
  if (!article) notFound();
  const trail = await getTopicTrail(article.topicSlug); // [topic] or [topic, subtopic]

  return (
    <>
      <Breadcrumbs>
        <Breadcrumbs.Item href="/">Home</Breadcrumbs.Item>
        {trail.map((t) => (
          <Breadcrumbs.Item key={t.slug} href={`/topics/${t.slug}`}>
            {t.title}
          </Breadcrumbs.Item>
        ))}
        <Breadcrumbs.Item>{article.title}</Breadcrumbs.Item>
      </Breadcrumbs>

      {/* Article first in the page order, so on small screens the sidebar comes after it. */}
      <div className="mt-6 grid gap-12 lg:grid-cols-[14rem_minmax(0,1fr)] lg:gap-16">
        <article className="min-w-0 max-w-prose lg:col-start-2 lg:row-start-1">
          <h1 className="font-serif text-4xl tracking-tight text-unh-primary sm:text-5xl dark:text-white">{article.title}</h1>
          {article.summary && <p className="mt-4 text-xl text-slate-600 dark:text-slate-300">{article.summary}</p>}
          <p className="mt-4 flex flex-wrap items-center gap-x-2 text-sm text-slate-500 dark:text-slate-400">
            <span>
                Last Updated <time dateTime={article.updated.toISOString()}>{formatDate(article.updated)}</time>
            </span>
            <span aria-hidden="true">·</span>
            <span>{readingMinutes(article.bodyText)} min read</span>
        </p>


          <div className="mt-8 border-t border-slate-200 pt-1 text-[1.0625rem] leading-7 dark:border-slate-700">
            <ArticleBody body={article.body} />
          </div>
        </article>

        {trail.length > 0 && (
          <aside className="border-t border-slate-200 pt-8 lg:col-start-1 lg:row-start-1 lg:border-t-0 lg:pt-0 dark:border-slate-700">
            <TopicSidebar topicSlug={article.topicSlug} currentSlug={article.slug} />
          </aside>
        )}
      </div>
    </>
  );
}

export default function ArticlePage({ params }: PageProps<"/articles/[slug]">) {
  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-10 sm:px-6">
      <Suspense fallback={<p className="text-slate-500">Loading article…</p>}>
        <ArticleContent params={params} />
      </Suspense>
    </main>
  );
}
