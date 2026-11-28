"use client";

import { Suspense } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button, Dropdown } from "@heroui/react";
import { ArrowUpRightIcon, Bars3Icon, BookOpenIcon } from "@heroicons/react/24/outline";
import { IT_SUPPORT_URL } from "@/lib/site-links";
import { NavbarSearchTrigger } from "./SearchDialog";
import ThemeToggle from "./ThemeToggle";

const navLink =
  "inline-flex items-center gap-1 rounded-sm text-sm font-semibold text-kb-heading underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-focus";

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
  const isBrowsing = pathname?.startsWith("/topics") || pathname?.startsWith("/articles");

  return (
    <header className="sticky top-0 z-40 border-b border-kb-line bg-background/95 backdrop-blur">
      <div className="kb-shell flex min-h-(--kb-header-height) items-center justify-between gap-2 sm:gap-5">
        <Link
          href="/"
          aria-label="IT Knowledge Base homepage"
          className="flex shrink-0 items-center gap-2 rounded-lg text-kb-heading focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-focus sm:gap-3"
        >
          <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-unh-primary text-unh-secondary sm:size-10 sm:rounded-xl">
            <BookOpenIcon aria-hidden="true" className="size-4.5 sm:size-5.5" />
          </span>
          <span className="whitespace-nowrap">
            <span className="block text-[0.625rem] leading-tight font-semibold text-kb-muted sm:text-[0.6875rem]">
              University of New Haven
            </span>
            <span className="block text-[0.8125rem] leading-tight font-bold tracking-tight sm:text-base">
              Knowledge Base
            </span>
          </span>
        </Link>

        <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
          <nav aria-label="Main navigation" className="mr-4 hidden items-center gap-6 md:flex">
            <Link
              href="/topics"
              aria-current={isBrowsing ? "true" : undefined}
              className={`${navLink} ${isBrowsing ? "underline" : ""}`}
            >
              Browse Topics
            </Link>
            <a href={IT_SUPPORT_URL} className={navLink}>
              Help Desk <ArrowUpRightIcon aria-hidden="true" className="size-3.5" />
            </a>
          </nav>

          <NavbarSearchTrigger />
          <ThemeToggle />

          <div className="md:hidden">
            <Dropdown>
              <Button
                aria-label="Navigation menu"
                isIconOnly
                variant="secondary"
                size="sm"
                className="size-8 min-w-8 border border-kb-line bg-kb-panel text-kb-heading data-[hovered=true]:bg-kb-hover sm:size-9 sm:min-w-9"
              >
                <Bars3Icon aria-hidden="true" className="size-4.5" />
              </Button>
              <Dropdown.Popover placement="bottom end">
                <Dropdown.Menu aria-label="Main navigation">
                  <Dropdown.Item href="/topics" id="topics">Browse topics</Dropdown.Item>
                  <Dropdown.Item href="/articles" id="articles">All guides</Dropdown.Item>
                  <Dropdown.Item href={IT_SUPPORT_URL} id="contact">Contact IT</Dropdown.Item>
                </Dropdown.Menu>
              </Dropdown.Popover>
            </Dropdown>
          </div>
        </div>
      </div>
    </header>
  );
}
