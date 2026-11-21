import Link from "next/link";
import { getArticlesByTopics, type ArticleSummary } from "@/lib/data/articles";
import { getSubtopics, getTopicTrail } from "@/lib/data/topics";

const focusRing = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus";

/**
 * Everything in the current article's top-level topic: its own articles, then each subtopic
 * with its articles. The current article is highlighted.
 */
export default async function TopicSidebar({ topicSlug, currentSlug }: { topicSlug: string; currentSlug: string }) {
  const [root] = await getTopicTrail(topicSlug); // the top-level topic, even when the article is in a subtopic
  if (!root) return null;

  const subtopics = await getSubtopics(root.slug);
  const articles = await getArticlesByTopics([root.slug, ...subtopics.map((s) => s.slug)]);
  const articlesIn = (slug: string) => articles.filter((a) => a.topicSlug === slug);
  const groups = subtopics.map((s) => ({ topic: s, articles: articlesIn(s.slug) })).filter((g) => g.articles.length > 0);

  return (
    <nav aria-labelledby="topic-sidebar-heading" className="lg:sticky lg:top-24">
      <h2 id="topic-sidebar-heading" className="text-sm font-semibold text-unh-primary dark:text-white">
        <Link href={`/topics/${root.slug}`} className={`rounded-sm hover:underline ${focusRing}`}>
          {root.title}
        </Link>
      </h2>

      <ArticleList articles={articlesIn(root.slug)} currentSlug={currentSlug} />

      {groups.map(({ topic, articles }) => (
        <div key={topic.slug} className="mt-5">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            <Link href={`/topics/${topic.slug}`} className={`rounded-sm hover:text-link hover:underline ${focusRing}`}>
              {topic.title}
            </Link>
          </h3>
          <ArticleList articles={articles} currentSlug={currentSlug} />
        </div>
      ))}
    </nav>
  );
}

function ArticleList({ articles, currentSlug }: { articles: ArticleSummary[]; currentSlug: string }) {
  if (articles.length === 0) return null;

  return (
    <ul className="mt-3 space-y-1 border-l-2 border-slate-200 text-sm dark:border-slate-700">
      {articles.map((a) => {
        const isCurrent = a.slug === currentSlug;
        return (
          <li key={a.slug}>
            <Link
              href={`/articles/${a.slug}`}
              aria-current={isCurrent ? "page" : undefined}
              className={`-ml-0.5 block border-l-2 py-1 pl-4 ${focusRing} ${
                isCurrent
                  ? "border-unh-secondary font-medium text-unh-primary dark:text-white"
                  : "border-transparent text-slate-600 hover:border-slate-400 hover:text-link dark:text-slate-400 dark:hover:text-white"
              }`}
            >
              {a.title}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
