"use client";

import { useActionState, useEffect, useId, useState, type ReactNode } from "react";
import type { JSONContent } from "@tiptap/core";
import { StarterKit } from "@tiptap/starter-kit";
import { EditorContent, useEditor, type Editor } from "@tiptap/react";
import { Alert, Button, Description, FieldError, Form, Input, InputGroup, Label, TextArea, TextField } from "@heroui/react";
import Link from "next/link";
import { createArticle, updateArticle } from "@/lib/admin/actions";
import { slugFromTitle } from "@/lib/admin/slug";
import { adminStyles as styles } from "../admin-styles";
import {
  EditorArticleAccordion,
  EditorArticleAccordionItem,
  EditorArticleAlert,
  EditorArticleImage,
  EditorArticleTab,
  EditorArticleTabs,
} from "./editor-nodes";
import FormattingToolbar from "./formatting-toolbar";

type Topic = { slug: string; title: string; parentSlug: string | null };
type ExistingArticle = {
  slug: string;
  title: string;
  summary: string;
  topicSlug: string;
  topicSlugs?: string[];
  published: boolean;
  updatedToken: string;
  body: JSONContent;
  bodyText: string;
};

const emptyDocument: JSONContent = { type: "doc", content: [{ type: "paragraph" }] };
const fieldHint = "text-[.8125rem] leading-[1.5] text-kb-muted";
const editorSurface = [
  "[&_.tiptap]:min-h-60 min-[58rem]:[&_.tiptap]:min-h-88 [&_.tiptap]:p-4 [&_.tiptap]:leading-[1.65] [&_.tiptap]:text-kb-heading [&_.tiptap]:[overflow-wrap:anywhere]",
  "[&_.tiptap:focus-visible]:-outline-offset-2 [&_.tiptap:focus-visible]:outline-2 [&_.tiptap:focus-visible]:outline-focus",
  "[&_:is(h2,h3)]:mt-4 [&_:is(h2,h3)]:mb-1.5 [&_:is(h2,h3)]:font-bold [&_:is(h2,h3)]:leading-[1.3] [&_h2]:text-[1.375rem] [&_h3]:text-lg",
  "[&_p+p]:mt-2 [&_:is(ul,ol)]:my-1.5 [&_:is(ul,ol)]:ps-6 [&_ul]:list-disc [&_ol]:list-decimal",
  "[&_blockquote]:border-s-[3px] [&_blockquote]:border-kb-line [&_blockquote]:ps-[.8rem]",
  "[&_pre]:overflow-x-auto [&_pre]:rounded-lg [&_pre]:bg-kb-panel [&_pre]:p-3 [&_a]:text-link [&_a]:underline",
].join(" ");

