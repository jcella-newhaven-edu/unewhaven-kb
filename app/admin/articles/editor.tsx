"use client";

import { useActionState, useEffect, useId, useState } from "react";
import type { JSONContent } from "@tiptap/core";
import { StarterKit } from "@tiptap/starter-kit";
import { EditorContent, useEditor, type Editor } from "@tiptap/react";
import { Alert, Button, Description, FieldError, Form, Input, InputGroup, Label, TextArea, TextField } from "@heroui/react";
import Link from "next/link";
import { createArticle, updateArticle } from "@/lib/admin/actions";
import { slugFromTitle } from "@/lib/admin/slug";
import FormattingToolbar from "./formatting-toolbar";
import styles from "../admin.module.css";
import editorStyles from "./editor.module.css";

type Topic = { slug: string; title: string; parentSlug: string | null };

type ExistingArticle = {
  slug: string;
  title: string;
  summary: string;
  topicSlug: string;
  published: boolean;
  updatedToken: string;
  body: JSONContent;
  bodyText: string;
};

const emptyDocument: JSONContent = { type: "doc", content: [{ type: "paragraph" }] };

const extensions = [
  StarterKit.configure({
    heading: { levels: [2, 3] },
    link: { openOnClick: false },
  }),
];

function editorContent(article?: ExistingArticle): JSONContent {
  if (!article) return emptyDocument;
  if (article.body?.type === "doc" && Array.isArray(article.body.content) && article.body.content.length) {
    return article.body;
  }
  const paragraphs = article.bodyText.split(/\r?\n/).filter((line) => line.trim()).map((line) => ({
    type: "paragraph",
    content: [{ type: "text", text: line }],
  }));
  return paragraphs.length ? { type: "doc", content: paragraphs } : emptyDocument;
}

export function SaveError({ message }: { message: string }) {
  return (
    <Alert status="danger" role="alert">
      <Alert.Indicator />
      <Alert.Content><Alert.Description>{message}</Alert.Description></Alert.Content>
    </Alert>
  );
}

