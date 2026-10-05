import Link from 'next/link';
import { notFound } from 'next/navigation';
import ArticleList from '@/components/ArticleList';
import { getContent } from '@/lib/content';

export async function generateMetadata({ params }) {
  const tag = (await getContent()).tag((await params).tag);
  return tag ? { title: `Tagged “${tag.name}”` } : {};
}

export default async function TagPage({ params }) {
  const tag = (await getContent()).tag((await params).tag);
  if (!tag) notFound();

  return (
    <main id="main" className="page">
      <nav className="crumbs" aria-label="Breadcrumb"><Link href="/">Home</Link></nav>
      <h1>Tagged “{tag.name}”</h1>
      <p className="page-lede">{tag.articles.length} {tag.articles.length === 1 ? 'article' : 'articles'}</p>
      <ArticleList items={tag.articles} showCategory />
    </main>
  );
}
