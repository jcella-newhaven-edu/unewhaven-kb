import { Children } from "react";
import type { JSONContent } from "@tiptap/core";
import { renderJSONContentToReactElement } from "@tiptap/static-renderer/json/react";
import { Accordion, Tabs } from "@heroui/react";
import { defaultArticleAlertStatus, isArticleAlertStatus } from "@/lib/article-alert";
import { validArticleImageSrc } from "@/lib/article-media";
import ArticleAlert from "./ArticleAlert";

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
  paragraph: ({ children }) => <p className="mt-2 mb-3 max-w-[72ch]">{children}</p>,
  heading: ({ node, children }) => {
    const Heading = node.attrs?.level === 2 ? "h2" : "h3";
    const spacing = Heading === "h2"
      ? "mt-[1.5625rem] mb-2 border-t border-kb-line pt-[1.5625rem] text-2xl"
      : "mt-6 mb-2.5 text-[1.1875rem]";
    return (
      <Heading id={node.attrs?.id} className={`${spacing} leading-[1.18] font-bold tracking-[-0.035em] text-kb-heading`}>
        {children}
      </Heading>
    );
  },
  bulletList: ({ children }) => <ul className="my-3 list-disc ps-6 [&>li+li]:mt-1.5">{children}</ul>,
  orderedList: ({ node, children }) => {
    const value = node.attrs?.start;
    const start = typeof value === "number" && Number.isInteger(value) ? value : 1;
    return <ol start={start} role="list" className="my-3 list-none ps-0">{children}</ol>;
  },
  listItem: ({ parent, children }) => (
    <li
      className={parent?.type === "orderedList"
        ? "relative mb-2.5 min-h-[1.5625rem] ps-[2.1875rem] text-foreground before:absolute before:start-0 before:top-0 before:grid before:h-[1.5625rem] before:min-w-[1.5625rem] before:place-items-center before:rounded-full before:bg-kb-highlight before:px-[0.2rem] before:text-xs before:font-bold before:text-kb-heading before:content-[counter(list-item)] [&>p:first-child]:mt-0"
        : "[&>p:first-child]:mt-0"}
    >
      {children}
    </li>
  ),
  codeBlock: ({ children }) => (
    <pre className="my-4 overflow-x-auto rounded-lg bg-kb-panel px-4 py-3.5 text-sm text-kb-heading">
      <code>{children}</code>
    </pre>
  ),
  blockquote: ({ children }) => <blockquote className="my-4 border-s-3 border-kb-line ps-4">{children}</blockquote>,
  hardBreak: () => <br />,
  horizontalRule: () => <hr className="my-[1.5625rem] border-kb-line" />,
  image: ({ node }) => {
    const { src, alt } = node.attrs ?? {};
    if (!validArticleImageSrc(src)) return null;
    // Images can come from editor-selected HTTPS hosts or the protected local media route.
    // eslint-disable-next-line @next/next/no-img-element
    return <img className="my-5 block h-auto max-w-full rounded-[0.625rem]" src={src} alt={typeof alt === "string" ? alt : ""} loading="lazy" decoding="async" referrerPolicy="no-referrer" />;
  },
  articleTabs: ({ node, children }) => {
    if (!node.content?.length) return null;
    const panels = Children.toArray(children);
    const tabs = node.content.map((tab, index) => ({
      id: `tab-${index}`,
      label: typeof tab.attrs?.label === "string" ? tab.attrs.label : `Tab ${index + 1}`,
    }));
    return (
      <Tabs className="my-6 min-w-0 rounded-xl border border-kb-line bg-kb-panel" variant="secondary" defaultSelectedKey={tabs[0].id}>
        <Tabs.ListContainer className="overflow-x-auto px-3">
          <Tabs.List aria-label="Article tabs">
            {tabs.map(({ id, label }) => (
              <Tabs.Tab id={id} key={id}>{label}<Tabs.Indicator /></Tabs.Tab>
            ))}
          </Tabs.List>
        </Tabs.ListContainer>
        {tabs.map(({ id }, index) => (
          <Tabs.Panel id={id} key={id} className="px-4 py-[0.8rem]">{panels[index]}</Tabs.Panel>
        ))}
      </Tabs>
    );
  },
  articleTab: ({ children }) => <>{children}</>,
  articleAccordion: ({ node, children }) => {
    if (!node.content?.length) return null;
    const panels = Children.toArray(children);
    return (
      <Accordion allowsMultipleExpanded className="my-6 min-w-0 overflow-hidden rounded-xl border border-kb-line bg-kb-panel">
        {node.content.map((section, index) => {
          const title = typeof section.attrs?.title === "string" && section.attrs.title.trim()
            ? section.attrs.title
            : `Section ${index + 1}`;
          return (
            <Accordion.Item key={index}>
              <Accordion.Heading>
                <Accordion.Trigger className="min-w-0 gap-3 px-4 py-3.5 text-base font-semibold text-kb-heading wrap-anywhere hover:bg-kb-hover focus-visible:-outline-offset-2">
                  <span className="min-w-0">{title}</span>
                  <Accordion.Indicator />
                </Accordion.Trigger>
              </Accordion.Heading>
              <Accordion.Panel>
                <Accordion.Body className="text-[0.9375rem] leading-[1.6] text-kb-muted">
                  {panels[index]}
                </Accordion.Body>
              </Accordion.Panel>
            </Accordion.Item>
          );
        })}
      </Accordion>
    );
  },
  articleAccordionItem: ({ children }) => <>{children}</>,
  articleAlert: ({ node, children }) => {
    const { status, title } = node.attrs ?? {};
    return (
      <ArticleAlert
        status={isArticleAlertStatus(status) ? status : defaultArticleAlertStatus}
        title={typeof title === "string" ? title : undefined}
      >
        {children}
      </ArticleAlert>
    );
  },
} satisfies RendererOptions["nodeMapping"];

