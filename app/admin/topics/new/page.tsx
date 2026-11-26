import { listManagedTopics } from "@/lib/admin/topics";
import { AdminBackLink, AdminGate, AdminHeader, AdminPage } from "../../shell";
import TopicForm from "../editor";

export default function NewAdminTopic() {
  return (
    <AdminPage>
      <AdminGate render={async (session) => {
        const topics = await listManagedTopics();
        return (
          <>
            <AdminHeader title="New topic" session={session} section="topics">
              <AdminBackLink section="topics" />
            </AdminHeader>
            <TopicForm parentTopics={topics.filter((topic) => !topic.parentSlug)} />
          </>
        );
      }} />
    </AdminPage>
  );
}
