import { Suspense } from 'react';
import SearchResults from '@/components/SearchResults';
import { getContent } from '@/lib/content';
import { getSite } from '@/lib/config';

export const metadata = { title: 'Search', robots: { index: false } };

// The page itself is static; results are computed in the browser from search-index.json.
export default async function SearchPage() {
  const content = await getContent();
  const topics = content.categoryList().map((c) => ({ title: c.title, url: c.url }));
  return (
    <main id="main" className="page">
      <Suspense fallback={<h1>Search</h1>}>
        <SearchResults topics={topics} locale={getSite().locale} siteName={getSite().name} />
      </Suspense>
    </main>
  );
}
