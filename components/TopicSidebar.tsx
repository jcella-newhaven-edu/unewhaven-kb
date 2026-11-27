import { Accordion } from "@heroui/react";
import Link from "next/link";
import { getAllArticles, type ArticleSummary } from "@/lib/data/articles";
import { getAllTopics } from "@/lib/data/topics";

const topicLinks = "my-0 grid list-none gap-0.5 border-s border-kb-line ps-1.5";
const topicLink = "block rounded-[0.3125rem] px-1.5 py-[0.4375rem] text-[0.78125rem] leading-[1.35] wrap-anywhere hover:bg-kb-panel hover:text-kb-heading";

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
    <aside
      data-article-sidebar=""
      className="sticky top-[calc(var(--kb-header-height)+1.625rem)] me-[1.6875rem] hidden max-h-[calc(100dvh-var(--kb-header-height)-3.25rem)] overflow-y-auto border-e border-kb-line pe-4 pb-[1.1875rem] scrollbar-thin [grid-area:topics] min-[791px]:block min-[1071px]:me-9"
    >
      <nav aria-labelledby="article-topics">
        <h2 id="article-topics" className="mb-[0.5625rem] text-sm leading-[1.4] font-[720] text-kb-heading">Topics</h2>
        <Accordion
          hideSeparator
          defaultExpandedKeys={rootSlug ? [rootSlug] : []}
          className="gap-0"
        >
          {roots.map((topic) => {
            const subtopics = topics.filter((child) => child.parentSlug === topic.slug);
            return (
              <Accordion.Item key={topic.slug} id={topic.slug}>
                <Accordion.Heading>
                  <Accordion.Trigger
                    className="group/topic flex min-h-[2.1875rem] items-center justify-start gap-1.5 rounded-md p-[0.45rem] text-start text-[0.8125rem] leading-[1.35] font-[650] text-kb-heading hover:bg-kb-panel"
                  >
                    <Accordion.Indicator className="m-0 size-4 flex-none -rotate-90 text-inherit group-aria-expanded/topic:rotate-0" />
                    {topic.title}
                  </Accordion.Trigger>
                </Accordion.Heading>
                <Accordion.Panel>
                  <Accordion.Body className="pt-0 pe-0 pb-[0.15rem] ps-[0.8125rem]">
                    <ul className={topicLinks}>
                      <li>
                        <Link href={`/topics/${topic.slug}`} className={`${topicLink} font-[620] text-kb-muted`} prefetch={false}>
                          View topic
                        </Link>
                      </li>
                      <ArticleLinks articles={byTopic.get(topic.slug)} currentSlug={currentSlug} />
                      {subtopics.map((subtopic) => (
                        <li key={subtopic.slug}>
                          <Link
                            href={`/topics/${subtopic.slug}`}
                            className={`${topicLink} font-[680] text-kb-heading`}
                            prefetch={false}
                          >
                            {subtopic.title}
                          </Link>
                          <ul className={topicLinks}>
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
        className={`${topicLink} text-kb-muted aria-[current=page]:bg-kb-highlight aria-[current=page]:font-[680] aria-[current=page]:text-kb-heading`}
        prefetch={false}
      >
        {article.title}
      </Link>
    </li>
  ));
}
