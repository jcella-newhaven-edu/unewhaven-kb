import type { Metadata } from "next";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { Breadcrumbs } from "@heroui/react";
import { getArticle, getArticleSlugs, readingMinutes } from "@/lib/data/articles";
import { getTopicTrail } from "@/lib/data/topics";
import ArticleBody, { type ArticleHeading, prepareArticleBody } from "@/components/ArticleBody";
import TopicSidebar from "@/components/TopicSidebar";
import styles from "./article.module.css";

// Prerender every published article at build time. New ones are rendered on first visit.
export async function generateStaticParams() {
  const slugs = await getArticleSlugs();
  // Cache Components requires a param even when all articles are drafts or deleted.
  return slugs.length > 0 ? slugs : [{ slug: "__no-published-articles__" }];
}

export async function generateMetadata({ params }: PageProps<"/articles/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const article = await getArticle(slug);
  return article ? { title: article.title, description: article.summary } : {};
}

const dateFormat = new Intl.DateTimeFormat("en-US", {
  month: "short", day: "numeric", year: "numeric", timeZone: "UTC",
});

function OutlineLinks({ headings }: { headings: ArticleHeading[] }) {
  return (
    <ul className={styles.outlineLinks}>
      {headings.map(({ id, title }) => (
        <li key={id}><a href={`#${encodeURIComponent(id)}`}>{title}</a></li>
      ))}
    </ul>
  );
}

// Read params inside Suspense to keep the instant shell for new articles.
async function ArticleContent({ params }: Pick<PageProps<"/articles/[slug]">, "params">) {
  const { slug } = await params;
  const article = await getArticle(slug);
  if (!article) notFound();

  const trail = await getTopicTrail(article.topicSlug);
  const { content, headings } = prepareArticleBody(article.body, article.bodyText);
  const hasOutline = headings.length > 0;

  return (
    <>
      <Breadcrumbs className={styles.breadcrumbs}>
        <Breadcrumbs.Item href="/">Home</Breadcrumbs.Item>
        {trail.map((topic) => (
          <Breadcrumbs.Item key={topic.slug} href={`/topics/${topic.slug}`}>
            {topic.title}
          </Breadcrumbs.Item>
        ))}
        <Breadcrumbs.Item>{article.title}</Breadcrumbs.Item>
      </Breadcrumbs>

      <div className={styles.readingGrid}>
        <article className={styles.guide}>
          <h1>{article.title}</h1>
          {article.summary && <p className={styles.intro}>{article.summary}</p>}
          {hasOutline && (
            <details className={styles.mobileOutline}>
              <summary>On this page</summary>
              <OutlineLinks headings={headings} />
            </details>
          )}

          <div className={styles.prose}>
            <ArticleBody body={content} />
          </div>
          <p className={styles.metadata}>
            <span>Updated <time dateTime={article.updated.toISOString()}>{dateFormat.format(article.updated)}</time></span>
            <span aria-hidden="true">·</span>
            <span>{readingMinutes(article.bodyText)} min read</span>
          </p>
        </article>

        <TopicSidebar rootSlug={trail[0]?.slug} currentSlug={slug} />
        {hasOutline && (
          <aside className={styles.outline}>
            <nav aria-labelledby="article-outline">
              <h2 id="article-outline" className={styles.railHeading}>On this page</h2>
              <OutlineLinks headings={headings} />
            </nav>
          </aside>
        )}
      </div>
    </>
  );
}

export default function ArticlePage({ params }: PageProps<"/articles/[slug]">) {
  return (
    <main className={`kb-shell ${styles.page}`}>
      <Suspense fallback={<p className={styles.loading}>Loading article…</p>}>
        <ArticleContent params={params} />
      </Suspense>
    </main>
  );
}
