"use client";

import { useEffect, useRef, useState } from "react";
import { Button, Input } from "@heroui/react";
import { useEditorState, type Editor } from "@tiptap/react";
import styles from "../admin.module.css";

export default function FormattingToolbar({ editor }: { editor: Editor }) {
  const [link, setLink] = useState<string | null>(null);
  const [linkError, setLinkError] = useState(false);
  const linkInput = useRef<HTMLInputElement>(null);
  const linkOpen = link !== null;

  useEffect(() => {
    if (linkOpen) linkInput.current?.focus();
  }, [linkOpen]);

  const active = useEditorState({
    editor,
    selector: ({ editor }) => ({
      paragraph: editor.isActive("paragraph"),
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
      link: editor.isActive("link"),
      canUndo: editor.can().undo(),
      canRedo: editor.can().redo(),
    }),
  });

  const commands = [
    { label: "Paragraph", pressed: active.paragraph, run: () => editor.chain().focus().setParagraph().run() },
    { label: "Heading 2", pressed: active.heading2, run: () => editor.chain().focus().toggleHeading({ level: 2 }).run() },
    { label: "Heading 3", pressed: active.heading3, run: () => editor.chain().focus().toggleHeading({ level: 3 }).run() },
    { label: "Bold", pressed: active.bold, run: () => editor.chain().focus().toggleBold().run() },
    { label: "Italic", pressed: active.italic, run: () => editor.chain().focus().toggleItalic().run() },
    { label: "Underline", pressed: active.underline, run: () => editor.chain().focus().toggleUnderline().run() },
    { label: "Strikethrough", pressed: active.strike, run: () => editor.chain().focus().toggleStrike().run() },
    { label: "Bulleted list", pressed: active.bulletList, run: () => editor.chain().focus().toggleBulletList().run() },
    { label: "Numbered list", pressed: active.orderedList, run: () => editor.chain().focus().toggleOrderedList().run() },
    { label: "Quote", pressed: active.blockquote, run: () => editor.chain().focus().toggleBlockquote().run() },
    { label: "Code block", pressed: active.codeBlock, run: () => editor.chain().focus().toggleCodeBlock().run() },
  ];

  function closeLinkPanel() {
    setLink(null);
    setLinkError(false);
    editor.commands.focus();
  }

  function applyLink() {
    const href = link?.trim() ?? "";
    if (!/^(https?:\/\/|mailto:|#|\/(?![/\\]))/i.test(href) || /[\s\u0000-\u001f]/u.test(href)) {
      setLinkError(true);
      return;
    }
    editor.chain().focus().extendMarkRange("link").setLink({ href }).run();
    closeLinkPanel();
  }

  return (
    <>
      <div className={styles.toolbar} role="group" aria-label="Article formatting">
        {commands.map(({ label, pressed, run }) => (
          <Button
            key={label}
            variant="ghost"
            size="sm"
            type="button"
            aria-pressed={pressed}
            onPress={run}
          >
            {label}
          </Button>
        ))}
        <Button
          variant="ghost"
          size="sm"
          type="button"
          aria-expanded={linkOpen}
          onPress={() => {
            if (linkOpen) closeLinkPanel();
            else setLink(editor.getAttributes("link").href ?? "");
          }}
        >
          {active.link ? "Edit link" : "Add link"}
        </Button>
        <Button variant="ghost" size="sm" type="button" isDisabled={!active.canUndo} onPress={() => editor.chain().focus().undo().run()}>
          Undo
        </Button>
        <Button variant="ghost" size="sm" type="button" isDisabled={!active.canRedo} onPress={() => editor.chain().focus().redo().run()}>
          Redo
        </Button>
      </div>
      {link !== null && (
        <div className={styles.linkPanel}>
          <label htmlFor="admin-editor-link">Link URL</label>
          <div className={styles.linkControls}>
            <Input
              ref={linkInput}
              id="admin-editor-link"
              value={link}
              aria-invalid={linkError || undefined}
              aria-describedby={linkError ? "admin-link-error" : undefined}
              onChange={(event) => setLink(event.target.value)}
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
          {linkError && <p id="admin-link-error" className={styles.error} role="alert">Enter a web, email, or site link.</p>}
        </div>
      )}
    </>
  );
}
