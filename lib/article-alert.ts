export const articleAlertStatuses = {
  accent: "Info",
  success: "Success",
  warning: "Warning",
  danger: "Danger",
} as const;

export type ArticleAlertStatus = keyof typeof articleAlertStatuses;

export const defaultArticleAlertStatus: ArticleAlertStatus = "accent";
export const articleAlertTitleMaxLength = 80;

export function isArticleAlertStatus(value: unknown): value is ArticleAlertStatus {
  return typeof value === "string" && Object.hasOwn(articleAlertStatuses, value);
}
