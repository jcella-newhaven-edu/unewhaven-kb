import Link from "next/link";
import { Button, Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@heroui/react";

// import { getRecentArticles, getTopics } from "@/lib/articles";

import { getRecentArticles } from "@/lib/data/articles";
import { getAllTopics, getTopics } from "@/lib/data/topics";

const formatDate = (date: Date) =>
  new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" }).format(date);

// Focus ring for links on light backgrounds (yellow in dark mode).
const focusRing =
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus";

export default async function Home() {
  const [recent, topics, allTopics] = await Promise.all([getRecentArticles(4), getTopics(), getAllTopics()]);

  // Titles for every topic and subtopic, so recent articles in a subtopic show its name.
  const topicTitles = new Map(allTopics.map((t) => [t.slug, t.title]));

  return (
    <main className="flex-1 bg-background text-foreground">
       {/* Hero */}
      <section className="bg-gradient-to-b from-unh-primary to-unh-deep text-white">
        {/* Same width as the sections below, so the left edges line up. */}
        <div className="mx-auto max-w-6xl px-4 pb-16 pt-14 sm:px-6 sm:pb-20 sm:pt-20">
          <h1 className="font-serif text-4xl tracking-tight sm:text-6xl">Find an answer</h1>
          <p className="mt-4 max-w-xl text-lg text-slate-300">
            Guides, how-tos and reference articles, all in one place.
          </p>

          <form action="/search" method="get" role="search" className="mt-10 flex max-w-3xl flex-col gap-4 sm:flex-row sm:items-end">
            <label htmlFor="q" className="sr-only">
              Search the knowledge base
            </label>
            <input
              id="q"
              name="q"
              type="search"
              placeholder="Search for a topic, error or question"
              autoComplete="off"
              className="w-full flex-1 border-b-[3px] border-unh-secondary bg-transparent pb-2 font-serif text-xl text-white placeholder:text-slate-400 focus:border-unh-tertiary-light focus:outline-none sm:text-2xl"
            />
            <button
              type="submit"
              className="rounded-md bg-unh-secondary px-6 py-3 font-semibold text-unh-primary transition-colors hover:bg-[#ffd65c] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-unh-secondary"
            >
              Search
            </button>
            <Button type="submit" className={"rounded-full hover:ring-2 hover:ring-green-500 font-bold border border-unh-tertiary border-2 bg-white px-6 py-3 font-semibold text-unh-primary transition-colors hover:border-blue hover:text-unh-secondary hover:border-unh-primary font-bold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-unh-secondary"}>Submit</Button>
            <Button
  variant="outline"
  className="h-11 min-w-50 rounded-full border-2 border-[#3360c1] px-6 text-[15px] font-extrabold tracking-wide text-unh-primary uppercase transition-colors [--button-bg:white] [--button-bg-hover:var(--color-unh-primary)] [--button-bg-pressed:var(--color-unh-primary)] hover:border-unh-primary hover:text-unh-secondary hover:inset-ring-2 hover:inset-ring-white focus-visible:border-unh-primary focus-visible:text-unh-secondary focus-visible:inset-ring-2 focus-visible:inset-ring-white focus-visible:[--button-bg:var(--color-unh-primary)] dark:border-[#6b93e6] dark:text-white dark:[--button-bg:transparent] dark:[--button-bg-hover:var(--color-unh-secondary)] dark:[--button-bg-pressed:var(--color-unh-secondary)] dark:hover:border-unh-secondary dark:hover:text-unh-primary dark:hover:inset-ring-brand-deep dark:focus-visible:border-unh-secondary dark:focus-visible:text-unh-primary dark:focus-visible:inset-ring-brand-deep dark:focus-visible:[--button-bg:var(--color-unh-secondary)]"
>
  Request information
</Button>

<Button variant="outline" size="lg" className={"font-bold bg-white text-unh-primary border-unh-tertiary hover:border-unh-secondary focus:border-unh-tertiary hover:ring hover:ring-blue-500 hover:border-green"}>Submit</Button>
          </form>
        </div>
      </section>

       {/* Topics */}
       <section aria-labelledby="topics-heading" className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
         <div className="flex items-baseline justify-between gap-4">
           <h2 id="topics-heading" className="font-serif text-2xl text-unh-primary sm:text-3xl dark:text-white">
             Browse by topic
           </h2>
           <Link 
             href="/topics"
             className={`font-medium text-link underline decoration-2 underline-offset-4 ${focusRing}`}
           >
             All topics
           </Link>
         </div>
        {topics.length === 0 && (
          <p className="mt-6 text-slate-600 dark:text-slate-400">No topics yet. Add some to the topics collection.</p>
        )}
        <ul className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {topics.map((topic) => (
            <li key={topic.slug}>
              {/* The whole card is the link. HeroUI's Card is a <div>, so it sits inside <Link>;
                  rounded-3xl matches the card's corners so the focus ring follows them. */}
              <Link href={`/topics/${topic.slug}`} className={`group block h-full rounded-3xl ${focusRing}`}>
                <Card className="h-full border border-unh-primary-200 hover:bg-unh-tertiary/5 transition group-hover:-translate-y-0.5 group-hover:shadow-lg group-hover:shadow-unh-primary/10 motion-reduce:transition-none motion-reduce:group-hover:translate-y-0">
                  <CardHeader>
                    <span aria-hidden="true" className="mb-3 block h-1 w-10 rounded-full bg-unh-secondary" />
                    <CardTitle className="font-serif text-xl text-unh-primary group-hover:underline group-hover:decoration-unh-tertiary-light group-hover:underline-offset-4 dark:text-white">
                      {topic.title}
                    </CardTitle>
                    {topic.description && <CardDescription className="mt-1">{topic.description}</CardDescription>}
                  </CardHeader>
                  {topic.subtopics.length > 0 && (
                    <CardContent className="text-sm text-muted">
                      Includes {topic.subtopics.map((s) => s.title).join(", ")}
                    </CardContent>
                  )}
                  <CardFooter className="mt-auto text-sm font-medium text-muted">
                    {topic.articleCount} {topic.articleCount === 1 ? "article" : "articles"}
                  </CardFooter>
                </Card>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      {/* Recently updated */}
       <section
        aria-labelledby="recent-heading"
        className="border-t border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-unh-primary/40"
      >
        <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
          <h2 id="recent-heading" className="font-serif text-2xl text-unh-primary sm:text-3xl dark:text-white">
            Recently updated
          </h2>
          {recent.length === 0 && (
            <p className="mt-6 text-slate-600 dark:text-slate-400">No published articles yet.</p>
          )}
          <ul className="mt-6 divide-y divide-slate-200 overflow-hidden rounded-lg border border-slate-200 bg-white dark:divide-slate-700 dark:border-slate-700 dark:bg-unh-deep">
            {recent.map((article) => (
              <li key={article.slug}>
                <Link
                  href={`/articles/${article.slug}`}
                  className={`flex flex-col gap-1 px-5 py-4 transition-colors hover:bg-sky-50 sm:flex-row sm:items-center sm:justify-between dark:hover:bg-unh-primary ${focusRing} focus-visible:-outline-offset-2`}
                >
                  <span className="font-medium text-unh-primary dark:text-white">{article.title}<br/><span className="text-slate-400">{article.summary}</span></span>
                  <span className="text-sm text-slate-500 dark:text-slate-400">
                    {topicTitles.get(article.topicSlug) ?? article.topicSlug}, updated{" "}


                    <time dateTime={article.updated.toISOString()}>{formatDate(article.updated)}</time>                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </section>

    {/* //   Help  */}
       <section className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
         <div className="flex flex-col items-start gap-4 rounded-lg bg-unh-primary p-8 text-white sm:flex-row sm:items-center sm:justify-between">
           <div>
             <h2 className="font-serif text-2xl">Can’t find what you need?</h2>
             <p className="mt-1 text-slate-300">Our support team is happy to help.</p>
           </div>
           <Link
            href="/contact"
            className="shrink-0 rounded-md bg-unh-secondary px-5 py-3 font-semibold text-unh-primary transition-colors hover:bg-[#ffd65c] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-unh-secondary"
          >
            Contact support
          </Link>
        </div>
      </section>
    </main>
  );
}
