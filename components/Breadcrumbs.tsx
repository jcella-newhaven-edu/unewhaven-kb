import Link from "next/link";

export type Crumb = { label: string; href?: string };

/**
 * Trail of links from Home to the current page. The last item is the current page,
 * so it isn't a link and is marked aria-current for screen readers.
 */
export default function Breadcrumbs({ items }: { items: Crumb[] }) {
  return (
    <nav aria-label="Breadcrumb" className="text-sm text-slate-500 dark:text-slate-400">
      <ol className="flex flex-wrap items-center gap-x-2 gap-y-1">
        {items.map((item, i) => {
          const isCurrent = i === items.length - 1;
          return (
            <li key={item.href ?? item.label} className="flex items-center gap-2">
              {i > 0 && (
                <span aria-hidden="true" className="text-slate-300 dark:text-slate-600">
                  /
                </span>
              )}
              {isCurrent || !item.href ? (
                <span aria-current={isCurrent ? "page" : undefined} className="text-slate-700 dark:text-slate-200">
                  {item.label}
                </span>
              ) : (
                <Link
                  href={item.href}
                  className="rounded-sm hover:text-link hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus dark:hover:text-white"
                >
                  {item.label}
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