const markMapping = {
  bold: ({ children }) => <strong>{children}</strong>,
  italic: ({ children }) => <em>{children}</em>,
  underline: ({ children }) => <u>{children}</u>,
  strike: ({ children }) => <s>{children}</s>,
  code: ({ children }) => <code className="rounded bg-kb-panel px-[0.3em] py-[0.1em]">{children}</code>,
  link: ({ mark, children }) => {
    const href = safeHref(mark.attrs?.href);
    return href
      ? <a href={href} className="font-semibold text-link underline underline-offset-[0.2em]">{children}</a>
      : <>{children}</>;
  },
} satisfies RendererOptions["markMapping"];

const renderArticle = renderJSONContentToReactElement<ArticleMark, JSONContent>({ nodeMapping, markMapping });

function plainText(node: JSONContent): string {
  if (node.type === "hardBreak") return " ";
  return node.text ?? node.content?.map(plainText).join("") ?? "";
}

function headingId(title: string, ids: Set<string>, prefix: string) {
  const slug = title.normalize("NFKD").toLowerCase()
    .replace(/\p{M}/gu, "").replace(/[^\p{L}\p{N}]+/gu, "-").replace(/^-|-$/g, "");
  const base = `${prefix}-${slug || "heading"}`;
  let id = base;
  for (let suffix = 2; ids.has(id); suffix += 1) id = `${base}-${suffix}`;
  ids.add(id);
  return id;
}

/** Prepare a renderable document and use its heading IDs for both outlines. */
export function prepareArticleBody(body: JSONContent, bodyText: string, headingPrefix = "section") {
  const headings: ArticleHeading[] = [];
  const ids = new Set<string>();
  let hasContent = false;

  function prepare(node: JSONContent, inPanel = false): JSONContent | undefined {
    if (typeof node?.type !== "string" || !Object.hasOwn(nodeMapping, node.type)) return;
    const text = typeof node.text === "string" ? node.text : undefined;
    const hasPanels = node.type === "articleTabs" || node.type === "articleAccordion";
    if ((node.type === "text" && text?.trim()) || (node.type === "image" && validArticleImageSrc(node.attrs?.src))
      || ((hasPanels || node.type === "articleAlert") && node.content?.length)) hasContent = true;
    const content = Array.isArray(node.content)
      ? node.content.map((child) => prepare(child, inPanel || hasPanels)).filter((child) => child !== undefined)
      : undefined;
    const marks = Array.isArray(node.marks)
      ? node.marks.filter((mark) => typeof mark?.type === "string" && Object.hasOwn(markMapping, mark.type))
      : undefined;
    const prepared = { ...node, text, content, marks };
    if (node.type === "heading" && !inPanel) {
      const title = plainText(prepared).replace(/\s+/g, " ").trim();
      if (title) {
        const level = node.attrs?.level === 2 ? 2 : 3;
        const id = headingId(title, ids, headingPrefix);
        headings.push({ id, title, level });
        prepared.attrs = { ...node.attrs, id };
      }
    }
    return prepared;
  }

  const content = prepare(body);
  if (content && hasContent) {
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

/** Render the prepared Tiptap document without loading an editor. */
export default function ArticleBody({ body }: { body: JSONContent }) {
  return renderArticle({ content: body });
}
