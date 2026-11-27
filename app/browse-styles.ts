export const browseFocus = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus";

export const browseStyles = {
  shell: "kb-shell flex-1 pt-[clamp(1.5rem,4vw,2.5rem)] pb-14",
  heading: "mt-[1.55rem] text-[clamp(2rem,3.15vw,2.9375rem)] leading-[1.08] font-[750] tracking-[-0.045em] text-kb-heading wrap-anywhere",
  intro: "mt-3 max-w-[40rem] text-[1.0625rem] leading-[1.55] text-kb-muted",
  status: "mt-6 max-w-[50.625rem] text-sm leading-normal text-kb-muted wrap-anywhere",
  list: "mt-6 max-w-[50.625rem] border-be border-kb-line",
  listItem: "border-bs border-kb-line wrap-anywhere",
  row: `group flex items-center justify-between gap-4 py-[0.9375rem] no-underline ${browseFocus}`,
  rowTitle: "text-lg leading-[1.3] font-bold tracking-tight text-kb-heading group-hover:underline group-hover:underline-offset-[0.23em]",
  summary: "mt-[0.3rem] block text-sm leading-[1.45] text-kb-muted",
  meta: "mt-[0.3rem] block text-[0.8125rem] leading-[1.45] text-kb-muted",
  arrow: "size-4 flex-none text-kb-muted",
};
