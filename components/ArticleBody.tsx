import type { CSSProperties } from "react";
import type { JSONContent } from "@tiptap/core";
import { renderJSONContentToReactElement } from "@tiptap/static-renderer/json/react";

type ArticleMark = NonNullable<JSONContent["marks"]>[number];
type RendererOptions = Parameters<typeof renderJSONContentToReactElement<ArticleMark, JSONContent>>[0];

export type ArticleHeading = { id: string; title: string; level: 2 | 3 };

function safeHref(value: unknown) {
  if (typeof value !== "string") return undefined;
  const href = value.trim();
  return /^(https?:\/\/|mailto:|#|\/(?![/\\]))/i.test(href) ? href : undefined;
}

const nodeMapping = {
  doc: ({ children }) => <>{children}</>,
  text: ({ node }) => node.text ?? null,
  paragraph: ({ children }) => <p>{children}</p>,
  heading: ({ node, children }) => {
    const Heading = node.attrs?.level === 2 ? "h2" : "h3";
    return <Heading id={node.attrs?.id}>{children}</Heading>;
  },
  bulletList: ({ children }) => <ul>{children}</ul>,
  orderedList: ({ node, children }) => {
    const value = node.attrs?.start;
    const start = typeof value === "number" && Number.isInteger(value) ? value : 1;
    const style = { "--article-step-start": start - 1 } as CSSProperties;
    return <ol start={start} style={style} role="list">{children}</ol>;
  },
  listItem: ({ children }) => <li>{children}</li>,
  codeBlock: ({ children }) => <pre><code>{children}</code></pre>,
  blockquote: ({ children }) => <blockquote>{children}</blockquote>,
  hardBreak: () => <br />,
  horizontalRule: () => <hr />,
} satisfies RendererOptions["nodeMapping"];

const markMapping = {
  bold: ({ children }) => <strong>{children}</strong>,
  italic: ({ children }) => <em>{children}</em>,
  underline: ({ children }) => <u>{children}</u>,
  strike: ({ children }) => <s>{children}</s>,
  code: ({ children }) => <code>{children}</code>,
  link: ({ mark, children }) => {
    const href = safeHref(mark.attrs?.href);
    return href ? <a href={href}>{children}</a> : <>{children}</>;
  },
} satisfies RendererOptions["markMapping"];

const renderArticle = renderJSONContentToReactElement<ArticleMark, JSONContent>({ nodeMapping, markMapping });

function plainText(node: JSONContent): string {
  if (node.type === "hardBreak") return " ";
  return node.text ?? node.content?.map(plainText).join("") ?? "";
}

function headingId(title: string, ids: Set<string>) {
  const slug = title.normalize("NFKD").toLowerCase()
    .replace(/\p{M}/gu, "").replace(/[^\p{L}\p{N}]+/gu, "-").replace(/^-|-$/g, "");
  const base = `section-${slug || "heading"}`;
  let id = base;
  for (let suffix = 2; ids.has(id); suffix += 1) id = `${base}-${suffix}`;
  ids.add(id);
  return id;
}

/** Prepare a renderable document and use its heading IDs for both outlines. */
export function prepareArticleBody(body: JSONContent, bodyText: string) {
  const headings: ArticleHeading[] = [];
  const ids = new Set<string>();
  let hasText = false;

  function prepare(node: JSONContent): JSONContent | undefined {
    if (typeof node?.type !== "string" || !Object.hasOwn(nodeMapping, node.type)) return;
    const text = typeof node.text === "string" ? node.text : undefined;
    if (node.type === "text" && text?.trim()) hasText = true;
    const content = Array.isArray(node.content)
      ? node.content.map(prepare).filter((child) => child !== undefined)
      : undefined;
    const marks = Array.isArray(node.marks)
      ? node.marks.filter((mark) => typeof mark?.type === "string" && Object.hasOwn(markMapping, mark.type))
      : undefined;
    const prepared = { ...node, text, content, marks };
    if (node.type === "heading") {
      const title = plainText(prepared).replace(/\s+/g, " ").trim();
      if (title) {
        const level = node.attrs?.level === 2 ? 2 : 3;
        const id = headingId(title, ids);
        headings.push({ id, title, level });
        prepared.attrs = { ...node.attrs, id };
      }
    }
    return prepared;
  }

  const content = prepare(body);
  if (content && hasText) {
    const sections = headings.filter((heading) => heading.level === 2);
    return { content, headings: sections.length ? sections : headings };
  }

  // Older articles may only have a plain-text copy of their content.
  return {
    content: {
      type: "doc",
      content: bodyText.split(/\r?\n/).map((line) => line.trim()).filter(Boolean).map((text) => ({
        type: "paragraph",
        content: [{ type: "text", text }],
      })),
    },
    headings: [],
  };
}

/** Render the prepared Tiptap document on the server without loading an editor. */
export default function ArticleBody({ body }: { body: JSONContent }) {
  return renderArticle({ content: body });
}
