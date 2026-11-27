"use client";

import { createContext, useContext, useEffect, useState, useSyncExternalStore, type ComponentProps, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Autocomplete } from "react-aria-components/Autocomplete";
import { Button, Kbd, ListBox, Modal, SearchField } from "@heroui/react";
import { MagnifyingGlassIcon } from "@heroicons/react/20/solid";
import type { SearchResult } from "@/lib/data/search";

// Mac shows ⌘K, everything else Ctrl K. Read from the browser; the server renders the Mac version.
const noSubscribe = () => () => {};
const isMac = () => /Mac|iPhone|iPad/.test(navigator.userAgent);

// Don't steal "/" while someone is typing in a field.
const isTypingIn = (el: EventTarget | null) =>
  el instanceof HTMLElement && (el.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(el.tagName));

type SearchOpenState = [isOpen: boolean, setOpen: (open: boolean) => void];
const SearchOpenContext = createContext<SearchOpenState | null>(null);

function useSearchOpen(): SearchOpenState {
  const state = useContext(SearchOpenContext);
  if (!state) throw new Error("Search controls need a SearchProvider.");
  return state;
}

export function SearchProvider({ children }: { children: ReactNode }) {
  const state = useState(false);
  return (
    <SearchOpenContext.Provider value={state}>
      {children}
      <SearchDialog />
    </SearchOpenContext.Provider>
  );
}

type SearchTriggerProps = Pick<ComponentProps<typeof Button>, "children" | "className" | "size" | "aria-label"> & {
  "aria-keyshortcuts"?: string;
};

export function SearchTrigger(props: SearchTriggerProps) {
  const [isOpen, setOpen] = useSearchOpen();
  return (
    <Button
      {...props}
      type="button"
      variant="secondary"
      aria-haspopup="dialog"
      aria-expanded={isOpen}
      onPress={() => setOpen(true)}
    />
  );
}

export function NavbarSearchTrigger() {
  const mac = useSyncExternalStore(noSubscribe, isMac, () => true);
  return (
    <SearchTrigger
      aria-label="Search articles"
      aria-keyshortcuts="Control+K Meta+K"
      size="sm"
      className="size-8 min-w-8 gap-2 rounded-lg border border-kb-line bg-kb-panel px-0 font-semibold text-kb-heading data-[hovered=true]:bg-kb-hover sm:h-9 sm:w-auto sm:px-2.5"
    >
      <MagnifyingGlassIcon aria-hidden="true" className="size-4 shrink-0" />
      <span className="hidden sm:inline">Search</span>
      <Kbd className="hidden border-kb-line bg-background text-xs text-kb-muted lg:inline-flex">
        <Kbd.Abbr keyValue={mac ? "command" : "ctrl"} />
        <Kbd.Content>K</Kbd.Content>
      </Kbd>
    </SearchTrigger>
  );
}

/**
 * The shared dialog searches as you type, whether opened from the homepage or the navbar.
 * Shortcuts: ⌘K or Ctrl K toggles it from anywhere; "/" opens it when not typing in a field.
 * Results come from /api/search; ↑↓ moves through them, Enter opens one.
 */
function SearchDialog() {
  const router = useRouter();
  const [isOpen, setOpen] = useSearchOpen();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loadedQuery, setLoadedQuery] = useState<string | null>(null); // query the current results are for

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        e.preventDefault();
        e.stopPropagation();
        setOpen(false);
        setQuery("");
      } else if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        // Autocomplete forwards input keystrokes to its listbox. Handle this shortcut once.
        e.stopPropagation();
        setOpen(!isOpen);
        if (isOpen) setQuery("");
      } else if (e.key === "/" && !e.metaKey && !e.ctrlKey && !isTypingIn(e.target)) {
        e.preventDefault();
        setOpen(true);
      }
    };
    // Close the modal before the search field handles Escape as a clear action.
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [isOpen, setOpen]);

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
    <Modal.Backdrop isOpen={isOpen} onOpenChange={onOpenChange} variant="blur">
      <Modal.Container placement="top" size="lg">
        <Modal.Dialog className="gap-0 overflow-hidden border border-kb-line bg-background p-0">
          <Modal.Header className="px-4 pt-4 pb-0">
            <Modal.Heading className="text-lg font-semibold tracking-tight text-kb-heading">
              Search the knowledge base
            </Modal.Heading>
            <Modal.CloseTrigger aria-label="Close search" />
          </Modal.Header>
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
                onAction={(slug) => go(`/articles/${encodeURIComponent(slug)}`)}
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
