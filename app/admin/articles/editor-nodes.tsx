"use client";

import { useId } from "react";
import { PlusIcon, TrashIcon } from "@heroicons/react/24/outline";
import { Button, Input } from "@heroui/react";
import type { JSONContent } from "@tiptap/core";
import {
  NodeViewContent,
  NodeViewWrapper,
  ReactNodeViewRenderer,
  useEditorState,
  type NodeViewProps,
} from "@tiptap/react";
import { ArticleImage, ArticleTab, ArticleTabs } from "@/components/article-extensions";
import { articleImageAltMaxLength, validArticleImageSrc } from "@/lib/article-media";

const nodePanel = "my-3 overflow-hidden rounded-[0.625rem] border border-kb-line bg-kb-panel";
const nodeToolbar = "flex flex-wrap items-center gap-2 px-2.5 py-2 text-[0.8125rem] text-kb-heading";
const nodeField = `${nodeToolbar} [&>input]:min-w-32 [&>input]:flex-1 [&>label]:font-[650]`;

export function articleTab(label: string): JSONContent {
  return { type: "articleTab", attrs: { label }, content: [{ type: "paragraph" }] };
}

function ImageView({ node, updateAttributes, deleteNode, selected }: NodeViewProps) {
  const altId = useId();
  const { src, alt } = node.attrs as { src?: unknown; alt?: unknown };
  const altText = typeof alt === "string" ? alt : "";

  return (
    <NodeViewWrapper as="figure" className={`${nodePanel} data-[selected]:outline-2 data-[selected]:outline-offset-2 data-[selected]:outline-focus`} data-selected={selected || undefined}>
      {validArticleImageSrc(src) && (
        // eslint-disable-next-line @next/next/no-img-element -- Editorial image URLs may come from any HTTPS origin.
        <img src={src} alt={altText} loading="lazy" referrerPolicy="no-referrer" className="mx-auto block max-h-96 max-w-full object-contain" />
      )}
      <div className={nodeField} contentEditable={false}>
        <label htmlFor={altId}>Alt text</label>
        <Input
          id={altId}
          value={altText}
          maxLength={articleImageAltMaxLength}
          onChange={(event) => updateAttributes({ alt: event.target.value })}
          onKeyDown={preventFormSubmit}
        />
        <RemoveNodeButton label="Remove image" remove={deleteNode} />
      </div>
    </NodeViewWrapper>
  );
}

function TabsView({ editor, node, getPos, deleteNode }: NodeViewProps) {
  function addTab() {
    const position = getPos();
    if (position === undefined || node.childCount >= 8) return;
    editor.commands.insertContentAt(
      position + node.nodeSize - 1,
      articleTab(`Tab ${node.childCount + 1}`),
      { updateSelection: false },
    );
  }

  return (
    <NodeViewWrapper className={nodePanel}>
      <div className={nodeToolbar} contentEditable={false}>
        <span className="me-auto font-bold">Tabbed content</span>
        <Button type="button" variant="ghost" size="sm" isDisabled={node.childCount >= 8} onPress={addTab}>
          <PlusIcon aria-hidden="true" className="size-4 shrink-0" /> Add tab
        </Button>
        <RemoveNodeButton label="Remove tab group" remove={deleteNode} />
      </div>
      <NodeViewContent className="px-2.5 pb-2.5" />
    </NodeViewWrapper>
  );
}

function TabView({ editor, node, getPos, updateAttributes, deleteNode }: NodeViewProps) {
  const labelId = useId();
  const canRemove = useEditorState({
    editor,
    selector: ({ editor }) => {
      const position = getPos();
      return position !== undefined && position <= editor.state.doc.content.size
        && editor.state.doc.resolve(position).parent.childCount > 2;
    },
  });

  return (
    <NodeViewWrapper className="overflow-hidden rounded-lg border border-kb-line bg-background not-first:mt-2">
      <div className={nodeField} contentEditable={false}>
        <label htmlFor={labelId}>Tab title</label>
        <Input
          id={labelId}
          value={typeof node.attrs.label === "string" ? node.attrs.label : ""}
          maxLength={80}
          onChange={(event) => updateAttributes({ label: event.target.value })}
          onKeyDown={preventFormSubmit}
        />
        <RemoveNodeButton label="Remove tab" remove={deleteNode} disabled={!canRemove} />
      </div>
      <NodeViewContent className="min-h-11 border-t border-kb-line px-3 pt-1.5 pb-2.5" />
    </NodeViewWrapper>
  );
}

function preventFormSubmit(event: React.KeyboardEvent) {
  if (event.key === "Enter") event.preventDefault();
}

function RemoveNodeButton({
  label,
  remove,
  disabled = false,
}: {
  label: string;
  remove: () => void;
  disabled?: boolean;
}) {
  return (
    <Button type="button" variant="ghost" size="sm" isIconOnly isDisabled={disabled} aria-label={label} onPress={remove}>
      <TrashIcon aria-hidden="true" className="size-4 shrink-0" />
    </Button>
  );
}

export const EditorArticleImage = ArticleImage.extend({
  addNodeView: () => ReactNodeViewRenderer(ImageView),
});

export const EditorArticleTabs = ArticleTabs.extend({
  addNodeView: () => ReactNodeViewRenderer(TabsView),
});

export const EditorArticleTab = ArticleTab.extend({
  addNodeView: () => ReactNodeViewRenderer(TabView),
});
