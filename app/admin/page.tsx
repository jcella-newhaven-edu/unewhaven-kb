import Link from "next/link";
import { Button, Chip, SearchField } from "@heroui/react";
import { listAdminArticles } from "@/lib/admin/articles";
import { AdminCreateLink, AdminGate, AdminHeader, AdminPage } from "./shell";
import styles from "./admin.module.css";

type AdminSearch = {
  error?: string | string[];
  status?: string | string[];
  deleted?: string | string[];
  q?: string | string[];
};

const statuses = [
  { value: "all", label: "All articles" },
  { value: "draft", label: "Drafts" },
  { value: "published", label: "Published" },
] as const;

const dateFormat = new Intl.DateTimeFormat("en-US", {
  month: "short", day: "numeric", year: "numeric", timeZone: "UTC",
});

function statusHref(status: (typeof statuses)[number]["value"], search: string) {
  const params = new URLSearchParams();
  if (status !== "all") params.set("status", status);
  if (search) params.set("q", search);
  const query = params.toString();
  return query ? `/admin?${query}` : "/admin";
}

export default function AdminIndex({ searchParams }: { searchParams: Promise<AdminSearch> }) {
  return (
    <AdminPage>
      <AdminGate
        searchParams={searchParams}
        render={async (session) => {
          const [query, articles] = await Promise.all([searchParams, listAdminArticles()]);
          const current = statuses.find(({ value }) => value === query.status)?.value ?? "all";
          const search = typeof query.q === "string" ? query.q.trim().slice(0, 120) : "";
          const term = search.toLowerCase();
          const published = articles.filter((article) => article.published).length;
          const counts = { all: articles.length, draft: articles.length - published, published };
          const entries = articles.filter((article) => (
            (current === "all" || article.published === (current === "published"))
            && (!term || [article.title, article.summary, ...article.topics.map((topic) => topic.title)]
              .some((value) => value.toLowerCase().includes(term)))
          ));

          return (
            <>
              <AdminHeader title="Articles" session={session} actions={<AdminCreateLink section="articles" />} />
              {query.deleted === "1" && <p className={styles.notice} role="status">Article deleted.</p>}
              <div className={styles.directory}>
                <div className={styles.listControls}>
                  <nav aria-label="Publication status" className={styles.filters}>
                    {statuses.map(({ value, label }) => (
                      <Link
                        key={value}
                        href={statusHref(value, search)}
                        aria-current={value === current ? "page" : undefined}
                        prefetch={false}
                      >
                        {label}
                        <span className={styles.filterCount}>{counts[value]}</span>
                      </Link>
                    ))}
                  </nav>
                  <form action="/admin" method="get" className={styles.searchForm}>
                    {current !== "all" && <input type="hidden" name="status" value={current} />}
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

                {entries.length ? (
                  <table className={`${styles.table} ${styles.articleTable}`} aria-label="Articles">
                    <thead>
                      <tr>
                        <th scope="col">Article</th>
                        <th scope="col">Status</th>
                        <th scope="col">Author</th>
                        <th scope="col">First published</th>
                        <th scope="col">Last edited</th>
                      </tr>
                    </thead>
                    <tbody>
                      {entries.map((article) => (
                        <tr key={article.slug}>
                          <th scope="row">
                            <div className={styles.rowIdentity}>
                              <Link href={`/admin/articles/${encodeURIComponent(article.slug)}`} prefetch={false}>
                                {article.title}
                              </Link>
                              <span className={styles.rowDetail}>
                                {article.topics.length ? article.topics.map(({ title }) => title).join(" · ") : article.topicTitle}
                              </span>
                            </div>
                          </th>
                          <td data-label="Status">
                            <Chip color={article.published ? "success" : "default"} variant="soft" size="sm">
                              <Chip.Label>{article.published ? "Published" : "Draft"}</Chip.Label>
                            </Chip>
                          </td>
                          <td data-label="Author">
                            {article.authorName ?? <span className={styles.rowDetail}>Not recorded</span>}
                          </td>
                          <td data-label="First published">
                            {article.publishedAt
                              ? <time dateTime={article.publishedAt.toISOString()}>{dateFormat.format(article.publishedAt)}</time>
                              : <span className={styles.rowDetail}>Not recorded</span>}
                          </td>
                          <td data-label="Last edited">
                            <time dateTime={article.updated.toISOString()}>{dateFormat.format(article.updated)}</time>
                            <span className={styles.rowDetail}>{article.lastEditorName ?? "Editor not recorded"}</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <div className={styles.emptyResults}>
                    <p>{search
                      ? "No articles match this search."
                      : current === "all" ? "No articles yet." : current === "draft" ? "No drafts." : "No published articles."}</p>
                    {search && <Link className={styles.backLink} href={statusHref(current, "")} prefetch={false}>Clear search</Link>}
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
