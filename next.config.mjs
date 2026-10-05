/** @type {import('next').NextConfig} */
const isProd = process.env.NODE_ENV === 'production';

// Next.js injects small inline scripts for hydration, so scripts need 'unsafe-inline'
// unless you add nonce-based CSP via a proxy. Article HTML is sanitized server-side.
const csp = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: https:",
  "font-src 'self'",
  "connect-src 'self'",
  "frame-ancestors 'self'",
  "base-uri 'self'",
  "form-action 'self'",
].join('; ');

const nextConfig = {
  output: 'standalone',
  poweredByHeader: false,
  reactStrictMode: true,
  serverExternalPackages: ['sanitize-html', 'highlight.js', 'gray-matter'],
  async headers() {
    const security = [
      { key: 'X-Content-Type-Options', value: 'nosniff' },
      { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
      { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
      { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
    ];
    if (isProd) security.push({ key: 'Content-Security-Policy', value: csp });
    return [{ source: '/:path*', headers: security }];
  },
};

export default nextConfig;
