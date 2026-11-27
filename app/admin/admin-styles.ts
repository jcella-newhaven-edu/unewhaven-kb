const focusOutline = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus";

export const adminStyles = {
  primaryLink: `inline-flex min-h-10 items-center justify-center gap-1.5 rounded-lg bg-accent px-3.5 py-2 text-center text-sm font-semibold text-accent-foreground hover:bg-accent/90 [&_svg]:size-4 [&_svg]:shrink-0 ${focusOutline}`,
  backLink: `justify-self-start text-sm font-semibold text-link underline underline-offset-4 ${focusOutline}`,
  empty: "rounded-xl border border-kb-line bg-kb-panel p-5 text-kb-muted",
  emptyResults: "grid gap-2 px-4 py-6 text-kb-muted",
  notice: "mb-5 max-w-3xl rounded-lg border border-kb-line bg-kb-highlight px-3.5 py-3 text-sm font-semibold text-kb-heading",
  directory: "rounded-xl border border-kb-line bg-background",
  rowDetail: "mt-0.5 block text-[0.8125rem] font-normal text-kb-muted",
  rowLink: `justify-self-start wrap-anywhere text-[0.9375rem] font-semibold text-kb-heading hover:text-link hover:underline hover:underline-offset-4 ${focusOutline}`,
  detailsPanel: "min-w-0 rounded-xl border border-kb-line bg-kb-panel p-4 [&_h2]:mb-3 [&_h2]:text-[0.9375rem] [&_h2]:font-semibold [&_h2]:text-kb-heading [&_dl]:grid [&_dl]:gap-2.5 [&_dt]:text-xs [&_dt]:text-kb-muted [&_dd]:wrap-anywhere [&_dd]:text-sm [&_dd]:text-kb-heading",
  form: "grid max-w-3xl gap-4",
  fields: "grid min-w-0 gap-4 rounded-xl border border-kb-line p-4 sm:p-6",
  field: "grid min-w-0 gap-1.5 text-kb-heading [&>label]:text-sm [&>label]:font-semibold [&>span]:text-sm [&>span]:font-semibold [&>select]:min-w-0 [&>select]:w-full [&>select]:rounded-lg [&>select]:border [&>select]:border-kb-line [&>select]:bg-kb-panel [&>select]:px-3 [&>select]:py-2.5 [&>select]:text-sm [&>select:focus-visible]:outline-2 [&>select:focus-visible]:outline-offset-2 [&>select:focus-visible]:outline-focus",
  slug: "grid min-w-0 gap-1.5 text-kb-heading [&_span]:text-sm [&_span]:font-semibold [&_a]:wrap-anywhere [&_a]:text-sm [&_a]:font-semibold [&_a]:text-link [&_a]:underline [&_a]:underline-offset-4 [&_a:focus-visible]:outline-2 [&_a:focus-visible]:outline-offset-2 [&_a:focus-visible]:outline-focus",
  fieldPair: "grid grid-cols-1 gap-4 min-[42rem]:grid-cols-2",
  error: "text-[0.8125rem] text-danger",
  editor: "overflow-hidden rounded-[0.625rem] border border-kb-line",
  editorLoading: "min-h-52 px-4 py-3.5 leading-relaxed text-kb-muted",
  toolbar: "flex flex-wrap gap-1 border-b border-kb-line bg-kb-panel p-1.5 [&_button[aria-pressed=true]]:bg-kb-highlight [&_button[aria-pressed=true]]:text-kb-heading",
  linkPanel: "grid gap-1.5 border-b border-kb-line bg-kb-panel p-2.5 text-sm",
  linkControls: "flex flex-wrap items-center gap-1.5 [&_input]:min-w-40 [&_input]:flex-1",
  formActions: "flex flex-wrap items-center gap-4",
  deleteArea: "mt-8 max-w-3xl border-t border-kb-line pt-5",
  deleteDialog: "[&_p_strong]:wrap-anywhere",
} as const;

export const adminTable = {
  table: "w-full table-fixed border-separate border-spacing-0 text-sm max-[52rem]:block",
  head: "max-[52rem]:sr-only",
  column: "bg-kb-panel px-4 py-3 text-start text-[0.8125rem] font-semibold text-kb-muted",
  body: "max-[52rem]:block",
  row: "max-[52rem]:grid max-[52rem]:grid-cols-2 max-[52rem]:gap-x-3.5 max-[52rem]:gap-y-2 max-[52rem]:px-4 max-[52rem]:py-3.5 max-[52rem]:not-first:border-t max-[52rem]:border-kb-line",
  name: "wrap-anywhere border-t border-kb-line px-4 py-3 text-start max-[52rem]:col-span-full max-[52rem]:border-0 max-[52rem]:p-0",
  cell: "wrap-anywhere border-t border-kb-line px-4 py-3 text-start text-kb-heading max-[52rem]:border-0 max-[52rem]:p-0 max-[52rem]:before:mb-0.5 max-[52rem]:before:block max-[52rem]:before:text-xs max-[52rem]:before:text-kb-muted max-[52rem]:before:content-[attr(data-label)]",
} as const;
