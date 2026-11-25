import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { ChevronRightIcon, MagnifyingGlassIcon } from "@heroicons/react/24/outline";
import { Breadcrumbs, Button } from "@heroui/react";
import { searchArticles } from "@/lib/data/search";
import styles from "../browse.module.css";

export const metadata: Metadata = { title: "Search" };

// searchParams is read inside <Suspense> so the page shell is prerendered and results stream in.
async function Results({ searchParams }: Pick<PageProps<"/search">, "searchParams">) {
  const { q } = await searchParams;
  const query = (Array.isArray(q) ? q[0] : q)?.trim() ?? "";

  if (!query) {
    return <p className={styles.status}>Type a word or two above to search every article.</p>;
  }

  const results = await searchArticles(query, 50);

  return (
    <>
      <p className={styles.status} role="status">
        {results.length === 0
          ? `No articles match “${query}”.`
          : `${results.length} ${results.length === 1 ? "article matches" : "articles match"} “${query}”`}
      </p>
      {results.length > 0 && (
        <ul className={styles.list}>
          {results.map((r) => (
            <li key={r.slug} className={styles.listItem}>
              <Link href={`/articles/${r.slug}`} className={styles.row}>
                <div className={styles.rowText}>
                  <h2 className={styles.rowTitle}>{r.title}</h2>
                  {r.summary && <p className={styles.summary}>{r.summary}</p>}
                </div>
                <ChevronRightIcon aria-hidden="true" className={styles.arrow} />
              </Link>
              <Link href={`/topics/${r.topicSlug}`} className={styles.meta}>
                {r.topicTitle}
              </Link>
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
    <form action="/search" method="get" role="search" className={styles.form}>
      <label htmlFor="search-q" className="sr-only">
        Search articles
      </label>
      <div className={styles.field}>
        <MagnifyingGlassIcon aria-hidden="true" className={styles.searchIcon} />
        <input
          id="search-q"
          name="q"
          type="search"
          defaultValue={defaultValue}
          placeholder="Search articles…"
          autoComplete="off"
          className={styles.input}
        />
      </div>
      <Button type="submit" className={styles.searchButton}>
        Search
      </Button>
    </form>
  );
}

export default function SearchPage({ searchParams }: PageProps<"/search">) {
  return (
    <main className={`kb-shell ${styles.shell}`}>
      <Breadcrumbs>
        <Breadcrumbs.Item href="/">Home</Breadcrumbs.Item>
        <Breadcrumbs.Item>Search</Breadcrumbs.Item>
      </Breadcrumbs>

      <h1 className={styles.heading}>Search</h1>
      <Suspense fallback={<SearchForm defaultValue="" />}>
        <QueryBox searchParams={searchParams} />
      </Suspense>
      <Suspense fallback={<p className={styles.status}>Searching…</p>}>
        <Results searchParams={searchParams} />
      </Suspense>
    </main>
  );
}
