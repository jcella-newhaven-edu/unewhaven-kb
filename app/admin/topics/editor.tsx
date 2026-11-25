"use client";

import { useActionState, useId, useState } from "react";
import { Alert, Button, Description, FieldError, Form, Input, Label, TextArea, TextField } from "@heroui/react";
import Link from "next/link";
import type { ManagedTopic } from "@/lib/admin/topics";
import { createTopic, updateTopic } from "@/lib/admin/topic-actions";
import { slugFromTitle } from "@/lib/admin/slug";
import styles from "../admin.module.css";
import topicStyles from "./topics.module.css";

export default function TopicForm({
  topic,
  parentTopics,
}: {
  topic?: ManagedTopic;
  parentTopics: Pick<ManagedTopic, "slug" | "title">[];
}) {
  const [result, save, saving] = useActionState(topic ? updateTopic : createTopic, {});
  const [title, setTitle] = useState(topic?.title ?? "");
  const [slugOverride, setSlugOverride] = useState<string>();
  const [description, setDescription] = useState(topic?.description ?? "");
  const [parent, setParent] = useState(topic?.parentSlug ?? "");
  const [sortOrder, setSortOrder] = useState(String(topic?.sortOrder ?? 0));
  const parentId = useId();
  const errors = result.fieldErrors ?? {};
  const currentParent = topic?.parentSlug;
  const currentParentUnavailable = currentParent && !parentTopics.some(({ slug }) => slug === currentParent);
  const parentError = errors.parentSlug ? `${parentId}-error` : undefined;
  const parentHint = topic?.childCount ? `${parentId}-hint` : undefined;

  return (
    <Form
      action={save}
      className={styles.form}
      aria-busy={saving}
      validationBehavior="aria"
      render={(props) => <form {...props} onResetCapture={(event) => event.preventDefault()} />}
    >
      {result.error && (
        <Alert status="danger" role="alert">
          <Alert.Indicator />
          <Alert.Content><Alert.Description>{result.error}</Alert.Description></Alert.Content>
        </Alert>
      )}
      {Object.keys(errors).length > 0 && !result.error && (
        <p className={styles.error} role="alert">Review the fields marked below.</p>
      )}
      {topic && (
        <>
          <input type="hidden" name="slug" value={topic.slug} />
          <input type="hidden" name="updatedToken" value={topic.updatedToken} />
        </>
      )}

      <fieldset className={styles.fields} disabled={saving}>
        <TextField className={styles.field} name="title" value={title} onChange={setTitle} isRequired isInvalid={!!errors.title}>
          <Label>Title</Label>
          <Input fullWidth maxLength={160} />
          {errors.title && <FieldError>{errors.title}</FieldError>}
        </TextField>

        {topic ? (
          <div className={styles.slug}>
            <span>Topic URL</span>
            <Link href={`/topics/${encodeURIComponent(topic.slug)}`}>/topics/{topic.slug}</Link>
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

        <TextField
          className={styles.field}
          name="description"
          value={description}
          onChange={setDescription}
          isInvalid={!!errors.description}
        >
          <Label>Description</Label>
          <TextArea fullWidth rows={3} maxLength={500} />
          {errors.description && <FieldError>{errors.description}</FieldError>}
        </TextField>

        <div className={styles.fieldPair}>
          <div className={styles.field}>
            <label htmlFor={parentId}>Parent topic</label>
            <select
              id={parentId}
              name="parentSlug"
              value={parent}
              onChange={(event) => setParent(event.target.value)}
              aria-invalid={errors.parentSlug ? true : undefined}
              aria-describedby={[parentHint, parentError].filter(Boolean).join(" ") || undefined}
            >
              <option value="">None (top-level topic)</option>
              {currentParentUnavailable && (
                <option value={currentParent}>{topic?.parentTitle || currentParent} (unavailable)</option>
              )}
              {parentTopics.map(({ slug, title }) => <option key={slug} value={slug}>{title}</option>)}
            </select>
            {parentHint && (
              <p id={parentHint} className={topicStyles.muted}>
                Move its subtopics before making this topic a subtopic.
              </p>
            )}
            {parentError && <p id={parentError} className={styles.error}>{errors.parentSlug}</p>}
          </div>
          <TextField
            className={styles.field}
            name="sortOrder"
            value={sortOrder}
            onChange={setSortOrder}
            isRequired
            isInvalid={!!errors.sortOrder}
          >
            <Label>Sort order</Label>
            <Input fullWidth type="number" min={-2147483648} max={2147483647} step={1} />
            <Description>Lower numbers appear first among sibling topics.</Description>
            {errors.sortOrder && <FieldError>{errors.sortOrder}</FieldError>}
          </TextField>
        </div>
      </fieldset>

      <div className={styles.formActions}>
        <Button type="submit" variant="primary" isPending={saving} isDisabled={saving}>
          {saving ? "Saving…" : topic ? "Save changes" : "Create topic"}
        </Button>
        <Link className={styles.backLink} href="/admin/topics" prefetch={false}>Cancel</Link>
      </div>
    </Form>
  );
}
