"use server";

import { revalidatePath, updateTag } from "next/cache";
import { redirect } from "next/navigation";
import type { PoolClient } from "pg";
import { getAdminSession } from "@/lib/admin/auth";
import { isArticleSlug } from "@/lib/admin/validation";
import { withTransaction } from "@/lib/postgres";

export type TopicActionState = {
  error?: string;
  fieldErrors?: Record<string, string>;
};

type TopicFields = {
  slug: string;
  title: string;
  description: string;
  sortOrder: number;
  parentSlug: string | null;
};

type TopicVersion = {
  updatedToken: string;
  parentSlug: string | null;
  hasChildren: boolean;
  hasArticles: boolean;
};

const signIn = { error: "Sign in with an editorial account to change topics." };
const staleTopic = { error: "This topic changed or was removed. Reload the page before trying again." };
const missingParent = { fieldErrors: { parentSlug: "Choose an existing top-level topic." } };

function field(form: FormData, name: string, optional = false) {
  const values = form.getAll(name);
  if (optional && values.length === 0) return "";
  return values.length === 1 && typeof values[0] === "string" && values[0].isWellFormed()
    && !values[0].includes("\0") ? values[0] : null;
}

function topicFields(form: FormData, creating: boolean): { data: TopicFields } | { fieldErrors: Record<string, string> } {
  const rawSlug = field(form, "slug") ?? "";
  const slug = creating ? rawSlug.trim() : rawSlug;
  const title = field(form, "title")?.trim() ?? "";
  const description = field(form, "description", true)?.trim();
  const parent = field(form, "parentSlug", true);
  const order = field(form, "sortOrder")?.trim() ?? "";
  const sortOrder = Number(order);
  const fieldErrors: Record<string, string> = {};

  if (creating && (slug.length > 96 || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug))) {
    fieldErrors.slug = "Use up to 96 lowercase letters, numbers, or hyphen-separated words.";
  } else if (creating && slug === "new") {
    fieldErrors.slug = "Choose a URL slug other than new.";
  }
  if (!title || title.length > 160 || /[\r\n\t]/.test(title)) {
    fieldErrors.title = "Enter a single-line title between 1 and 160 characters.";
  }
  if (description === undefined || description.length > 500) {
    fieldErrors.description = "Use 500 characters or fewer for the description.";
  }
  if (parent === null || (parent !== "" && (!isArticleSlug(parent) || parent === slug))) {
    fieldErrors.parentSlug = parent === slug ? "A topic cannot be its own parent." : "Choose an existing top-level topic.";
  }
  if (!/^-?\d{1,10}$/.test(order) || sortOrder < -2147483648 || sortOrder > 2147483647) {
    fieldErrors.sortOrder = "Enter a whole number between -2,147,483,648 and 2,147,483,647.";
  }

  if (Object.keys(fieldErrors).length > 0) return { fieldErrors };
  return { data: { slug, title, description: description ?? "", sortOrder, parentSlug: parent || null } };
}

function topicVersion(form: FormData) {
  const slug = field(form, "slug") ?? "";
  const updatedToken = field(form, "updatedToken") ?? "";
  if (!isArticleSlug(slug) || !/^\d{1,10}$/.test(updatedToken)) return null;
  return { slug, updatedToken };
}

async function withLockedTopics<Result>(run: (client: PoolClient) => Promise<Result>): Promise<Result> {
  return withTransaction(async (client) => {
    // Article saves take a conflicting row-share lock while selecting their topic.
    // Once this lock is held, separate statements see committed article references.
    await client.query("LOCK TABLE topics IN EXCLUSIVE MODE");
    return run(client);
  });
}

async function canUseParent(client: PoolClient, parentSlug: string | null) {
  if (parentSlug === null) return true;
  const { rowCount } = await client.query(
    "SELECT 1 FROM topics WHERE slug = $1 AND NULLIF(parent_slug, '') IS NULL",
    [parentSlug],
  );
  return rowCount === 1;
}

async function currentTopic(client: PoolClient, slug: string) {
  const { rows } = await client.query<TopicVersion>(
    `SELECT t.xmin::text AS "updatedToken", NULLIF(t.parent_slug, '') AS "parentSlug",
            EXISTS (SELECT 1 FROM topics c WHERE c.parent_slug = t.slug) AS "hasChildren",
            EXISTS (SELECT 1 FROM articles a WHERE a.topic_slug = t.slug) AS "hasArticles"
     FROM topics t WHERE t.slug = $1`,
    [slug],
  );
  return rows[0];
}

