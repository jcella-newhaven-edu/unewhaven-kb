import type { ReactNode } from "react";
import { Suspense } from "react";
import Link from "next/link";
import { connection } from "next/server";
import { Button } from "@heroui/react";
import { ArrowLeftIcon, ArrowsRightLeftIcon, DocumentTextIcon, PlusIcon, RectangleStackIcon, UsersIcon } from "@heroicons/react/24/outline";
import { getAdminSession, isAdminAuthConfigured } from "@/lib/admin/auth";
import { adminStyles } from "./admin-styles";

type AdminSession = NonNullable<Awaited<ReturnType<typeof getAdminSession>>>;
type EditableSection = "articles" | "topics";
type AdminSection = EditableSection | "content-transfer" | "users";

const sections = [
  { id: "articles", label: "Articles", href: "/admin", icon: DocumentTextIcon },
  { id: "topics", label: "Topics", href: "/admin/topics", icon: RectangleStackIcon },
  { id: "content-transfer", label: "Import / Export", href: "/admin/content-transfer", icon: ArrowsRightLeftIcon },
  { id: "users", label: "Users", href: "/admin/users", icon: UsersIcon },
] as const;

const heading = "m-0 text-[clamp(2rem,3.6vw,2.75rem)] leading-[1.1] font-[740] tracking-[-0.045em] text-kb-heading";

export function AdminPage({ children }: { children: ReactNode }) {
  return (
    <main className="kb-shell flex-1 pt-7 pb-16 max-[42rem]:pt-6">
      <Suspense fallback={<p className="text-kb-muted">Loading administration…</p>}>{children}</Suspense>
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
    <section className="grid max-w-[34rem] justify-items-start gap-4 rounded-[0.875rem] border border-kb-line bg-kb-panel p-[clamp(1.25rem,4vw,2rem)] text-kb-muted">
      <h1 className={heading}>{title}</h1>
      <p>{message}</p>
      {canSignIn && <a href="/api/admin/auth/login" className={adminStyles.primaryLink}>Sign in with Microsoft</a>}
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
      <div className="mb-[clamp(1.25rem,3vw,2rem)] flex flex-wrap items-center justify-between gap-3 rounded-xl border border-kb-line bg-kb-panel px-3 py-[0.55rem]">
        <nav aria-label="Administration" className="flex flex-wrap items-center gap-1.5">
          {sections.filter(({ id }) => id !== "users" || session.role === "admin").map(({ id, label, href, icon: Icon }) => (
            <Link
              key={id}
              href={href}
              prefetch={false}
              aria-current={section === id ? "page" : undefined}
              className="flex items-center gap-1.5 rounded-[0.4rem] px-[0.7rem] py-[0.45rem] text-sm font-[620] text-kb-muted hover:bg-kb-hover hover:text-kb-heading aria-[current=page]:bg-kb-highlight aria-[current=page]:text-kb-heading focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
            >
              <Icon aria-hidden="true" className="size-4 shrink-0" />
              {label}
            </Link>
          ))}
        </nav>
        <div className="flex min-w-0 flex-wrap items-center gap-3">
          <div className="grid wrap-anywhere text-sm leading-[1.3] font-[650] text-kb-heading">
            <span>{session.displayName}</span>
            <span className="text-xs leading-[1.3] font-medium text-kb-muted">{session.role === "admin" ? "Administrator" : "Editor"}</span>
          </div>
          <form action="/api/admin/auth/logout" method="post">
            <Button type="submit" variant="secondary" size="sm">Sign out</Button>
          </form>
        </div>
      </div>
      <header className="mb-5 flex flex-wrap items-end justify-between gap-4">
        <div className="grid min-w-0 gap-[0.7rem]">
          {children}
          <h1 className={heading}>{title}</h1>
        </div>
        {actions}
      </header>
    </>
  );
}

export function AdminBackLink({ section }: { section: EditableSection }) {
  const { href, label } = section === "articles" ? sections[0] : sections[1];
  return (
    <Link href={href} className="inline-flex items-center justify-self-start gap-[0.35rem] text-sm font-semibold text-link hover:underline hover:underline-offset-[0.15em] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus" prefetch={false}>
      <ArrowLeftIcon aria-hidden="true" className="size-4 shrink-0" />
      Back to {label.toLowerCase()}
    </Link>
  );
}

export function AdminCreateLink({ section }: { section: EditableSection }) {
  const label = section === "articles" ? "New article" : "New topic";
  return (
    <Link href={`/admin/${section}/new`} className={adminStyles.primaryLink} prefetch={false}>
      <PlusIcon aria-hidden="true" />
      {label}
    </Link>
  );
}
