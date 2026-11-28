"use client";

import { useActionState } from "react";
import { AlertDialog, Button } from "@heroui/react";
import { TrashIcon } from "@heroicons/react/24/outline";
import { deleteArticle } from "@/lib/admin/actions";
import AdminFeedback from "../admin-feedback";
import { adminStyles as styles } from "../admin-styles";

export function DeleteArticle({
  slug,
  title,
  updatedToken,
  compact = false,
}: {
  slug: string;
  title: string;
  updatedToken: string;
  compact?: boolean;
}) {
  const [result, remove, pending] = useActionState(deleteArticle, {});

  return (
    <div className={compact ? undefined : styles.deleteArea}>
      <AlertDialog>
        <Button
          type="button"
          variant="danger-soft"
          size={compact ? "sm" : undefined}
          isIconOnly={compact}
          aria-label={compact ? `Delete ${title}` : undefined}
        >
          {compact ? <TrashIcon aria-hidden="true" className="size-4" /> : "Delete article"}
        </Button>
        <AlertDialog.Backdrop isKeyboardDismissDisabled={pending}>
          <AlertDialog.Container>
            <AlertDialog.Dialog className={styles.deleteDialog}>
              {({ close }) => (
                <>
                  <AlertDialog.Header>
                    <AlertDialog.Heading>Delete this article?</AlertDialog.Heading>
                  </AlertDialog.Header>
                  <form action={remove} aria-busy={pending}>
                    <input type="hidden" name="slug" value={slug} />
                    <input type="hidden" name="updatedToken" value={updatedToken} />
                    <AlertDialog.Body>
                      <p><strong>{title}</strong> will be permanently deleted.</p>
                      {result.error && <AdminFeedback status="danger" className="mt-3">{result.error}</AdminFeedback>}
                    </AlertDialog.Body>
                    <AlertDialog.Footer>
                      <Button type="button" autoFocus variant="secondary" onPress={close} isDisabled={pending}>Cancel</Button>
                      <Button type="submit" variant="danger" isPending={pending} isDisabled={pending}>
                        {pending ? "Deleting…" : "Delete article"}
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
