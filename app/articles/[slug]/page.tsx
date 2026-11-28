import type { Metadata } from "next";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { Breadcrumbs } from "@heroui/react";
import { getArticle, getArticleSlugs, readingMinutes } from "@/lib/data/articles";
import { getTopicTrail } from "@/lib/data/topics";
import { prepareArticleBody } from "@/components/ArticleBody";
import { ArticleHeader, ArticleText, OutlineLinks } from "@/components/ArticlePresentation";
import TopicSidebar from "@/components/TopicSidebar";

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
      <Breadcrumbs
        className="mb-[1.8rem] flex-wrap gap-x-2 gap-y-[0.35rem] text-[0.8125rem] text-kb-muted max-[791px]:mb-6 [&_[data-slot=link]]:text-[length:inherit] [&_[data-slot=link]]:text-inherit [&_[data-slot=breadcrumbs-item]]:min-w-0 [&_[data-slot=breadcrumbs-item]]:shrink [&_[data-slot=breadcrumbs-item]]:justify-start [&_[data-slot=breadcrumbs-item]]:wrap-anywhere [&_:is([aria-current=page],[data-current=true])]:font-[650] [&_:is([aria-current=page],[data-current=true])]:text-kb-heading"
      >
        <Breadcrumbs.Item href="/">Home</Breadcrumbs.Item>
        {trail.map((topic) => (
          <Breadcrumbs.Item key={topic.slug} href={`/topics/${encodeURIComponent(topic.slug)}`}>
            {topic.title}
          </Breadcrumbs.Item>
        ))}
        <Breadcrumbs.Item>{article.title}</Breadcrumbs.Item>
      </Breadcrumbs>

      <div
        className="grid grid-cols-[var(--article-sidebar-width,0px)_minmax(0,1fr)_var(--article-outline-width,0px)] items-start [grid-template-areas:'topics_article_outline'] min-[791px]:has-[[data-article-sidebar]]:[--article-sidebar-width:13.1875rem] min-[1071px]:has-[[data-article-sidebar]]:[--article-sidebar-width:15.4375rem] min-[1071px]:has-[[data-article-outline]]:[--article-outline-width:12.625rem]"
      >
        <article className="min-w-0 max-w-[49rem] pb-[2.375rem] wrap-anywhere [grid-area:article] min-[791px]:pe-3">
          <ArticleHeader title={article.title} summary={article.summary}>
            <p className="mt-3 flex flex-wrap gap-[0.45rem] text-xs text-kb-muted">
              <span>Updated <time dateTime={article.updated.toISOString()}>{dateFormat.format(article.updated)}</time></span>
              <span aria-hidden="true">·</span>
              <span>{readingMinutes(article.bodyText)} min read</span>
            </p>
          </ArticleHeader>
          {hasOutline && (
            <details className="mt-[1.125rem] rounded-lg border border-kb-line bg-kb-panel px-[0.8125rem] py-2.5 min-[1071px]:hidden">
              <summary className="cursor-pointer text-sm font-[650] text-kb-heading">On this page</summary>
              <div className="mt-1.5 ps-[1.0625rem]"><OutlineLinks headings={headings} /></div>
            </details>
          )}
          <ArticleText body={content} />
        </article>

        <TopicSidebar rootSlug={trail[0]?.slug} currentSlug={slug} />
        {hasOutline && (
          <aside
            data-article-outline=""
            className="sticky top-[calc(var(--kb-header-height)+1.625rem)] ms-9 hidden max-h-[calc(100dvh-var(--kb-header-height)-3.25rem)] overflow-y-auto border-s border-kb-line pt-[0.3125rem] pb-[0.8125rem] ps-3.5 scrollbar-thin [grid-area:outline] min-[1071px]:block"
          >
            <nav aria-labelledby="article-outline">
              <h2 id="article-outline" className="mb-2 text-sm leading-[1.4] font-[720] text-kb-heading">On this page</h2>
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
    <main className="kb-shell flex-1 pt-[1.625rem] pb-[4.25rem] max-[791px]:pt-[1.125rem]">
      <Suspense fallback={<p className="text-kb-muted">Loading article…</p>}>
        <ArticleContent params={params} />
      </Suspense>
    </main>
  );
}
