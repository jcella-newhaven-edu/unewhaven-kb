import { notFound } from "next/navigation";
import { getAdminArticle, listAdminTopics, type AdminArticle } from "@/lib/admin/articles";
import { AdminBackLink, AdminGate, AdminHeader, AdminPage } from "../../shell";
import AdminArticleForm from "../editor";
import { DeleteArticle } from "../delete";
import { adminStyles as styles } from "../../admin-styles";

const historyDate = new Intl.DateTimeFormat("en-US", {
  dateStyle: "medium", timeStyle: "short", timeZone: "UTC",
});

function ArticleHistory({ article, showAttribution }: { article: AdminArticle; showAttribution: boolean }) {
  return (
    <section className={styles.detailsPanel} aria-label="Article history">
      <h2>Article history</h2>
      <dl>
        {showAttribution && (
          <div>
            <dt>Author</dt>
            <dd>{article.authorName ?? "Not recorded"}</dd>
          </div>
        )}
        <div>
          <dt>First published</dt>
          <dd>
            {article.publishedAt
              ? <time dateTime={article.publishedAt.toISOString()}>{historyDate.format(article.publishedAt)} UTC</time>
              : "Not recorded"}
          </dd>
        </div>
        <div>
          <dt>Last edited</dt>
          <dd><time dateTime={article.updated.toISOString()}>{historyDate.format(article.updated)} UTC</time></dd>
        </div>
        {showAttribution && (
          <div>
            <dt>Last edited by</dt>
            <dd>{article.lastEditorName ?? "Not recorded"}</dd>
          </div>
        )}
      </dl>
    </section>
  );
}

export default function EditAdminArticle({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ saved?: string | string[] }>;
}) {
  return (
    <AdminPage>
      <AdminGate render={async (session) => {
        const { slug } = await params;
        const [article, topics, query] = await Promise.all([
          getAdminArticle(slug), listAdminTopics(), searchParams,
        ]);
        if (!article) notFound();

        return (
          <>
            <AdminHeader title="Edit article" session={session}>
              <AdminBackLink section="articles" />
            </AdminHeader>
            <AdminArticleForm
              key={`${article.slug}:${article.updatedToken}`}
              article={{
                slug: article.slug,
                title: article.title,
                summary: article.summary,
                topicSlug: article.topicSlug,
                topicSlugs: article.topicSlugs,
                published: article.published,
                updatedToken: article.updatedToken,
                body: article.body,
                bodyText: article.bodyText,
              }}
              topics={topics}
              history={<ArticleHistory article={article} showAttribution={session.role === "admin"} />}
              saved={query.saved === "1"}
              deletion={session.role === "admin" && (
                <DeleteArticle slug={article.slug} title={article.title} updatedToken={article.updatedToken} />
              )}
            />
          </>
        );
      }} />
    </AdminPage>
  );
}
