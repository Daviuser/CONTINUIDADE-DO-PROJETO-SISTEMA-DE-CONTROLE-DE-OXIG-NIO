import "server-only";
import { randomUUID } from "crypto";
import { put, get, del } from "@vercel/blob";
import { StockError } from "./stock";
import { RECEIPT_MAX_BYTES, validateReceiptBytes } from "./receipt-validation";

export type ReceiptMeta = { url: string; pathname: string; contentType: string; size: number };
export { RECEIPT_MAX_BYTES };

// Uploads remain private; only server routes using the SDK can read them.
export async function saveReceipt(file: File): Promise<ReceiptMeta> {
  if (file.size > RECEIPT_MAX_BYTES) throw new StockError("A foto do recibo passa de 4 MB. Escolha uma imagem menor.");
  const hasReadWriteToken = Boolean(process.env.BLOB_READ_WRITE_TOKEN?.trim());
  const hasOidcCredentials = Boolean(process.env.BLOB_STORE_ID?.trim() && (process.env.VERCEL_OIDC_TOKEN?.trim() || process.env.VERCEL === "1"));
  if (!hasReadWriteToken && !hasOidcCredentials) {
    throw new StockError("O armazenamento de recibos não está configurado. Defina BLOB_READ_WRITE_TOKEN nas variáveis de ambiente e tente novamente.");
  }

  const buf = Buffer.from(await file.arrayBuffer());
  let kind: ReturnType<typeof validateReceiptBytes>;
  try { kind = validateReceiptBytes(buf); }
  catch (e) { if (e instanceof Error) throw new StockError(e.message); throw e; }
  const blob = await put(`recibos/${new Date().getUTCFullYear()}/${randomUUID()}.${kind.ext}`, buf, {
    access: "private",
    contentType: kind.mime,
  });
  return { url: blob.url, pathname: blob.pathname, contentType: kind.mime, size: buf.length };
}

type BlobRead = { stream?: ReadableStream<Uint8Array> | null } | null;
export async function openReceipt(pathname: string): Promise<ReadableStream<Uint8Array> | null> {
  const r = (await get(pathname, { access: "private" })) as unknown as BlobRead;
  return r?.stream ?? null;
}

// Para embutir no PDF (só JPEG/PNG são suportados pelo gerador)
export async function receiptDataUrl(pathname: string, mime: string): Promise<string | null> {
  try {
    const stream = await openReceipt(pathname);
    if (!stream) return null;
    const buf = Buffer.from(await new Response(stream).arrayBuffer());
    return `data:${mime};base64,${buf.toString("base64")}`;
  } catch { return null; }
}

export async function removeReceipt(pathname: string) {
  try { await del(pathname); } catch { /* limpeza best-effort */ }
}
