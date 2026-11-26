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
import styles from "./editor.module.css";

export function articleTab(label: string): JSONContent {
  return { type: "articleTab", attrs: { label }, content: [{ type: "paragraph" }] };
}

function ImageView({ node, updateAttributes, deleteNode, selected }: NodeViewProps) {
  const altId = useId();
  const { src, alt } = node.attrs as { src?: unknown; alt?: unknown };
  const altText = typeof alt === "string" ? alt : "";

  return (
    <NodeViewWrapper as="figure" className={styles.editorImage} data-selected={selected || undefined}>
      {validArticleImageSrc(src) && (
        // eslint-disable-next-line @next/next/no-img-element -- Editorial image URLs may come from any HTTPS origin.
        <img src={src} alt={altText} loading="lazy" referrerPolicy="no-referrer" />
      )}
      <div className={styles.nodeControls} contentEditable={false}>
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
    <NodeViewWrapper className={styles.tabGroup}>
      <div className={styles.tabGroupHeader} contentEditable={false}>
        <span>Tabbed content</span>
        <Button type="button" variant="ghost" size="sm" isDisabled={node.childCount >= 8} onPress={addTab}>
          <PlusIcon aria-hidden="true" className={styles.icon} /> Add tab
        </Button>
        <RemoveNodeButton label="Remove tab group" remove={deleteNode} />
      </div>
      <NodeViewContent className={styles.tabPanels} />
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
    <NodeViewWrapper className={styles.editorTab}>
      <div className={styles.nodeControls} contentEditable={false}>
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
      <NodeViewContent className={styles.editorTabContent} />
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
      <TrashIcon aria-hidden="true" className={styles.icon} />
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