const extensions = [
  StarterKit.configure({
    heading: { levels: [2, 3] },
    link: { openOnClick: false },
  }),
  EditorArticleImage,
  EditorArticleTabs,
  EditorArticleTab,
  EditorArticleAccordion,
  EditorArticleAccordionItem,
  EditorArticleAlert,
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

export default function AdminArticleForm({
  article,
  topics,
  attribution,
}: {
  article?: ExistingArticle;
  topics: Topic[];
  attribution?: ReactNode;
}) {
  const [result, save, saving] = useActionState(article ? updateArticle : createArticle, {});
  const formId = useId();
  const topicId = `${formId}-topic`;
  const extraTopicsId = `${formId}-extra-topics`;
  const statusId = `${formId}-status`;
  const bodyLabelId = `${formId}-body-label`;
  const settingsId = `${formId}-settings`;
  const [title, setTitle] = useState(article?.title ?? "");
  const [summary, setSummary] = useState(article?.summary ?? "");
  const [topic, setTopic] = useState(article?.topicSlug ?? "");
  const [extraTopics, setExtraTopics] = useState(() =>
    article?.topicSlugs?.filter((slug) => slug !== article.topicSlug) ?? [],
  );
  const [published, setPublished] = useState(article?.published ? "true" : "false");
  const [slugOverride, setSlugOverride] = useState<string>();
  const [uploading, setUploading] = useState(false);
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

  function topicLabel({ title, parentSlug }: Topic) {
    const parent = parentSlug ? topicsBySlug.get(parentSlug) : undefined;
    return parent ? `${parent} / ${title}` : title;
  }

  return (
    <Form
      action={save}
      className="grid gap-5"
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

      <fieldset
        className="grid min-w-0 grid-cols-1 items-start gap-5 min-[58rem]:grid-cols-[minmax(0,1fr)_minmax(15rem,19rem)]"
        disabled={saving}
      >
        <div className="grid min-w-0 gap-4.5 rounded-[.875rem] border border-kb-line bg-background p-[clamp(1rem,2.3vw,1.5rem)]">
          <TextField className={styles.field} name="title" value={title} onChange={setTitle} isRequired isInvalid={!!errors.title}>
            <Label>Title</Label>
            <Input fullWidth maxLength={160} className="min-h-12 text-lg font-[650]" />
            {errors.title && <FieldError>{errors.title}</FieldError>}
          </TextField>

          <TextField className={styles.field} name="summary" value={summary} onChange={setSummary} isInvalid={!!errors.summary}>
            <Label>Summary</Label>
            <TextArea fullWidth rows={2} maxLength={500} />
            {errors.summary && <FieldError>{errors.summary}</FieldError>}
          </TextField>

          <BodyField editor={editor} labelId={bodyLabelId} error={errors.body} onUploadChange={setUploading} />
        </div>

        <aside className="grid min-w-0 gap-4" aria-labelledby={settingsId}>
          <div className="grid min-w-0 gap-4 rounded-[.875rem] border border-kb-line bg-kb-panel p-4.5">
            <h2 id={settingsId} className="text-[1.0625rem] font-bold tracking-[-.025em] text-kb-heading">Article settings</h2>
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

            <div className={styles.field}>
              <label htmlFor={topicId}>Primary topic</label>
              <select
                id={topicId}
                name="topicSlug"
                value={topic}
                onChange={(event) => {
                  const selected = event.target.value;
                  setTopic(selected);
                  setExtraTopics((slugs) => slugs.filter((candidate) => candidate !== selected));
                }}
                required
                aria-invalid={errors.topicSlug ? true : undefined}
                aria-describedby={errors.topicSlug ? `${topicId}-error` : undefined}
              >
                <option value="">Select a topic</option>
                {topics.map((item) => <option key={item.slug} value={item.slug}>{topicLabel(item)}</option>)}
              </select>
              {errors.topicSlug && <p id={`${topicId}-error`} className={styles.error}>{errors.topicSlug}</p>}
            </div>

            {topics.length > 1 && (
              <fieldset className="grid min-w-0 gap-1.5" aria-describedby={errors.additionalTopicSlug ? `${extraTopicsId}-error` : undefined}>
                <legend className="pb-1.5 text-sm font-[650] text-kb-heading">Additional topics</legend>
                <div className="grid max-h-44 divide-y divide-kb-line overflow-y-auto rounded-lg border border-kb-line bg-background px-2.5 py-1">
                  {topics.map((item) => (
                    <label
                      key={item.slug}
                      className="flex items-baseline gap-2 py-1.5 text-[.8125rem] leading-[1.4] text-kb-heading [overflow-wrap:anywhere] has-[:disabled]:text-kb-muted"
                    >
                      <input
                        className="flex-none accent-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
                        type="checkbox"
                        name="additionalTopicSlug"
                        value={item.slug}
                        checked={extraTopics.includes(item.slug)}
                        disabled={item.slug === topic || (extraTopics.length >= 99 && !extraTopics.includes(item.slug))}
                        onChange={(event) => {
                          const checked = event.target.checked;
                          setExtraTopics((slugs) => checked ? [...slugs, item.slug] : slugs.filter((candidate) => candidate !== item.slug));
                        }}
                      />
                      <span>{topicLabel(item)}</span>
                    </label>
                  ))}
                </div>
                {errors.additionalTopicSlug && <p id={`${extraTopicsId}-error`} className={styles.error}>{errors.additionalTopicSlug}</p>}
              </fieldset>
            )}

            <TextField
              className={styles.field}
              name="slug"
              value={slug}
              onChange={setSlugOverride}
              isRequired
              isInvalid={!!errors.slug}
            >
              <Label>Article URL slug</Label>
              <InputGroup fullWidth className="min-w-0 max-w-full [&_input]:min-w-0 [&_input]:flex-1">
                <InputGroup.Prefix aria-hidden="true">/articles/</InputGroup.Prefix>
                <InputGroup.Input maxLength={96} autoCapitalize="none" autoComplete="off" spellCheck={false} />
              </InputGroup>
              <Description className={fieldHint}>
                Use lowercase letters, numbers, and hyphens.
                {article?.published && " Changing the slug breaks links to the current URL."}
              </Description>
              {errors.slug && <FieldError>{errors.slug}</FieldError>}
              {article && (
                <div className="mt-0.5 flex min-w-0 flex-wrap items-baseline gap-x-2 gap-y-1 text-kb-heading [overflow-wrap:anywhere]">
                  <span className="text-sm font-[650]">Current URL</span>
                  {article.published
                    ? <Link href={`/articles/${encodeURIComponent(article.slug)}`} className={`min-w-0 ${styles.backLink}`}>/articles/{article.slug}</Link>
                    : <code className="text-sm text-kb-muted">/articles/{article.slug}</code>}
                </div>
              )}
            </TextField>
          </div>
          {attribution}
        </aside>
      </fieldset>

      <div className={`${styles.formActions} px-0.5`}>
        <Button
          type="submit"
          variant="primary"
          isPending={saving}
          isDisabled={!editor || !topics.length || saving || uploading}
        >
          {saving ? "Saving…" : article ? "Save changes" : "Create article"}
        </Button>
        <Link className={styles.backLink} href="/admin" prefetch={false}>Cancel</Link>
      </div>
    </Form>
  );
}

function BodyField({
  editor,
  labelId,
  error,
  onUploadChange,
}: {
  editor: Editor | null;
  labelId: string;
  error?: string;
  onUploadChange: (uploading: boolean) => void;
}) {
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
      <p id={helpId} className={fieldHint}>Use headings for sections and lists for steps.</p>
      <div className={`${styles.editor} bg-background`}>
        {editor ? (
          <>
            <FormattingToolbar editor={editor} onUploadChange={onUploadChange} />
            <EditorContent editor={editor} className={editorSurface} />
          </>
        ) : <p className={styles.editorLoading} role="status">Loading editor…</p>}
      </div>
      {error && <p id={errorId} className={styles.error}>{error}</p>}
    </div>
  );
}
