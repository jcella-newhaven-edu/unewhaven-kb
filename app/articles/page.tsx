import type { Metadata } from "next";
import { Breadcrumbs } from "@heroui/react";
import { getAllArticles } from "@/lib/data/articles";
import ArticleCardList from "../article-card-list";
import { browseStyles as styles } from "../browse-styles";

export const metadata: Metadata = { title: "All articles" };

export default async function ArticlesPage() {
  const articles = await getAllArticles();

  return (
    <main className={styles.shell}>
      <Breadcrumbs>
        <Breadcrumbs.Item href="/">Home</Breadcrumbs.Item>
        <Breadcrumbs.Item>Articles</Breadcrumbs.Item>
      </Breadcrumbs>

      <h1 className={styles.heading}>All articles</h1>
      <p className={styles.intro}>Every published guide and how-to, A to Z.</p>

      {articles.length === 0 ? (
        <p className={styles.status}>No articles published yet.</p>
      ) : (
        <ArticleCardList articles={articles} className="mt-6" />
      )}
    </main>
  );
}
