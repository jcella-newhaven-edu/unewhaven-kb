import type { Metadata } from "next";
import Link from "next/link";
import { ChevronRightIcon } from "@heroicons/react/24/outline";
import { Breadcrumbs } from "@heroui/react";
import { getAllArticles } from "@/lib/data/articles";
import styles from "../browse.module.css";

export const metadata: Metadata = { title: "All articles" };

const formatDate = (date: Date) =>
  new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" }).format(date);

export default async function ArticlesPage() {
  const articles = await getAllArticles();

  return (
    <main className={`kb-shell ${styles.shell}`}>
      <Breadcrumbs>
        <Breadcrumbs.Item href="/">Home</Breadcrumbs.Item>
        <Breadcrumbs.Item>Articles</Breadcrumbs.Item>
      </Breadcrumbs>

      <h1 className={styles.heading}>All articles</h1>
      <p className={styles.intro}>Every published guide and how-to, A to Z.</p>

      {articles.length === 0 ? (
        <p className={styles.status}>No articles published yet.</p>
      ) : (
        <ul className={styles.list}>
          {articles.map((article) => (
            <li key={article.slug} className={styles.listItem}>
              <Link href={`/articles/${article.slug}`} className={styles.row}>
                <div className={styles.rowText}>
                  <h2 className={styles.rowTitle}>{article.title}</h2>
                  {article.summary && <p className={styles.summary}>{article.summary}</p>}
                  <p className={styles.meta}>
                    Last Updated <time dateTime={article.updated.toISOString()}>{formatDate(article.updated)}</time>
                  </p>
                </div>
                <ChevronRightIcon aria-hidden="true" className={styles.arrow} />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
