import "server-only";

/** Read a bounded body even when the client has omitted Content-Length. */
export async function readBoundedBody(request: Request, limit: number) {
  if (Number(request.headers.get("content-length")) > limit) return null;

  const reader = request.body?.getReader();
  if (!reader) throw new Error("Missing request body.");

  const chunks: Uint8Array[] = [];
  let length = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      length += value.byteLength;
      if (length > limit) {
        await reader.cancel();
        return null;
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }

  const bytes = new Uint8Array(length);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return bytes;
}
