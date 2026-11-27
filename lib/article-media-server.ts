import "server-only";
import type { JSONContent } from "@tiptap/core";
import { localArticleImageId } from "./article-media";

const pngSignature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

export function detectArticleImageType(bytes: Buffer) {
  if (bytes.subarray(0, 8).equals(pngSignature)) return "image/png";
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "image/jpeg";
  const signature = bytes.toString("latin1", 0, 6);
  if (signature === "GIF87a" || signature === "GIF89a") return "image/gif";
  if (bytes.toString("latin1", 0, 4) === "RIFF" && bytes.toString("latin1", 8, 12) === "WEBP") return "image/webp";
  return null;
}

export function articleImageIds(body: JSONContent): string[] {
  const ids = new Set<string>();
  const pending = [body];
  while (pending.length) {
    const node = pending.pop();
    if (node?.type === "image") {
      const id = localArticleImageId(node.attrs?.src);
      if (id) ids.add(id);
    }
    if (Array.isArray(node?.content)) {
      for (const child of node.content) pending.push(child);
    }
  }
  return [...ids];
}
