import { getSite } from '@/lib/config';

export const dynamic = 'force-static';

export default function robots() {
  const base = getSite().baseUrl;
  return { rules: { userAgent: '*', allow: '/' }, sitemap: base ? `${base}/sitemap.xml` : undefined };
}
