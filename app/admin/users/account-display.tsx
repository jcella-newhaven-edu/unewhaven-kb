import { Chip } from "@heroui/react";
import type { ManagedUser } from "@/lib/admin/users";

const dateTime = new Intl.DateTimeFormat("en-US", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "UTC",
});

export function UserRole({ role }: { role: ManagedUser["role"] }) {
  return (
    <Chip color={role === "admin" ? "accent" : "default"} variant="soft" size="sm">
      <Chip.Label>{role === "admin" ? "Administrator" : "Editor"}</Chip.Label>
    </Chip>
  );
}

export function UserDate({ value }: { value: Date }) {
  return <time dateTime={value.toISOString()}>{dateTime.format(value)} UTC</time>;
}
