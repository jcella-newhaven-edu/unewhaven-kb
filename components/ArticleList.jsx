import Link from 'next/link';
import { formatDate } from '@/lib/config';

/** items: articles, or search results shaped { article, snippet }. */
export default function ArticleList({ items, showCategory = false }) {
  return (
    <ul className="article-list">
      {items.map((item) => {
        const a = item.article || item;
        return (
          <li key={a.key}>
            <Link className="article-list-title" href={a.url}>{a.title}</Link>
            <p className="article-list-text">
              {item.snippet
                ? item.snippet.map((s, i) => (s.match ? <mark key={i}>{s.text}</mark> : s.text))
                : a.summary}
            </p>
            <p className="article-list-meta">
              {showCategory && (
                <>
                  <Link href={a.category.url}>{a.category.trail.map((c) => c.title).join(' › ')}</Link>,{' '}
                </>
              )}
              updated <time dateTime={a.updated.toISOString()}>{formatDate(a.updated)}</time>
            </p>
          </li>
        );
      })}
    </ul>
  );
}
