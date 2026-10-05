// Static export for GitHub Pages: `next build` writes a plain HTML site to ./out.
//
// BASE_PATH is the sub-path the site is served from. For a project site at
// https://you.github.io/my-repo/ it is "/my-repo"; for a user/org site or a custom
// domain it is empty. The GitHub Actions workflow sets it automatically.
const basePath = normalize(process.env.BASE_PATH);

function normalize(value) {
  const trimmed = String(value || '').trim().replace(/\/+$/, '');
  if (!trimmed) return '';
  return trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
}

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  trailingSlash: true,          // /topic/article/ -> topic/article/index.html (works on any static host)
  basePath,
  env: { NEXT_PUBLIC_BASE_PATH: basePath },
  images: { unoptimized: true },
  reactStrictMode: true,
  serverExternalPackages: ['sanitize-html', 'highlight.js', 'gray-matter'],
};

export default nextConfig;
