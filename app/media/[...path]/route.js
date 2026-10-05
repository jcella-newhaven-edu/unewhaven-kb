import fs from 'node:fs/promises';
import path from 'node:path';
import { getConfig } from '@/lib/config';

const TYPES = {
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.gif': 'image/gif',
  '.webp': 'image/webp', '.avif': 'image/avif', '.svg': 'image/svg+xml', '.pdf': 'application/pdf',
  '.mp4': 'video/mp4', '.webm': 'video/webm',
};

// Serves files from content/_media, e.g. /media/screenshot.png
export async function GET(request, { params }) {
  const { path: segments } = await params;
  const root = path.join(/*turbopackIgnore: true*/ getConfig().contentDir, '_media');
  const file = path.resolve(/*turbopackIgnore: true*/ root, ...segments);
  const type = TYPES[path.extname(file).toLowerCase()];

  if (!file.startsWith(root + path.sep) || !type) return new Response('Not found', { status: 404 });
  try {
    const data = await fs.readFile(file);
    return new Response(data, {
      headers: {
        'Content-Type': type,
        'Cache-Control': 'public, max-age=3600',
        // SVGs can contain script; this keeps them inert when opened directly.
        'Content-Security-Policy': "default-src 'none'; style-src 'unsafe-inline'; sandbox",
      },
    });
  } catch {
    return new Response('Not found', { status: 404 });
  }
}
