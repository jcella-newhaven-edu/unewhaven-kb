"use client";

import { Disclosure } from "@heroui/react";
import { useState } from "react";
import type { AdminTopic, ArticleRevision } from "@/lib/admin/articles";
import RestoreArticleRevision from "./restore-revision";

type ComparisonVersion = Pick<ArticleRevision, "title" | "summary" | "slug" | "topicSlug" | "topicSlugs" | "bodyText" | "published">;

const revisionDate = new Intl.DateTimeFormat("en-US", {
  dateStyle: "medium", timeStyle: "medium", timeZone: "UTC",
});

const revisionLabels = new Map([
  ["baseline", "Starting version"],
  ["draft", "Draft saved"],
  ["published", "Published"],
  ["restored", "Restored"],
]);

const comparisonValue = "rounded-md border border-kb-line bg-kb-panel px-2 py-1.5 text-sm whitespace-pre-wrap wrap-anywhere";

function RevisionComparison({ current, revision, topicsBySlug }: {
  current: ComparisonVersion;
  revision: ArticleRevision;
  topicsBySlug: Map<string, string>;
}) {
  function topicName(slug: string) {
    return topicsBySlug.get(slug) ?? slug;
  }

  function otherTopics(version: ComparisonVersion) {
    return version.topicSlugs.filter((slug) => slug !== version.topicSlug).sort();
  }

  const currentTopics = otherTopics(current);
  const revisionTopics = otherTopics(revision);
  const richTextDiffers = revision.bodyChanged && current.bodyText === revision.bodyText;
  const changes = [
    { label: "Title", before: current.title, after: revision.title },
    { label: "Summary", before: current.summary, after: revision.summary },
    { label: "Article URL slug", before: current.slug, after: revision.slug },
    { label: "Primary topic", before: topicName(current.topicSlug), after: topicName(revision.topicSlug), changed: current.topicSlug !== revision.topicSlug },
    {
      label: "Additional topics",
      before: currentTopics.map(topicName).join(" · "),
      after: revisionTopics.map(topicName).join(" · "),
      changed: currentTopics.join("\0") !== revisionTopics.join("\0"),
    },
    { label: "Publication status", before: current.published ? "Published" : "Draft", after: revision.published ? "Published" : "Draft" },
    { label: "Body text", before: current.bodyText, after: revision.bodyText, scrollable: true },
  ].filter(({ before, after, changed }) => changed ?? (before !== after));

  if (!changes.length && !richTextDiffers) {
    return <p className="text-xs text-kb-muted">The text and article settings match the current saved version.</p>;
  }

  return (
    <div className="grid gap-3">
      {richTextDiffers && <p className="text-xs text-kb-muted">Formatting, links, or media differ from the current saved version.</p>}
      {changes.map(({ label, before, after, scrollable }) => {
        const valueClass = scrollable ? `${comparisonValue} max-h-48 overflow-y-auto focus-visible:outline-2 focus-visible:outline-focus` : comparisonValue;
        return (
          <div key={label} className="grid gap-1.5">
            <h5 className="text-sm font-semibold text-kb-heading">{label}</h5>
            <dl className="grid gap-1.5">
              <div>
                <dt className="mb-1 text-xs text-kb-muted">Current saved version</dt>
                <dd className={valueClass} tabIndex={scrollable ? 0 : undefined}>{before || "Empty"}</dd>
              </div>
              <div>
                <dt className="mb-1 text-xs text-kb-muted">This revision</dt>
                <dd className={valueClass} tabIndex={scrollable ? 0 : undefined}>{after || "Empty"}</dd>
              </div>
            </dl>
          </div>
        );
      })}
    </div>
  );
}

export default function ArticleRevisions({ current, revisions, topics, version, showAttribution }: {
  current: ComparisonVersion;
  revisions: ArticleRevision[];
  topics: AdminTopic[];
  version: { slug: string; updatedToken: string; draftToken: string };
  showAttribution: boolean;
}) {
  const [historyOpen, setHistoryOpen] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const topicsBySlug = new Map(topics.map(({ slug, title }) => [slug, title]));

  if (!revisions.length) {
    return <p className="mt-4 border-t border-kb-line pt-3 text-xs text-kb-muted">No saved revisions yet.</p>;
  }

  return (
    <Disclosure
      className="mt-4 min-w-0 border-t border-kb-line pt-2"
      isExpanded={historyOpen}
      onExpandedChange={(open) => {
        setHistoryOpen(open);
        if (!open) setExpanded(null);
      }}
    >
      <Disclosure.Heading level={3}>
        <Disclosure.Trigger type="button" className="flex w-full items-center gap-2 rounded-md px-1.5 py-1.5 text-start text-sm font-semibold text-kb-heading hover:bg-kb-hover">
          Revision history
          <Disclosure.Indicator aria-hidden="true" />
        </Disclosure.Trigger>
      </Disclosure.Heading>
      <Disclosure.Content>
        {historyOpen && (
          <div className="grid gap-2 pt-2">
            {revisions.map((revision) => (
              <Disclosure
                key={revision.id}
                isExpanded={expanded === revision.id}
                onExpandedChange={(open) => setExpanded(open ? revision.id : null)}
                className="min-w-0 rounded-lg border border-kb-line bg-background"
              >
                <Disclosure.Heading level={4}>
                  <Disclosure.Trigger type="button" className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-start text-xs font-semibold text-kb-heading hover:bg-kb-hover">
                    <span className="min-w-0">
                      {revisionLabels.get(revision.kind) ?? "Revision"} · <time dateTime={revision.createdAt.toISOString()}>{revisionDate.format(revision.createdAt)} UTC</time>
                    </span>
                    <Disclosure.Indicator aria-hidden="true" />
                  </Disclosure.Trigger>
                </Disclosure.Heading>
                <Disclosure.Content>
                  {expanded === revision.id && (
                    <Disclosure.Body className="grid gap-3">
                      {showAttribution && <p className="text-xs text-kb-muted">{revision.editorName ? `Edited by ${revision.editorName}` : "Editor not recorded"}</p>}
                      <RevisionComparison current={current} revision={revision} topicsBySlug={topicsBySlug} />
                      <RestoreArticleRevision {...version} revisionId={revision.id} />
                    </Disclosure.Body>
                  )}
                </Disclosure.Content>
              </Disclosure>
            ))}
          </div>
        )}
      </Disclosure.Content>
    </Disclosure>
  );
}
