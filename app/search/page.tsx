import type { Metadata } from "next";
import { Suspense } from "react";
import { MagnifyingGlassIcon } from "@heroicons/react/24/outline";
import { Breadcrumbs, Button } from "@heroui/react";
import { searchArticles } from "@/lib/data/search";
import ArticleCardList from "../article-card-list";
import { browseFocus, browseStyles as styles } from "../browse-styles";

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
      {results.length > 0 && <ArticleCardList articles={results} className="mt-6" />}
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
    <form action="/search" method="get" role="search" className="mt-5.5 flex max-w-[35rem] items-stretch gap-2.5">
      <label htmlFor="search-q" className="sr-only">
        Search articles
      </label>
      <div className="flex min-w-0 flex-1 items-center gap-2.5 rounded-[0.625rem] border border-kb-line bg-background px-3 focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-focus">
        <MagnifyingGlassIcon aria-hidden="true" className="size-4.5 flex-none text-kb-muted" />
        <input
          id="search-q"
          name="q"
          type="search"
          defaultValue={defaultValue}
          placeholder="Search articles…"
          autoComplete="off"
          className="min-w-0 w-full py-2.75 text-base text-foreground outline-none placeholder:text-kb-muted"
        />
      </div>
      <Button
        type="submit"
        className={`h-auto min-h-11 rounded-[0.625rem] bg-unh-secondary font-bold text-unh-primary hover:bg-unh-secondary-dark data-[hovered]:bg-unh-secondary-dark ${browseFocus}`}
      >
        Search
      </Button>
    </form>
  );
}

export default function SearchPage({ searchParams }: PageProps<"/search">) {
  return (
    <main className={styles.shell}>
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
