import "server-only";
import type { JSONContent } from "@tiptap/core";
import { articleImageMaxBytes, isArticleImageId } from "@/lib/article-media";
import { detectArticleImageType } from "@/lib/article-media-server";
import { defaultTopicIcon, isTopicIcon } from "@/lib/topic-icons";
import {
  transferFormat,
  transferMaxBytes,
  transferMaxMiB,
  transferMaxRecords,
  transferVersion,
  type TransferArticle,
  type TransferTopic,
} from "./content-transfer-types";
import { isArticleSlug, validateArticle } from "./validation";

export type ValidatedTransfer = {
  topics: TransferTopic[];
  articles: (TransferArticle & { bodyText: string })[];
  images: { id: string; contentType: string; content: Buffer }[];
};

const issueLimit = 20;
const maxEncodedImageLength = Math.ceil(articleImageMaxBytes / 3) * 4;
const slugError = "Use a valid URL slug without #, ?, or %. The slug “new” is reserved.";

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function validSlug(value: unknown): value is string {
  // Next.js escapes these delimiters in dynamic params, so they can't round-trip as slugs.
  return typeof value === "string" && isArticleSlug(value) && value !== "new" && !/[#?%]/.test(value);
}

function textField(value: unknown, maxLength: number): value is string {
  return typeof value === "string" && value.length <= maxLength && value.isWellFormed() && !value.includes("\0");
}

function parseTopic(value: unknown): TransferTopic | string {
  if (!isObject(value)) return "Expected a topic object.";

  const { slug, title, description = "", sortOrder = 0, parentSlug = null, icon = defaultTopicIcon } = value;
  if (!validSlug(slug)) return slugError;
  if (typeof title !== "string" || !textField(title.trim(), 160) || !title.trim() || /[\r\n\t]/.test(title.trim())) {
    return "Enter a single-line title between 1 and 160 characters.";
  }
  if (typeof description !== "string" || !textField(description.trim(), 500)) {
    return "Use 500 characters or fewer for the description.";
  }
  if (typeof sortOrder !== "number" || !Number.isInteger(sortOrder) || sortOrder < -2147483648 || sortOrder > 2147483647) {
    return "Enter a whole-number sort order between -2,147,483,648 and 2,147,483,647.";
  }
  if (parentSlug !== null && !validSlug(parentSlug)) return "Use a valid parent topic slug or null.";
  if (parentSlug === slug) return "Choose a different slug for the parent topic.";
  if (!isTopicIcon(icon)) return "Choose an icon from the topic icon catalog.";

  return { slug, title: title.trim(), description: description.trim(), sortOrder, parentSlug, icon };
}

export function paragraphsFromText(value: string): JSONContent {
  const paragraphs = value.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  return {
    type: "doc",
    content: paragraphs.length
      ? paragraphs.map((text) => ({ type: "paragraph", content: [{ type: "text", text }] }))
      : [{ type: "paragraph" }],
  };
}

function parseArticle(value: unknown): ValidatedTransfer["articles"][number] | string {
  if (!isObject(value)) return "Expected an article object.";
  const { slug, title, summary = "", topicSlug, additionalTopicSlugs = [], published = false, body, bodyText } = value;
  if (!validSlug(slug)) return slugError;
  if (typeof title !== "string") return "Enter a title.";
  if (typeof summary !== "string") return "Enter a text summary.";
  if (!validSlug(topicSlug)) return "Enter a valid primary topic slug.";
  if (!Array.isArray(additionalTopicSlugs) || additionalTopicSlugs.length > 99 || !additionalTopicSlugs.every(validSlug)) {
    return "Use an array of up to 99 valid additional topic slugs.";
  }
  if (typeof published !== "boolean") return "Use true or false for published.";
  if (body === undefined ? !textField(bodyText, 200_000) : !isObject(body)) {
    return "Provide a rich-text body or plain bodyText.";
  }

  const article = new FormData();
  article.set("slug", slug);
  article.set("title", title);
  article.set("summary", summary);
  article.set("topicSlug", topicSlug);
  for (const additionalSlug of additionalTopicSlugs) article.append("additionalTopicSlug", additionalSlug);
  article.set("published", String(published));

  try {
    const document = body === undefined && typeof bodyText === "string" ? paragraphsFromText(bodyText) : body;
    article.set("body", JSON.stringify(document));
  } catch {
    return "The article body could not be read.";
  }

  const checked = validateArticle(article, slug);
  if ("fieldErrors" in checked) return Object.values(checked.fieldErrors).join(" ");
  if (!checked.data.content) return "Provide article content.";

  return {
    slug,
    title: checked.data.title,
    summary: checked.data.summary,
    topicSlug,
    additionalTopicSlugs: checked.data.topicSlugs.slice(1),
    published,
    ...checked.data.content,
  };
}

function parseImage(value: unknown): ValidatedTransfer["images"][number] | string {
  if (!isObject(value)) return "Expected an image object.";
  const { id, contentType, data } = value;
  if (!isArticleImageId(id)) return "Use a lowercase UUID for the image ID.";
  if (typeof contentType !== "string") return "Specify an image content type.";
  if (typeof data !== "string" || data.length === 0 || data.length % 4 !== 0 || data.length > maxEncodedImageLength) {
    return "Provide base64 image data up to 5 MiB when decoded.";
  }

  const content = Buffer.from(data, "base64");
  if (content.length === 0 || content.length > articleImageMaxBytes || content.toString("base64") !== data) {
    return "Provide valid base64 image data up to 5 MiB when decoded.";
  }
  if (detectArticleImageType(content) !== contentType) {
    return "Use PNG, JPEG, GIF, or WebP data matching the declared content type.";
  }

  return { id, contentType, content };
}

function parseEntries<Entry extends object>(
  values: unknown[],
  kind: string,
  parse: (value: unknown) => Entry | string,
  identifier: (entry: Entry) => string,
  issues: string[],
): Entry[] {
  const entries: Entry[] = [];
  const identifiers = new Set<string>();
  for (const [index, value] of values.entries()) {
    if (issues.length >= issueLimit) break;
    const parsed = parse(value);
    if (typeof parsed === "string") {
      issues.push(`${kind} ${index + 1}. ${parsed}`);
      continue;
    }

    const key = identifier(parsed);
    if (identifiers.has(key)) {
      issues.push(`${kind} ${index + 1}. “${key}” appears more than once.`);
      continue;
    }
    identifiers.add(key);
    entries.push(parsed);
  }
  return entries;
}

export function parseContentTransfer(raw: string): { data: ValidatedTransfer } | { issues: string[] } {
  if (Buffer.byteLength(raw, "utf8") > transferMaxBytes) {
    return { issues: [`Choose a JSON file no larger than ${transferMaxMiB} MiB.`] };
  }

  let document: unknown;
  try {
    document = JSON.parse(raw);
  } catch {
    return { issues: ["Choose a valid JSON file."] };
  }
  if (!isObject(document) || document.format !== transferFormat || document.version !== transferVersion) {
    return { issues: [`Use a ${transferFormat} version ${transferVersion} content file.`] };
  }

  const { topics, articles, images = [] } = document;
  if (!Array.isArray(topics) || !Array.isArray(articles) || !Array.isArray(images)) {
    return { issues: ["Provide topics and articles arrays. If included, images must also be an array."] };
  }
  if ([topics, articles, images].some((entries) => entries.length > transferMaxRecords)) {
    return { issues: [`Use at most ${transferMaxRecords.toLocaleString("en-US")} records in each array.`] };
  }

  const issues: string[] = [];
  const data = {
    topics: parseEntries(topics, "Topic", parseTopic, (topic) => topic.slug, issues),
    articles: parseEntries(articles, "Article", parseArticle, (article) => article.slug, issues),
    images: parseEntries(images, "Image", parseImage, (image) => image.id, issues),
  };
  return issues.length ? { issues } : { data };
}
