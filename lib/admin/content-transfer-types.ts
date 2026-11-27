import type { JSONContent } from "@tiptap/core";

export const transferFormat = "unewhaven-kb";
export const transferVersion = 1;
export const transferMaxMiB = 32;
export const transferMaxBytes = transferMaxMiB * 1024 * 1024;
export const transferMaxRecords = 10_000;

export type TransferMode = "skip" | "update";
export type ExportScope = "all" | "topics" | "topic";

export type TransferTopic = {
  slug: string;
  title: string;
  description: string;
  sortOrder: number;
  parentSlug: string | null;
  icon: string;
};

export type TransferArticle = {
  slug: string;
  title: string;
  summary: string;
  topicSlug: string;
  additionalTopicSlugs: string[];
  published: boolean;
  body: JSONContent;
  bodyText?: string;
};

export type TransferImage = {
  id: string;
  contentType: string;
  data: string;
};

export type ContentTransfer = {
  format: typeof transferFormat;
  version: typeof transferVersion;
  topics: TransferTopic[];
  articles: TransferArticle[];
  images: TransferImage[];
};

type TransferCounts = { created: number; updated: number; skipped: number };

export type TransferSummary = {
  topics: TransferCounts;
  articles: TransferCounts;
  images: { created: number; reused: number };
  publishedArticles: number;
};

export type TransferResponse = { summary: TransferSummary; token?: string } | { error: string; issues?: string[] };
