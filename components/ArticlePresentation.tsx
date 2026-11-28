import type { ReactNode } from "react";
import type { JSONContent } from "@tiptap/core";
import ArticleBody, { type ArticleHeading } from "./ArticleBody";

export function ArticleHeader({
  title,
  summary,
  children,
}: {
  title: string;
  summary: string;
  children?: ReactNode;
}) {
  return (
    <header>
      <h1 className="m-0 text-[clamp(2rem,3.15vw,2.9375rem)] leading-[1.07] font-[750] tracking-[-0.045em] text-kb-heading">
        {title}
      </h1>
      {summary && <p className="mt-3 max-w-[40rem] text-[1.0625rem] leading-[1.55] text-kb-muted">{summary}</p>}
      {children}
    </header>
  );
}

export function ArticleText({ body }: { body: JSONContent }) {
  return (
    <div className="text-[0.9375rem] leading-[1.6] text-kb-muted [&>:first-child]:mt-[1.5625rem]">
      <ArticleBody body={body} />
    </div>
  );
}

export function OutlineLinks({
  headings,
  onJump,
}: {
  headings: ArticleHeading[];
  onJump?: (id: string) => void;
}) {
  return (
    <ul className="m-0 list-none p-0">
      {headings.map(({ id, title }) => (
        <li key={id}>
          <a
            href={`#${encodeURIComponent(id)}`}
            onClick={onJump ? (event) => {
              event.preventDefault();
              onJump(id);
            } : undefined}
            className="block py-[0.3125rem] text-[0.8125rem] leading-[1.45] wrap-anywhere text-kb-muted hover:text-link hover:underline"
          >
            {title}
          </a>
        </li>
      ))}
    </ul>
  );
}
