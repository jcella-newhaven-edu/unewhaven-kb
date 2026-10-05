import { headers } from 'next/headers';
import { getContent } from '@/lib/content';
import { getSite } from '@/lib/config';

export default async function sitemap() {
  const content = await getContent();
  let base = getSite().baseUrl;
  if (!base) {
    const h = await headers();
    base = `${h.get('x-forwarded-proto') || 'http'}://${h.get('x-forwarded-host') || h.get('host')}`;
  }
  return [
    { url: `${base}/` },
    ...content.allCategories().map((c) => ({ url: base + c.url })),
    ...content.allArticles().map((a) => ({ url: base + a.url, lastModified: a.updated })),
  ];
}
