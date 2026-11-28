"use client";

import { useActionState } from "react";
import { Alert, AlertDialog, Button } from "@heroui/react";
import { TrashIcon } from "@heroicons/react/24/outline";
import { deleteTopic } from "@/lib/admin/topic-actions";
import { adminStyles } from "../admin-styles";

export function DeleteTopic({
  slug,
  title,
  updatedToken,
  compact = false,
  blockedReason,
}: {
  slug: string;
  title: string;
  updatedToken: string;
  compact?: boolean;
  blockedReason?: string;
}) {
  const [result, remove, pending] = useActionState(deleteTopic, {});
  const trigger = (
    <Button
      type="button"
      variant="danger-soft"
      size={compact ? "sm" : undefined}
      isIconOnly={compact}
      isDisabled={!!blockedReason}
      aria-label={compact ? `Delete ${title}${blockedReason ? `. ${blockedReason}` : ""}` : undefined}
    >
      {compact ? <TrashIcon aria-hidden="true" className="size-4" /> : "Delete topic"}
    </Button>
  );

  if (blockedReason) return <span title={blockedReason}>{trigger}</span>;

  return (
    <div className={compact ? undefined : "mt-3.5 border-t border-kb-line pt-3.5"}>
      <AlertDialog>
        {trigger}
        <AlertDialog.Backdrop isKeyboardDismissDisabled={pending}>
          <AlertDialog.Container>
            <AlertDialog.Dialog className={adminStyles.deleteDialog}>
              {({ close }) => (
                <>
                  <AlertDialog.Header>
                    <AlertDialog.Heading>Delete this topic?</AlertDialog.Heading>
                  </AlertDialog.Header>
                  <form action={remove} aria-busy={pending}>
                    <input type="hidden" name="slug" value={slug} />
                    <input type="hidden" name="updatedToken" value={updatedToken} />
                    <AlertDialog.Body>
                      <p><strong>{title}</strong> will be permanently deleted.</p>
                      {result.error && (
                        <Alert status="danger" role="alert">
                          <Alert.Content><Alert.Description>{result.error}</Alert.Description></Alert.Content>
                        </Alert>
                      )}
                    </AlertDialog.Body>
                    <AlertDialog.Footer>
                      <Button type="button" autoFocus variant="secondary" onPress={close} isDisabled={pending}>
                        Cancel
                      </Button>
                      <Button type="submit" variant="danger" isPending={pending} isDisabled={pending}>
                        {pending ? "Deleting…" : "Delete topic"}
                      </Button>
                    </AlertDialog.Footer>
                  </form>
                </>
              )}
            </AlertDialog.Dialog>
          </AlertDialog.Container>
        </AlertDialog.Backdrop>
      </AlertDialog>
    </div>
  );
}
