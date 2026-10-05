import Link from 'next/link';
import ArticleList from '@/components/ArticleList';
import { getContent } from '@/lib/content';

const readQuery = async (searchParams) => {
  const q = (await searchParams).q;
  return String(Array.isArray(q) ? q[0] : q || '').trim();
};

export async function generateMetadata({ searchParams }) {
  const q = await readQuery(searchParams);
  return { title: q ? `Search: ${q}` : 'Search', robots: { index: false } };
}

export default async function SearchPage({ searchParams }) {
  const q = await readQuery(searchParams);
  const content = await getContent();
  const results = q ? content.search(q, 30) : [];

  return (
    <main id="main" className="page">
      {!q ? (
        <>
          <h1>Search</h1>
          <p className="page-lede">Type a word or phrase in the search box above.</p>
        </>
      ) : results.length === 0 ? (
        <>
          <h1>No results for “{q}”</h1>
          <p className="page-lede">Check the spelling, try a shorter phrase, or browse a topic below.</p>
          <ul className="topic-links">
            {content.categoryList().map((c) => (
              <li key={c.slug}><Link href={c.url}>{c.title}</Link></li>
            ))}
          </ul>
        </>
      ) : (
        <>
          <h1>Results for “{q}”</h1>
          <p className="page-lede">{results.length} {results.length === 1 ? 'article' : 'articles'} found</p>
          <ArticleList items={results} showCategory />
        </>
      )}
    </main>
  );
}
