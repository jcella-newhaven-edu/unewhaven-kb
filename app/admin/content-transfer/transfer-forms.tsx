"use client";

import { useId, useState } from "react";
import { useRouter } from "next/navigation";
import { Alert, Button } from "@heroui/react";
import { ArrowDownTrayIcon, ArrowUpTrayIcon } from "@heroicons/react/24/outline";
import type { AdminTopic } from "@/lib/admin/articles";
import {
  transferMaxBytes,
  type ExportScope,
  type TransferMode,
  type TransferResponse,
  type TransferSummary,
} from "@/lib/admin/content-transfer-types";
import { adminStyles } from "../admin-styles";

const transferEndpoint = "/api/admin/content-transfer";
const maxFileSize = transferMaxBytes / (1024 * 1024);
const panel = "grid min-w-0 gap-4 rounded-xl border border-kb-line bg-background p-4 sm:p-5";

type Problem = { error: string; issues?: string[] };
type ImportPhase = "preview" | "apply";
type ImportState =
  | { stage: "idle" }
  | { stage: "working"; phase: ImportPhase }
  | { stage: "ready"; token: string; summary: TransferSummary }
  | { stage: "done"; summary: TransferSummary }
  | { stage: "error"; problem: Problem };

async function readResult(response: Response): Promise<TransferResponse | null> {
  const payload: unknown = await response.json().catch(() => null);
  return payload && typeof payload === "object" ? payload as TransferResponse : null;
}

function transferProblem(response: Response, result: TransferResponse | null, message: string): Problem {
  if (result && "error" in result) return result;
  if (response.status === 413) {
    return { error: `The server rejected the upload size. If the file is under ${maxFileSize} MiB, check the reverse proxy limit.` };
  }
  if (response.status === 401 || response.status === 403) {
    return { error: "Sign in again to transfer knowledge base content." };
  }
  return { error: message };
}

function TransferError({ problem }: { problem: Problem }) {
  return (
    <Alert status="danger" role="alert">
      <Alert.Indicator />
      <Alert.Content className="min-w-0 wrap-anywhere">
        <Alert.Title>{problem.error}</Alert.Title>
        {!!problem.issues?.length && (
          <Alert.Description>
            <ul className="mt-1.5 list-disc space-y-1 ps-5">
              {problem.issues.map((issue, index) => <li key={index}>{issue}</li>)}
            </ul>
          </Alert.Description>
        )}
      </Alert.Content>
    </Alert>
  );
}

