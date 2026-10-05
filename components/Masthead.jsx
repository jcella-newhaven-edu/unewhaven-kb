'use client';

import { Suspense, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import SearchBox from './SearchBox';

function HeaderSearch() {
  const params = useSearchParams();
  return <SearchBox variant="compact" defaultValue={params.get('q') || ''} />;
}

export default function Masthead({ siteName }) {
  const pathname = usePathname();
  const isHome = pathname === '/';

  // "/" anywhere on the page focuses the first search box.
  useEffect(() => {
    const onKey = (e) => {
      const t = e.target;
      const editing = t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName);
      if (e.key !== '/' || e.ctrlKey || e.metaKey || e.altKey || editing) return;
      const input = document.querySelector('[data-search-input]');
      if (!input) return;
      e.preventDefault();
      input.focus();
      input.select();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  return (
    <header className={`masthead${isHome ? ' masthead--home' : ''}`}>
      <div className="masthead-inner">
        <Link className="brand" href="/">{siteName}</Link>
        {!isHome && (
          <Suspense fallback={<SearchBox variant="compact" />}>
            <HeaderSearch />
          </Suspense>
        )}
      </div>
    </header>
  );
}
