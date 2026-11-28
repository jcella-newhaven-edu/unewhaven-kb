import Link from "next/link";
import TopicIcon from "@/components/TopicIcon";
import { listManagedTopics, type ManagedTopic } from "@/lib/admin/topics";
import { AdminCreateLink, AdminGate, AdminHeader, AdminPage } from "../shell";
import { adminStyles, adminTable } from "../admin-styles";
import {
  AdminEditLink,
  compareSortValues,
  MobileSort,
  nextSort,
  parseSort,
  SortHeader,
  type SortColumn,
  type SortState,
} from "../table-sort";
import { DeleteTopic } from "./delete";

type TopicSortKey = "title" | "parent" | "articles" | "subtopics" | "order";

const columns = [
  { key: "title", label: "Topic", className: "rounded-ss-xl" },
  { key: "parent", label: "Parent topic", className: "w-[18%]" },
  { key: "articles", label: "Articles", className: "w-[15%]" },
  { key: "subtopics", label: "Subtopics", className: "w-[15%]" },
  { key: "order", label: "Sort order", className: "w-[13%]" },
] as const satisfies readonly (SortColumn<TopicSortKey> & { className: string })[];

const topicSortValue: Record<TopicSortKey, (topic: ManagedTopic) => string | number> = {
  title: (topic) => topic.title,
  parent: (topic) => topic.parentTitle || topic.parentSlug || "",
  articles: (topic) => topic.articleCount,
  subtopics: (topic) => topic.childCount,
  order: (topic) => topic.sortOrder,
};

function topicsHref(sort: SortState<TopicSortKey>) {
  return `/admin/topics?${new URLSearchParams({ sort: sort.key, dir: sort.direction })}`;
}

function topicDeleteBlocker(topic: ManagedTopic) {
  if (topic.articleCount && topic.childCount) return "Move or remove its articles and subtopics first.";
  if (topic.articleCount) return "Move or remove its articles first.";
  if (topic.childCount) return "Move or remove its subtopics first.";
  return undefined;
}

export default function AdminTopics({
  searchParams,
}: {
  searchParams: Promise<{ deleted?: string | string[]; sort?: string | string[]; dir?: string | string[] }>;
}) {
  return (
    <AdminPage>
      <AdminGate render={async (session) => {
        const [topics, query] = await Promise.all([listManagedTopics(), searchParams]);
        const sort = parseSort<TopicSortKey>(query, columns, { key: "order", direction: "asc" });
        const value = topicSortValue[sort.key];
        const sortedTopics = topics.toSorted((a, b) => compareSortValues(value(a), value(b), sort.direction));

        return (
          <>
            <AdminHeader title="Topics" session={session} section="topics" actions={<AdminCreateLink section="topics" />} />
            {query.deleted === "1" && <p className={adminStyles.notice} role="status">Topic deleted.</p>}

            <div className={adminStyles.directory}>
              {topics.length ? (
                <>
                  <MobileSort columns={columns} active={sort} hrefFor={topicsHref} />
                  <table className={adminTable.table} aria-label="Topics">
                    <thead className={adminTable.head}>
                      <tr>
                        {columns.map((column) => (
                          <SortHeader
                            key={column.key}
                            column={column}
                            active={sort}
                            href={topicsHref(nextSort(column, sort))}
                            className={column.className}
                          />
                        ))}
                        <th scope="col" className={`${adminTable.column} w-[7rem] rounded-se-xl`}>Actions</th>
                      </tr>
                    </thead>
                    <tbody className={adminTable.body}>
                      {sortedTopics.map((topic) => {
                        const editHref = `/admin/topics/${encodeURIComponent(topic.slug)}`;
                        return (
                          <tr key={topic.slug} className={adminTable.row}>
                            <th scope="row" className={adminTable.name}>
                              <div className="flex items-start gap-2.5">
                                <span className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-md bg-kb-highlight text-kb-heading">
                                  <TopicIcon icon={topic.icon} className="size-4.5" />
                                </span>
                                <div className="grid min-w-0 gap-[0.2rem]">
                                  <Link href={editHref} className={adminStyles.rowLink} prefetch={false}>{topic.title}</Link>
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
                            <td data-label="Actions" className={`${adminTable.cell} max-[52rem]:col-span-full`}>
                              <div className="flex items-center gap-1">
                                <AdminEditLink href={editHref} title={topic.title} />
                                {session.role === "admin" && (
                                  <DeleteTopic
                                    slug={topic.slug}
                                    title={topic.title}
                                    updatedToken={topic.updatedToken}
                                    compact
                                    blockedReason={topicDeleteBlocker(topic)}
                                  />
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </>
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
