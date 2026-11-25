"use client";

import { useActionState, useEffect, useState } from "react";
import type { JSONContent } from "@tiptap/core";
import { StarterKit } from "@tiptap/starter-kit";
import { EditorContent, useEditor, type Editor } from "@tiptap/react";
import { Alert, Button, FieldError, Input, Label, TextArea, TextField } from "@heroui/react";
import Link from "next/link";
import { createArticle, updateArticle } from "@/lib/admin/actions";
import FormattingToolbar from "./formatting-toolbar";
import styles from "../admin.module.css";

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

function slugFromTitle(title: string) {
  return title.normalize("NFKD").toLowerCase().replace(/\p{M}/gu, "")
    .replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 96).replace(/-$/g, "");
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
        "aria-labelledby": "article-body-label",
        "aria-multiline": "true",
        id: "admin-article-body",
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

  return (
    <form action={save} className={styles.form} aria-busy={saving}>
      {result.error && <SaveError message={result.error} />}
      {Object.keys(errors).length > 0 && !result.error && (
        <p className={styles.error} role="alert">Review the fields marked below.</p>
      )}
      {article && (
        <>
          <input type="hidden" name="slug" value={article.slug} />
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

        {article ? (
          <div className={styles.slug}>
            <span>Article URL</span>
            {article.published
              ? <Link href={`/articles/${encodeURIComponent(article.slug)}`}>/articles/{article.slug}</Link>
              : <code>/articles/{article.slug}</code>}
          </div>
        ) : (
          <TextField
            className={styles.field}
            name="slug"
            value={slugOverride ?? slugFromTitle(title)}
            onChange={setSlugOverride}
            isRequired
            isInvalid={!!errors.slug}
          >
            <Label>URL slug</Label>
            <Input fullWidth maxLength={96} spellCheck={false} />
            {errors.slug && <FieldError>{errors.slug}</FieldError>}
          </TextField>
        )}

        <TextField className={styles.field} name="summary" value={summary} onChange={setSummary} isInvalid={!!errors.summary}>
          <Label>Summary</Label>
          <TextArea fullWidth rows={2} maxLength={500} />
          {errors.summary && <FieldError>{errors.summary}</FieldError>}
        </TextField>

        <div className={styles.fieldPair}>
          <div className={styles.field}>
            <label htmlFor="admin-article-topic">Topic</label>
            <select
              id="admin-article-topic"
              name="topicSlug"
              value={topic}
              onChange={(event) => setTopic(event.target.value)}
              required
              aria-invalid={errors.topicSlug ? true : undefined}
              aria-describedby={errors.topicSlug ? "admin-topic-error" : undefined}
            >
              <option value="">Select a topic</option>
              {topics.map(({ slug, title, parentSlug }) => (
                <option key={slug} value={slug}>
                  {parentSlug && topicsBySlug.has(parentSlug) ? `${topicsBySlug.get(parentSlug)} / ${title}` : title}
                </option>
              ))}
            </select>
            {errors.topicSlug && <p id="admin-topic-error" className={styles.error}>{errors.topicSlug}</p>}
          </div>
          <div className={styles.field}>
            <label htmlFor="admin-article-status">Publication status</label>
            <select
              id="admin-article-status"
              name="published"
              value={published}
              onChange={(event) => setPublished(event.target.value)}
              aria-invalid={errors.published ? true : undefined}
              aria-describedby={errors.published ? "admin-publication-error" : undefined}
            >
              <option value="false">Draft</option>
              <option value="true">Published</option>
            </select>
            {errors.published && <p id="admin-publication-error" className={styles.error}>{errors.published}</p>}
          </div>
        </div>

        <BodyField editor={editor} error={errors.body} />
      </fieldset>

      <div className={styles.formActions}>
        <Button type="submit" variant="primary" isPending={saving} isDisabled={!editor || !topics.length || saving}>
          {saving ? "Saving…" : article ? "Save changes" : "Create article"}
        </Button>
        <Link className={styles.backLink} href="/admin" prefetch={false}>Cancel</Link>
      </div>
    </form>
  );
}

function BodyField({ editor, error }: { editor: Editor | null; error?: string }) {
  useEffect(() => {
    if (!editor) return;
    const element = editor.view.dom;
    if (error) {
      element.setAttribute("aria-invalid", "true");
      element.setAttribute("aria-describedby", "admin-body-error");
    } else {
      element.removeAttribute("aria-invalid");
      element.removeAttribute("aria-describedby");
    }
  }, [editor, error]);

  return (
    <div className={styles.field}>
      <span id="article-body-label">Article body</span>
      <div className={styles.editor}>
        {editor ? (
          <>
            <FormattingToolbar editor={editor} />
            <EditorContent editor={editor} className={styles.editorSurface} />
          </>
        ) : <p className={styles.editorLoading} role="status">Loading editor…</p>}
      </div>
      {error && <p id="admin-body-error" className={styles.error}>{error}</p>}
    </div>
  );
}
