import type { JSONContent } from "@tiptap/core";
import { articleAlertTitleMaxLength, defaultArticleAlertStatus, isArticleAlertStatus } from "@/lib/article-alert";
import { articleImageAltMaxLength, validArticleImageSrc } from "@/lib/article-media";

export type ArticleActionState = {
  error?: string;
  fieldErrors?: Record<string, string>;
};

type Validation<T> = { data: T } | { fieldErrors: Record<string, string> };
type ArticleBody = { body: JSONContent; bodyText: string };

export type ArticleInput = {
  slug: string;
  title: string;
  summary: string;
  topicSlug: string;
  topicSlugs: string[];
  published: boolean;
  content: ArticleBody | null;
};

const NEW_SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const VERSION = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{6}Z$/;
const BLOCKS = [
  "paragraph", "heading", "bulletList", "orderedList", "blockquote", "codeBlock", "horizontalRule",
  "image", "articleTabs", "articleAccordion", "articleAlert",
];
const INLINE = ["text", "hardBreak"];
const CHILDREN: Record<string, string[]> = {
  doc: BLOCKS,
  paragraph: INLINE,
  heading: INLINE,
  bulletList: ["listItem"],
  orderedList: ["listItem"],
  listItem: BLOCKS,
  blockquote: BLOCKS,
  codeBlock: ["text"],
  articleTabs: ["articleTab"],
  articleTab: BLOCKS,
  articleAccordion: ["articleAccordionItem"],
  articleAccordionItem: BLOCKS,
  articleAlert: BLOCKS,
  image: [],
  horizontalRule: [],
  hardBreak: [],
  text: [],
};
const MARKS = new Set(["bold", "italic", "underline", "strike", "code", "link"]);
const TEXT_BLOCKS = new Set([
  "doc", "listItem", "bulletList", "orderedList", "blockquote",
  "articleTabs", "articleTab", "articleAccordion", "articleAccordionItem", "articleAlert",
]);

function formString(form: FormData, name: string): string | null {
  const fields = form.getAll(name);
  return fields.length === 1 && typeof fields[0] === "string" ? fields[0] : null;
}

function hasControlCharacter(value: string) {
  return Array.from(value).some((character) => {
    const code = character.charCodeAt(0);
    return code < 32 || code === 127;
  });
}

export function isArticleSlug(value: string) {
  // Existing articles can have slugs that predate the new-article naming rule.
  return value.length > 0 && value.length <= 200 && value.isWellFormed() && value !== "." && value !== ".."
    && !value.includes("/") && !value.includes("\\") && !hasControlCharacter(value);
}

export function validateArticleVersion(
  form: FormData,
  slugField: "slug" | "originalSlug" = "slug",
): Validation<{ slug: string; updatedToken: string }> {
  const slug = formString(form, slugField) ?? "";
  const updatedToken = formString(form, "updatedToken") ?? "";
  if (!isArticleSlug(slug)) return { fieldErrors: { slug: "This article has an invalid URL." } };
  if (!VERSION.test(updatedToken)) {
    return { fieldErrors: { updatedToken: "Reload this page before changing the article." } };
  }
  return { data: { slug, updatedToken } };
}

