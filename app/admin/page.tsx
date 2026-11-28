import Link from "next/link";
import { Button, Chip, SearchField } from "@heroui/react";
import { listAdminArticles, type AdminArticleSummary } from "@/lib/admin/articles";
import AdminFeedback from "./admin-feedback";
import { AdminCreateLink, AdminGate, AdminHeader, AdminPage } from "./shell";
import { adminStyles, adminTable } from "./admin-styles";
import { DeleteArticle } from "./articles/delete";
import { AdminEditLink, compareSortValues, MobileSort, nextSort, parseSort, SortHeader, type SortColumn, type SortState } from "./table-sort";

type AdminSearch = {
  error?: string | string[];
  status?: string | string[];
  deleted?: string | string[];
  q?: string | string[];
  sort?: string | string[];
  dir?: string | string[];
  review?: string | string[];
};

const statuses = [
  { value: "all", label: "All articles" },
  { value: "draft", label: "Drafts" },
  { value: "published", label: "Published" },
  { value: "working", label: "Working drafts" },
] as const;
type ArticleStatus = (typeof statuses)[number]["value"];

type ArticleSortKey = "title" | "status" | "author" | "published" | "updated";

const columns: (SortColumn<ArticleSortKey> & { className?: string })[] = [
  { key: "title", label: "Article", className: "w-[31%]" },
  { key: "status", label: "Status", className: "w-[12%]" },
  { key: "author", label: "Author" },
  { key: "published", label: "First published", initialDirection: "desc", className: "w-[16%]" },
  { key: "updated", label: "Last edited", initialDirection: "desc" },
];

const defaultSort: SortState<ArticleSortKey> = { key: "updated", direction: "desc" };

function draftIsLatestEdit(article: AdminArticleSummary) {
  return article.workingDraftToken !== null && article.workingDraftToken >= article.updatedToken;
}

const sortValues: Record<ArticleSortKey, (article: AdminArticleSummary) => string | number | null> = {
  title: (article) => article.title,
  status: (article) => Number(article.published),
  author: (article) => article.authorName,
  published: (article) => article.publishedAt?.getTime() ?? null,
  updated: (article) => draftIsLatestEdit(article) ? article.workingDraftToken : article.updatedToken,
};

const dateFormat = new Intl.DateTimeFormat("en-US", {
  month: "short", day: "numeric", year: "numeric", timeZone: "UTC",
});

function isDefaultSort(sort: SortState<ArticleSortKey>) {
  return sort.key === defaultSort.key && sort.direction === defaultSort.direction;
}

function articleListHref(status: ArticleStatus, search: string, sort: SortState<ArticleSortKey>, reviewDue: boolean) {
  const params = new URLSearchParams();
  if (status !== "all") params.set("status", status);
  if (search) params.set("q", search);
  if (reviewDue) params.set("review", "due");
  if (!isDefaultSort(sort)) {
    params.set("sort", sort.key);
    params.set("dir", sort.direction);
  }
  const query = params.toString();
  return query ? `/admin?${query}` : "/admin";
}

function matchesStatus(article: AdminArticleSummary, status: ArticleStatus) {
  switch (status) {
    case "published": return article.published;
    case "draft": return !article.published;
    case "working": return article.workingDraftUpdated !== null;
    default: return true;
  }
}

