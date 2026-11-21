import Link from "next/link";

// Edit these to match your pages.
const SITE_NAME = "Knowledge Base";
const TAGLINE = "Guides, how-tos and reference articles, all in one place.";
const GROUPS = [
  {
    heading: "Browse",
    links: [
      { href: "/topics", label: "Topics" },
      { href: "/articles", label: "Articles" },
      { href: "/search", label: "Search" },
    ],
  },
  {
    heading: "Help",
    links: [
      { href: "/contact", label: "Contact support" },
      { href: "/about", label: "About" },
    ],
  },
];

const linkClass =
  "rounded-sm text-slate-300 underline-offset-4 transition-colors hover:text-white hover:underline hover:decoration-unh-secondary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-unh-secondary";

export default function Footer() {
  // const year = new Date().getFullYear();
  const year = "2026"

  return (
    <footer className="bg-unh-primary text-slate-300 dark:border-t dark:border-white/10 dark:bg-[#050f1a]">
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
        <div className="grid grid-cols-2 gap-10 lg:grid-cols-4">
          <div className="col-span-2">
            <Link
              href="/"
              className="font-serif text-xl text-white focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-unh-secondary"
            >
              {SITE_NAME}
            </Link>
            <p className="mt-3 max-w-sm text-sm leading-6 text-slate-400">{TAGLINE}</p>
          </div>

          {GROUPS.map((group) => (
            <nav key={group.heading} aria-labelledby={`footer-${group.heading}`}>
              <h2
                id={`footer-${group.heading}`}
                className="text-sm font-semibold uppercase tracking-wider text-unh-secondary"
              >
                {group.heading}
              </h2>
              <ul className="mt-4 space-y-3 text-sm">
                {group.links.map(({ href, label }) => (
                  <li key={href}>
                    <Link href={href} className={linkClass}>
                      {label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>

        <div className="mt-12 border-t border-white/10 pt-6 text-sm text-slate-400">
          <p>
            © {year} {SITE_NAME}
          </p>
        </div>
      </div>
    </footer>
  );
}
