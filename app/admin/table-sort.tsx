import Link from "next/link";
import { ArrowDownIcon, ArrowUpIcon, ArrowsUpDownIcon, PencilSquareIcon } from "@heroicons/react/24/outline";
import { Button, Dropdown } from "@heroui/react";
import { adminTable } from "./admin-styles";

type SortDirection = "asc" | "desc";

export type SortState<Key extends string = string> = { key: Key; direction: SortDirection };
export type SortColumn<Key extends string = string> = {
  key: Key;
  label: string;
  initialDirection?: SortDirection;
};

const columnCollator = new Intl.Collator("en-US", { numeric: true, sensitivity: "base" });

export function parseSort<Key extends string>(
  query: { sort?: string | string[]; dir?: string | string[] },
  columns: readonly SortColumn<Key>[],
  fallback: SortState<Key>,
): SortState<Key> {
  const column = columns.find(({ key }) => key === query.sort);
  if (!column) return fallback;
  return {
    key: column.key,
    direction: query.dir === "asc" || query.dir === "desc"
      ? query.dir
      : column.initialDirection ?? "asc",
  };
}

export function nextSort<Key extends string>(column: SortColumn<Key>, active: SortState<Key>): SortState<Key> {
  const direction = column.key === active.key
    ? active.direction === "asc" ? "desc" : "asc"
    : column.initialDirection ?? "asc";
  return { key: column.key, direction };
}

export function compareSortValues(a: string | number | null, b: string | number | null, direction: SortDirection) {
  if (a === b) return 0;
  if (a === null) return 1;
  if (b === null) return -1;
  const comparison = typeof a === "number" && typeof b === "number"
    ? a - b
    : columnCollator.compare(String(a), String(b));
  return direction === "asc" ? comparison : -comparison;
}

function directionLabel(direction: SortDirection) {
  return direction === "asc" ? "ascending" : "descending";
}

export function SortHeader({
  column,
  active,
  href,
  className = "",
}: {
  column: SortColumn;
  active: SortState;
  href: string;
  className?: string;
}) {
  const isActive = column.key === active.key;
  const Icon = isActive
    ? active.direction === "asc" ? ArrowUpIcon : ArrowDownIcon
    : ArrowsUpDownIcon;

  return (
    <th scope="col" aria-sort={isActive ? directionLabel(active.direction) : undefined} className={`${adminTable.column} ${className}`}>
      <span className="min-[52rem]:hidden">{column.label}</span>
      <Link
        href={href}
        prefetch={false}
        aria-label={`Sort by ${column.label} ${directionLabel(nextSort(column, active).direction)}`}
        className={`hidden max-w-full items-center gap-1.5 rounded-sm text-start hover:text-link hover:underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus min-[52rem]:inline-flex ${isActive ? "text-kb-heading" : ""}`}
      >
        <span className="min-w-0">{column.label}</span>
        <Icon aria-hidden="true" className={`size-3.5 shrink-0 ${isActive ? "text-link" : "text-kb-muted"}`} />
      </Link>
    </th>
  );
}

export function MobileSort<Key extends string>({
  columns,
  active,
  hrefFor,
}: {
  columns: readonly SortColumn<Key>[];
  active: SortState<Key>;
  hrefFor: (sort: SortState<Key>) => string;
}) {
  const column = columns.find(({ key }) => key === active.key);
  if (!column) return null;
  const Icon = active.direction === "asc" ? ArrowUpIcon : ArrowDownIcon;

  return (
    <div className="flex justify-end border-b border-kb-line px-4 py-2 min-[52rem]:hidden">
      <Dropdown>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          aria-label={`Sort by ${column.label}, ${directionLabel(active.direction)}`}
          className="max-w-full"
        >
          <span>Sort by {column.label}</span>
          <Icon aria-hidden="true" className="size-3.5 shrink-0" />
        </Button>
        <Dropdown.Popover placement="bottom end">
          <Dropdown.Menu aria-label="Sort columns">
            {columns.map((option) => {
              const next = nextSort(option, active);
              return (
                <Dropdown.Item key={option.key} id={option.key} href={hrefFor(next)} textValue={option.label}>
                  <span>{option.label}</span>
                  <span className="ms-auto text-xs text-kb-muted capitalize">{directionLabel(next.direction)}</span>
                </Dropdown.Item>
              );
            })}
          </Dropdown.Menu>
        </Dropdown.Popover>
      </Dropdown>
    </div>
  );
}

export function AdminEditLink({ href, title }: { href: string; title: string }) {
  const label = `Edit ${title}`;
  return (
    <Link
      href={href}
      prefetch={false}
      aria-label={label}
      title="Edit"
      className="inline-grid size-8 shrink-0 place-items-center rounded-md text-kb-heading hover:bg-kb-highlight focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
    >
      <PencilSquareIcon aria-hidden="true" className="size-4" />
    </Link>
  );
}
