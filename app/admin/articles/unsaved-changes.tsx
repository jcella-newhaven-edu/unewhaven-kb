"use client";

import { AlertDialog, Button } from "@heroui/react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { editorNavigationEvent } from "@/lib/editor-navigation";

function leavesEditor(destination: URL) {
  return destination.origin !== location.origin
    || destination.pathname !== location.pathname
    || destination.search !== location.search;
}

export default function UnsavedChangesWarning({ active }: { active: boolean }) {
  const router = useRouter();
  const [pending, setPending] = useState<{ leave: () => void } | null>(null);
  const allowUnload = useRef(false);

  useEffect(() => {
    if (!active) return;
    const navigation = window.navigation;
    let approvedSignOut: HTMLFormElement | null = null;
    let approvedHistoryKey: string | null = null;

    function beforeUnload(event: BeforeUnloadEvent) {
      if (allowUnload.current) {
        allowUnload.current = false;
        return;
      }
      event.preventDefault();
      event.returnValue = "";
    }

    function checkLink(event: MouseEvent) {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const anchor = event.target instanceof Element ? event.target.closest("a[href]") : null;
      if (!(anchor instanceof HTMLAnchorElement) || anchor.hasAttribute("download") || (anchor.target && anchor.target !== "_self")) return;
      const url = new URL(anchor.href);
      if ((url.protocol !== "https:" && url.protocol !== "http:") || !leavesEditor(url)) return;

      event.preventDefault();
      setPending({
        leave: () => {
          if (url.origin === location.origin) {
            router.push(url.pathname + url.search + url.hash);
          } else {
            allowUnload.current = true;
            location.assign(url.href);
          }
        },
      });
    }

    function checkSignOut(event: SubmitEvent) {
      const form = event.target;
      if (!(form instanceof HTMLFormElement) || form === approvedSignOut) return;
      const action = new URL(form.action);
      if (action.origin !== location.origin || action.pathname !== "/api/admin/auth/logout") return;

      event.preventDefault();
      setPending({
        leave: () => {
          approvedSignOut = form;
          allowUnload.current = true;
          form.requestSubmit();
          approvedSignOut = null;
        },
      });
    }

    function checkTraversal(event: NavigateEvent) {
      if (event.navigationType !== "traverse" || !event.destination.sameDocument) return;
      const { key, url } = event.destination;
      if (approvedHistoryKey === key) {
        approvedHistoryKey = null;
        return;
      }
      // The browser controls whether a history traversal can be canceled.
      if (!event.cancelable || !leavesEditor(new URL(url))) return;

      event.preventDefault();
      setPending({
        leave: () => {
          approvedHistoryKey = key;
          const traversal = navigation.traverseTo(key);
          void traversal.committed?.catch(() => { approvedHistoryKey = null; });
          void traversal.finished?.catch(() => { approvedHistoryKey = null; });
        },
      });
    }

    function checkAppNavigation(event: Event) {
      const { detail } = event as CustomEvent<() => void>;
      event.preventDefault();
      setPending({ leave: detail });
    }

    window.addEventListener("beforeunload", beforeUnload);
    window.addEventListener(editorNavigationEvent, checkAppNavigation);
    document.addEventListener("click", checkLink, true);
    document.addEventListener("submit", checkSignOut, true);
    navigation?.addEventListener("navigate", checkTraversal);
    return () => {
      window.removeEventListener("beforeunload", beforeUnload);
      window.removeEventListener(editorNavigationEvent, checkAppNavigation);
      document.removeEventListener("click", checkLink, true);
      document.removeEventListener("submit", checkSignOut, true);
      navigation?.removeEventListener("navigate", checkTraversal);
      allowUnload.current = false;
    };
  }, [active, router]);

  return (
    <AlertDialog>
      <AlertDialog.Backdrop
        isOpen={active && pending !== null}
        onOpenChange={(open) => { if (!open) setPending(null); }}
        isKeyboardDismissDisabled={false}
      >
        <AlertDialog.Container>
          <AlertDialog.Dialog>
            <AlertDialog.Header>
              <AlertDialog.Heading>Discard unsaved changes?</AlertDialog.Heading>
            </AlertDialog.Header>
            <AlertDialog.Body>
              <p>Your edits will be lost if you leave this page.</p>
            </AlertDialog.Body>
            <AlertDialog.Footer>
              <Button type="button" variant="secondary" autoFocus onPress={() => setPending(null)}>Stay on page</Button>
              <Button type="button" variant="danger" onPress={() => {
                setPending(null);
                pending?.leave();
              }}>
                Discard changes
              </Button>
            </AlertDialog.Footer>
          </AlertDialog.Dialog>
        </AlertDialog.Container>
      </AlertDialog.Backdrop>
    </AlertDialog>
  );
}
