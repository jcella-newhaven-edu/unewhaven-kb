import { createHash } from "node:crypto";
import { revalidatePath, revalidateTag } from "next/cache";
import { getAdminSession, isAdminOrigin } from "@/lib/admin/auth";
import { exportContentTransfer } from "@/lib/admin/content-transfer-export";
import { parseContentTransfer } from "@/lib/admin/content-transfer-format";
import { planContentTransfer } from "@/lib/admin/content-transfer-import";
import { transferMaxBytes, transferMaxMiB, type TransferResponse } from "@/lib/admin/content-transfer-types";
import { isArticleSlug } from "@/lib/admin/validation";
import { readBoundedBody } from "@/lib/request-body";

const privateHeaders = {
  "Cache-Control": "private, no-store",
  "X-Content-Type-Options": "nosniff",
};

function json(payload: TransferResponse, status = 200) {
  return Response.json(payload, { status, headers: privateHeaders });
}

export async function GET(request: Request) {
  if (!await getAdminSession()) {
    return json({ error: "Sign in with an editorial account to export content." }, 403);
  }

  const query = new URL(request.url).searchParams;
  const scope = query.get("scope") ?? "all";
  const topic = query.get("topic") ?? "";
  if (scope !== "all" && scope !== "topics" && scope !== "topic") {
    return json({ error: "Choose an export scope." }, 400);
  }
  if (scope === "topic" && !isArticleSlug(topic)) {
    return json({ error: "Choose a topic to export." }, 400);
  }

  try {
    const result = await exportContentTransfer(scope, topic);
    if ("error" in result) return json(result, 422);
    return new Response(result.json, {
      headers: {
        ...privateHeaders,
        "Content-Type": "application/json; charset=utf-8",
        "Content-Disposition": 'attachment; filename="unewhaven-kb-export.json"',
      },
    });
  } catch (error) {
    console.error("Knowledge base export failed.", error);
    return json({ error: "The export could not be created. Try again." }, 500);
  }
}

export async function POST(request: Request) {
  const session = isAdminOrigin(request) ? await getAdminSession() : null;
  if (!session) return json({ error: "Sign in with an editorial account to import content." }, 403);

  const query = new URL(request.url).searchParams;
  const phase = query.get("phase");
  const mode = query.get("mode") ?? "skip";
  if ((phase !== "preview" && phase !== "apply") || (mode !== "skip" && mode !== "update")) {
    return json({ error: "Choose an import mode and preview the file." }, 400);
  }
  const token = phase === "apply" ? request.headers.get("x-kb-transfer-preview") ?? "" : undefined;
  if (token !== undefined && !/^[a-f0-9]{64}$/.test(token)) {
    return json({ error: "Preview the file before applying it." }, 400);
  }
  if (request.headers.get("content-type")?.split(";")[0].trim().toLowerCase() !== "application/json") {
    return json({ error: "Choose a JSON import file." }, 415);
  }

  let raw: string;
  let digest: string;
  try {
    const bytes = await readBoundedBody(request, transferMaxBytes);
    if (!bytes) return json({ error: `Choose a JSON file of ${transferMaxMiB} MiB or less.` }, 413);
    raw = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
    digest = createHash("sha256").update(bytes).digest("hex");
  } catch {
    return json({ error: "The import file could not be read as UTF-8 JSON." }, 400);
  }

  const parsed = parseContentTransfer(raw);
  if ("issues" in parsed) {
    return json({ error: "Fix the issues in the import file.", issues: parsed.issues }, 422);
  }

  let result: TransferResponse;
  try {
    result = await planContentTransfer(parsed.data, mode, session.id, digest, token);
  } catch (error) {
    console.error("Knowledge base import failed.", error);
    return json({ error: "The import could not be completed. Preview the file again." }, 500);
  }
  if ("error" in result) return json(result, phase === "apply" ? 409 : 422);
  const { topics, articles } = result.summary;
  if (phase === "apply" && (topics.created || topics.updated || articles.created || articles.updated)) {
    revalidateTag("topics", { expire: 0 });
    revalidateTag("articles", { expire: 0 });
    revalidatePath("/", "layout");
    revalidatePath("/api/search");
  }
  return json(result);
}
