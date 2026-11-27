import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { listManagedUsers } from "@/lib/admin/users";
import { adminStyles, adminTable } from "../admin-styles";
import { AdminGate, AdminHeader, AdminPage } from "../shell";
import { UserDate, UserRole } from "./account-display";

export const metadata: Metadata = { title: "Users" };

export default function AdminUsers() {
  return (
    <AdminPage>
      <AdminGate render={async (session) => {
        if (session.role !== "admin") redirect("/admin");
        const users = await listManagedUsers();

        return (
          <>
            <AdminHeader title="Users" session={session} section="users" />
            <p className="mb-4 text-sm text-kb-muted">Accounts that have signed in to this knowledge base.</p>
            <div className={adminStyles.directory}>
              {users.length ? (
                <table className={adminTable.table} aria-label="Users">
                  <thead className={adminTable.head}>
                    <tr>
                      <th scope="col" className={`${adminTable.column} w-[34%] rounded-ss-xl`}>User</th>
                      <th scope="col" className={`${adminTable.column} w-[16%]`}>Role</th>
                      <th scope="col" className={`${adminTable.column} w-[13%]`}>Authored</th>
                      <th scope="col" className={`${adminTable.column} w-[16%]`}>Articles last edited</th>
                      <th scope="col" className={`${adminTable.column} rounded-se-xl`}>Last signed in</th>
                    </tr>
                  </thead>
                  <tbody className={adminTable.body}>
                    {users.map((user) => (
                      <tr key={user.id} className={adminTable.row}>
                        <th scope="row" className={adminTable.name}>
                          <Link
                            href={`/admin/users/${encodeURIComponent(user.id)}`}
                            className={adminStyles.rowLink}
                            prefetch={false}
                          >
                            {user.displayName}
                          </Link>
                          {user.email && <span className={adminStyles.rowDetail}>{user.email}</span>}
                        </th>
                        <td data-label="Role" className={adminTable.cell}><UserRole role={user.role} /></td>
                        <td data-label="Authored" className={adminTable.cell}>{user.authoredCount}</td>
                        <td data-label="Articles last edited" className={adminTable.cell}>{user.latestEditCount}</td>
                        <td data-label="Last signed in" className={adminTable.cell}><UserDate value={user.lastLoginAt} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <p className={adminStyles.emptyResults}>No users have signed in yet.</p>
              )}
            </div>
          </>
        );
      }} />
    </AdminPage>
  );
}