export default function AdminArticleForm({ article, topics }: { article?: ExistingArticle; topics: Topic[] }) {
  const [result, save, saving] = useActionState(article ? updateArticle : createArticle, {});
  const formId = useId();
  const topicId = `${formId}-topic`;
  const statusId = `${formId}-status`;
  const bodyLabelId = `${formId}-body-label`;
  const [title, setTitle] = useState(article?.title ?? "");
  const [summary, setSummary] = useState(article?.summary ?? "");
  const [topic, setTopic] = useState(article?.topicSlug ?? "");
  const [published, setPublished] = useState(article?.published ? "true" : "false");
  const [slugOverride, setSlugOverride] = useState<string>();
  const [body, setBody] = useState<JSONContent | null>(() => article ? null : emptyDocument);
  const [initialBody] = useState(() => editorContent(article));
  const editor = useEditor({
    extensions,
    content: initialBody,
    immediatelyRender: false,
    editorProps: {
      attributes: {
        "aria-labelledby": bodyLabelId,
        "aria-multiline": "true",
        role: "textbox",
        spellcheck: "true",
      },
    },
    onUpdate: ({ editor }) => setBody(editor.getJSON()),
  });

  useEffect(() => {
    editor?.setEditable(!saving, false);
  }, [editor, saving]);

  const errors = result.fieldErrors ?? {};
  const topicsBySlug = new Map(topics.map((item) => [item.slug, item.title]));
  const slug = slugOverride ?? article?.slug ?? slugFromTitle(title);

  return (
    <Form
      action={save}
      className={styles.form}
      aria-busy={saving}
      validationBehavior="aria"
      render={(props) => <form {...props} onResetCapture={(event) => event.preventDefault()} />}
    >
      {result.error && <SaveError message={result.error} />}
      {Object.keys(errors).length > 0 && !result.error && (
        <p className={styles.error} role="alert">Review the fields marked below.</p>
      )}
      {article && (
        <>
          <input type="hidden" name="originalSlug" value={article.slug} />
          <input type="hidden" name="updatedToken" value={article.updatedToken} />
        </>
      )}
      {body && <input type="hidden" name="body" value={JSON.stringify(body)} />}

      <fieldset className={styles.fields} disabled={saving}>
        <TextField className={styles.field} name="title" value={title} onChange={setTitle} isRequired isInvalid={!!errors.title}>
          <Label>Title</Label>
          <Input fullWidth maxLength={160} />
          {errors.title && <FieldError>{errors.title}</FieldError>}
        </TextField>

        <TextField
          className={styles.field}
          name="slug"
          value={slug}
          onChange={setSlugOverride}
          isRequired
          isInvalid={!!errors.slug}
        >
          <Label>Article URL slug</Label>
          <InputGroup fullWidth>
            <InputGroup.Prefix aria-hidden="true">/articles/</InputGroup.Prefix>
            <InputGroup.Input maxLength={96} autoCapitalize="none" autoComplete="off" spellCheck={false} />
          </InputGroup>
          <Description className={editorStyles.hint}>
            Use lowercase letters, numbers, and hyphens.
            {article?.published && " Changing the slug breaks links to the current URL."}
          </Description>
          {errors.slug && <FieldError>{errors.slug}</FieldError>}
          {article && (
            <div className={`${styles.slug} ${editorStyles.currentUrl}`}>
              <span>Current URL</span>
              {article.published
                ? <Link href={`/articles/${encodeURIComponent(article.slug)}`}>/articles/{article.slug}</Link>
                : <code>/articles/{article.slug}</code>}
            </div>
          )}
        </TextField>

        <TextField className={styles.field} name="summary" value={summary} onChange={setSummary} isInvalid={!!errors.summary}>
          <Label>Summary</Label>
          <TextArea fullWidth rows={2} maxLength={500} />
          {errors.summary && <FieldError>{errors.summary}</FieldError>}
        </TextField>

        <div className={styles.fieldPair}>
          <div className={styles.field}>
            <label htmlFor={topicId}>Topic</label>
            <select
              id={topicId}
              name="topicSlug"
              value={topic}
              onChange={(event) => setTopic(event.target.value)}
              required
              aria-invalid={errors.topicSlug ? true : undefined}
              aria-describedby={errors.topicSlug ? `${topicId}-error` : undefined}
            >
              <option value="">Select a topic</option>
              {topics.map(({ slug, title, parentSlug }) => (
                <option key={slug} value={slug}>
                  {parentSlug && topicsBySlug.has(parentSlug) ? `${topicsBySlug.get(parentSlug)} / ${title}` : title}
                </option>
              ))}
            </select>
            {errors.topicSlug && <p id={`${topicId}-error`} className={styles.error}>{errors.topicSlug}</p>}
          </div>
          <div className={styles.field}>
            <label htmlFor={statusId}>Publication status</label>
            <select
              id={statusId}
              name="published"
              value={published}
              onChange={(event) => setPublished(event.target.value)}
              aria-invalid={errors.published ? true : undefined}
              aria-describedby={errors.published ? `${statusId}-error` : undefined}
            >
              <option value="false">Draft</option>
              <option value="true">Published</option>
            </select>
            {errors.published && <p id={`${statusId}-error`} className={styles.error}>{errors.published}</p>}
          </div>
        </div>

        <BodyField editor={editor} labelId={bodyLabelId} error={errors.body} />
      </fieldset>

      <div className={styles.formActions}>
        <Button type="submit" variant="primary" isPending={saving} isDisabled={!editor || !topics.length || saving}>
          {saving ? "Saving…" : article ? "Save changes" : "Create article"}
        </Button>
        <Link className={styles.backLink} href="/admin" prefetch={false}>Cancel</Link>
      </div>
    </Form>
  );
}

function BodyField({ editor, labelId, error }: { editor: Editor | null; labelId: string; error?: string }) {
  const helpId = `${labelId}-help`;
  const errorId = `${labelId}-error`;
  useEffect(() => {
    if (!editor) return;
    const element = editor.view.dom;
    element.setAttribute("aria-describedby", error ? `${helpId} ${errorId}` : helpId);
    if (error) element.setAttribute("aria-invalid", "true");
    else element.removeAttribute("aria-invalid");
  }, [editor, error, errorId, helpId]);

  return (
    <div className={styles.field}>
      <span id={labelId}>Article body</span>
      <p id={helpId} className={editorStyles.hint}>Use headings for sections and lists for steps.</p>
      <div className={styles.editor}>
        {editor ? (
          <>
            <FormattingToolbar editor={editor} />
            <EditorContent editor={editor} className={styles.editorSurface} />
          </>
        ) : <p className={styles.editorLoading} role="status">Loading editor…</p>}
      </div>
      {error && <p id={errorId} className={styles.error}>{error}</p>}
    </div>
  );
}
