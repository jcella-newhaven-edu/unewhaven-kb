import type { Metadata } from "next";
import Link from "next/link";
import { Breadcrumbs } from "@heroui/react";
import { getAllArticles } from "@/lib/data/articles";

export const metadata: Metadata = { title: "All articles" };

const formatDate = (date: Date) =>
  new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" }).format(date);

// Layout and type styles match the article page (app/articles/[slug]/page.tsx).
export default async function ArticlesPage() {
  const articles = await getAllArticles();

  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-10 sm:px-6">
      <Breadcrumbs>
        <Breadcrumbs.Item href="/">Home</Breadcrumbs.Item>
        <Breadcrumbs.Item>Articles</Breadcrumbs.Item>
      </Breadcrumbs>

      <div className="mt-6 max-w-prose">
        <h1 className="font-serif text-4xl tracking-tight text-unh-primary sm:text-5xl dark:text-white">All articles</h1>
        <p className="mt-4 text-xl text-slate-600 dark:text-slate-300">Every published guide and how-to, A to Z.</p>

        {articles.length === 0 ? (
          <p className="mt-8 border-t border-slate-200 pt-6 text-slate-600 dark:border-slate-700 dark:text-slate-400">
            No articles published yet.
          </p>
        ) : (
          <ul className="mt-8 divide-y divide-slate-200 border-t border-slate-200 dark:divide-slate-700 dark:border-slate-700">
            {articles.map((a) => (
              <li key={a.slug} className="py-6">
                <h2 className="font-serif text-2xl text-unh-primary dark:text-white">
                  <Link
                    href={`/articles/${a.slug}`}
                    className="rounded-sm hover:underline hover:decoration-2 hover:underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
                  >
                    {a.title}
                  </Link>
                </h2>
                {a.summary && <p className="mt-2 text-slate-600 dark:text-slate-300">{a.summary}</p>}
                <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                  Last Updated <time dateTime={a.updated.toISOString()}>{formatDate(a.updated)}</time>
                </p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </main>
  );
}
