import type { Metadata } from "next";
import Link from "next/link";
import { Breadcrumbs } from "@heroui/react";
import { getTopics } from "@/lib/data/topics";

export const metadata: Metadata = { title: "All topics" };

const focusRing = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus";
const count = (n: number) => `${n} ${n === 1 ? "article" : "articles"}`;

// Every topic with its subtopics. Layout and type styles match the All articles page.
export default async function TopicsPage() {
  const topics = await getTopics();

  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-10 sm:px-6">
      <Breadcrumbs>
        <Breadcrumbs.Item href="/">Home</Breadcrumbs.Item>
        <Breadcrumbs.Item>Topics</Breadcrumbs.Item>
      </Breadcrumbs>

      <div className="mt-6 max-w-prose">
        <h1 className="font-serif text-4xl tracking-tight text-unh-primary sm:text-5xl dark:text-white">All topics</h1>
        <p className="mt-4 text-xl text-slate-600 dark:text-slate-300">Browse guides and how-tos by subject.</p>

        {topics.length === 0 ? (
          <p className="mt-8 border-t border-slate-200 pt-6 text-slate-600 dark:border-slate-700 dark:text-slate-400">
            No topics yet.
          </p>
        ) : (
          <ul className="mt-8 divide-y divide-slate-200 border-t border-slate-200 dark:divide-slate-700 dark:border-slate-700">
            {topics.map((t) => (
              <li key={t.slug} className="py-6">
                <h2 className="font-serif text-2xl text-unh-primary dark:text-white">
                  <Link
                    href={`/topics/${t.slug}`}
                    className={`rounded-sm hover:underline hover:decoration-2 hover:underline-offset-4 ${focusRing}`}
                  >
                    {t.title}
                  </Link>
                </h2>
                {t.description && <p className="mt-2 text-slate-600 dark:text-slate-300">{t.description}</p>}
                <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">{count(t.articleCount)}</p>

                {t.subtopics.length > 0 && (
                  <ul aria-label={`${t.title} subtopics`} className="mt-4 space-y-2 border-l-2 border-slate-200 pl-4 dark:border-slate-700">
                    {t.subtopics.map((s) => (
                      <li key={s.slug} className="flex flex-wrap items-baseline gap-x-2">
                        <Link href={`/topics/${s.slug}`} className={`rounded-sm font-medium text-link hover:underline ${focusRing}`}>
                          {s.title}
                        </Link>
                        <span className="text-sm text-slate-500 dark:text-slate-400">{count(s.articleCount)}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </main>
  );
}
