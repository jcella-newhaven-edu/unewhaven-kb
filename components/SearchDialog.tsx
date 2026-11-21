"use client";

import { useEffect, useState, useSyncExternalStore, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Autocomplete } from "react-aria-components/Autocomplete";
import { Button } from "react-aria-components/Button";
import { Kbd, ListBox, Modal, SearchField } from "@heroui/react";
import { MagnifyingGlassIcon } from "@heroicons/react/20/solid";
import type { SearchResult } from "@/lib/data/search";

// Mac shows ⌘K, everything else Ctrl K. Read from the browser; the server renders the Mac version.
const noSubscribe = () => () => {};
const isMac = () => /Mac|iPhone|iPad/.test(navigator.userAgent);

// Don't steal "/" while someone is typing in a field.
const isTypingIn = (el: EventTarget | null) =>
  el instanceof HTMLElement && (el.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(el.tagName));

/**
 * Search button for the navbar, plus a ⌘K / Ctrl K dialog that searches as you type.
 * Shortcuts: ⌘K or Ctrl K toggles it from anywhere; "/" opens it when not typing in a field.
 * Results come from /api/search; ↑↓ moves through them, Enter opens one.
 */
export default function SearchDialog() {
  const router = useRouter();
  const mac = useSyncExternalStore(noSubscribe, isMac, () => true);
  const [isOpen, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loadedQuery, setLoadedQuery] = useState<string | null>(null); // query the current results are for

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((open) => !open);
      } else if (e.key === "/" && !e.metaKey && !e.ctrlKey && !isTypingIn(e.target)) {
        e.preventDefault();
        setOpen(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Search after a short pause in typing; an empty query loads suggestions straight away.
  useEffect(() => {
    if (!isOpen) return;
    const controller = new AbortController();
    const timer = setTimeout(
      async () => {
        try {
          const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`, { signal: controller.signal });
          const data: { results: SearchResult[] } = await res.json();
          setResults(data.results);
          setLoadedQuery(query);
        } catch {
          // Aborted because the query changed, or the request failed: keep the previous results.
        }
      },
      query.trim() ? 150 : 0,
    );
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query, isOpen]);

  function onOpenChange(open: boolean) {
    setOpen(open);
    if (!open) setQuery("");
  }

  function go(href: string) {
    onOpenChange(false);
    router.push(href);
  }

  const trimmed = query.trim();
  const isLoading = loadedQuery !== query;
  const heading = trimmed ? "Articles" : "Recently updated";

  return (
    <>
      {/* The trigger button goes inside <Modal> (React Aria's DialogTrigger), which opens the
          dialog when it's pressed. It must be a React Aria Button to receive those presses. */}
      <Modal isOpen={isOpen} onOpenChange={onOpenChange}>
        <Button
          aria-label="Search articles"
          className="rounded-full flex items-center gap-2  bg-white/10 py-1.5 pl-2.5 pr-2 text-sm text-white/80 ring-1 ring-white/20 ring-inset transition-colors hover:bg-white/15 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-unh-secondary sm:w-56"
        >
          <MagnifyingGlassIcon aria-hidden="true" className="size-4 shrink-0" />
          {/* <span className="hidden flex-1 text-left sm:inline">Search...</span> */}
          <Kbd className="hidden border-white/20 bg-white/10 text-xs text-white/70 sm:inline-flex">
            <Kbd.Abbr keyValue={mac ? "command" : "ctrl"} />
            <Kbd.Content>K</Kbd.Content>
          </Kbd>
        </Button>

        <Modal.Backdrop variant="blur">
          <Modal.Container placement="top" size="lg">
            <Modal.Dialog aria-label="Search the knowledge base" className="gap-0 overflow-hidden p-0">
              <Autocomplete inputValue={query} onInputChange={setQuery}>
                <div className="border-b border-border p-3">
                  <SearchField aria-label="Search articles" autoFocus>
                    <SearchField.Group>
                      <SearchField.SearchIcon />
                      <SearchField.Input placeholder="Search articles…" />
                      <SearchField.ClearButton />
                    </SearchField.Group>
                  </SearchField>
                </div>

                <div className="max-h-[min(60vh,28rem)] overflow-y-auto p-2" aria-busy={isLoading}>
                  {results.length > 0 && (
                    <p className="px-3 pb-1 pt-2 text-xs font-semibold uppercase tracking-wider text-muted">{heading}</p>
                  )}
                  <ListBox
                    aria-label={heading}
                    items={results}
                    onAction={(slug) => go(`/articles/${slug}`)}
                    renderEmptyState={() => (
                      <p className="px-3 py-8 text-center text-sm text-muted">
                        {isLoading ? "Searching…" : trimmed ? <>No articles match “{trimmed}”.</> : "No articles yet."}
                      </p>
                    )}
                  >
                    {(r) => (
                      <ListBox.Item id={r.slug} textValue={r.title} className="flex-col items-start gap-0.5 rounded-lg px-3 py-2.5">
                        <span className="flex w-full items-baseline justify-between gap-3">
                          <span className="font-medium text-foreground">{highlight(r.title, trimmed)}</span>
                          <span className="shrink-0 text-xs text-muted">{r.topicTitle}</span>
                        </span>
                        {r.summary && <span className="line-clamp-1 text-sm text-muted">{highlight(r.summary, trimmed)}</span>}
                      </ListBox.Item>
                    )}
                  </ListBox>
                </div>
              </Autocomplete>

              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-4 py-2.5 text-xs text-muted">
                <span className="flex items-center gap-3">
                  <span className="flex items-center gap-1">
                    <Kbd><Kbd.Abbr keyValue="up" /></Kbd>
                    <Kbd><Kbd.Abbr keyValue="down" /></Kbd>
                    to move
                  </span>
                  <span className="flex items-center gap-1">
                    <Kbd><Kbd.Abbr keyValue="enter" /></Kbd>
                    to open
                  </span>
                  <span className="hidden items-center gap-1 sm:flex">
                    {/* Text, not HeroUI's escape glyph, which reads like a "refresh" arrow. */}
                    <Kbd><Kbd.Content>Esc</Kbd.Content></Kbd>
                    to close
                  </span>
                </span>
                {trimmed && (
                  <button
                    type="button"
                    onClick={() => go(`/search?q=${encodeURIComponent(trimmed)}`)}
                    className="rounded-sm font-medium text-link hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
                  >
                    See all results
                  </button>
                )}
              </div>
            </Modal.Dialog>
          </Modal.Container>
        </Modal.Backdrop>
      </Modal>
    </>
  );
}

/** Wraps the parts of text that start with a typed word in <mark>. */
function highlight(text: string, query: string): ReactNode {
  const words = query.split(/\s+/).filter(Boolean).map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  if (words.length === 0) return text;
  const pattern = new RegExp(`(${words.join("|")})`, "gi");
  return text.split(pattern).map((part, i) =>
    i % 2 === 1 ? (
      <mark key={i} className="rounded-sm bg-unh-secondary/40 text-inherit dark:bg-unh-secondary/30">
        {part}
      </mark>
    ) : (
      part
    ),
  );
}
