import type { ReactNode } from "react";
import { Alert } from "@heroui/react";

export default function AdminFeedback({
  status,
  children,
  className = "",
  id,
}: {
  status: "danger" | "success" | "warning" | "accent";
  children: ReactNode;
  className?: string;
  id?: string;
}) {
  return (
    <Alert
      id={id}
      status={status}
      role={status === "danger" || status === "warning" ? "alert" : "status"}
      className={`min-w-0 items-start gap-2 rounded-xl border border-kb-line bg-kb-panel px-3 py-2.5 shadow-none ${className}`}
    >
      <Alert.Indicator aria-hidden="true" className="shrink-0" />
      <Alert.Content className="min-w-0">
        <Alert.Description className="leading-6 text-kb-heading wrap-anywhere">
          {children}
        </Alert.Description>
      </Alert.Content>
    </Alert>
  );
}
