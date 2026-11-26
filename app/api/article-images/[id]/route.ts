import { getAdminSession } from "@/lib/admin/auth";
import { queryRows } from "@/lib/postgres";

const idPattern = /^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/;
const privateHeaders = { "Cache-Control": "private, no-store" };

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!idPattern.test(id)) return new Response(null, { status: 404, headers: privateHeaders });

  const session = await getAdminSession();
  const imagePath = `/api/article-images/${id}`;
  const imageNode = `$.** ? (@.type == "image" && @.attrs.src == ${JSON.stringify(imagePath)})`;
  const [image] = await queryRows<{ contentType: string; content: Buffer }>(
    `SELECT i.content_type AS "contentType", i.content FROM article_images i
      WHERE i.id = $1 AND ($3 OR EXISTS (
        SELECT 1 FROM articles a WHERE a.published AND a.body @? $2::jsonpath
      ))`,
    [id, imageNode, Boolean(session)],
  );
  if (!image) return new Response(null, { status: 404, headers: privateHeaders });

  return new Response(new Uint8Array(image.content), {
    headers: {
      ...privateHeaders,
      "Content-Type": image.contentType,
      "X-Content-Type-Options": "nosniff",
      "Content-Security-Policy": "default-src 'none'; sandbox",
    },
  });
}
