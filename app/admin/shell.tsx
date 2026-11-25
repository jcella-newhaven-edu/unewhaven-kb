import type { ReactNode } from "react";
import { Suspense } from "react";
import { connection } from "next/server";
import { Button } from "@heroui/react";
import { getAdminSession, isAdminAuthConfigured } from "@/lib/admin/auth";
import styles from "./admin.module.css";

type AdminSession = NonNullable<Awaited<ReturnType<typeof getAdminSession>>>;

export function AdminPage({ children }: { children: ReactNode }) {
  return (
    <main className={`kb-shell ${styles.page}`}>
      <Suspense fallback={<p className={styles.loading}>Loading administration…</p>}>{children}</Suspense>
    </main>
  );
}

export async function AdminGate({
  render,
  searchParams,
}: {
  render: (session: AdminSession) => ReactNode | Promise<ReactNode>;
  searchParams?: Promise<{ error?: string | string[] }>;
}) {
  // Read configuration at request time so a standalone build can get its secrets at startup.
  await connection();
  if (!isAdminAuthConfigured()) {
    return (
      <AdminSignIn
        title="Administration is unavailable"
        message="Microsoft sign-in is not configured for this site."
      />
    );
  }

  const session = await getAdminSession();
  if (session) return render(session);

  const { error } = (await searchParams) ?? {};
  const message = error === "access-denied"
    ? "This account does not have access to manage the knowledge base."
    : error === "sign-in"
      ? "Microsoft sign-in could not be completed. Try signing in again."
      : "Sign in with your university account to manage articles.";

  return <AdminSignIn title="Article administration" message={message} canSignIn />;
}

function AdminSignIn({
  title,
  message,
  canSignIn = false,
}: {
  title: string;
  message: string;
  canSignIn?: boolean;
}) {
  return (
    <section className={styles.signIn}>
      <h1 className={styles.heading}>{title}</h1>
      <p>{message}</p>
      {canSignIn && <a href="/api/admin/auth/login" className={styles.primaryLink}>Sign in with Microsoft</a>}
    </section>
  );
}

export function AdminHeader({
  title,
  session,
  children,
}: {
  title: string;
  session: AdminSession;
  children?: ReactNode;
}) {
  return (
    <header className={styles.header}>
      <div className={styles.headerTitle}>
        <h1 className={styles.heading}>{title}</h1>
        {children}
      </div>
      <div className={styles.session}>
        <div className={styles.account}>
          <span>{session.displayName}</span>
          <span>{session.role === "admin" ? "Administrator" : "Editor"}</span>
        </div>
        <form action="/api/admin/auth/logout" method="post">
          <Button type="submit" variant="secondary" size="sm">Sign out</Button>
        </form>
      </div>
    </header>
  );
}
