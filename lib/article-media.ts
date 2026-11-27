export const articleImageMaxBytes = 5 * 1024 * 1024;
export const articleImageAltMaxLength = 250;
export const articleImageAccept = "image/png,image/jpeg,image/gif,image/webp";
const imagePathPrefix = "/api/article-images/";
const imageIdPattern = /^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/;

export function isArticleImageId(value: unknown): value is string {
  return typeof value === "string" && imageIdPattern.test(value);
}

export function localArticleImageId(src: unknown) {
  if (typeof src !== "string" || !src.startsWith(imagePathPrefix)) return null;
  const id = src.slice(imagePathPrefix.length);
  return isArticleImageId(id) ? id : null;
}

export function validArticleImageSrc(value: unknown): value is string {
  if (typeof value !== "string" || value.length > 2048 || !value.isWellFormed()
    || /[\s\u0000-\u001f\u007f\\]/u.test(value)) return false;

  if (/^\/(?!\/)/.test(value)) return true;
  if (!/^https:\/\//i.test(value)) return false;

  try {
    const url = new URL(value);
    return !!url.hostname && !url.username && !url.password;
  } catch {
    return false;
  }
}
