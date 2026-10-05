import Link from 'next/link';
import SearchBox from '@/components/SearchBox';

export const metadata = { title: 'Page not found' };

export default function NotFound() {
  return (
    <main id="main" className="page page-error">
      <h1>This page doesn’t exist</h1>
      <p className="page-lede">The link may be out of date, or the article may have moved. Try searching for it instead.</p>
      <SearchBox variant="hero" />
      <p><Link href="/">Go to the home page</Link></p>
    </main>
  );
}
