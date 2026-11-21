"use client";

import { MoonIcon, SunIcon } from "@heroicons/react/16/solid";
import { useSyncExternalStore } from "react";

const STORAGE_KEY = "theme";

/**
 * Runs in <head> before the page is shown, so the right theme is applied with no flash.
 * Uses the saved choice, or the system setting if the visitor hasn't chosen.
 */
export const themeScript = `(() => {
  try {
    const saved = localStorage.getItem("${STORAGE_KEY}");
    const dark = saved ? saved === "dark" : matchMedia("(prefers-color-scheme: dark)").matches;
    document.documentElement.classList.toggle("dark", dark);
  } catch {}
})();`;

// Keep React in sync with the "dark" class on <html>.
function subscribe(onChange: () => void) {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
  return () => observer.disconnect();
}
const getSnapshot = () => document.documentElement.classList.contains("dark");
const getServerSnapshot = () => false;

export default function ThemeToggle({ className = "" }: { className?: string }) {
  const isDark = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  function toggle() {
    const next = !document.documentElement.classList.contains("dark");
    document.documentElement.classList.toggle("dark", next);
    try {
      localStorage.setItem(STORAGE_KEY, next ? "dark" : "light");
    } catch {
      /* private browsing: the choice just isn't remembered */
    }
  }

  return (
    <button
      type="button"
      role="switch"
      aria-checked={isDark}
      aria-label="Dark mode"
      title={isDark ? "Switch to light mode" : "Switch to dark mode"}
      onClick={toggle}
      className={`group relative inline-flex h-8 w-14 shrink-0 cursor-pointer items-center rounded-full bg-white/15 ring-1 ring-white/25 ring-inset transition-colors duration-300 hover:bg-white/25 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-unh-secondary dark:bg-unh-deep dark:ring-unh-tertiary-light/40 ${className}`}
    >
      {/* Track hints on the empty side: moon on the right in light mode, sun on the left in dark mode */}
      <MoonIcon className="absolute right-2 size-3.5 text-white/70 transition-opacity duration-300 dark:opacity-0" />
      <SunIcon className="absolute left-2 size-3.5 text-unh-secondary/70 opacity-0 transition-opacity duration-300 dark:opacity-100" />

      {/* Knob: yellow sun in light mode, slides right and becomes a pale moon in dark mode.
          Eased with HeroUI's --ease-out-fluid curve (the one its Switch uses), from @heroui/styles. */}
      <span className="relative ml-1 flex size-6 items-center justify-center rounded-full bg-unh-secondary shadow-md shadow-black/30 transition-all duration-300 ease-(--ease-out-fluid) group-active:scale-90 dark:translate-x-6 dark:bg-slate-100 motion-reduce:transition-none">
        <SunIcon className="size-3.5 text-unh-primary transition-all duration-300 ease-(--ease-out-fluid) dark:scale-0 dark:rotate-90" />
        <MoonIcon className="absolute size-3.5 scale-0 -rotate-90 text-unh-deep transition-all duration-300 ease-(--ease-out-fluid) dark:scale-100 dark:rotate-0" />
      </span>
    </button>
  );
}
