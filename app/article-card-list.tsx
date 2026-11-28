import Link from "next/link";
import { ArrowRightIcon, DocumentTextIcon } from "@heroicons/react/24/outline";
import { Card } from "@heroui/react";
import { browseFocus } from "./browse-styles";

type ArticleCard = {
  slug: string;
  title: string;
  summary: string;
  updated?: Date;
  topicSlug?: string;
  topicTitle?: string;
};

const updatedDate = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
  timeZone: "UTC",
});

export default function ArticleCardList({
  articles,
  heading: Heading = "h2",
  className = "",
}: {
  articles: ArticleCard[];
  heading?: "h2" | "h3";
  className?: string;
}) {
  return (
    <ul role="list" className={`grid grid-cols-[repeat(auto-fit,minmax(min(100%,25rem),1fr))] gap-3 sm:gap-4 ${className}`}>
      {articles.map(({ slug, title, summary, updated, topicSlug, topicTitle }) => (
        <li key={slug} className="min-w-0">
          <Card className="h-full gap-0 rounded-2xl border border-kb-line bg-background p-0 shadow-none motion-safe:transition-colors hover:border-focus focus-within:border-focus">
            <Link
              href={`/articles/${encodeURIComponent(slug)}`}
              className={`group flex flex-1 items-start gap-3 rounded-[inherit] p-4 no-underline motion-safe:transition-colors hover:bg-kb-panel not-last:rounded-b-none sm:gap-4 sm:p-5 ${browseFocus}`}
            >
              <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-kb-panel text-link group-hover:bg-kb-highlight">
                <DocumentTextIcon aria-hidden="true" className="size-5" />
              </span>
              <div className="flex min-w-0 flex-1 flex-col self-stretch">
                <Heading className="text-base leading-snug font-bold text-kb-heading wrap-anywhere group-hover:underline group-hover:underline-offset-4">
                  {title}
                </Heading>
                {summary && <p className="mt-1 text-sm leading-relaxed text-kb-muted wrap-anywhere">{summary}</p>}
                {updated && (
                  <p className="mt-auto pt-3 text-xs leading-normal text-kb-muted">
                    Updated <time dateTime={updated.toISOString()}>{updatedDate.format(updated)}</time>
                  </p>
                )}
              </div>
              <ArrowRightIcon aria-hidden="true" className="mt-1 size-4 shrink-0 text-kb-muted group-hover:text-link motion-safe:transition-transform motion-safe:group-hover:translate-x-0.5" />
            </Link>
            {topicSlug && topicTitle && (
              <Link
                href={`/topics/${encodeURIComponent(topicSlug)}`}
                className={`rounded-b-[inherit] border-t border-kb-line px-4 py-2.5 text-sm font-medium text-link wrap-anywhere hover:bg-kb-panel hover:underline hover:underline-offset-4 sm:px-5 ${browseFocus}`}
              >
                {topicTitle}
              </Link>
            )}
          </Card>
        </li>
      ))}
    </ul>
  );
}
