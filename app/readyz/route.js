import { getContent } from '@/lib/content';

// Readiness: content has loaded and the search index is built.
export async function GET() {
  try {
    const content = await getContent();
    return new Response(`ready (${content.articles.size} articles)`, {
      headers: { 'Content-Type': 'text/plain', 'Cache-Control': 'no-store' },
    });
  } catch {
    return new Response('content unavailable', { status: 503, headers: { 'Cache-Control': 'no-store' } });
  }
}
