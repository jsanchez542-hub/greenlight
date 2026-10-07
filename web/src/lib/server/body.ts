export type BodyResult = { ok: true; text: string } | { ok: false };

/**
 * Reads a request body only up to a limit. A body that announces more is refused without
 * being read, and one that does not announce its size is cut off as soon as it goes over.
 */
export async function readLimitedText(request: Request, limitBytes: number): Promise<BodyResult> {
  const announced = Number(request.headers.get('content-length'));
  if (Number.isFinite(announced) && announced > limitBytes) {
    return { ok: false };
  }
  if (request.body === null) {
    return { ok: true, text: '' };
  }

  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let received = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) {
      break;
    }
    received += value.byteLength;
    if (received > limitBytes) {
      await reader.cancel();
      return { ok: false };
    }
    chunks.push(value);
  }
  return { ok: true, text: new TextDecoder().decode(Buffer.concat(chunks)) };
}
