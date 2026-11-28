"use client";

import { useEffect, useId, useRef, useState } from "react";
import {
  ArrowUturnLeftIcon,
  ArrowUturnRightIcon,
  BoldIcon,
  ChatBubbleBottomCenterTextIcon,
  ChevronDownIcon,
  CodeBracketIcon,
  ItalicIcon,
  LinkIcon,
  ListBulletIcon,
  NumberedListIcon,
  PhotoIcon,
  QueueListIcon,
  RectangleStackIcon,
  StrikethroughIcon,
  UnderlineIcon,
} from "@heroicons/react/24/outline";
import { Button, Dropdown, Input, ToggleButton, Toolbar, Tooltip } from "@heroui/react";
import { useEditorState, type Editor } from "@tiptap/react";
import { validHref } from "@/lib/admin/validation";
import { adminStyles } from "../admin-styles";
import { articlePanel, type ArticlePanelGroup } from "./editor-nodes";
import ImagePanel from "./image-panel";

const textStyles = [
  { id: "paragraph", label: "Paragraph" },
  { id: "heading-2", label: "Heading 2" },
  { id: "heading-3", label: "Heading 3" },
] as const;

const toolbarGroup = "flex items-center gap-0.5";
const groupSeparators = "min-[32rem]:[&>div+div]:ms-[0.15rem] min-[32rem]:[&>div+div]:border-s min-[32rem]:[&>div+div]:border-kb-line min-[32rem]:[&>div+div]:ps-[0.35rem]";

type FormatCommand = {
  label: string;
  icon: typeof BoldIcon;
  pressed: boolean;
  run: () => boolean;
};

function selectionInsidePanelGroup(editor: Editor) {
  const { $to } = editor.state.selection;
  for (let depth = $to.depth; depth > 0; depth -= 1) {
    const type = $to.node(depth).type.name;
    if (type === "articleTabs" || type === "articleAccordion") return true;
  }
  return false;
}

