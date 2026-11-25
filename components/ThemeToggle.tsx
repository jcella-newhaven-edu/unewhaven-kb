"use client";

import { Button } from "@heroui/react";
import { MoonIcon, SunIcon } from "@heroicons/react/24/outline";
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
    document.documentElement.classList.toggle("dark", next);
    try {
      localStorage.setItem(THEME_STORAGE_KEY, next ? "dark" : "light");
    } catch {
      // The theme still works for this page when storage is unavailable.
    }
  }

  return (
    <Button
      aria-label="Dark mode"
      aria-pressed={isDark}
      isIconOnly
      variant="secondary"
      size="sm"
      onPress={toggle}
      className="size-8 min-w-8 border border-kb-line bg-kb-panel text-kb-heading data-[hovered=true]:bg-kb-hover sm:size-9 sm:min-w-9"
    >
      {isDark
        ? <SunIcon aria-hidden="true" className="size-4.5" />
        : <MoonIcon aria-hidden="true" className="size-4.5" />}
    </Button>
  );
}
