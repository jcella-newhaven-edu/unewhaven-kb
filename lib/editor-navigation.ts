export const editorNavigationEvent = "kb:editor-navigation";

/** Give an active editor the opportunity to confirm an app-initiated navigation. */
export function requestEditorNavigation(leave: () => void) {
  const event = new CustomEvent(editorNavigationEvent, { cancelable: true, detail: leave });
  if (window.dispatchEvent(event)) leave();
}
