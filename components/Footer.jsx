import { ArrowUpRightIcon } from "@heroicons/react/20/solid";
import { IT_SUPPORT_URL } from "@/lib/site-links";

export default function Footer() {
  return (
    <footer className="border-t border-kb-line bg-kb-panel/55 text-sm text-kb-muted">
      <div className="kb-shell flex min-h-17 flex-wrap items-center justify-between gap-x-5 gap-y-2 py-4">
        <p>
          University of New Haven
          <span aria-hidden="true" className="px-2">/</span>
          Information Technology
        </p>
        <a
          href={IT_SUPPORT_URL}
          className="inline-flex items-center gap-1 rounded-sm font-semibold text-kb-heading underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-focus"
        >
          IT support <ArrowUpRightIcon aria-hidden="true" className="size-3.5" />
        </a>
      </div>
    </footer>
  );
}
