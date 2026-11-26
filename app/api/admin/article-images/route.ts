import { getAdminSession } from "@/lib/admin/auth";
import { articleImageMaxBytes } from "@/lib/article-media";
import { queryRows } from "@/lib/postgres";

const requestLimit = articleImageMaxBytes + 16 * 1024;
const pngSignature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

function imageType(bytes: Buffer) {
  if (bytes.subarray(0, 8).equals(pngSignature)) return "image/png";
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "image/jpeg";
  const signature = bytes.toString("latin1", 0, 6);
  if (signature === "GIF87a" || signature === "GIF89a") return "image/gif";
  if (bytes.toString("latin1", 0, 4) === "RIFF" && bytes.toString("latin1", 8, 12) === "WEBP") return "image/webp";
  return null;
}

function isAdminOrigin(request: Request) {
  const configured = process.env.ADMIN_ORIGIN?.trim();
  if (!configured) return false;
  try {
    return request.headers.get("origin") === new URL(configured).origin;
  } catch {
    return false;
  }
}

async function readUpload(request: Request, contentType: string) {
  const reader = request.body?.getReader();
  if (!reader) throw new Error("Missing request body.");
  const chunks: Uint8Array[] = [];
  let length = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      length += value.byteLength;
      if (length > requestLimit) {
        await reader.cancel();
        return null;
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  const bytes = new Uint8Array(length);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return new Response(bytes, { headers: { "Content-Type": contentType } }).formData();
}

export async function POST(request: Request) {
  if (!isAdminOrigin(request) || !await getAdminSession()) {
    return Response.json({ error: "Sign in with an editorial account to upload images." }, { status: 403 });
  }

  if (Number(request.headers.get("content-length")) > requestLimit) {
    return Response.json({ error: "Upload an image up to 5 MB." }, { status: 413 });
  }
  const contentType = request.headers.get("content-type") ?? "";
  if (!contentType.toLowerCase().startsWith("multipart/form-data;")) {
    return Response.json({ error: "Choose an image to upload." }, { status: 400 });
  }

  let upload: FormData | null;
  try {
    upload = await readUpload(request, contentType);
  } catch {
    return Response.json({ error: "The image upload could not be read." }, { status: 400 });
  }
  if (!upload) return Response.json({ error: "Upload an image up to 5 MB." }, { status: 413 });

  const images = upload.getAll("image");
  const [image] = images;
  if (images.length !== 1 || !(image instanceof File) || image.size === 0 || image.size > articleImageMaxBytes) {
    return Response.json({ error: "Choose one image up to 5 MB." }, { status: 400 });
  }
  const bytes = Buffer.from(await image.arrayBuffer());
  const type = imageType(bytes);
  if (!type) return Response.json({ error: "Use a PNG, JPEG, GIF, or WebP image." }, { status: 415 });

  try {
    const [saved] = await queryRows<{ id: string }>(
      "INSERT INTO article_images (content_type, content) VALUES ($1, $2) RETURNING id",
      [type, bytes],
    );
    return Response.json({ src: `/api/article-images/${saved.id}` }, { status: 201 });
  } catch (error) {
    console.error("Article image upload failed.", error);
    return Response.json({ error: "The image could not be uploaded. Try again." }, { status: 500 });
  }
}
