import Link from 'next/link';
import ArticleList from './ArticleList';
import Banner from './Banner';
import Breadcrumbs from './Breadcrumbs';
import TopicTree from './TopicTree';
import { TableOfContents } from './ArticleView';
import { getSite } from '@/lib/config';

const count = (n) => `${n} ${n === 1 ? 'article' : 'articles'}`;

export default function CategoryView({ category }) {
  const { intro } = category;
  const site = getSite();

  return (
    <main id="main" className="doc">
      <div className="doc-body">
        <Breadcrumbs trail={category.trail} includeLast={false} />
        <h1>{category.title}</h1>
        {category.description && !intro && <p className="page-lede">{category.description}</p>}

        {intro && (
          <>
            <Banner banner={intro.banner} className="doc-banner" />
            <div className="prose topic-intro" dangerouslySetInnerHTML={{ __html: intro.html }} />
            {site.editUrl && (
              <p className="topic-edit"><a href={site.editUrl + intro.sourcePath} rel="noopener">Suggest an edit to this page</a></p>
            )}
          </>
        )}

        {category.children.length > 0 && (
          <section className="subtopics" aria-labelledby="subtopics-heading">
            <h2 id="subtopics-heading" className="section-heading">Topics</h2>
            <ul>
              {category.children.map((child) => (
                <li key={child.path}>
                  <Link className="subtopic-title" href={child.url}>{child.title}</Link>
                  {child.description && <p>{child.description}</p>}
                  <p className="subtopic-meta">{count(child.totalArticles)}</p>
                </li>
              ))}
            </ul>
          </section>
        )}

        {category.articles.length > 0 && (
          <section aria-label="Articles">
            {category.children.length > 0 && <h2 className="section-heading">Articles</h2>}
            <ArticleList items={category.articles} />
          </section>
        )}
      </div>

      <TopicTree root={category.trail[0]} current={category.path} />
      {intro && <TableOfContents headings={intro.headings} />}
    </main>
  );
}
