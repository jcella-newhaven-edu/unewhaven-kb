import type { Metadata } from "next";
import { ArrowLeftIcon } from "@heroicons/react/24/outline";
import { Chip } from "@heroui/react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getManagedUser, type ManagedUserArticle } from "@/lib/admin/users";
import { adminStyles, adminTable } from "../../admin-styles";
import { AdminGate, AdminHeader, AdminPage } from "../../shell";
import { UserDate, UserRole } from "../account-display";

export const metadata: Metadata = { title: "User details" };

function ArticleActivity({ articles }: { articles: ManagedUserArticle[] }) {
  return (
    <section aria-labelledby="user-article-activity">
      <h2 id="user-article-activity" className="mb-1 text-lg font-semibold text-kb-heading">Article activity</h2>
      <p className="mb-4 text-sm text-kb-muted">Articles this user authored or most recently edited.</p>
      <div className={adminStyles.directory}>
        {articles.length ? (
          <table className={adminTable.table} aria-labelledby="user-article-activity">
            <thead className={adminTable.head}>
              <tr>
                <th scope="col" className={`${adminTable.column} w-[30%] rounded-ss-xl`}>Article</th>
                <th scope="col" className={`${adminTable.column} w-[13%]`}>Status</th>
                <th scope="col" className={`${adminTable.column} w-[19%]`}>Contribution</th>
                <th scope="col" className={adminTable.column}>First published</th>
                <th scope="col" className={`${adminTable.column} rounded-se-xl`}>Last edited</th>
              </tr>
            </thead>
            <tbody className={adminTable.body}>
              {articles.map((article) => (
                <tr key={article.slug} className={adminTable.row}>
                  <th scope="row" className={adminTable.name}>
                    <Link
                      href={`/admin/articles/${encodeURIComponent(article.slug)}`}
                      className={adminStyles.rowLink}
                      prefetch={false}
                    >
                      {article.title}
                    </Link>
                  </th>
                  <td data-label="Status" className={adminTable.cell}>
                    <Chip color={article.published ? "success" : "default"} variant="soft" size="sm">
                      <Chip.Label>{article.published ? "Published" : "Draft"}</Chip.Label>
                    </Chip>
                  </td>
                  <td data-label="Contribution" className={adminTable.cell}>
                    <div className="flex flex-wrap gap-1.5">
                      {article.isAuthor && <Chip variant="soft" size="sm"><Chip.Label>Author</Chip.Label></Chip>}
                      {article.isLastEditor && <Chip variant="soft" size="sm"><Chip.Label>Latest editor</Chip.Label></Chip>}
                    </div>
                  </td>
                  <td data-label="First published" className={adminTable.cell}>
                    {article.publishedAt ? <UserDate value={article.publishedAt} /> : <span className={adminStyles.rowDetail}>Not recorded</span>}
                  </td>
                  <td data-label="Last edited" className={adminTable.cell}><UserDate value={article.updated} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className={adminStyles.emptyResults}>No articles list this user as author or latest editor.</p>
        )}
      </div>
    </section>
  );
}

export default function AdminUserDetails({ params }: { params: Promise<{ id: string }> }) {
  return (
    <AdminPage>
      <AdminGate render={async (session) => {
        if (session.role !== "admin") redirect("/admin");
        const { id } = await params;
        const account = await getManagedUser(id);
        if (!account) notFound();
        const { user, articles } = account;

        return (
          <>
            <AdminHeader title={user.displayName} session={session} section="users">
              <Link href="/admin/users" className={`${adminStyles.backLink} inline-flex items-center gap-1.5`} prefetch={false}>
                <ArrowLeftIcon aria-hidden="true" className="size-4 shrink-0" />
                Back to users
              </Link>
            </AdminHeader>

            <div className="grid gap-5">
              <section className={adminStyles.detailsPanel} aria-label="Account details">
                <h2>Account details</h2>
                <dl className="grid-cols-1 min-[30rem]:grid-cols-2 min-[52rem]:grid-cols-4">
                  <div>
                    <dt>Email</dt>
                    <dd>{user.email ?? "Not recorded"}</dd>
                  </div>
                  <div>
                    <dt>Role</dt>
                    <dd><UserRole role={user.role} /></dd>
                  </div>
                  <div>
                    <dt>First signed in</dt>
                    <dd><UserDate value={user.createdAt} /></dd>
                  </div>
                  <div>
                    <dt>Last signed in</dt>
                    <dd><UserDate value={user.lastLoginAt} /></dd>
                  </div>
                </dl>
              </section>
              <ArticleActivity articles={articles} />
            </div>
          </>
        );
      }} />
    </AdminPage>
  );
}
