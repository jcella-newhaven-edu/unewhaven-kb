import "server-only";
import { redirect } from "next/navigation";
import { getAdminSession } from "@/lib/admin/auth";
import { queryRows, withTransaction } from "@/lib/postgres";

type UserAccount = {
  id: string;
  displayName: string;
  email: string | null;
  role: "admin" | "editor";
  createdAt: Date;
  lastLoginAt: Date;
};

export type ManagedUser = UserAccount & {
  authoredCount: number;
  latestEditCount: number;
};

export type ManagedUserArticle = {
  slug: string;
  title: string;
  published: boolean;
  publishedAt: Date | null;
  updated: Date;
  isAuthor: boolean;
  isLastEditor: boolean;
};

const accountFields = `
  account.id, account.display_name AS "displayName", account.email, account.role,
  account.created_at AS "createdAt", account.last_login_at AS "lastLoginAt"
`;
const accountsVisibleToAdministrator = `
  FROM admin_accounts account
  JOIN admin_accounts viewer
    ON viewer.id = $1 AND viewer.role = 'admin' AND viewer.tenant_id = account.tenant_id
`;
const uuidPattern = /^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i;
const lastEditor = "CASE WHEN draft.updated >= a.updated THEN draft.last_editor_id ELSE a.last_editor_id END";

async function requireAdministrator() {
  const session = await getAdminSession();
  if (session?.role !== "admin") redirect("/admin");
  return session;
}

export async function listManagedUsers(): Promise<ManagedUser[]> {
  const viewer = await requireAdministrator();
  return queryRows<ManagedUser>(
    `SELECT ${accountFields},
            COALESCE(authored.total, 0) AS "authoredCount",
            COALESCE(last_edited.total, 0) AS "latestEditCount"
     ${accountsVisibleToAdministrator}
     LEFT JOIN (
       SELECT author_id, count(*)::integer AS total
       FROM articles WHERE author_id IS NOT NULL GROUP BY author_id
     ) authored ON authored.author_id = account.id
     LEFT JOIN (
       SELECT (${lastEditor}) AS editor_id, count(*)::integer AS total
       FROM articles a LEFT JOIN article_working_drafts draft ON draft.article_slug = a.slug
       GROUP BY editor_id
     ) last_edited ON last_edited.editor_id = account.id
     ORDER BY lower(account.display_name), account.id`,
    [viewer.id],
  );
}

export async function getManagedUser(id: string): Promise<{ user: ManagedUser; articles: ManagedUserArticle[] } | null> {
  const viewer = await requireAdministrator();
  if (!uuidPattern.test(id)) return null;

  return withTransaction(async (client) => {
    await client.query("SET TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY");
    const { rows: [account] } = await client.query<UserAccount>(
      `SELECT ${accountFields} ${accountsVisibleToAdministrator} WHERE account.id = $2`,
      [viewer.id, id],
    );
    if (!account) return null;

    const { rows: articles } = await client.query<ManagedUserArticle>(
      `SELECT a.slug, a.title, a.published, a.published_at AS "publishedAt", GREATEST(a.updated, draft.updated) AS updated,
              COALESCE(a.author_id = $1, false) AS "isAuthor",
              COALESCE((${lastEditor}) = $1, false) AS "isLastEditor"
       FROM articles a LEFT JOIN article_working_drafts draft ON draft.article_slug = a.slug
       WHERE a.author_id = $1 OR (${lastEditor}) = $1
       ORDER BY updated DESC, a.slug`,
      [account.id],
    );

    const user = {
      ...account,
      authoredCount: articles.filter(({ isAuthor }) => isAuthor).length,
      latestEditCount: articles.filter(({ isLastEditor }) => isLastEditor).length,
    };
    return { user, articles };
  });
}
