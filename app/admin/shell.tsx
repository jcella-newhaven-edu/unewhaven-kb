import type { ReactNode } from "react";
import { Suspense } from "react";
import Link from "next/link";
import { connection } from "next/server";
import { Button } from "@heroui/react";
import { ArrowLeftIcon, DocumentTextIcon, PlusIcon, RectangleStackIcon } from "@heroicons/react/24/outline";
import { getAdminSession, isAdminAuthConfigured } from "@/lib/admin/auth";
import styles from "./admin.module.css";

type AdminSession = NonNullable<Awaited<ReturnType<typeof getAdminSession>>>;
type AdminSection = "articles" | "topics";

const sections = [
  { id: "articles", label: "Articles", href: "/admin", icon: DocumentTextIcon },
  { id: "topics", label: "Topics", href: "/admin/topics", icon: RectangleStackIcon },
] as const;

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
      : "Sign in with your university account to manage articles and topics.";

  return <AdminSignIn title="Knowledge base administration" message={message} canSignIn />;
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
  actions,
  section = "articles",
}: {
  title: string;
  session: AdminSession;
  children?: ReactNode;
  actions?: ReactNode;
  section?: AdminSection;
}) {
  return (
    <>
      <div className={styles.workspaceBar}>
        <nav aria-label="Administration" className={styles.navigation}>
          {sections.map(({ id, label, href, icon: Icon }) => (
            <Link
              key={id}
              href={href}
              prefetch={false}
              aria-current={section === id ? "page" : undefined}
              className={styles.navLink}
            >
              <Icon aria-hidden="true" />
              {label}
            </Link>
          ))}
        </nav>
        <div className={styles.session}>
          <div className={styles.account}>
            <span>{session.displayName}</span>
            <span>{session.role === "admin" ? "Administrator" : "Editor"}</span>
          </div>
          <form action="/api/admin/auth/logout" method="post">
            <Button type="submit" variant="secondary" size="sm">Sign out</Button>
          </form>
        </div>
      </div>
      <header className={styles.header}>
        <div className={styles.headerTitle}>
          {children}
          <h1 className={styles.heading}>{title}</h1>
        </div>
        {actions}
      </header>
    </>
  );
}

export function AdminBackLink({ section }: { section: AdminSection }) {
  const { href, label } = section === "articles" ? sections[0] : sections[1];
  return (
    <Link href={href} className={styles.headerBack} prefetch={false}>
      <ArrowLeftIcon aria-hidden="true" />
      Back to {label.toLowerCase()}
    </Link>
  );
}

export function AdminCreateLink({ section }: { section: AdminSection }) {
  const label = section === "articles" ? "New article" : "New topic";
  return (
    <Link href={`/admin/${section}/new`} className={styles.primaryLink} prefetch={false}>
      <PlusIcon aria-hidden="true" />
      {label}
    </Link>
  );
}
