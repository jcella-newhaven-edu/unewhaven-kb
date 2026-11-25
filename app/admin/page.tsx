import Link from "next/link";
import { Chip } from "@heroui/react";
import { listAdminArticles } from "@/lib/admin/articles";
import { AdminGate, AdminHeader, AdminPage } from "./shell";
import styles from "./admin.module.css";

type AdminSearch = {
  error?: string | string[];
  status?: string | string[];
  deleted?: string | string[];
};

const statuses = [
  { value: "all", label: "All articles" },
  { value: "draft", label: "Drafts" },
  { value: "published", label: "Published" },
] as const;

const dateFormat = new Intl.DateTimeFormat("en-US", {
  month: "short", day: "numeric", year: "numeric", timeZone: "UTC",
});

export default function AdminIndex({ searchParams }: { searchParams: Promise<AdminSearch> }) {
  return (
    <AdminPage>
      <AdminGate
        searchParams={searchParams}
        render={async (session) => {
          const [query, articles] = await Promise.all([searchParams, listAdminArticles()]);
          const current = statuses.find(({ value }) => value === query.status)?.value ?? "all";
          const entries = articles.filter((article) => (
            current === "all" || article.published === (current === "published")
          ));

          return (
            <>
              <AdminHeader title="Article administration" session={session} />
              {query.deleted === "1" && <p className={styles.notice} role="status">Article deleted.</p>}
              <div className={styles.listControls}>
                <nav aria-label="Publication status" className={styles.filters}>
                  {statuses.map(({ value, label }) => (
                    <Link
                      key={value}
                      href={value === "all" ? "/admin" : `/admin?status=${value}`}
                      aria-current={value === current ? "page" : undefined}
                      prefetch={false}
                    >
                      {label}
                    </Link>
                  ))}
                </nav>
                <Link href="/admin/articles/new" className={styles.primaryLink} prefetch={false}>New article</Link>
              </div>

              {entries.length ? (
                <ul className={styles.articleList} aria-label={statuses.find(({ value }) => value === current)?.label}>
                  {entries.map((article) => (
                    <li key={article.slug} className={styles.articleRow}>
                      <div className={styles.articleDetails}>
                        <Link href={`/admin/articles/${encodeURIComponent(article.slug)}`} prefetch={false}>
                          {article.title}
                        </Link>
                        <span>{article.topicTitle || article.topicSlug}</span>
                      </div>
                      <Chip color={article.published ? "success" : "default"} variant="soft" size="sm">
                        <Chip.Label>{article.published ? "Published" : "Draft"}</Chip.Label>
                      </Chip>
                      <time dateTime={article.updated.toISOString()}>{dateFormat.format(article.updated)}</time>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className={styles.empty}>
                  {current === "all" ? "No articles yet." : current === "draft" ? "No drafts." : "No published articles."}
                </p>
              )}
            </>
          );
        }}
      />
    </AdminPage>
  );
}
