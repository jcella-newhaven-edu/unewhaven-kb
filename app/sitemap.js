import { getContent } from '@/lib/content';
import { getSite } from '@/lib/config';

export const dynamic = 'force-static';

// Needs BASE_URL (set automatically by the GitHub Pages workflow) for absolute URLs.
export default async function sitemap() {
  const content = await getContent();
  const base = getSite().baseUrl;
  return [
    { url: `${base}/` },
    ...content.allCategories().map((c) => ({ url: base + c.url })),
    ...content.allArticles().map((a) => ({ url: base + a.url, lastModified: a.updated })),
  ];
}
