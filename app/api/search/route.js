import { getContent } from '@/lib/content';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get('q') || '';
  const limit = Math.min(Math.max(Number(searchParams.get('limit')) || 8, 1), 25);
  const content = await getContent();
  const results = content.search(q, limit).map(({ article }) => ({
    title: article.title,
    url: article.url,
    category: article.category.trail.map((c) => c.title).join(' › '),
    summary: article.summary,
  }));
  return Response.json({ query: q, results }, { headers: { 'Cache-Control': 'public, max-age=60' } });
}