export function validateArticle(form: FormData, originalSlug?: string): Validation<ArticleInput> {
  const rawSlug = formString(form, "slug") ?? "";
  // Keep an existing URL exactly as supplied when the editor has left it unchanged.
  const slug = rawSlug === originalSlug ? rawSlug : rawSlug.trim();
  const title = formString(form, "title")?.trim() ?? "";
  const summary = formString(form, "summary")?.trim();
  const topicSlug = formString(form, "topicSlug") ?? "";
  const additional = form.getAll("additionalTopicSlug");
  const additionalTopics = additional.filter((value): value is string => typeof value === "string" && validTopicSlug(value));
  const published = formString(form, "published");
  const fieldErrors: Record<string, string> = {};

  if (rawSlug !== originalSlug) {
    if (slug.length > 96 || !NEW_SLUG.test(slug)) {
      fieldErrors.slug = "Use up to 96 lowercase letters, numbers, or hyphen-separated words.";
    } else if (slug === "new") {
      fieldErrors.slug = "The slug “new” is reserved. Choose another URL.";
    }
  }
  if (title.length === 0 || title.length > 160 || !title.isWellFormed() || hasControlCharacter(title)) {
    fieldErrors.title = "Enter a title between 1 and 160 characters.";
  }
  if (summary === undefined || summary.length > 500 || !summary.isWellFormed() || summary.includes("\0")) {
    fieldErrors.summary = "Use 500 characters or fewer for the summary.";
  }
  if (!validTopicSlug(topicSlug)) {
    fieldErrors.topicSlug = "Choose an existing topic.";
  }
  if (additional.length > 99 || additional.length !== additionalTopics.length) {
    fieldErrors.additionalTopicSlug = "Choose up to 99 existing additional topics.";
  } else if (additionalTopics.includes(topicSlug) || new Set(additionalTopics).size !== additionalTopics.length) {
    fieldErrors.additionalTopicSlug = "Choose each topic only once.";
  }
  if (published !== "true" && published !== "false") {
    fieldErrors.published = "Choose Draft or Published.";
  }

  let content: ArticleBody | null = null;
  if (originalSlug === undefined || form.has("body")) {
    const body = formString(form, "body");
    try {
      content = parseArticleBody(body);
    } catch (error) {
      fieldErrors.body = error instanceof Error ? error.message : "Check the article body.";
    }
  }

  if (Object.keys(fieldErrors).length > 0) return { fieldErrors };
  return { data: { slug, title, summary: summary ?? "", topicSlug, topicSlugs: [topicSlug, ...additionalTopics], published: published === "true", content } };
}

