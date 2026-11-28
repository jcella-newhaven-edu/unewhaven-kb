"use client";

import { useActionState, useEffect, useId, useRef, useState, type ReactNode } from "react";
import type { JSONContent } from "@tiptap/core";
import { StarterKit } from "@tiptap/starter-kit";
import { EditorContent, useEditor, type Editor } from "@tiptap/react";
import { Button, Description, FieldError, Form, Input, InputGroup, Label, TextArea, TextField } from "@heroui/react";
import Link from "next/link";
import { createArticle, updateArticle } from "@/lib/admin/actions";
import type { AdminArticle, AdminTopic, ArticleOwner } from "@/lib/admin/articles";
import { slugFromTitle } from "@/lib/admin/slug";
import AdminFeedback from "../admin-feedback";
import AdminSelect from "../admin-select";
import { adminStyles as styles } from "../admin-styles";
import DraftPreview from "./draft-preview";
import {
  EditorArticleAccordion,
  EditorArticleAccordionItem,
  EditorArticleAlert,
  EditorArticleImage,
  EditorArticleTab,
  EditorArticleTabs,
} from "./editor-nodes";
import FormattingToolbar from "./formatting-toolbar";
import UnsavedChangesWarning from "./unsaved-changes";

type EditableArticle = Pick<AdminArticle, "slug" | "title" | "summary" | "topicSlug" | "topicSlugs" | "updatedToken" | "body" | "bodyText">;
type ExistingArticle = EditableArticle & Pick<AdminArticle, "published" | "workingDraft" | "ownerId" | "reviewDueOn">;

const emptyDocument: JSONContent = { type: "doc", content: [{ type: "paragraph" }] };
const publicationStatuses = [
  { value: "false", label: "Draft" },
  { value: "true", label: "Published" },
];
const saveMessages = new Map([
  ["1", "Article saved."],
  ["working-draft", "Working draft saved."],
  ["published", "Article published."],
  ["unpublished", "Article unpublished."],
  ["restored", "Revision restored as a working draft."],
]);
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

