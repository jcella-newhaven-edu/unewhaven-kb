import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { ChevronRightIcon } from "@heroicons/react/24/outline";
import { Breadcrumbs } from "@heroui/react";
import TopicIcon from "@/components/TopicIcon";
import { getArticlesByTopics } from "@/lib/data/articles";
import { getAllTopics, getSubtopics, getTopicTrail } from "@/lib/data/topics";
import ArticleCardList from "../../article-card-list";
import { browseFocus, browseStyles as styles } from "../../browse-styles";

// Prerender every topic and subtopic at build time. New ones are rendered on first visit.
export async function generateStaticParams() {
  const topics = await getAllTopics();
  return topics.length > 0 ? topics.map(({ slug }) => ({ topic: slug })) : [{ topic: "__no-topics__" }];
}

export async function generateMetadata({ params }: PageProps<"/topics/[topic]">): Promise<Metadata> {
  const { topic: slug } = await params;
  const trail = await getTopicTrail(slug);
  const topic = trail.at(-1);
  return topic ? { title: topic.title, description: topic.description || undefined } : {};
}

// params is read inside <Suspense> so topics that weren't prerendered still get an instant shell.
async function TopicContent({ params }: Pick<PageProps<"/topics/[topic]">, "params">) {
  const { topic: slug } = await params;
  const trail = await getTopicTrail(slug); // [topic] or [parent, subtopic]
  const topic = trail.at(-1);
  if (!topic) notFound();

  // A subtopic can't have subtopics, so only top-level topics look them up.
  const subtopics = topic.parentSlug === null ? await getSubtopics(topic.slug) : [];
  const articles = await getArticlesByTopics([topic.slug, ...subtopics.map((s) => s.slug)]);
  const articlesIn = (s: string) => articles.filter((a) => a.topicSlugs.includes(s));
  const ownArticles = articlesIn(topic.slug);

  return (
    <>
      <Breadcrumbs className="flex-wrap">
        <Breadcrumbs.Item href="/">Home</Breadcrumbs.Item>
        <Breadcrumbs.Item href="/topics">Topics</Breadcrumbs.Item>
        {trail.slice(0, -1).map((t) => (
          <Breadcrumbs.Item key={t.slug} href={`/topics/${encodeURIComponent(t.slug)}`}>
            {t.title}
          </Breadcrumbs.Item>
        ))}
        <Breadcrumbs.Item>{topic.title}</Breadcrumbs.Item>
      </Breadcrumbs>

      <header className="mt-5 flex flex-wrap items-start gap-4 rounded-3xl border border-kb-line bg-linear-to-br from-kb-panel to-background p-5 sm:gap-5 sm:p-8">
        <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-kb-highlight text-link sm:size-14">
          <TopicIcon icon={topic.icon} className="size-6 sm:size-7" />
        </span>
        <div className="min-w-0 basis-full flex-1 sm:basis-0">
          <h1 className="text-[clamp(1.875rem,4vw,2.75rem)] leading-[1.1] font-[750] tracking-[-0.045em] text-kb-heading wrap-anywhere">
            {topic.title}
          </h1>
          {topic.description && <p className="mt-2 max-w-2xl text-base leading-relaxed text-kb-muted wrap-anywhere">{topic.description}</p>}
        </div>
        <p className="self-start rounded-full border border-kb-line bg-background px-3 py-1 text-sm font-medium whitespace-nowrap text-kb-muted">
          {articles.length} {articles.length === 1 ? "article" : "articles"}
        </p>
      </header>

      <div className="mt-8 flex flex-col gap-8 sm:mt-10 sm:gap-10">
        {ownArticles.length > 0 && (
          <section aria-labelledby="topic-articles-heading">
            <h2 id="topic-articles-heading" className="mb-4 text-xl font-bold tracking-tight text-kb-heading">
              Articles
            </h2>
            <ArticleCardList articles={ownArticles} heading="h3" />
          </section>
        )}

        {articles.length === 0 && subtopics.length === 0 && <EmptyArticles />}

        {subtopics.map((subtopic) => {
          const list = articlesIn(subtopic.slug);
          const headingId = `subtopic-${subtopic.slug}`;

          return (
            <section key={subtopic.slug} aria-labelledby={headingId} className="border-t border-kb-line pt-6">
              <div className="mb-4 flex items-start gap-3">
                <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-kb-highlight text-link">
                  <TopicIcon icon={subtopic.icon} className="size-5" />
                </span>
                <div className="min-w-0">
                  <h2 id={headingId} className="text-xl font-bold tracking-tight text-kb-heading wrap-anywhere">
                    <Link
                      href={`/topics/${encodeURIComponent(subtopic.slug)}`}
                      className={`group inline-flex items-center gap-2 rounded-sm hover:underline hover:underline-offset-4 ${browseFocus}`}
                    >
                      <span>{subtopic.title}</span>
                      <ChevronRightIcon aria-hidden="true" className="size-4 shrink-0 text-kb-muted group-hover:text-link" />
                    </Link>
                  </h2>
                  {subtopic.description && <p className="mt-1 max-w-2xl text-sm leading-relaxed text-kb-muted wrap-anywhere">{subtopic.description}</p>}
                </div>
              </div>
              {list.length > 0 ? <ArticleCardList articles={list} heading="h3" /> : <EmptyArticles />}
            </section>
          );
        })}
      </div>
    </>
  );
}

function EmptyArticles() {
  return (
    <p className="rounded-2xl border border-dashed border-kb-line px-4 py-5 text-sm text-kb-muted">
      No articles yet.
    </p>
  );
}

export default function TopicPage({ params }: PageProps<"/topics/[topic]">) {
  return (
    <main className={styles.shell}>
      <Suspense fallback={<p className={styles.status}>Loading topic…</p>}>
        <TopicContent params={params} />
      </Suspense>
    </main>
  );
}