function validTopicSlug(value: string) {
  return value.length > 0 && value.length <= 200 && value.isWellFormed() && !value.includes("\0");
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function validHref(value: unknown): value is string {
  if (typeof value !== "string" || value.length > 2048 || !value.isWellFormed() || hasControlCharacter(value)
    || /\s/.test(value) || value.includes("\\")) return false;
  if (value.startsWith("#") || (value.startsWith("/") && !value.startsWith("//"))) return true;
  if (!/^(https?:\/\/|mailto:)/i.test(value)) return false;
  try {
    const parsed = new URL(value);
    return !parsed.username && !parsed.password && !!parsed.pathname
      && (parsed.protocol === "mailto:" || !!parsed.hostname);
  } catch {
    return false;
  }
}

function validateMark(value: unknown): NonNullable<JSONContent["marks"]>[number] {
  if (!isRecord(value) || typeof value.type !== "string" || !MARKS.has(value.type)) {
    throw new Error("The article contains unsupported text formatting.");
  }
  if (value.type !== "link") return { type: value.type };

  const href = isRecord(value.attrs) && typeof value.attrs.href === "string" ? value.attrs.href.trim() : null;
  if (!validHref(href)) {
    throw new Error("Use links starting with https://, http://, mailto:, /, or #.");
  }
  return { type: "link", attrs: { href } };
}

export function parseArticleBody(raw: string | null): ArticleBody {
  if (raw === null || raw.length > 200_000) {
    throw new Error("Enter an article body smaller than 200,000 characters.");
  }
  let document: unknown;
  try {
    document = JSON.parse(raw);
  } catch {
    throw new Error("The article body could not be read.");
  }

  let nodeCount = 0;
  function readNode(value: unknown, allowed: string[], depth: number): JSONContent {
    nodeCount += 1;
    if (nodeCount > 5000 || depth > 24) throw new Error("The article body contains too many nested elements.");
    if (!isRecord(value) || typeof value.type !== "string" || !allowed.includes(value.type)) {
      throw new Error("The article body contains an unsupported element.");
    }

    const type = value.type;
    const node: JSONContent = { type };
    const childTypes = CHILDREN[type];
    if (value.content !== undefined) {
      if (!Array.isArray(value.content) || childTypes.length === 0) {
        throw new Error("The article body contains invalid nested content.");
      }
      node.content = value.content.map((child) => readNode(child, childTypes, depth + 1));
    }
    if (type === "text") {
      if (typeof value.text !== "string" || !value.text || !value.text.isWellFormed() || value.text.includes("\0")) {
        throw new Error("The article body contains invalid text.");
      }
      node.text = value.text;
    }
    if (value.marks !== undefined) {
      if ((type !== "text" && type !== "hardBreak") || !Array.isArray(value.marks) || value.marks.length > MARKS.size) {
        throw new Error("The article contains unsupported text formatting.");
      }
      node.marks = value.marks.map(validateMark);
    }
    const attrs = isRecord(value.attrs) ? value.attrs : {};
    if (type === "heading") {
      if (attrs.level !== 2 && attrs.level !== 3) throw new Error("Use level 2 or 3 for article headings.");
      node.attrs = { level: attrs.level };
    }
    if (type === "orderedList" && attrs.start != null) {
      if (!Number.isSafeInteger(attrs.start) || Number(attrs.start) < 1 || Number(attrs.start) > 10000) {
        throw new Error("Start numbered lists at a number between 1 and 10,000.");
      }
      node.attrs = { start: attrs.start };
    }
    if (type === "codeBlock" && typeof attrs.language === "string" && /^[\w+-]{1,40}$/.test(attrs.language)) {
      node.attrs = { language: attrs.language };
    }
    if (type === "image") {
      const src = typeof attrs.src === "string" ? attrs.src.trim() : null;
      const alt = attrs.alt ?? "";
      if (!validArticleImageSrc(src)) throw new Error("Use an HTTPS or site-relative image URL.");
      if (typeof alt !== "string" || alt.length > articleImageAltMaxLength || !alt.isWellFormed() || hasControlCharacter(alt)) {
        throw new Error(`Use up to ${articleImageAltMaxLength} characters for image descriptions.`);
      }
      node.attrs = { src, alt: alt.trim() };
    }
    if (type === "articleTabs" && (!node.content || node.content.length < 2 || node.content.length > 8)) {
      throw new Error("Use between two and eight tabs in each tab group.");
    }
    if (type === "articleAccordion" && (!node.content?.length || node.content.length > 8)) {
      throw new Error("Use between one and eight sections in each accordion.");
    }
    if (type === "articleTab" || type === "articleAccordionItem") {
      const tab = type === "articleTab";
      const attr = tab ? "label" : "title";
      const name = typeof attrs[attr] === "string" ? attrs[attr].trim() : "";
      if (!name || name.length > 80 || !name.isWellFormed() || hasControlCharacter(name)) {
        throw new Error(tab
          ? "Enter a tab label between 1 and 80 characters."
          : "Enter an accordion section title between 1 and 80 characters.");
      }
      if (!node.content?.length) {
        throw new Error(tab
          ? "Include a paragraph or another block in each tab."
          : "Include a paragraph or another block in each accordion section.");
      }
      node.attrs = { [attr]: name };
    }
    if (type === "articleAlert") {
      const { status = defaultArticleAlertStatus, title = "" } = attrs;
      if (!isArticleAlertStatus(status)) throw new Error("Choose a supported alert status.");
      const trimmedTitle = typeof title === "string" ? title.trim() : null;
      if (trimmedTitle === null || trimmedTitle.length > articleAlertTitleMaxLength
        || !trimmedTitle.isWellFormed() || hasControlCharacter(trimmedTitle)) {
        throw new Error(`Use up to ${articleAlertTitleMaxLength} characters for the alert title.`);
      }
      if (!node.content?.length) throw new Error("Include a paragraph or another block in each alert.");
      node.attrs = { status, title: trimmedTitle };
    }
    if (type === "listItem" && node.content?.[0]?.type !== "paragraph") {
      throw new Error("The article body contains an invalid list item.");
    }
    if ((type === "bulletList" || type === "orderedList" || type === "blockquote") && !node.content?.length) {
      throw new Error("The article body contains an empty list or quote.");
    }
    return node;
  }

  function extractText(node: JSONContent): string {
    if (node.type === "hardBreak") return "\n";
    if (node.type === "image") return node.attrs?.alt ?? "";
    const separator = TEXT_BLOCKS.has(node.type ?? "") ? "\n" : "";
    const content = node.text ?? node.content?.map(extractText).join(separator) ?? "";
    if (node.type === "articleTab") return `${node.attrs?.label}\n${content}`;
    if (node.type === "articleAccordionItem") return `${node.attrs?.title}\n${content}`;
    if (node.type === "articleAlert" && node.attrs?.title) {
      return content ? `${node.attrs.title}\n${content}` : node.attrs.title;
    }
    return content;
  }

  const body = readNode(document, ["doc"], 0);
  return { body, bodyText: extractText(body).trim() };
}
