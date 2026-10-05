import { notFound } from 'next/navigation';
import ArticleView from '@/components/ArticleView';
import CategoryView from '@/components/CategoryView';
import { getContent } from '@/lib/content';
import { getSite } from '@/lib/config';

// One route for every topic and article at any depth, e.g.
//   /deployment                    -> topic
//   /deployment/docker             -> subtopic
//   /deployment/docker/compose     -> article
// Every topic and article is generated at build time; anything else is a 404 on GitHub Pages.
// (dynamicParams is left at its default so articles added during `npm run dev` appear immediately.)

export async function generateStaticParams() {
  const content = await getContent();
  const paths = [...content.allCategories().map((c) => c.path), ...content.allArticles().map((a) => a.key)];
  // A static export must generate at least one page; with no content, emit a placeholder that 404s.
  return paths.length ? paths.map((p) => ({ path: p.split('/') })) : [{ path: ['_empty'] }];
}

async function resolve(params) {
  const { path } = await params;
  return (await getContent()).resolve(path);
}

export async function generateMetadata({ params }) {
  const match = await resolve(params);
  if (!match) return {};
  const { baseUrl } = getSite();
  const canonical = baseUrl ? { canonical: baseUrl + (match.category || match.article).url } : undefined;

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