function refreshTopics(...slugs: (string | null)[]) {
  updateTag("topics");
  updateTag("articles");
  for (const slug of new Set(slugs)) {
    if (!slug) continue;
    const tag = `topic:${slug}`;
    if (tag.length <= 256) updateTag(tag);
  }

  revalidatePath("/");
  revalidatePath("/topics");
  revalidatePath("/topics/[topic]", "page");
  revalidatePath("/articles");
  revalidatePath("/articles/[slug]", "page");
  revalidatePath("/search");
  revalidatePath("/api/search");
  revalidatePath("/_not-found");
  revalidatePath("/admin/topics");
}

export async function createTopic(_previous: TopicActionState, form: FormData): Promise<TopicActionState> {
  const session = await getAdminSession();
  if (session?.role !== "admin" && session?.role !== "editor") return signIn;

  const parsed = topicFields(form, true);
  if ("fieldErrors" in parsed) return parsed;
  const { slug, title, description, sortOrder, parentSlug } = parsed.data;

  try {
    const failure = await withLockedTopics(async (client) => {
      if (!await canUseParent(client, parentSlug)) return missingParent;
      const { rowCount } = await client.query(
        `INSERT INTO topics (slug, title, description, sort_order, parent_slug)
         VALUES ($1, $2, $3, $4, $5) ON CONFLICT (slug) DO NOTHING`,
        [slug, title, description, sortOrder, parentSlug],
      );
      if (rowCount !== 1) return { fieldErrors: { slug: "A topic already uses this slug." } };
    });
    if (failure) return failure;
  } catch (error) {
    console.error("Topic insert failed.", error);
    return { error: "The topic could not be saved. Try again." };
  }

  refreshTopics(slug, parentSlug);
  redirect(`/admin/topics/${encodeURIComponent(slug)}?saved=1`);
}

export async function updateTopic(_previous: TopicActionState, form: FormData): Promise<TopicActionState> {
  const session = await getAdminSession();
  if (session?.role !== "admin" && session?.role !== "editor") return signIn;

  const version = topicVersion(form);
  if (!version) return staleTopic;
  const parsed = topicFields(form, false);
  if ("fieldErrors" in parsed) return parsed;
  const { slug, updatedToken } = version;
  const { title, description, sortOrder, parentSlug } = parsed.data;

  let priorParent: string | null;
  try {
    const outcome = await withLockedTopics(async (client) => {
      const current = await currentTopic(client, slug);
      if (current?.updatedToken !== updatedToken) return staleTopic;
      if (parentSlug && current.hasChildren) {
        return { fieldErrors: { parentSlug: "Move this topic’s children before assigning it a parent." } };
      }
      if (!await canUseParent(client, parentSlug)) return missingParent;

      await client.query(
        `UPDATE topics SET title = $2, description = $3, sort_order = $4, parent_slug = $5 WHERE slug = $1`,
        [slug, title, description, sortOrder, parentSlug],
      );
      return { priorParent: current.parentSlug };
    });
    if (!("priorParent" in outcome)) return outcome;
    priorParent = outcome.priorParent;
  } catch (error) {
    console.error("Topic update failed.", error);
    return { error: "The topic could not be saved. Try again." };
  }

  refreshTopics(slug, parentSlug, priorParent);
  redirect(`/admin/topics/${encodeURIComponent(slug)}?saved=1`);
}

export async function deleteTopic(_previous: TopicActionState, form: FormData): Promise<TopicActionState> {
  const session = await getAdminSession();
  if (session?.role !== "admin") return { error: "Only administrators can delete topics." };

  const version = topicVersion(form);
  if (!version) return staleTopic;
  const { slug, updatedToken } = version;

  let parent: string | null;
  try {
    const outcome = await withLockedTopics(async (client) => {
      const current = await currentTopic(client, slug);
      if (current?.updatedToken !== updatedToken) return staleTopic;
      if (current.hasArticles) return { error: "Move this topic’s articles before deleting the topic." };
      if (current.hasChildren) return { error: "Move or delete this topic’s subtopics before deleting the topic." };

      await client.query("DELETE FROM topics WHERE slug = $1", [slug]);
      return { parent: current.parentSlug };
    });
    if (!("parent" in outcome)) return outcome;
    parent = outcome.parent;
  } catch (error) {
    console.error("Topic deletion failed.", error);
    return { error: "The topic could not be deleted. Try again." };
  }

  refreshTopics(slug, parent);
  redirect("/admin/topics?deleted=1");
}
