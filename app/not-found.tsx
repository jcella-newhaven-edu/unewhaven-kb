import Link from "next/link";
import { getRecentArticles } from "@/lib/data/articles";

// Shown when a page calls notFound() (e.g. an article that doesn't exist) and for any URL
// that matches no route. Renders inside the root layout, so the navbar and footer stay.
export default async function NotFound() {
  const suggestions = await getRecentArticles(4);

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-16 sm:px-6 sm:py-24">
      <p className="text-xl font-semibold uppercase tracking-wider text-unh-tertiary dark:text-unh-tertiary-light">
        404
      </p>
      <h1 className="mt-2 font-serif text-4xl tracking-tight text-unh-primary sm:text-5xl dark:text-white">
        We couldn’t find that page
      </h1>
      <p className="mt-4 text-lg text-slate-600 dark:text-slate-300">
        It may have been moved or renamed, or the link may be mistyped.
      </p>

      <div className="mt-8 flex flex-wrap gap-3">
        <Link
          href="/"
          className="rounded-md bg-unh-primary px-5 py-3 font-semibold text-white transition-colors hover:bg-unh-primary/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus dark:bg-unh-secondary dark:text-unh-primary dark:hover:bg-unh-secondary-dark"
        >
          Go to the home page
        </Link>
        <Link
          href="/topics"
          className="rounded-md border border-slate-300 px-5 py-3 font-semibold text-unh-primary transition-colors hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus dark:border-slate-600 dark:text-white dark:hover:bg-white/5"
        >
          Browse topics
        </Link>
      </div>

      {suggestions.length > 0 && (
        <section aria-labelledby="suggestions-heading" className="mt-14 border-t border-slate-200 pt-8 dark:border-slate-700">
          <h2 id="suggestions-heading" className="font-serif text-xl text-unh-primary dark:text-white">
            Recently updated articles
          </h2>
          <ul className="mt-4 space-y-3">
            {suggestions.map((a) => (
              <li key={a.slug}>
                <Link
                  href={`/articles/${a.slug}`}
                  className="font-medium text-link underline decoration-2 underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
                >
                  {a.title}
                </Link>
                {a.summary && <p className="text-sm text-slate-600 dark:text-slate-400">{a.summary}</p>}
              </li>
            ))}
          </ul>
        </section>
      )}
    </main>
  );
}
