import { notFound } from 'next/navigation';
import ArticleView from '@/components/ArticleView';
import CategoryView from '@/components/CategoryView';
import { getContent } from '@/lib/content';
import { getSite } from '@/lib/config';

// One route for every topic and article at any depth, e.g.
//   /deployment                    -> topic
//   /deployment/docker             -> subtopic
//   /deployment/docker/compose     -> article
async function resolve(params) {
  const { path } = await params;
  return (await getContent()).resolve(path);
}

export async function generateMetadata({ params }) {
  const match = await resolve(params);
  if (!match) return {};
  const canonical = getSite().baseUrl ? { canonical: (match.category || match.article).url } : undefined;

  if (match.type === 'category') {
    const { category } = match;
    return { title: category.title, description: category.description || undefined, alternates: canonical };
  }
  const { article } = match;
  return {
    title: article.title,
    description: article.summary,
    alternates: canonical,
    openGraph: { title: article.title, description: article.summary, type: 'article' },
  };
}

export default async function ContentPage({ params }) {
  const match = await resolve(params);
  if (!match) notFound();
  return match.type === 'category'
    ? <CategoryView category={match.category} />
    : <ArticleView article={match.article} />;
}
