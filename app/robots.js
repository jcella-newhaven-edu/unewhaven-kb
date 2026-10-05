import { headers } from 'next/headers';
import { getSite } from '@/lib/config';

export default async function robots() {
  let base = getSite().baseUrl;
  if (!base) {
    const h = await headers();
    base = `${h.get('x-forwarded-proto') || 'http'}://${h.get('x-forwarded-host') || h.get('host')}`;
  }
  return { rules: { userAgent: '*', allow: '/' }, sitemap: `${base}/sitemap.xml` };
}
