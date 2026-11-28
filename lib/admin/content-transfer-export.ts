import "server-only";
import type { JSONContent } from "@tiptap/core";
import type { PoolClient, QueryResultRow } from "pg";
import { validArticleImageSrc } from "@/lib/article-media";
import { articleImageIds } from "@/lib/article-media-server";
import { withTransaction } from "@/lib/postgres";
import { defaultTopicIcon, isTopicIcon } from "@/lib/topic-icons";
import { paragraphsFromText } from "./content-transfer-format";
import {
  transferFormat,
  transferMaxBytes,
  transferMaxMiB,
  transferMaxRecords,
  transferVersion,
  type ContentTransfer,
  type ExportScope,
  type TransferArticle,
  type TransferImage,
  type TransferTopic,
} from "./content-transfer-types";

type StoredArticle = TransferArticle & { bodyText: string };
type StoredImage = { id: string; contentType: string; content: Buffer };
type ExportFailure = { error: string };

const limitError = {
  error: `An export can include up to ${transferMaxRecords.toLocaleString("en-US")} records per section and ${transferMaxMiB} MiB. Choose a smaller export scope.`,
};

// Leave room for the outer object and delimiters when budgeting the wire format.
const bundleOverhead = 256;

const topicFields = `t.slug, t.title, t.description, t.sort_order AS "sortOrder",
  NULLIF(t.parent_slug, '') AS "parentSlug", t.icon`;
const articleFields = `a.slug, a.title, a.summary, a.topic_slug AS "topicSlug",
  ARRAY(SELECT m.topic_slug FROM article_topics m
    WHERE m.article_slug = a.slug AND m.topic_slug <> a.topic_slug ORDER BY m.topic_slug) AS "additionalTopicSlugs",
  a.published, a.body, a.body_text AS "bodyText"`;

async function readBoundedRows<Row extends QueryResultRow>(
  client: PoolClient,
  select: string,
  values: unknown[],
  budget: number,
): Promise<{ rows: Row[]; bytes: number } | ExportFailure> {
  const limited = `${select} LIMIT ${transferMaxRecords + 1}`;
  const { rows: [stats] } = await client.query<{ count: number; bytes: string }>(
    `SELECT count(*)::integer AS count,
            COALESCE(sum(octet_length(row_to_json(limited)::text)::bigint + 1), 0)::text AS bytes
     FROM (${limited}) limited`,
    values,
  );
  const bytes = Number(stats.bytes);
  if (stats.count > transferMaxRecords || bytes > budget) return limitError;

  const { rows } = await client.query<Row>(limited, values);
  return { rows, bytes };
}

function hasArticleContent(body: JSONContent) {
  if (body?.type !== "doc") return false;
  const pending = [body];
  while (pending.length) {
    const node = pending.pop();
    if (node?.type === "text" && node.text?.trim()) return true;
    if (node?.type === "image" && validArticleImageSrc(node.attrs?.src)) return true;
    if ((node?.type === "articleTabs" || node?.type === "articleAccordion") && node.content?.length) return true;
    if (Array.isArray(node?.content)) {
      for (const child of node.content) pending.push(child);
    }
  }
  return false;
}

function exportArticle({ bodyText, ...article }: StoredArticle): TransferArticle {
  // Some older articles render only their stored plain text.
  if (article.body?.type !== "doc" || (bodyText.trim() && !hasArticleContent(article.body))) {
    return { ...article, body: paragraphsFromText(bodyText) };
  }
  return article;
}

async function readImages(
  client: PoolClient,
  articles: TransferArticle[],
  budget: number,
): Promise<TransferImage[] | ExportFailure> {
  const ids = [...new Set(articles.flatMap(({ body }) => articleImageIds(body)))];
  if (ids.length > transferMaxRecords) return limitError;
  if (!ids.length) return [];

  // Bound the base64 output before fetching the image bytes.
  const { rows: [stats] } = await client.query<{ count: number; bytes: string }>(
    `SELECT count(*)::integer AS count,
            COALESCE(sum(4 * ((octet_length(content)::bigint + 2) / 3) + 100), 0)::text AS bytes
     FROM article_images WHERE id = ANY($1::uuid[])`,
    [ids],
  );
  if (stats.count !== ids.length) return { error: "An exported article references an uploaded image that could not be found." };
  if (Number(stats.bytes) > budget) return limitError;

  const { rows } = await client.query<StoredImage>(
    `SELECT id::text, content_type AS "contentType", content
     FROM article_images WHERE id = ANY($1::uuid[]) ORDER BY id`,
    [ids],
  );
  return rows.map(({ id, contentType, content }) => ({ id, contentType, data: content.toString("base64") }));
}

export async function exportContentTransfer(
  scope: ExportScope,
  topic?: string,
): Promise<{ json: string } | ExportFailure> {
  return withTransaction(async (client) => {
    await client.query("SET TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY");

    let topicSlugs: string[] = [];
    if (scope === "topic") {
      if (!topic) return { error: "Choose a topic to export." };
      const { rows } = await client.query<{ slug: string }>(
        "SELECT slug FROM topics WHERE slug = $1 OR parent_slug = $1 ORDER BY slug LIMIT $2",
        [topic, transferMaxRecords + 1],
      );
      if (rows.length > transferMaxRecords) return limitError;
      if (!rows.some(({ slug }) => slug === topic)) return { error: "Choose an existing topic to export." };
      topicSlugs = rows.map(({ slug }) => slug);
    }

    let budget = transferMaxBytes - bundleOverhead;
    let articles: TransferArticle[] = [];
    if (scope !== "topics") {
      const selection = scope === "topic"
        ? `WHERE EXISTS (SELECT 1 FROM article_topic_memberships m
             WHERE m.article_slug = a.slug AND m.topic_slug = ANY($1::text[]))`
        : "";
      const results = await readBoundedRows<StoredArticle>(
        client,
        `SELECT ${articleFields} FROM articles a ${selection} ORDER BY a.slug`,
        scope === "topic" ? [topicSlugs] : [],
        budget,
      );
      if ("error" in results) return results;
      articles = results.rows.map(exportArticle);
      budget -= results.bytes;
    }

    const ancestors = scope === "topic"
      ? `WITH RECURSIVE included(slug) AS (
          SELECT unnest($1::text[])
          UNION
          SELECT t.parent_slug FROM topics t JOIN included i ON i.slug = t.slug
          WHERE NULLIF(t.parent_slug, '') IS NOT NULL
        )`
      : "";
    const topicSelection = scope === "topic" ? "JOIN included i ON i.slug = t.slug" : "";
    const referenced = scope === "topic" ? [...new Set([
      ...topicSlugs,
      ...articles.flatMap(({ topicSlug, additionalTopicSlugs }) => [topicSlug, ...additionalTopicSlugs]),
    ])] : [];
    if (referenced.length > transferMaxRecords) return limitError;

    const results = await readBoundedRows<TransferTopic>(
      client,
      `${ancestors} SELECT ${topicFields} FROM topics t ${topicSelection} ORDER BY t.sort_order, t.title, t.slug`,
      scope === "topic" ? [referenced] : [],
      budget,
    );
    if ("error" in results) return results;
    const topics = results.rows.map((row) => isTopicIcon(row.icon) ? row : { ...row, icon: defaultTopicIcon });

    const images = await readImages(client, articles, budget - results.bytes);
    if ("error" in images) return images;

    const data: ContentTransfer = { format: transferFormat, version: transferVersion, topics, articles, images };
    const json = JSON.stringify(data);
    return Buffer.byteLength(json) > transferMaxBytes ? limitError : { json };
  });
}
