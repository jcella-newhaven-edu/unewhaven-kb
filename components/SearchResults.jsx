'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { loadSearch } from '@/lib/search-core';

export default function SearchResults({ topics, locale, siteName }) {
  const q = (useSearchParams().get('q') || '').trim();
  const [state, setState] = useState({ status: 'idle', results: [] });

  useEffect(() => {
    document.title = q ? `Search: ${q} | ${siteName}` : `Search | ${siteName}`;
    if (!q) {
      setState({ status: 'idle', results: [] });
      return;
    }
    let cancelled = false;
    setState((s) => ({ ...s, status: 'loading' }));
    loadSearch()
      .then((search) => !cancelled && setState({ status: 'ready', results: search(q, 30) }))
      .catch(() => !cancelled && setState({ status: 'error', results: [] }));
    return () => {
      cancelled = true;
    };
  }, [q, siteName]);

  const format = (iso) => new Intl.DateTimeFormat(locale, { year: 'numeric', month: 'short', day: 'numeric' }).format(new Date(iso));
  const { status, results } = state;

  if (!q) {
    return (
      <>
        <h1>Search</h1>
        <p className="page-lede">Type a word or phrase in the search box above.</p>
      </>
    );
  }
  if (status === 'loading' || status === 'idle') {
    return (
      <>
        <h1>Results for “{q}”</h1>
        <p className="page-lede" aria-live="polite">Searching…</p>
      </>
    );
  }
  if (status === 'error') {
    return (
      <>
        <h1>Search isn’t available right now</h1>
        <p className="page-lede">The search index couldn’t be loaded. Reload the page to try again, or browse a topic below.</p>
        <TopicLinks topics={topics} />
      </>
    );
  }
  if (!results.length) {
    return (
      <>
        <h1>No results for “{q}”</h1>
        <p className="page-lede">Check the spelling, try a shorter phrase, or browse a topic below.</p>
        <TopicLinks topics={topics} />
      </>
    );
  }
  return (
    <>
      <h1>Results for “{q}”</h1>
      <p className="page-lede" aria-live="polite">
        {results.length} {results.length === 1 ? 'article' : 'articles'} found
      </p>
      <ul className="article-list">
        {results.map(({ doc, snippet }) => (
          <li key={doc.id}>
            <Link className="article-list-title" href={doc.url}>{doc.title}</Link>
            <p className="article-list-text">
              {snippet.map((s, i) => (s.match ? <mark key={i}>{s.text}</mark> : s.text))}
            </p>
            <p className="article-list-meta">
              {doc.trail}, updated <time dateTime={doc.updated}>{format(doc.updated)}</time>
            </p>
          </li>
        ))}
      </ul>
    </>
  );
}

function TopicLinks({ topics }) {
  return (
    <ul className="topic-links">
      {topics.map((t) => (
        <li key={t.url}><Link href={t.url}>{t.title}</Link></li>
      ))}
    </ul>
  );
}
