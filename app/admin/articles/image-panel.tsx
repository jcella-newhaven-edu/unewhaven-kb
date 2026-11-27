"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Button, Input } from "@heroui/react";
import type { Editor } from "@tiptap/react";
import {
  articleImageAccept,
  articleImageAltMaxLength,
  articleImageMaxBytes,
  validArticleImageSrc,
} from "@/lib/article-media";
import { adminStyles } from "../admin-styles";

const imageTypes = articleImageAccept.split(",");
const limitMiB = articleImageMaxBytes / (1024 * 1024);
const imageFieldLabel = "text-[0.8125rem] font-[650] text-kb-heading";

export default function ImagePanel({
  editor,
  id,
  onClose,
  onUploadChange,
}: {
  editor: Editor;
  id: string;
  onClose: () => void;
  onUploadChange: (uploading: boolean) => void;
}) {
  const formId = useId();
  const [mode, setMode] = useState<"url" | "upload">("url");
  const [src, setSrc] = useState("");
  const [alt, setAlt] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState("");
  const [uploading, setUploading] = useState(false);
  const sourceInput = useRef<HTMLInputElement>(null);
  const pending = useRef<AbortController | null>(null);

  useEffect(() => {
    sourceInput.current?.focus();
  }, [mode]);

  useEffect(() => () => {
    if (pending.current) {
      pending.current.abort();
      pending.current = null;
      onUploadChange(false);
    }
  }, [onUploadChange]);

  function insertImage(imageSrc: string) {
    const inserted = editor.chain().focus().insertContentAt(editor.state.selection.to, {
      type: "image",
      attrs: { src: imageSrc, alt: alt.trim() },
    }).run();
    if (inserted) onClose();
    else setError("Place the cursor where you want the image and try again.");
  }

  async function addImage() {
    if (pending.current) return;
    setError("");
    if (!alt.trim()) {
      setError("Enter alt text that describes the image.");
      return;
    }
    if (mode === "url") {
      const imageSrc = src.trim();
      if (!validArticleImageSrc(imageSrc)) {
        setError("Enter an HTTPS image URL or a site path starting with /.");
        return;
      }
      insertImage(imageSrc);
      return;
    }
    if (!file || !imageTypes.includes(file.type) || file.size === 0 || file.size > articleImageMaxBytes) {
      setError(`Choose a PNG, JPEG, GIF, or WebP image up to ${limitMiB} MiB.`);
      return;
    }

    const request = new AbortController();
    pending.current = request;
    setUploading(true);
    onUploadChange(true);
    try {
      const form = new FormData();
      form.set("image", file);
      const response = await fetch("/api/admin/article-images", {
        method: "POST",
        body: form,
        signal: request.signal,
      });
      const result: { src?: unknown; error?: unknown } | null = await response.json().catch(() => null);
      if (request.signal.aborted) return;
      if (!response.ok || !validArticleImageSrc(result?.src)) {
        setError(typeof result?.error === "string" ? result.error : "The image could not be uploaded. Try again.");
        return;
      }
      insertImage(result.src);
    } catch {
      if (!request.signal.aborted) setError("The image could not be uploaded. Try again.");
    } finally {
      if (pending.current === request) {
        pending.current = null;
        setUploading(false);
        onUploadChange(false);
      }
    }
  }

  function selectMode(next: typeof mode) {
    if (next !== mode) setFile(null);
    setMode(next);
    setError("");
  }

  return (
    <div
      id={id}
      className="grid gap-2 border-b border-kb-line bg-kb-panel p-3.5"
      aria-busy={uploading}
      onKeyDown={(event) => {
        if (event.key === "Enter" && event.target instanceof HTMLInputElement && event.target.type !== "file") {
          event.preventDefault();
          void addImage();
        }
        if (event.key === "Escape") {
          event.preventDefault();
          onClose();
        }
      }}
    >
      <div className="flex flex-wrap gap-1.5" role="group" aria-label="Image source">
        <Button type="button" size="sm" variant={mode === "url" ? "secondary" : "ghost"} aria-pressed={mode === "url"} onPress={() => selectMode("url")} isDisabled={uploading}>Use URL</Button>
        <Button type="button" size="sm" variant={mode === "upload" ? "secondary" : "ghost"} aria-pressed={mode === "upload"} onPress={() => selectMode("upload")} isDisabled={uploading}>Upload file</Button>
      </div>
      <label htmlFor={`${formId}-source`} className={imageFieldLabel}>{mode === "url" ? "Image URL" : "Image file"}</label>
      {mode === "url" ? (
        <Input
          ref={sourceInput}
          id={`${formId}-source`}
          inputMode="url"
          spellCheck={false}
          placeholder="https://…"
          value={src}
          onChange={(event) => setSrc(event.target.value)}
        />
      ) : (
        <>
          <input
            ref={sourceInput}
            id={`${formId}-source`}
            className="min-w-0 max-w-full text-[0.8125rem] text-kb-heading file:me-2 file:min-h-9 file:cursor-pointer file:rounded-md file:border file:border-kb-line file:bg-background file:px-2.5 file:font-[650] file:text-kb-heading focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
            type="file"
            accept={articleImageAccept}
            aria-describedby={`${formId}-formats`}
            disabled={uploading}
            onChange={(event) => setFile(event.target.files?.[0] ?? null)}
          />
          <p id={`${formId}-formats`} className="text-[0.8125rem] leading-normal text-kb-muted">PNG, JPEG, GIF, or WebP. Maximum {limitMiB} MiB.</p>
        </>
      )}
      <label htmlFor={`${formId}-alt`} className={imageFieldLabel}>Alt text</label>
      <Input
        id={`${formId}-alt`}
        value={alt}
        maxLength={articleImageAltMaxLength}
        disabled={uploading}
        placeholder="Describe what the image shows"
        onChange={(event) => setAlt(event.target.value)}
      />
      {error && <p className={adminStyles.error} role="alert">{error}</p>}
      <div className="mt-0.5 flex flex-wrap gap-1.5">
        <Button size="sm" type="button" variant="primary" isPending={uploading} onPress={() => void addImage()}>
          {uploading ? "Uploading…" : "Insert image"}
        </Button>
        <Button size="sm" type="button" variant="ghost" onPress={onClose}>Cancel</Button>
      </div>
    </div>
  );
}
