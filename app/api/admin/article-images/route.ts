import { getAdminSession, isAdminOrigin } from "@/lib/admin/auth";
import { articleImageMaxBytes } from "@/lib/article-media";
import { detectArticleImageType } from "@/lib/article-media-server";
import { queryRows } from "@/lib/postgres";
import { readBoundedBody } from "@/lib/request-body";

const requestLimit = articleImageMaxBytes + 16 * 1024;

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
    const body = await readBoundedBody(request, requestLimit);
    upload = body && await new Response(body, { headers: { "Content-Type": contentType } }).formData();
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
  const type = detectArticleImageType(bytes);
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
