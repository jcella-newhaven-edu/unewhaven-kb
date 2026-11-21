import type { JSONContent } from "@tiptap/core";
import { renderJSONContentToReactElement } from "@tiptap/static-renderer/json/react";

// Only allow links to web pages, email and pages on this site. Blocks javascript: and data: URLs.
const safeHref = (href: unknown) =>
  typeof href === "string" && /^(https?:|mailto:|\/|#)/i.test(href) ? href : undefined;

// Built once: maps each Tiptap node and mark type to JSX.
const renderArticle = renderJSONContentToReactElement({
  nodeMapping: {
    doc: ({ children }) => <>{children}</>,
    text: ({ node }) => node.text ?? null,
    paragraph: ({ children }) => <p className="mt-5">{children}</p>,
    heading: ({ node, children }) =>
      node.attrs?.level === 2 ? (
        <h2 className="mt-12 font-serif text-2xl text-unh-primary sm:text-3xl dark:text-white">{children}</h2>
      ) : (
        <h3 className="mt-8 text-lg font-semibold text-unh-primary dark:text-slate-100">{children}</h3>
      ),
    bulletList: ({ children }) => <ul className="mt-5 list-disc space-y-2 pl-6 marker:text-link">{children}</ul>,
    orderedList: ({ node, children }) => (
      <ol start={node.attrs?.start ?? 1} className="mt-5 list-decimal space-y-2 pl-6 marker:font-semibold marker:text-unh-primary dark:marker:text-unh-secondary">
        {children}
      </ol>
    ),
    // List items wrap their text in a paragraph; [&>p]:mt-0 stops it adding extra space.
    listItem: ({ children }) => <li className="[&>p]:mt-0">{children}</li>,
    codeBlock: ({ children }) => (
      <pre className="mt-5 overflow-x-auto rounded-lg bg-unh-deep p-4 font-mono text-sm text-slate-100 dark:bg-black/40">
        <code>{children}</code>
      </pre>
    ),
    blockquote: ({ children }) => (
      <blockquote className="mt-5 border-l-4 border-unh-tertiary-light pl-4 italic">{children}</blockquote>
    ),
    hardBreak: () => <br />,
    horizontalRule: () => <hr className="my-10 border-slate-200 dark:border-slate-700" />,
  },
  markMapping: {
    bold: ({ children }) => <strong>{children}</strong>,
    italic: ({ children }) => <em>{children}</em>,
    underline: ({ children }) => <u>{children}</u>,
    strike: ({ children }) => <s>{children}</s>,
    code: ({ children }) => (
      <code className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[0.9em] dark:bg-white/10">{children}</code>
    ),
    link: ({ mark, children }) => (
      <a
        href={safeHref(mark.attrs?.href)}
        className="text-link underline decoration-2 underline-offset-4"
      >
        {children}
      </a>
    ),
  },
  // Anything the editor adds later that isn't mapped above is skipped instead of crashing the page.
  unhandledNode: () => null,
  unhandledMark: ({ children }) => <>{children}</>,
});

/** Renders an article's Tiptap JSON as HTML on the server. No editor code ships to readers. */
export default function ArticleBody({ body }: { body: JSONContent }) {
  return renderArticle({ content: body });
}