export default function AdminIndex({ searchParams }: { searchParams: Promise<AdminSearch> }) {
  return (
    <AdminPage>
      <AdminGate
        searchParams={searchParams}
        render={async (session) => {
          const [query, articles] = await Promise.all([searchParams, listAdminArticles()]);
          const showAttribution = session.role === "admin";
          const current = statuses.find(({ value }) => value === query.status)?.value ?? "all";
          const reviewDue = query.review === "due";
          const search = typeof query.q === "string" ? query.q.trim().slice(0, 120) : "";
          const visibleColumns = columns.filter(({ key }) => key !== "author" || showAttribution);
          const sort = parseSort(query, visibleColumns, defaultSort);
          const sortHref = (next: SortState<ArticleSortKey>) => articleListHref(current, search, next, reviewDue);
          const term = search.toLowerCase();
          const published = articles.filter((article) => article.published).length;
          const counts = {
            all: articles.length,
            draft: articles.length - published,
            published,
            working: articles.filter((article) => article.workingDraftUpdated).length,
          };
          const reviewCount = articles.filter((article) => article.reviewDue).length;
          const entries = articles.filter((article) => (
            matchesStatus(article, current) && (!reviewDue || article.reviewDue)
            && (!term || [article.title, article.summary, ...article.topics.map((topic) => topic.title)]
              .some((value) => value.toLowerCase().includes(term)))
          ));
          if (!isDefaultSort(sort)) {
            const value = sortValues[sort.key];
            entries.sort((left, right) => compareSortValues(value(left), value(right), sort.direction));
          }

          return (
            <>
              <AdminHeader title="Articles" session={session} actions={<AdminCreateLink section="articles" />} />
              {query.deleted === "1" && <AdminFeedback status="success" className="mb-5 max-w-3xl">Article deleted.</AdminFeedback>}
              <div className={adminStyles.directory}>
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-kb-line px-4 py-3.5 max-[42rem]:p-3">
                  <nav aria-label="Publication status" className="flex flex-wrap gap-1 rounded-[0.625rem] border border-kb-line bg-kb-panel p-1">
                    {statuses.map(({ value, label }) => (
                      <Link
                        key={value}
                        href={articleListHref(value, search, sort, reviewDue)}
                        aria-current={value === current ? "page" : undefined}
                        prefetch={false}
                        className="inline-flex items-center gap-[0.35rem] rounded-md px-[0.7rem] py-[0.4rem] text-sm font-semibold text-kb-muted hover:bg-kb-hover hover:text-kb-heading aria-[current=page]:bg-kb-hover aria-[current=page]:text-kb-heading focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus max-[42rem]:px-2"
                      >
                        {label}
                        <span className="min-w-[1.2rem] text-end text-xs text-kb-muted max-[42rem]:min-w-0">{counts[value]}</span>
                      </Link>
                    ))}
                  </nav>
                  <Link
                    href={articleListHref(current, search, sort, !reviewDue)}
                    aria-current={reviewDue ? "true" : undefined}
                    prefetch={false}
                    className="inline-flex items-center gap-2 rounded-lg border border-kb-line bg-kb-panel px-3 py-2 text-sm font-semibold text-kb-muted hover:bg-kb-hover hover:text-kb-heading aria-[current=true]:bg-kb-highlight aria-[current=true]:text-kb-heading focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
                  >
                    Due for review <span className="text-xs">{reviewCount}</span>
                  </Link>
                  <form action="/admin" method="get" className="flex min-w-[min(19rem,100%)] max-w-[27rem] flex-1 items-center gap-2 [&>[data-slot=search-field]]:min-w-0 [&>[data-slot=search-field]]:flex-1 [&>button]:shrink-0">
                    {current !== "all" && <input type="hidden" name="status" value={current} />}
                    {reviewDue && <input type="hidden" name="review" value="due" />}
                    {!isDefaultSort(sort) && (
                      <>
                        <input type="hidden" name="sort" value={sort.key} />
                        <input type="hidden" name="dir" value={sort.direction} />
                      </>
                    )}
                    <SearchField key={search} aria-label="Search articles" name="q" defaultValue={search} fullWidth>
                      <SearchField.Group>
                        <SearchField.SearchIcon />
                        <SearchField.Input placeholder="Search title or topic" maxLength={120} />
                        <SearchField.ClearButton />
                      </SearchField.Group>
                    </SearchField>
                    <Button type="submit" variant="secondary" size="sm">Search</Button>
                  </form>
                </div>

                {!!entries.length && <MobileSort columns={visibleColumns} active={sort} hrefFor={sortHref} />}
                {entries.length ? (
                  <table className={adminTable.table} aria-label="Articles">
                    <thead className={adminTable.head}>
                      <tr>
                        {visibleColumns.map((column) => (
                          <SortHeader key={column.key} column={column} active={sort} href={sortHref(nextSort(column, sort))} className={column.className} />
                        ))}
                        <th scope="col" className={`${adminTable.column} w-[6.5rem]`}>Actions</th>
                      </tr>
                    </thead>
                    <tbody className={adminTable.body}>
                      {entries.map((article) => {
                        const href = `/admin/articles/${encodeURIComponent(article.slug)}`;
                        const draftLatest = draftIsLatestEdit(article);
                        const edited = (draftLatest && article.workingDraftUpdated) || article.updated;
                        const editorName = draftLatest ? article.workingDraftEditorName : article.lastEditorName;
                        return (
                          <tr key={article.slug} className={adminTable.row}>
                            <th scope="row" className={adminTable.name}>
                              <div className="grid gap-[0.2rem]">
                                <Link href={href} className={adminStyles.rowLink} prefetch={false}>
                                  {article.title}
                                </Link>
                                <span className={adminStyles.rowDetail}>
                                  {article.topics.length ? article.topics.map(({ title }) => title).join(" · ") : article.topicTitle}
                                </span>
                                {article.workingDraftUpdated && <span className={adminStyles.rowDetail}>Working draft</span>}
                                {article.ownerName && <span className={adminStyles.rowDetail}>Owner {article.ownerName}</span>}
                                {article.reviewDueOn && (
                                  <span className={adminStyles.rowDetail}>
                                    {article.reviewDue ? "Review due " : "Review on "}
                                    <time dateTime={article.reviewDueOn}>{dateFormat.format(new Date(article.reviewDueOn))}</time>
                                  </span>
                                )}
                              </div>
                            </th>
                            <td data-label="Status" className={adminTable.cell}>
                              <Chip color={article.published ? "success" : "default"} variant="soft" size="sm">
                                <Chip.Label>{article.published ? "Published" : "Draft"}</Chip.Label>
                              </Chip>
                            </td>
                            {showAttribution && (
                              <td data-label="Author" className={adminTable.cell}>
                                {article.authorName ?? <span className={adminStyles.rowDetail}>Not recorded</span>}
                              </td>
                            )}
                            <td data-label="First published" className={adminTable.cell}>
                              {article.publishedAt
                                ? <time dateTime={article.publishedAt.toISOString()}>{dateFormat.format(article.publishedAt)}</time>
                                : <span className={adminStyles.rowDetail}>Not recorded</span>}
                            </td>
                            <td data-label="Last edited" className={adminTable.cell}>
                              <time dateTime={edited.toISOString()}>{dateFormat.format(edited)}</time>
                              {showAttribution && (
                                <span className={adminStyles.rowDetail}>{editorName ?? "Editor not recorded"}</span>
                              )}
                            </td>
                            <td data-label="Actions" className={adminTable.cell}>
                              <div className="flex flex-wrap items-center gap-1">
                                <AdminEditLink href={href} title={article.title} />
                                {showAttribution && (
                                  <DeleteArticle compact slug={article.slug} title={article.title} updatedToken={article.updatedToken} draftToken={article.workingDraftToken ?? ""} />
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                ) : (
                  <div className={adminStyles.emptyResults}>
                    <p>{search
                      ? "No articles match this search."
                      : reviewDue ? "No matching articles are due for review."
                        : current === "all" ? "No articles yet."
                          : current === "draft" ? "No drafts."
                            : current === "working" ? "No working drafts." : "No published articles."}</p>
                    {search && <Link className={adminStyles.backLink} href={articleListHref(current, "", sort, reviewDue)} prefetch={false}>Clear search</Link>}
                  </div>
                )}
              </div>
            </>
          );
        }}
      />
    </AdminPage>
  );
}
