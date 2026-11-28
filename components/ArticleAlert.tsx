import type { ReactNode } from "react";
import { Alert } from "@heroui/react";
import { articleAlertStatuses, type ArticleAlertStatus } from "@/lib/article-alert";

const statusColors: Record<ArticleAlertStatus, string> = {
  accent: "text-unh-tertiary dark:text-unh-tertiary-light",
  success: "text-emerald-700 dark:text-emerald-400",
  warning: "text-amber-700 dark:text-unh-secondary",
  danger: "text-rose-700 dark:text-rose-400",
};

export default function ArticleAlert({
  status,
  title,
  children,
}: {
  status: ArticleAlertStatus;
  title?: string | null;
  children: ReactNode;
}) {
  const label = articleAlertStatuses[status];
  const customTitle = title?.trim();

  return (
    <Alert
      status={status}
      role={title === null ? undefined : "note"}
      aria-label={customTitle && customTitle !== label ? label : undefined}
      className={`my-5 min-w-0 gap-2.5 rounded-xl border border-kb-line border-s-4 border-s-current bg-kb-panel px-3 py-3 shadow-none sm:gap-3 sm:px-4 ${statusColors[status]}`}
    >
      <Alert.Indicator aria-hidden="true" className="shrink-0 p-1 text-inherit" />
      <Alert.Content className="min-w-0 flex-1 gap-1.5">
        {title !== null && (
          <Alert.Title className="text-base leading-6 font-bold text-kb-heading wrap-anywhere">
            {customTitle || label}
          </Alert.Title>
        )}
        <div className="w-full min-w-0 text-[0.9375rem] leading-relaxed text-kb-muted wrap-anywhere [&>*:first-child]:mt-0 [&>*:last-child]:mb-0">
          {children}
        </div>
      </Alert.Content>
    </Alert>
  );
}
