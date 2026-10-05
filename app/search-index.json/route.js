import { getContent } from '@/lib/content';

// Written to out/search-index.json at build time; the browser downloads it when someone searches.
export const dynamic = 'force-static';

export async function GET() {
  const content = await getContent();
  return Response.json({ documents: content.searchDocuments() });
}
