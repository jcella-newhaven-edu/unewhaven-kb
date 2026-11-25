"use client";

import { useActionState } from "react";
import { Alert, AlertDialog, Button } from "@heroui/react";
import { deleteArticle } from "@/lib/admin/actions";
import styles from "../admin.module.css";

export function DeleteArticle({
  slug,
  title,
  updatedToken,
}: {
  slug: string;
  title: string;
  updatedToken: string;
}) {
  const [result, remove, pending] = useActionState(deleteArticle, {});

  return (
    <div className={styles.deleteArea}>
      <AlertDialog>
        <Button type="button" variant="danger-soft">Delete article</Button>
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
                      {result.error && (
                        <Alert status="danger" role="alert">
                          <Alert.Content><Alert.Description>{result.error}</Alert.Description></Alert.Content>
                        </Alert>
                      )}
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
