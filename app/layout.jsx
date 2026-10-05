import '@fontsource-variable/newsreader/opsz.css';
import '@fontsource-variable/newsreader/opsz-italic.css';
import '@fontsource-variable/instrument-sans';
import './globals.css';

import Masthead from '@/components/Masthead';
import Footer from '@/components/Footer';
import Banner from '@/components/Banner';
import { getContent } from '@/lib/content';
import { getSite } from '@/lib/config';
import { toBanner } from '@/lib/markdown';

export async function generateMetadata() {
  await getContent(); // request-time, so SITE_* env vars apply without rebuilding
  const site = getSite();
  return {
    title: { template: `%s | ${site.name}`, default: site.name },
    description: site.description,
    metadataBase: site.baseUrl ? new URL(site.baseUrl) : undefined,
    openGraph: { siteName: site.name, type: 'website' },
  };
}

export const viewport = { width: 'device-width', initialScale: 1 };

export default async function RootLayout({ children }) {
  const content = await getContent();
  const site = getSite();
  return (
    <html lang={site.lang}>
      <body>
        <a className="skip-link" href="#main">Skip to content</a>
        <Masthead siteName={site.name} />
        {site.banner && (
          <div className="site-banner">
            <Banner banner={toBanner(site.banner)} />
          </div>
        )}
        {children}
        <Footer categories={content.categoryList()} text={site.footer || site.name} />
      </body>
    </html>
  );
}
