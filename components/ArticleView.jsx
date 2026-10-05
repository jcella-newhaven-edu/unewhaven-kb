import Link from 'next/link';
import Banner from './Banner';
import Breadcrumbs from './Breadcrumbs';
import TopicTree from './TopicTree';
import { getSite, formatDate } from '@/lib/config';

export function TableOfContents({ headings }) {
  if (headings.length < 2) return null;
  return (
    <aside className="doc-toc" aria-labelledby="toc-heading">
      <p id="toc-heading" className="doc-toc-title">On this page</p>
      <ul>
        {headings.map((h) => (
          <li key={h.id} className={`toc-level-${h.level}`}><a href={`#${h.id}`}>{h.text}</a></li>
        ))}
      </ul>
    </aside>
  );
}

export default function ArticleView({ article }) {
  const { category } = article;
  const site = getSite();

  return (
    <main id="main" className="doc">
      <article className="doc-body">
        <Breadcrumbs trail={category.trail} />
        <h1>{article.title}</h1>
        <p className="doc-meta">
          Updated <time dateTime={article.updated.toISOString()}>{formatDate(article.updated)}</time>,{' '}
          {article.readingMinutes} min read
        </p>
        {article.tags.length > 0 && (
          <ul className="tags" aria-label="Tags">
            {article.tags.map((t) => (
              <li key={t.slug}><Link href={`/tags/${t.slug}`}>{t.name}</Link></li>
            ))}
          </ul>
        )}

        <Banner banner={article.banner} className="doc-banner" />

        {/* Rendered from Markdown and sanitized on the server (lib/markdown.js). */}
        <div className="prose" dangerouslySetInnerHTML={{ __html: article.html }} />

        <footer className="doc-foot">
          {site.editUrl && (
            <p><a href={site.editUrl + article.sourcePath} rel="noopener">Suggest an edit to this article</a></p>
          )}
          {(article.prev || article.next) && (
            <nav className="pager" aria-label={`More in ${category.trail[0].title}`}>
              {article.prev && (
                <Link className="pager-prev" href={article.prev.url}><span>Previous</span>{article.prev.title}</Link>
              )}
              {article.next && (
                <Link className="pager-next" href={article.next.url}><span>Next</span>{article.next.title}</Link>
              )}
            </nav>
          )}
        </footer>
      </article>

      <TopicTree root={category.trail[0]} current={article.key} />
      <TableOfContents headings={article.headings} />
    </main>
  );
}
