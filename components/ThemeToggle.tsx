"use client";

import { MoonIcon, SunIcon } from "@heroicons/react/16/solid";
import { useSyncExternalStore } from "react";
import { THEME_STORAGE_KEY } from "@/lib/theme";

function subscribe(onChange: () => void) {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
  return () => observer.disconnect();
}

const getSnapshot = () => document.documentElement.classList.contains("dark");
const getServerSnapshot = () => false;

export default function ThemeToggle() {
  const isDark = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  function toggle() {
    const next = !getSnapshot();
    const root = document.documentElement;
    root.setAttribute("data-theme-transition", "");
    root.classList.toggle("dark", next);
    try {
      localStorage.setItem(THEME_STORAGE_KEY, next ? "dark" : "light");
    } catch {
      // The theme still works for this page when storage is unavailable.
    }
  }

  return (
    <button
      type="button"
      role="switch"
      aria-label="Dark mode"
      aria-checked={isDark}
      onClick={toggle}
      className="group relative flex h-8 w-12 shrink-0 cursor-pointer items-center rounded-full bg-kb-panel ring-1 ring-kb-muted/40 ring-inset hover:bg-kb-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus sm:h-9 sm:w-14"
    >
      <MoonIcon
        aria-hidden="true"
        className="absolute end-1.5 size-3.5 text-kb-muted dark:opacity-0 motion-safe:transition-opacity motion-safe:duration-300 sm:end-2"
      />
      <SunIcon
        aria-hidden="true"
        className="absolute start-1.5 size-3.5 text-unh-secondary opacity-0 dark:opacity-100 motion-safe:transition-opacity motion-safe:duration-300 sm:start-2"
      />
      <span
        aria-hidden="true"
        className="relative ms-1 grid size-6 place-items-center rounded-full bg-unh-secondary text-unh-primary shadow-sm shadow-black/25 dark:translate-x-4 dark:bg-[#e9e8ec] dark:text-unh-deep motion-safe:transition-[translate,scale,background-color,color] motion-safe:duration-300 motion-safe:ease-(--ease-out-fluid) motion-safe:group-active:scale-90 sm:dark:translate-x-6"
      >
        <SunIcon className="size-3.5 dark:scale-0 dark:rotate-90 motion-safe:transition-transform motion-safe:duration-300 motion-safe:ease-(--ease-out-fluid)" />
        <MoonIcon className="absolute size-3.5 scale-0 -rotate-90 dark:scale-100 dark:rotate-0 motion-safe:transition-transform motion-safe:duration-300 motion-safe:ease-(--ease-out-fluid)" />
      </span>
    </button>
  );
}
