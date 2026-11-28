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
import {
  ArticleAccordion,
  ArticleAccordionItem,
  ArticleAlert as ArticleAlertExtension,
  ArticleImage,
  ArticleTab,
  ArticleTabs,
} from "@/components/article-extensions";
import ArticleAlert from "@/components/ArticleAlert";
import {
  articleAlertStatuses,
  articleAlertTitleMaxLength,
  defaultArticleAlertStatus,
  isArticleAlertStatus,
} from "@/lib/article-alert";
import { articleImageAltMaxLength, validArticleImageSrc } from "@/lib/article-media";
import { adminStyles } from "../admin-styles";

const nodePanel = "my-3 overflow-hidden rounded-[0.625rem] border border-kb-line bg-kb-panel";
const nodeToolbar = "flex flex-wrap items-center gap-2 px-2.5 py-2 text-[0.8125rem] text-kb-heading";
const nodeField = `${nodeToolbar} [&>input]:min-w-32 [&>input]:flex-1 [&>label]:font-[650]`;
const maxPanels = 8;
const maxTitleLength = 80;

const groups = {
  articleTabs: {
    heading: "Tabbed content",
    nodeType: "articleTab",
    titleAttribute: "label",
    panelLabel: "Tab",
    deleteLabel: "Remove tab group",
    minPanels: 2,
  },
  articleAccordion: {
    heading: "Accordion",
    nodeType: "articleAccordionItem",
    titleAttribute: "title",
    panelLabel: "Section",
    deleteLabel: "Remove accordion",
    minPanels: 1,
  },
} as const;

export type ArticlePanelGroup = keyof typeof groups;

export function articlePanel(group: ArticlePanelGroup, number: number): JSONContent {
  const { nodeType, titleAttribute, panelLabel } = groups[group];
  return {
    type: nodeType,
    attrs: { [titleAttribute]: `${panelLabel} ${number}` },
    content: [{ type: "paragraph" }],
  };
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

function AlertView({ editor, node, updateAttributes, deleteNode }: NodeViewProps) {
  const typeId = useId();
  const titleId = useId();
  const { status, title } = node.attrs;
  const alertStatus = isArticleAlertStatus(status) ? status : defaultArticleAlertStatus;

  return (
    <NodeViewWrapper>
      <ArticleAlert status={alertStatus} title={null}>
        <div className="mb-3 grid grid-cols-[minmax(0,1fr)_auto] items-end gap-2" contentEditable={false}>
          <div className="grid min-w-0 gap-2 min-[36rem]:grid-cols-[minmax(7rem,0.55fr)_minmax(0,1fr)]">
            <div className={adminStyles.field}>
              <label htmlFor={typeId}>Alert type</label>
              <select
                id={typeId}
                value={alertStatus}
                onChange={(event) => updateAttributes({ status: event.target.value })}
              >
                {Object.entries(articleAlertStatuses).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </div>
            <div className={adminStyles.field}>
              <label htmlFor={titleId}>Alert title</label>
              <Input
                id={titleId}
                value={typeof title === "string" ? title : ""}
                maxLength={articleAlertTitleMaxLength}
                placeholder="Optional"
                onChange={(event) => updateAttributes({ title: event.target.value })}
                onKeyDown={preventFormSubmit}
              />
            </div>
          </div>
          <RemoveNodeButton label="Remove alert" remove={deleteNode} />
        </div>
        <NodeViewContent
          role="group"
          aria-label="Alert content"
          className="min-h-9 border-t border-kb-line pt-2"
          onPointerDown={(event) => {
            // Restore editor focus before ProseMirror selects the clicked position.
            if (event.button === 0 && !editor.view.hasFocus()) editor.view.focus();
          }}
        />
      </ArticleAlert>
    </NodeViewWrapper>
  );
}

function GroupView({ editor, node, getPos, deleteNode }: NodeViewProps) {
  const type = node.type.name === "articleAccordion" ? "articleAccordion" : "articleTabs";
  const { heading, panelLabel, deleteLabel } = groups[type];
  const addLabel = `Add ${panelLabel.toLowerCase()}`;

  function addPanel() {
    const position = getPos();
    if (position === undefined || node.childCount >= maxPanels) return;
    editor.commands.insertContentAt(
      position + node.nodeSize - 1,
      articlePanel(type, node.childCount + 1),
      { updateSelection: false },
    );
  }

  return (
    <NodeViewWrapper className={nodePanel}>
      <div className={nodeToolbar} contentEditable={false}>
        <span className="me-auto font-bold">{heading}</span>
        <Button type="button" variant="ghost" size="sm" isDisabled={node.childCount >= maxPanels} onPress={addPanel}>
          <PlusIcon aria-hidden="true" className="size-4 shrink-0" />
          {addLabel}
        </Button>
        <RemoveNodeButton label={deleteLabel} remove={deleteNode} />
      </div>
      <NodeViewContent className="px-2.5 pb-2.5" />
    </NodeViewWrapper>
  );
}

function PanelView({ editor, node, getPos, updateAttributes, deleteNode }: NodeViewProps) {
  const labelId = useId();
  const type = node.type.name === "articleAccordionItem" ? "articleAccordion" : "articleTabs";
  const { panelLabel, titleAttribute, minPanels } = groups[type];
  const title = node.attrs[titleAttribute];
  const canRemove = useEditorState({
    editor,
    selector: ({ editor }) => {
      const position = getPos();
      return position !== undefined && position <= editor.state.doc.content.size
        && editor.state.doc.resolve(position).parent.childCount > minPanels;
    },
  });

  return (
    <NodeViewWrapper className="overflow-hidden rounded-lg border border-kb-line bg-background not-first:mt-2">
      <div className={nodeField} contentEditable={false}>
        <label htmlFor={labelId}>{panelLabel} title</label>
        <Input
          id={labelId}
          value={typeof title === "string" ? title : ""}
          maxLength={maxTitleLength}
          onChange={(event) => updateAttributes({ [titleAttribute]: event.target.value })}
          onKeyDown={preventFormSubmit}
        />
        <RemoveNodeButton label={`Remove ${panelLabel.toLowerCase()}`} remove={deleteNode} disabled={!canRemove} />
      </div>
      <NodeViewContent role="group" aria-label={`${panelLabel} content`} className="min-h-11 border-t border-kb-line px-3 pt-1.5 pb-2.5" />
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

export const EditorArticleAlert = ArticleAlertExtension.extend({
  addNodeView: () => ReactNodeViewRenderer(AlertView),
});

export const EditorArticleTabs = ArticleTabs.extend({
  addNodeView: () => ReactNodeViewRenderer(GroupView),
});

export const EditorArticleTab = ArticleTab.extend({
  addNodeView: () => ReactNodeViewRenderer(PanelView),
});

export const EditorArticleAccordion = ArticleAccordion.extend({
  addNodeView: () => ReactNodeViewRenderer(GroupView),
});

export const EditorArticleAccordionItem = ArticleAccordionItem.extend({
  addNodeView: () => ReactNodeViewRenderer(PanelView),
});
