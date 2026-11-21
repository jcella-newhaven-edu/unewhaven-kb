"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import SearchDialog from "./SearchDialog";
import ThemeToggle from "./ThemeToggle";

// Edit these to match your pages.
const SITE_NAME = "Knowledge Base";
const LINKS = [
  { href: "/", label: "Home" },
  { href: "/topics", label: "Topics" },
  { href: "/articles", label: "Articles" },
];

function isActive(pathname: string | null, href: string): boolean {
  if (pathname === null) return false;
  return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
}

/**
 * The navbar sits in the root layout, but on pages whose URL isn't known until request time
 * (e.g. an article that wasn't prerendered) Cache Components can't read the pathname while
 * prerendering. So the navbar is prerendered with no link highlighted, and the highlighted
 * version streams in once the pathname is known.
 */
export default function Navbar() {
  return (
    <Suspense fallback={<NavbarView pathname={null} />}>
      <CurrentNavbar />
    </Suspense>
  );
}

function CurrentNavbar() {
  return <NavbarView pathname={usePathname()} />;
}

function NavbarView({ pathname }: { pathname: string | null }) {
  const [open, setOpen] = useState(false);

  // Close the mobile menu after navigating, and when Escape is pressed.
  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <header className="sticky top-0 z-50 bg-unh-primary text-white shadow-md shadow-unh-deep/20">
      <nav aria-label="Main" className="mx-auto flex max-w-6xl items-center justify-between gap-6 px-4 py-3 sm:px-6">
        <Link
          href="/"
          className="font-serif text-xl whitespace-nowrap focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-unh-secondary"
        >
          {SITE_NAME}
        </Link>

        <div className="flex items-center gap-3">
        {/* Desktop links */}
        <ul className="hidden items-center gap-1 md:flex">
          {LINKS.map(({ href, label }) => {
            const active = isActive(pathname, href);
            return (
              <li key={href}>
                <Link
                  href={href}
                  aria-current={active ? "page" : undefined}
                  className={`rounded-md px-3 py-2 font-medium underline-offset-8 transition-colors hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-unh-secondary ${
                    active ? "text-white underline decoration-unh-secondary decoration-2" : "text-white/80 hover:text-white"
                  }`}
                >
                  {label}
                </Link>
              </li>
            );
          })}
        </ul>

        <SearchDialog />
        <ThemeToggle />

        {/* Mobile menu button */}
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-controls="mobile-menu"
          className="-mr-2 rounded-md p-2 hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-unh-secondary md:hidden"
        >
          <span className="sr-only">{open ? "Close menu" : "Open menu"}</span>
          <svg aria-hidden="true" viewBox="0 0 24 24" className="size-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            {open ? <path d="M6 6l12 12M18 6L6 18" /> : <path d="M4 7h16M4 12h16M4 17h16" />}
          </svg>
        </button>
        </div>
      </nav>

      {/* Mobile links */}
      {open && (
        <ul id="mobile-menu" className="border-t border-white/15 px-4 pb-4 pt-2 md:hidden">
          {LINKS.map(({ href, label }) => {
            const active = isActive(pathname, href);
            return (
              <li key={href}>
                <Link
                  href={href}
                  aria-current={active ? "page" : undefined}
                  className={`block rounded-md border-l-4 px-3 py-3 font-medium focus-visible:outline-2 focus-visible:outline-unh-secondary ${
                    active ? "border-unh-secondary bg-white/10 text-white" : "border-transparent text-white/85 hover:bg-white/10 hover:text-white"
                  }`}
                >
                  {label}
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </header>
  );
}
