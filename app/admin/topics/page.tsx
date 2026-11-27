import Link from "next/link";
import TopicIcon from "@/components/TopicIcon";
import { listManagedTopics } from "@/lib/admin/topics";
import { AdminCreateLink, AdminGate, AdminHeader, AdminPage } from "../shell";
import { adminStyles, adminTable } from "../admin-styles";

export default function AdminTopics({
  searchParams,
}: {
  searchParams: Promise<{ deleted?: string | string[] }>;
}) {
  return (
    <AdminPage>
      <AdminGate render={async (session) => {
        const [topics, query] = await Promise.all([listManagedTopics(), searchParams]);

        return (
          <>
            <AdminHeader title="Topics" session={session} section="topics" actions={<AdminCreateLink section="topics" />} />
            {query.deleted === "1" && <p className={adminStyles.notice} role="status">Topic deleted.</p>}

            <div className={adminStyles.directory}>
              {topics.length ? (
                <table className={adminTable.table} aria-label="Topics">
                  <thead className={adminTable.head}>
                    <tr>
                      <th scope="col" className={`${adminTable.column} w-[40%] rounded-ss-xl`}>Topic</th>
                      <th scope="col" className={`${adminTable.column} w-[24%]`}>Parent topic</th>
                      <th scope="col" className={adminTable.column}>Articles</th>
                      <th scope="col" className={adminTable.column}>Subtopics</th>
                      <th scope="col" className={`${adminTable.column} rounded-se-xl`}>Sort order</th>
                    </tr>
                  </thead>
                  <tbody className={adminTable.body}>
                    {topics.map((topic) => (
                      <tr key={topic.slug} className={adminTable.row}>
                        <th scope="row" className={adminTable.name}>
                          <div className="flex items-start gap-2.5">
                            <span className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-md bg-kb-highlight text-kb-heading">
                              <TopicIcon icon={topic.icon} className="size-4.5" />
                            </span>
                            <div className="grid min-w-0 gap-[0.2rem]">
                              <Link href={`/admin/topics/${encodeURIComponent(topic.slug)}`} className={adminStyles.rowLink} prefetch={false}>{topic.title}</Link>
                              {topic.description && <span className={adminStyles.rowDetail}>{topic.description}</span>}
                            </div>
                          </div>
                        </th>
                        <td data-label="Parent topic" className={adminTable.cell}>
                          {topic.parentSlug ? topic.parentTitle || topic.parentSlug : <span className={adminStyles.rowDetail}>Top level</span>}
                        </td>
                        <td data-label="Articles" className={adminTable.cell}>{topic.articleCount}</td>
                        <td data-label="Subtopics" className={adminTable.cell}>{topic.childCount}</td>
                        <td data-label="Sort order" className={adminTable.cell}>{topic.sortOrder}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <p className={adminStyles.emptyResults}>No topics yet.</p>
              )}
            </div>
          </>
        );
      }} />
    </AdminPage>
  );
}
