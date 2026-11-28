"use client";

import { useActionState } from "react";
import { AlertDialog, Button } from "@heroui/react";
import { restoreArticleRevision } from "@/lib/admin/actions";
import AdminFeedback from "../admin-feedback";

export default function RestoreArticleRevision({
  slug,
  updatedToken,
  draftToken,
  revisionId,
}: {
  slug: string;
  updatedToken: string;
  draftToken: string;
  revisionId: string;
}) {
  const [result, restore, pending] = useActionState(restoreArticleRevision, {});

  return (
    <AlertDialog>
      <Button type="button" variant="secondary" size="sm" className="w-full">Restore as working draft</Button>
      <AlertDialog.Backdrop isKeyboardDismissDisabled={pending}>
        <AlertDialog.Container>
          <AlertDialog.Dialog>
            {({ close }) => (
              <>
                <AlertDialog.Header>
                  <AlertDialog.Heading>Restore this revision?</AlertDialog.Heading>
                </AlertDialog.Header>
                <form action={restore} aria-busy={pending}>
                  <input type="hidden" name="originalSlug" value={slug} />
                  <input type="hidden" name="updatedToken" value={updatedToken} />
                  <input type="hidden" name="draftToken" value={draftToken} />
                  <input type="hidden" name="revisionId" value={revisionId} />
                  <AlertDialog.Body className="grid gap-3">
                    <p>The revision opens as a private working draft. Restoring replaces any saved working draft and discards unsaved edits in this editor.</p>
                    {result.error && <AdminFeedback status="danger">{result.error}</AdminFeedback>}
                  </AlertDialog.Body>
                  <AlertDialog.Footer>
                    <Button type="button" autoFocus variant="secondary" onPress={close} isDisabled={pending}>Cancel</Button>
                    <Button type="submit" variant="primary" isPending={pending} isDisabled={pending}>
                      {pending ? "Restoring…" : "Restore revision"}
                    </Button>
                  </AlertDialog.Footer>
                </form>
              </>
            )}
          </AlertDialog.Dialog>
        </AlertDialog.Container>
      </AlertDialog.Backdrop>
    </AlertDialog>
  );
}
