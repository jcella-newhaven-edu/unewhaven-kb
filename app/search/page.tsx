import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Breadcrumbs } from "@heroui/react";
import { searchArticles } from "@/lib/data/search";

export const metadata: Metadata = { title: "Search" };

const focusRing = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus";

// searchParams is read inside <Suspense> so the page shell is prerendered and results stream in.
async function Results({ searchParams }: Pick<PageProps<"/search">, "searchParams">) {
  const { q } = await searchParams;
  const query = (Array.isArray(q) ? q[0] : q)?.trim() ?? "";

  if (!query) {
    return <p className="mt-8 text-slate-600 dark:text-slate-400">Type a word or two above to search every article.</p>;
  }

  const results = await searchArticles(query, 50);

  return (
    <>
      <p className="mt-8 text-sm text-slate-500 dark:text-slate-400" role="status">
        {results.length === 0
          ? `No articles match “${query}”.`
          : `${results.length} ${results.length === 1 ? "article matches" : "articles match"} “${query}”`}
      </p>
      {results.length > 0 && (
        <ul className="mt-4 divide-y divide-slate-200 border-t border-slate-200 dark:divide-slate-700 dark:border-slate-700">
          {results.map((r) => (
            <li key={r.slug} className="py-6">
              <h2 className="font-serif text-2xl text-unh-primary dark:text-white">
                <Link href={`/articles/${r.slug}`} className={`rounded-sm hover:underline hover:decoration-2 hover:underline-offset-4 ${focusRing}`}>
                  {r.title}
                </Link>
              </h2>
              {r.summary && <p className="mt-2 text-slate-600 dark:text-slate-300">{r.summary}</p>}
              <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                <Link href={`/topics/${r.topicSlug}`} className={`rounded-sm hover:text-link hover:underline ${focusRing}`}>
                  {r.topicTitle}
                </Link>
              </p>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

// The query box. Reads searchParams too, so it also sits inside <Suspense>.
async function QueryBox({ searchParams }: Pick<PageProps<"/search">, "searchParams">) {
  const { q } = await searchParams;
  return <SearchForm defaultValue={(Array.isArray(q) ? q[0] : q) ?? ""} />;
}

// A plain GET form, so search works without JavaScript and results pages can be shared.
function SearchForm({ defaultValue }: { defaultValue: string }) {
  return (
    <form action="/search" method="get" role="search" className="mt-6 flex gap-3">
      <label htmlFor="search-q" className="sr-only">
        Search articles
      </label>
      <input
        id="search-q"
        name="q"
        type="search"
        defaultValue={defaultValue}
        placeholder="Search articles…"
        autoComplete="off"
        className="min-w-0 flex-1 rounded-md border border-slate-300 bg-white px-4 py-2.5 text-foreground placeholder:text-slate-400 focus:border-unh-tertiary focus:outline-2 focus:outline-offset-0 focus:outline-focus dark:border-slate-600 dark:bg-unh-primary"
      />
      <button
        type="submit"
        className={`rounded-md bg-unh-primary px-5 py-2.5 font-semibold text-white transition-colors hover:bg-unh-primary/90 dark:bg-unh-secondary dark:text-unh-primary dark:hover:bg-unh-secondary-dark ${focusRing}`}
      >
        Search
      </button>
    </form>
  );
}

export default function SearchPage({ searchParams }: PageProps<"/search">) {
  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-10 sm:px-6">
      <Breadcrumbs>
        <Breadcrumbs.Item href="/">Home</Breadcrumbs.Item>
        <Breadcrumbs.Item>Search</Breadcrumbs.Item>
      </Breadcrumbs>

      <div className="mt-6 max-w-prose">
        <h1 className="font-serif text-4xl tracking-tight text-unh-primary sm:text-5xl dark:text-white">Search</h1>
        <Suspense fallback={<SearchForm defaultValue="" />}>
          <QueryBox searchParams={searchParams} />
        </Suspense>
        <Suspense fallback={<p className="mt-8 text-slate-500">Searching…</p>}>
          <Results searchParams={searchParams} />
        </Suspense>
      </div>
    </main>
  );
}
