"use client";

import { useId } from "react";
import type { JSONContent } from "@tiptap/core";
import { Button, Modal } from "@heroui/react";
import { EyeIcon } from "@heroicons/react/24/outline";
import { prepareArticleBody } from "@/components/ArticleBody";
import { ArticleHeader, ArticleText, OutlineLinks } from "@/components/ArticlePresentation";

type PreviewArticle = { title: string; summary: string; body: JSONContent };

function PreviewContent({ title, summary, body }: PreviewArticle) {
  const id = useId();
  const { content, headings } = prepareArticleBody(body, "", `preview-${id}`);

  return (
    <article className="mx-auto min-w-0 max-w-[49rem] wrap-anywhere">
      <ArticleHeader title={title.trim() || "Untitled article"} summary={summary.trim()} />
      {headings.length > 0 && (
        <details className="mt-[1.125rem] rounded-lg border border-kb-line bg-kb-panel px-[0.8125rem] py-2.5">
          <summary className="cursor-pointer text-sm font-[650] text-kb-heading">On this page</summary>
          <div className="mt-1.5 ps-[1.0625rem]">
            <OutlineLinks
              headings={headings}
              onJump={(heading) => document.getElementById(heading)?.scrollIntoView({ block: "start" })}
            />
          </div>
        </details>
      )}
      {content.content?.length
        ? <ArticleText body={content} />
        : <p className="mt-5 text-sm text-kb-muted">Add article content to preview it here.</p>}
    </article>
  );
}

export default function DraftPreview({
  title,
  summary,
  body,
  isDisabled,
}: PreviewArticle & { isDisabled?: boolean }) {
  return (
    <Modal>
      <Button type="button" variant="secondary" isDisabled={isDisabled}>
        <EyeIcon aria-hidden="true" className="size-4" />
        Preview
      </Button>
      <Modal.Backdrop>
        <Modal.Container scroll="inside" size="lg">
          <Modal.Dialog className="max-w-[54rem] border border-kb-line bg-background">
            <Modal.Header className="border-b border-kb-line">
              <Modal.Heading className="text-base font-semibold text-kb-heading">Draft preview</Modal.Heading>
              <Modal.CloseTrigger aria-label="Close draft preview" />
            </Modal.Header>
            <Modal.Body className="min-w-0">
              <PreviewContent title={title} summary={summary} body={body} />
            </Modal.Body>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
}
