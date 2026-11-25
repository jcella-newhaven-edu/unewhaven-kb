export function slugFromTitle(title: string) {
  return title.normalize("NFKD").toLowerCase().replace(/\p{M}/gu, "")
    .replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 96).replace(/-$/g, "");
}
