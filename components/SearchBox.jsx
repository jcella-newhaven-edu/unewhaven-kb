'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';

/**
 * Search form with live suggestions. It is a plain GET form, so it still
 * works before JavaScript loads; suggestions are a progressive enhancement.
 */
export default function SearchBox({ variant = 'compact', defaultValue = '' }) {
  const id = useId();
  const listId = `${id}-suggestions`;
  const router = useRouter();
  const formRef = useRef(null);
  const [query, setQuery] = useState(defaultValue);
  const [results, setResults] = useState([]);
  const [active, setActive] = useState(-1);
  const [open, setOpen] = useState(false);
  // Only suggest after the person types, not for a prefilled query on the results page.
  const typed = useRef(false);

  useEffect(() => setQuery(defaultValue), [defaultValue]);

  // Debounced lookup; aborts stale requests so results never arrive out of order.
  useEffect(() => {
    const q = query.trim();
    if (!typed.current) return;
    if (q.length < 2) {
      setResults([]);
      setOpen(false);
      return;
    }
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?limit=6&q=${encodeURIComponent(q)}`, { signal: controller.signal });
        if (!res.ok) throw new Error(res.statusText);
        const data = await res.json();
        setResults(data.results);
        setActive(-1);
        setOpen(data.results.length > 0);
      } catch (err) {
        if (err.name !== 'AbortError') setOpen(false);
      }
    }, 140);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query]);

  useEffect(() => {
    const onClick = (e) => {
      if (!formRef.current?.contains(e.target)) setOpen(false);
    };
    document.addEventListener('click', onClick);
    return () => document.removeEventListener('click', onClick);
  }, []);

  function onKeyDown(e) {
    if (!open) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActive((i) => (i + 1) % results.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((i) => (i <= 0 ? results.length - 1 : i - 1));
    } else if (e.key === 'Enter' && active >= 0) {
      e.preventDefault();
      setOpen(false);
      router.push(results[active].url);
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  }

  return (
    <form ref={formRef} className={`search search--${variant}`} action="/search" method="get" role="search">
      <label className="visually-hidden" htmlFor={id}>Search the knowledge base</label>
      <input
        id={id}
        type="search"
        name="q"
        value={query}
        onChange={(e) => {
          typed.current = true;
          setQuery(e.target.value);
        }}
        onKeyDown={onKeyDown}
        placeholder={variant === 'hero' ? 'Search for a topic, error or question' : 'Search articles'}
        autoComplete="off"
        spellCheck={false}
        data-search-input=""
        role="combobox"
        aria-autocomplete="list"
        aria-controls={listId}
        aria-expanded={open}
        aria-activedescendant={active >= 0 ? `${listId}-${active}` : undefined}
      />
      <button type="submit">Search</button>
      <ul id={listId} className="suggestions" role="listbox" hidden={!open}>
        {results.map((r, i) => (
          <li key={r.url} id={`${listId}-${i}`} role="option" aria-selected={i === active}>
            <a href={r.url} tabIndex={-1} onClick={() => setOpen(false)}>
              <span>{r.title}</span>
              <span className="suggestion-category">{r.category}</span>
            </a>
          </li>
        ))}
      </ul>
    </form>
  );
}