function ImportSummary({ summary, applied }: { summary: TransferSummary; applied: boolean }) {
  const headingId = useId();
  return (
    <section aria-labelledby={headingId} className="grid min-w-0 gap-3 rounded-lg border border-kb-line bg-kb-panel p-3.5 sm:p-4">
      <h3 id={headingId} className="text-sm font-semibold text-kb-heading" role="status">
        {applied ? "Import complete" : "Import preview"}
      </h3>
      <table aria-labelledby={headingId} className="w-full text-sm">
        <thead className="border-b border-kb-line text-kb-muted">
          <tr>
            <th scope="col" className="pb-2 text-start font-medium">Content</th>
            <th scope="col" className="pb-2 text-end font-medium">New</th>
            <th scope="col" className="pb-2 text-end font-medium">Updated</th>
            <th scope="col" className="pb-2 text-end font-medium">Skipped</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-kb-line text-kb-heading">
          {([["Topics", summary.topics], ["Articles", summary.articles]] as const).map(([label, count]) => (
            <tr key={label}>
              <th scope="row" className="py-2 text-start font-semibold">{label}</th>
              <td className="py-2 text-end tabular-nums">{count.created}</td>
              <td className="py-2 text-end tabular-nums">{count.updated}</td>
              <td className="py-2 text-end tabular-nums">{count.skipped}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <dl className="grid gap-2 border-t border-kb-line pt-3 text-sm sm:grid-cols-2">
        <div>
          <dt className="text-kb-muted">{applied ? "Published articles imported" : "Articles to publish"}</dt>
          <dd className="font-semibold text-kb-heading">{summary.publishedArticles}</dd>
        </div>
        <div>
          <dt className="text-kb-muted">Uploaded images</dt>
          <dd className="font-semibold text-kb-heading">{summary.images.created} new, {summary.images.reused} reused</dd>
        </div>
      </dl>
    </section>
  );
}

function ImportForm() {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [mode, setMode] = useState<TransferMode>("skip");
  const [state, setState] = useState<ImportState>({ stage: "idle" });
  const fieldId = useId();
  const busy = state.stage === "working";
  const ready = state.stage === "ready";

  function chooseFile(next: File | null) {
    setFile(next);
    setState(next && next.size > transferMaxBytes
      ? { stage: "error", problem: { error: `Choose a JSON file of ${maxFileSize} MiB or less.` } }
      : { stage: "idle" });
  }

  async function runImport(phase: ImportPhase, token?: string) {
    if (!file || file.size > transferMaxBytes || busy) return;
    setState({ stage: "working", phase });
    try {
      const headers = new Headers({ "Content-Type": "application/json" });
      if (token) headers.set("X-KB-Transfer-Preview", token);
      const response = await fetch(`${transferEndpoint}?${new URLSearchParams({ phase, mode })}`, {
        method: "POST",
        headers,
        body: file,
      });
      const result = await readResult(response);
      const message = phase === "preview" ? "Could not preview this import." : "Could not apply this import. Preview it again.";
      if (!response.ok || !result || !("summary" in result)) {
        setState({ stage: "error", problem: transferProblem(response, result, message) });
      } else if (phase === "apply") {
        setState({ stage: "done", summary: result.summary });
        router.refresh();
      } else if (result.token) {
        setState({ stage: "ready", token: result.token, summary: result.summary });
      } else {
        setState({ stage: "error", problem: { error: message } });
      }
    } catch {
      const error = phase === "preview"
        ? "Could not preview this import. Check your connection and try again."
        : "The import result is unavailable. Preview the file again to check what is already saved.";
      setState({ stage: "error", problem: { error } });
    }
  }

  return (
    <section className={panel} aria-labelledby="import-content-heading">
      <header className="grid gap-1.5">
        <h2 id="import-content-heading" className="text-xl font-semibold tracking-tight text-kb-heading">Import content</h2>
        <p className="text-sm text-kb-muted">Choose a knowledge base JSON file and preview the changes before saving.</p>
      </header>

      <form className="grid gap-4" aria-busy={busy} onSubmit={(event) => {
        event.preventDefault();
        void runImport("preview");
      }}>
        <div className={adminStyles.field}>
          <label htmlFor={fieldId}>Import file</label>
          <input
            id={fieldId}
            type="file"
            accept=".json,application/json"
            aria-describedby={`${fieldId}-help`}
            disabled={busy}
            className="min-h-10 w-full min-w-0 rounded-lg border border-kb-line bg-kb-panel text-sm file:me-3 file:min-h-10 file:cursor-pointer file:border-0 file:border-e file:border-kb-line file:bg-background file:px-3 file:font-semibold file:text-kb-heading focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
            onChange={(event) => chooseFile(event.currentTarget.files?.[0] ?? null)}
          />
          <p id={`${fieldId}-help`} className="text-xs text-kb-muted">JSON files up to {maxFileSize} MiB.</p>
        </div>
        <div className={adminStyles.field}>
          <label htmlFor={`${fieldId}-mode`}>If a slug already exists</label>
          <select
            id={`${fieldId}-mode`}
            value={mode}
            disabled={busy}
            onChange={(event) => {
              setMode(event.currentTarget.value as TransferMode);
              chooseFile(file);
            }}
          >
            <option value="skip">Skip existing content</option>
            <option value="update">Update existing content</option>
          </select>
          <p className="text-xs text-kb-muted">
            {mode === "skip"
              ? "Only new slugs are added."
              : "Matching slugs replace the stored content, topic assignments, and publication status."}
          </p>
        </div>

        {state.stage === "error" && <TransferError problem={state.problem} />}
        {(ready || state.stage === "done") && <ImportSummary summary={state.summary} applied={state.stage === "done"} />}

        <div className={adminStyles.formActions}>
          <Button
            type="submit"
            variant={ready ? "secondary" : "primary"}
            isPending={state.stage === "working" && state.phase === "preview"}
            isDisabled={!file || file.size > transferMaxBytes || busy}
          >
            <ArrowUpTrayIcon aria-hidden="true" className="size-4 shrink-0" />
            {state.stage === "working" && state.phase === "preview" ? "Previewing…" : "Preview import"}
          </Button>
          {ready && (
            <Button type="button" variant="primary" onPress={() => void runImport("apply", state.token)}>
              Apply import
            </Button>
          )}
          {state.stage === "working" && state.phase === "apply" && (
            <p role="status" className="text-sm text-kb-muted">Applying import…</p>
          )}
        </div>
      </form>
    </section>
  );
}

function ExportForm({ topics }: { topics: AdminTopic[] }) {
  const [scope, setScope] = useState<ExportScope>("all");
  const [topic, setTopic] = useState("");
  const [pending, setPending] = useState(false);
  const [problem, setProblem] = useState<Problem>();
  const [started, setStarted] = useState(false);
  const fieldId = useId();
  const titles = new Map(topics.map(({ slug, title }) => [slug, title]));

  function resetNotice() {
    setProblem(undefined);
    setStarted(false);
  }

  async function download() {
    if (pending || (scope === "topic" && !topic)) return;
    resetNotice();
    setPending(true);
    const query = new URLSearchParams({ scope });
    if (scope === "topic") query.set("topic", topic);
    try {
      const response = await fetch(`${transferEndpoint}?${query}`, { cache: "no-store" });
      if (!response.ok) {
        setProblem(transferProblem(response, await readResult(response), "Could not export this content."));
        return;
      }
      const filename = /filename="([^"]+)"/i.exec(response.headers.get("Content-Disposition") ?? "")?.[1];
      const url = URL.createObjectURL(await response.blob());
      const link = document.createElement("a");
      link.href = url;
      link.download = filename ?? "unewhaven-kb-export.json";
      document.body.append(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
      setStarted(true);
    } catch {
      setProblem({ error: "Could not download the export. Check your connection and try again." });
    } finally {
      setPending(false);
    }
  }

  return (
    <section className={panel} aria-labelledby="export-content-heading">
      <header className="grid gap-1.5">
        <h2 id="export-content-heading" className="text-xl font-semibold tracking-tight text-kb-heading">Export content</h2>
        <p className="text-sm text-kb-muted">Download a JSON file with drafts, published articles, and their referenced uploads.</p>
      </header>
      <form className="grid gap-4" aria-busy={pending} onSubmit={(event) => {
        event.preventDefault();
        void download();
      }}>
        <div className={adminStyles.field}>
          <label htmlFor={fieldId}>Content to export</label>
          <select
            id={fieldId}
            value={scope}
            disabled={pending}
            onChange={(event) => {
              setScope(event.currentTarget.value as ExportScope);
              resetNotice();
            }}
          >
            <option value="all">All articles and topics</option>
            <option value="topics">Topics only</option>
            <option value="topic" disabled={!topics.length}>Articles in a topic</option>
          </select>
        </div>
        {scope === "topic" && (
          <div className={adminStyles.field}>
            <label htmlFor={`${fieldId}-topic`}>Topic</label>
            <select
              id={`${fieldId}-topic`}
              value={topic}
              disabled={pending}
              onChange={(event) => {
                setTopic(event.currentTarget.value);
                resetNotice();
              }}
            >
              <option value="">Choose a topic</option>
              {topics.map(({ slug, title, parentSlug }) => (
                <option key={slug} value={slug}>
                  {parentSlug ? `${titles.get(parentSlug) ?? parentSlug} / ${title}` : title}
                </option>
              ))}
            </select>
            <p className="text-xs text-kb-muted">The export includes topics needed by the selected articles.</p>
          </div>
        )}
        {problem && <TransferError problem={problem} />}
        <div className={adminStyles.formActions}>
          <Button type="submit" variant="secondary" isPending={pending} isDisabled={pending || (scope === "topic" && !topic)}>
            <ArrowDownTrayIcon aria-hidden="true" className="size-4 shrink-0" />
            {pending ? "Preparing export…" : "Export JSON"}
          </Button>
          {started && <p role="status" className="text-sm text-kb-muted">Download started.</p>}
        </div>
      </form>
    </section>
  );
}

export default function TransferForms({ topics }: { topics: AdminTopic[] }) {
  return (
    <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
      <ImportForm />
      <ExportForm topics={topics} />
    </div>
  );
}
