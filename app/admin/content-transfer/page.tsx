import { listAdminTopics } from "@/lib/admin/articles";
import { AdminGate, AdminHeader, AdminPage } from "../shell";
import TransferForms from "./transfer-forms";

export default function ContentTransferPage() {
  return (
    <AdminPage>
      <AdminGate render={async (session) => {
        const topics = await listAdminTopics();

        return (
          <>
            <AdminHeader title="Import and export" session={session} section="content-transfer" />
            <TransferForms topics={topics} />
          </>
        );
      }} />
    </AdminPage>
  );
}
