// Copies content/_media into public/media so images in articles are published with the site.
// Runs automatically before `npm run dev` and `npm run build`.
import fs from 'node:fs/promises';
import path from 'node:path';

const contentDir = path.resolve(process.env.CONTENT_DIR || 'content');
const source = path.join(contentDir, '_media');
const target = path.resolve('public', 'media');

await fs.rm(target, { recursive: true, force: true });
try {
  await fs.cp(source, target, { recursive: true });
  console.log(`[media] Copied ${path.relative(process.cwd(), source)} to public/media`);
} catch (err) {
  if (err.code !== 'ENOENT') throw err; // no _media folder is fine
}