function editorContent(article?: EditableArticle): JSONContent {
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

export default function AdminArticleForm({
  article,
  topics,
  owners,
  history,
  deletion,
  saved,
}: {
  article?: ExistingArticle;
  topics: AdminTopic[];
  owners: ArticleOwner[];
  history?: ReactNode;
  deletion?: ReactNode;
  saved?: string;
}) {
  const [result, save, saving] = useActionState(article ? updateArticle : createArticle, {});
  const formId = useId();
  const extraTopicsId = `${formId}-extra-topics`;
  const bodyLabelId = `${formId}-body-label`;
  const settingsId = `${formId}-settings`;
  const reviewId = `${formId}-review`;
  const editable = article?.workingDraft ?? article;
  const [title, setTitle] = useState(editable?.title ?? "");
  const [summary, setSummary] = useState(editable?.summary ?? "");
  const [topic, setTopic] = useState(editable?.topicSlug ?? "");
  const [initialExtraTopics] = useState(() => editable?.topicSlugs?.filter((slug) => slug !== editable.topicSlug) ?? []);
  const [extraTopics, setExtraTopics] = useState(initialExtraTopics);
  const [published, setPublished] = useState(article?.published ? "true" : "false");
  const [ownerId, setOwnerId] = useState(article?.ownerId ?? "");
  const [reviewDueOn, setReviewDueOn] = useState(article?.reviewDueOn ?? "");
  const [slugOverride, setSlugOverride] = useState<string>();
  const [uploading, setUploading] = useState(false);
  const [body, setBody] = useState<JSONContent | null>(() => article ? null : emptyDocument);
  const [initialBody] = useState(() => editorContent(editable));
  const originalDocument = useRef<Editor["state"]["doc"] | null>(null);
  const [bodyChanged, setBodyChanged] = useState(false);
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
    onCreate: ({ editor }) => {
      originalDocument.current = editor.state.doc;
    },
    onUpdate: ({ editor }) => {
      setBody(editor.getJSON());
      setBodyChanged(!originalDocument.current?.eq(editor.state.doc));
    },
  });

  useEffect(() => {
    editor?.setEditable(!saving, false);
  }, [editor, saving]);

  const errors = result.fieldErrors ?? {};
  const saveError = result.error || (Object.keys(errors).length ? "Review the highlighted fields." : undefined);
  const savedMessage = saved ? saveMessages.get(saved) : undefined;
  const topicsBySlug = new Map(topics.map((item) => [item.slug, item.title]));
  const slug = slugOverride ?? editable?.slug ?? slugFromTitle(title);
  const live = article?.published === true;
  const unpublishing = live && published === "false";
  const actionsDisabled = !editor || !topics.length || saving || uploading;
  const hasUnsavedChanges = bodyChanged
    || title !== (editable?.title ?? "")
    || summary !== (editable?.summary ?? "")
    || topic !== (editable?.topicSlug ?? "")
    || slug !== (editable?.slug ?? "")
    || published !== (live ? "true" : "false")
    || ownerId !== (article?.ownerId ?? "")
    || reviewDueOn !== (article?.reviewDueOn ?? "")
    || extraTopics.length !== initialExtraTopics.length
    || extraTopics.some((candidate) => !initialExtraTopics.includes(candidate));

  function topicLabel({ title, parentSlug }: AdminTopic) {
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
      {article && (
        <>
          <input type="hidden" name="originalSlug" value={article.slug} />
          <input type="hidden" name="updatedToken" value={article.updatedToken} />
          <input type="hidden" name="draftToken" value={article.workingDraft?.updatedToken ?? ""} />
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
            <AdminSelect
              label="Publication status"
              name="published"
              options={publicationStatuses}
              value={published}
              onChange={setPublished}
              description={live ? "Choose Draft to enable Unpublish." : undefined}
              error={errors.published}
              isDisabled={saving}
            />

            <AdminSelect
              label="Primary topic"
              name="topicSlug"
              options={topics.map((item) => ({ value: item.slug, label: topicLabel(item) }))}
              value={topic}
              onChange={(selected) => {
                setTopic(selected);
                setExtraTopics((slugs) => slugs.filter((candidate) => candidate !== selected));
              }}
              placeholder="Select a topic"
              error={errors.topicSlug}
              isRequired
              isDisabled={saving}
            />

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
                {errors.additionalTopicSlug && (
                  <AdminFeedback id={`${extraTopicsId}-error`} status="danger">{errors.additionalTopicSlug}</AdminFeedback>
                )}
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
                {live && " Publishing a new slug redirects the current public URL."}
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
          <section className="grid min-w-0 gap-3 rounded-[.875rem] border border-kb-line bg-kb-panel p-4.5" aria-labelledby={reviewId}>
            <h2 id={reviewId} className="text-[1.0625rem] font-bold tracking-[-.025em] text-kb-heading">Review schedule</h2>
            <AdminSelect
              label="Review owner"
              name="ownerId"
              options={[{ value: "", label: "Unassigned" }, ...owners.map(({ id, name }) => ({ value: id, label: name }))]}
              value={ownerId}
              onChange={setOwnerId}
              error={errors.ownerId}
              isDisabled={saving}
            />
            <TextField className={styles.field} name="reviewDueOn" value={reviewDueOn} onChange={setReviewDueOn} isInvalid={!!errors.reviewDueOn}>
              <Label>Review due date</Label>
              <Input type="date" fullWidth />
              {errors.reviewDueOn && <FieldError>{errors.reviewDueOn}</FieldError>}
            </TextField>
          </section>
          {history}
          <div className="grid gap-3">
            {saveError && <AdminFeedback status="danger">{saveError}</AdminFeedback>}
            {savedMessage && !hasUnsavedChanges && !saving && !saveError && (
              <AdminFeedback status="success">{savedMessage}</AdminFeedback>
            )}
            {article?.workingDraft && <p className={fieldHint}>Editing a saved working draft.</p>}
            <div className={styles.formActions}>
              <Button
                type="submit"
                name={live ? "intent" : undefined}
                value={live ? "working-draft" : undefined}
                variant="primary"
                isPending={saving}
                isDisabled={actionsDisabled}
              >
                {saving ? "Saving…" : live ? "Save working draft" : article ? "Save changes" : "Create article"}
              </Button>
              {live && (
                <Button type="submit" name="intent" value="apply" variant={unpublishing ? "danger-soft" : "secondary"} isDisabled={actionsDisabled}>
                  {unpublishing ? "Unpublish" : "Publish changes"}
                </Button>
              )}
              <DraftPreview
                title={title}
                summary={summary}
                body={body ?? initialBody}
                isDisabled={!editor || saving || uploading}
              />
              <Link className={styles.backLink} href="/admin" prefetch={false}>Cancel</Link>
            </div>
            {live && (
              <p className={fieldHint}>
                {unpublishing ? "Unpublish removes this article from the public knowledge base." : "Publish changes applies this version to the public article."}
              </p>
            )}
            {deletion}
          </div>
        </aside>
      </fieldset>
      <UnsavedChangesWarning active={hasUnsavedChanges} />
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
      {error && <AdminFeedback id={errorId} status="danger">{error}</AdminFeedback>}
    </div>
  );
}
