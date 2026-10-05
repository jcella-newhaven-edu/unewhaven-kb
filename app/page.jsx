import Link from 'next/link';
import SearchBox from '@/components/SearchBox';
import ArticleList from '@/components/ArticleList';
import { getContent } from '@/lib/content';
import { getSite } from '@/lib/config';

export default async function HomePage() {
  const content = await getContent();
  const site = getSite();
  const categories = content.categoryList();

  return (
    <main id="main">
      <section className="hero">
        <h1>{site.tagline}</h1>
        <p className="hero-lede">{site.description}</p>
        <SearchBox variant="hero" />
        <p className="hero-hint">Press <kbd>/</kbd> on any page to jump to search.</p>
      </section>

      {categories.length === 0 ? (
        <section className="empty">
          <h2>No articles yet</h2>
          <p>
            Add Markdown files to a folder inside the content directory, such as{' '}
            <code>content/getting-started/welcome.md</code>. They appear here automatically.
          </p>
        </section>
      ) : (
        <>
          <section className="shelf" aria-labelledby="browse-heading">
            <h2 id="browse-heading" className="section-heading">Browse by topic</h2>
            <div className="shelf-grid">
              {categories.map((c) => (
                <section className="shelf-item" key={c.slug}>
                  <h3><Link href={c.url}>{c.title}</Link></h3>
                  {c.description && <p>{c.description}</p>}
                  <ul>
                    {/* Subtopics first, then the topic's own articles, up to five links. */}
                    {[...c.children, ...c.articles].slice(0, 5).map((item) =>
                      item.children ? (
                        <li key={item.path} className="shelf-subtopic">
                          <Link href={item.url}>{item.title}</Link>{' '}
                          <span className="shelf-count">
                            {item.totalArticles} {item.totalArticles === 1 ? 'article' : 'articles'}
                          </span>
                        </li>
                      ) : (
                        <li key={item.key}><Link href={item.url}>{item.title}</Link></li>
                      ),
                    )}
                  </ul>
                  {c.children.length + c.articles.length > 5 && (
                    <Link className="shelf-more" href={c.url}>See all {c.totalArticles} articles</Link>
                  )}
                </section>
              ))}
            </div>
          </section>

          <section className="recent" aria-labelledby="recent-heading">
            <h2 id="recent-heading" className="section-heading">Recently updated</h2>
            <ArticleList items={content.recent(6)} showCategory />
          </section>
        </>
      )}
    </main>
  );
}