export default function FormattingToolbar({
  editor,
  onUploadChange,
}: {
  editor: Editor;
  onUploadChange: (uploading: boolean) => void;
}) {
  const [link, setLink] = useState<string | null>(null);
  const [linkError, setLinkError] = useState(false);
  const [imageOpen, setImageOpen] = useState(false);
  const linkId = useId();
  const imagePanelId = `${linkId}-image`;
  const linkInput = useRef<HTMLInputElement>(null);
  const linkOpen = link !== null;

  useEffect(() => {
    if (linkOpen) linkInput.current?.focus();
  }, [linkOpen]);

  const active = useEditorState({
    editor,
    selector: ({ editor }) => ({
      heading2: editor.isActive("heading", { level: 2 }),
      heading3: editor.isActive("heading", { level: 3 }),
      bold: editor.isActive("bold"),
      italic: editor.isActive("italic"),
      underline: editor.isActive("underline"),
      strike: editor.isActive("strike"),
      bulletList: editor.isActive("bulletList"),
      orderedList: editor.isActive("orderedList"),
      blockquote: editor.isActive("blockquote"),
      codeBlock: editor.isActive("codeBlock"),
      insidePanelGroup: selectionInsidePanelGroup(editor),
      link: editor.isActive("link"),
      canUndo: editor.can().undo(),
      canRedo: editor.can().redo(),
    }),
  });

  const textStyle = active.heading2 ? textStyles[1] : active.heading3 ? textStyles[2] : textStyles[0];
  const marks: FormatCommand[] = [
    { label: "Bold", icon: BoldIcon, pressed: active.bold, run: () => editor.chain().focus().toggleBold().run() },
    { label: "Italic", icon: ItalicIcon, pressed: active.italic, run: () => editor.chain().focus().toggleItalic().run() },
    { label: "Underline", icon: UnderlineIcon, pressed: active.underline, run: () => editor.chain().focus().toggleUnderline().run() },
    { label: "Strikethrough", icon: StrikethroughIcon, pressed: active.strike, run: () => editor.chain().focus().toggleStrike().run() },
  ];
  const blocks: FormatCommand[] = [
    { label: "Bulleted list", icon: ListBulletIcon, pressed: active.bulletList, run: () => editor.chain().focus().toggleBulletList().run() },
    { label: "Numbered list", icon: NumberedListIcon, pressed: active.orderedList, run: () => editor.chain().focus().toggleOrderedList().run() },
    { label: "Quote", icon: ChatBubbleBottomCenterTextIcon, pressed: active.blockquote, run: () => editor.chain().focus().toggleBlockquote().run() },
    { label: "Code block", icon: CodeBracketIcon, pressed: active.codeBlock, run: () => editor.chain().focus().toggleCodeBlock().run() },
  ];
  const linkLabel = active.link ? "Edit link" : "Add link";

  function changeTextStyle(key: React.Key) {
    const chain = editor.chain().focus();
    switch (key) {
      case "paragraph":
        chain.setParagraph().run();
        break;
      case "heading-2":
        chain.setHeading({ level: 2 }).run();
        break;
      case "heading-3":
        chain.setHeading({ level: 3 }).run();
        break;
    }
  }

  function closeLinkPanel() {
    setLink(null);
    setLinkError(false);
    editor.commands.focus();
  }

  function closeImagePanel() {
    setImageOpen(false);
    editor.commands.focus();
  }

  function insertPanelGroup(type: ArticlePanelGroup) {
    setLink(null);
    setLinkError(false);
    setImageOpen(false);
    editor.chain().focus().insertContentAt(editor.state.selection.to, {
      type,
      content: [articlePanel(type, 1), articlePanel(type, 2)],
    }).run();
  }

  function applyLink() {
    const href = link?.trim() ?? "";
    if (!validHref(href)) {
      setLinkError(true);
      return;
    }

    const chain = editor.chain().focus();
    if (editor.state.selection.empty && !editor.isActive("link")) {
      chain.insertContent({ type: "text", text: href, marks: [{ type: "link", attrs: { href } }] }).run();
    } else {
      chain.extendMarkRange("link").setLink({ href }).run();
    }
    closeLinkPanel();
  }

  return (
    <>
      <Toolbar className={`${adminStyles.toolbar} ${groupSeparators}`} aria-label="Article formatting">
        <div className={toolbarGroup}>
          <Dropdown>
            <Dropdown.Trigger
              className="inline-flex min-h-8 min-w-27 items-center justify-between gap-[0.4rem] rounded-md px-2 text-[0.8125rem] font-[650] text-kb-heading hover:bg-kb-hover focus-visible:-outline-offset-2 focus-visible:outline-2 focus-visible:outline-focus data-[open]:bg-kb-hover"
              type="button"
              aria-label={`Text style: ${textStyle.label}`}
            >
              {textStyle.label}
              <ChevronDownIcon aria-hidden="true" className="size-4 shrink-0" />
            </Dropdown.Trigger>
            <Dropdown.Popover placement="bottom start">
              <Dropdown.Menu
                aria-label="Text style"
                selectionMode="single"
                selectedKeys={[textStyle.id]}
                onAction={changeTextStyle}
              >
                {textStyles.map(({ id, label }) => (
                  <Dropdown.Item key={id} id={id} textValue={label}>
                    {label}
                    <Dropdown.ItemIndicator />
                  </Dropdown.Item>
                ))}
              </Dropdown.Menu>
            </Dropdown.Popover>
          </Dropdown>
        </div>

        <ToggleGroup label="Text formatting" commands={marks} />
        <ToggleGroup label="Lists and blocks" commands={blocks} />

        <div className={toolbarGroup} role="group" aria-label="Insert content">
          <Tooltip delay={300}>
            <Button
              variant="ghost"
              size="sm"
              type="button"
              isIconOnly
              isDisabled={active.codeBlock}
              aria-label={linkLabel}
              aria-expanded={linkOpen}
              aria-controls={linkOpen ? `${linkId}-panel` : undefined}
              onPress={() => {
                if (linkOpen) closeLinkPanel();
                else {
                  setImageOpen(false);
                  setLink(editor.getAttributes("link").href ?? "");
                }
              }}
            >
              <LinkIcon aria-hidden="true" className="size-4 shrink-0" />
            </Button>
            <Tooltip.Content>{linkLabel}</Tooltip.Content>
          </Tooltip>
          <Tooltip delay={300}>
            <Button
              variant="ghost"
              size="sm"
              type="button"
              isIconOnly
              isDisabled={active.codeBlock}
              aria-label="Insert image"
              aria-expanded={imageOpen}
              aria-controls={imageOpen ? imagePanelId : undefined}
              onPress={() => {
                if (imageOpen) closeImagePanel();
                else {
                  setLink(null);
                  setLinkError(false);
                  setImageOpen(true);
                }
              }}
            >
              <PhotoIcon aria-hidden="true" className="size-4 shrink-0" />
            </Button>
            <Tooltip.Content>Insert image</Tooltip.Content>
          </Tooltip>
          <Tooltip delay={300}>
            <Button
              variant="ghost"
              size="sm"
              type="button"
              isIconOnly
              isDisabled={active.codeBlock || active.insidePanelGroup}
              aria-label="Insert tabs"
              onPress={() => insertPanelGroup("articleTabs")}
            >
              <RectangleStackIcon aria-hidden="true" className="size-4 shrink-0" />
            </Button>
            <Tooltip.Content>Insert tabs</Tooltip.Content>
          </Tooltip>
          <Tooltip delay={300}>
            <Button
              variant="ghost"
              size="sm"
              type="button"
              isIconOnly
              isDisabled={active.codeBlock || active.insidePanelGroup}
              aria-label="Insert accordion"
              onPress={() => insertPanelGroup("articleAccordion")}
            >
              <QueueListIcon aria-hidden="true" className="size-4 shrink-0" />
            </Button>
            <Tooltip.Content>Insert accordion</Tooltip.Content>
          </Tooltip>
        </div>
        <div className={toolbarGroup} role="group" aria-label="History">
          <Tooltip delay={300}>
            <Button
              variant="ghost"
              size="sm"
              type="button"
              isIconOnly
              isDisabled={!active.canUndo}
              aria-label="Undo"
              onPress={() => editor.chain().focus().undo().run()}
            >
              <ArrowUturnLeftIcon aria-hidden="true" className="size-4 shrink-0" />
            </Button>
            <Tooltip.Content>Undo</Tooltip.Content>
          </Tooltip>
          <Tooltip delay={300}>
            <Button
              variant="ghost"
              size="sm"
              type="button"
              isIconOnly
              isDisabled={!active.canRedo}
              aria-label="Redo"
              onPress={() => editor.chain().focus().redo().run()}
            >
              <ArrowUturnRightIcon aria-hidden="true" className="size-4 shrink-0" />
            </Button>
            <Tooltip.Content>Redo</Tooltip.Content>
          </Tooltip>
        </div>
      </Toolbar>

      {imageOpen && (
        <ImagePanel editor={editor} id={imagePanelId} onClose={closeImagePanel} onUploadChange={onUploadChange} />
      )}
      {link !== null && (
        <div id={`${linkId}-panel`} className={adminStyles.linkPanel}>
          <label htmlFor={linkId}>Link URL</label>
          <div className={adminStyles.linkControls}>
            <Input
              ref={linkInput}
              id={linkId}
              value={link}
              inputMode="url"
              spellCheck={false}
              aria-invalid={linkError || undefined}
              aria-describedby={linkError ? `${linkId}-error` : undefined}
              onChange={(event) => {
                setLink(event.target.value);
                setLinkError(false);
              }}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  applyLink();
                }
                if (event.key === "Escape") {
                  event.preventDefault();
                  closeLinkPanel();
                }
              }}
            />
            <Button size="sm" type="button" variant="secondary" onPress={applyLink}>Apply</Button>
            {active.link && (
              <Button size="sm" type="button" variant="ghost" onPress={() => {
                editor.chain().focus().extendMarkRange("link").unsetLink().run();
                closeLinkPanel();
              }}>Remove link</Button>
            )}
            <Button size="sm" type="button" variant="ghost" onPress={closeLinkPanel}>Cancel</Button>
          </div>
          {linkError && <p id={`${linkId}-error`} className={adminStyles.error} role="alert">Enter a valid web, email, or site link.</p>}
        </div>
      )}
    </>
  );
}

function ToggleGroup({ label, commands }: { label: string; commands: FormatCommand[] }) {
  return (
    <div className={toolbarGroup} role="group" aria-label={label}>
      {commands.map(({ label, icon: Icon, pressed, run }) => (
        <Tooltip key={label} delay={300}>
          <ToggleButton
            size="sm"
            isIconOnly
            variant="ghost"
            aria-label={label}
            isSelected={pressed}
            onChange={run}
          >
            <Icon aria-hidden="true" className="size-4 shrink-0" />
          </ToggleButton>
          <Tooltip.Content>{label}</Tooltip.Content>
        </Tooltip>
      ))}
    </div>
  );
}
